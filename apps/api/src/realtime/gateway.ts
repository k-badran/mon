import type { Server as HttpServer } from "node:http";

import { env } from "@umzugplus/config";
import { verifyAccessToken, type UserRole } from "@umzugplus/auth";
import { can } from "@umzugplus/core";
import { db, schema } from "@umzugplus/db";
import { createAdapter } from "@socket.io/redis-adapter";
import { eq } from "drizzle-orm";
import { Server, type Socket } from "socket.io";

import { effectiveRole } from "../lib/account-state.js";
import { logger } from "../lib/logger.js";
import { redis } from "../lib/redis.js";

/**
 * The real-time gateway.
 *
 * The legacy app had no real-time of any kind — no WebSocket, no Supabase
 * channel, not even polling — so a new order did not appear on the admin board
 * until someone reloaded, two staff working the same queue overwrote each
 * other silently, and the availability calendar could offer a slot taken
 * minutes earlier.
 *
 * Five rules this implementation follows:
 *
 *  1. **The socket is authenticated, not just the page.** The JWT is verified
 *     during the handshake and the role is read from the database, never taken
 *     from the token's claim.
 *
 *  2. **The client never picks its own rooms.** Room membership follows from
 *     the verified identity, so a customer cannot subscribe to another
 *     customer's order by guessing an id.
 *
 *  3. **A room is earned by a capability, not by rank.** A feed carries the
 *     same data an endpoint would return, so it asks the same question the
 *     endpoint asks. The single `role:staff` room this replaces was the one
 *     staff data feed in the system with no capability check: a
 *     customer-service token and a super-admin token received byte-identical
 *     traffic, including verbatim visitor chat.
 *
 *  4. **Authority is re-checked while the connection is open.** A request is
 *     authorised once and then ends; a socket is authorised once and then
 *     lives for hours. Without the re-check, a demoted or blocked staff member
 *     with a tab open kept the staff feed indefinitely — long past the expiry
 *     of the token that let them in, because an expiring token does not close
 *     a socket by itself.
 *
 *  5. **Events are emitted after commit**, by the service layer, so no client
 *     is ever told about a change the database rolled back. Every event
 *     carries a per-room sequence number, so a client that reconnects can tell
 *     it missed something instead of silently desynchronising.
 */

export interface SocketIdentity {
  userId: string;
  /**
   * The role as the last re-authorisation pass read it from the database —
   * never the token's claim. Mutable on purpose: a demotion has to reach a
   * connection that is already open.
   */
  role: UserRole;
  email: string;
  /** When the token that opened this connection stops being valid. */
  tokenExpiresAt: Date;
}

declare module "socket.io" {
  interface Socket {
    identity?: SocketIdentity;
  }
}

/**
 * The capabilities that have a live feed behind them.
 *
 * Adding a feed means naming the capability that pays for it here and
 * publishing to `feedRoom(...)`. There is deliberately no "all staff" room to
 * fall back on.
 */
export const FEED_PERMISSIONS = ["orders.read", "messages.read"] as const;

export type FeedPermission = (typeof FEED_PERMISSIONS)[number];

/**
 * The room carrying what a holder of `permission` may see.
 *
 * Publishers name a capability rather than an audience, so a feed cannot be
 * widened by accident: putting order events somewhere a customer-service agent
 * can hear them takes writing their capability at the call site.
 */
export function feedRoom(permission: FeedPermission): string {
  return `feed:${permission}`;
}

/**
 * How often an open socket's authority is re-read from the database.
 *
 * One minute, chosen to sit well inside the fifteen-minute access-token
 * lifetime that used to be the only — and unenforced — bound on how long a
 * socket kept the authority it was opened with.
 */
const REAUTHORISE_INTERVAL_MS = 60_000;

/** Business events. Named after facts, not table operations. */
export type RealtimeEvent =
  | "order.created"
  | "order.status_changed"
  | "order.confirmed"
  | "order.cancelled"
  | "order.completed"
  | "payment.recorded"
  | "availability.changed"
  | "chat.message"
  | "complaint.message"
  | "presence.viewing"
  | "catalog.updated";

export interface EventEnvelope<T = unknown> {
  event: RealtimeEvent;
  /** Monotonic per room, so a client can detect and repair a gap. */
  sequence: number;
  emittedAt: string;
  payload: T;
}

let io: Server | null = null;

export function createRealtimeGateway(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    path: "/realtime",
    cors: { origin: [env.WEB_ORIGIN], credentials: true },
    // Long enough to survive a phone changing networks, short enough that a
    // dead connection does not hold its rooms forever.
    pingTimeout: 25_000,
    pingInterval: 20_000,
  });

  // The Redis adapter is what lets the gateway run as more than one instance:
  // an event emitted on one process reaches sockets connected to another.
  const subClient = redis.duplicate();
  io.adapter(createAdapter(redis, subClient));

  io.use(async (socket, next) => {
    try {
      const token = extractToken(socket);

      if (!token) {
        next(new Error("UNAUTHENTICATED"));
        return;
      }

      const claims = await verifyAccessToken(token);

      // The token proves who is connecting. What they may receive is a second
      // question, asked of the database — so an account blocked a minute ago
      // cannot open a feed with a token minted before it was blocked.
      const role = await effectiveRole(claims.sub);

      if (!role) {
        next(new Error("UNAUTHENTICATED"));
        return;
      }

      socket.identity = {
        userId: claims.sub,
        role,
        email: claims.email,
        tokenExpiresAt: claims.expiresAt,
      };
      next();
    } catch {
      next(new Error("UNAUTHENTICATED"));
    }
  });

  io.on("connection", (socket) => {
    const identity = socket.identity!;

    // Rooms are assigned from the verified identity — never requested. The
    // role here came from the database during the handshake, so the feeds can
    // be granted without asking again.
    void socket.join(`user:${identity.userId}`);
    applyFeedRooms(socket, identity.role);

    // A socket outlives the credential that opened it, so the credential is
    // checked again rather than assumed to still hold.
    const timer = setInterval(() => void reauthorise(socket), REAUTHORISE_INTERVAL_MS);

    logger.debug({ userId: identity.userId, role: identity.role }, "Socket connected");

    /**
     * A client may subscribe to one order or thread, but only after the server
     * confirms it belongs to them. The check lives in the handler rather than
     * being implied by the room name.
     */
    socket.on("subscribe:order", async (orderId: unknown, ack?: (ok: boolean) => void) => {
      if (typeof orderId !== "string") {
        ack?.(false);
        return;
      }

      const allowed = await canAccessOrder(identity, orderId);

      if (allowed) void socket.join(`order:${orderId}`);

      ack?.(allowed);
    });

    socket.on("subscribe:month", (month: unknown, ack?: (ok: boolean) => void) => {
      // Availability is public information, so any authenticated socket may
      // watch a month. The value is still validated to avoid unbounded rooms.
      if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
        ack?.(false);
        return;
      }

      void socket.join(`month:${month}`);
      ack?.(true);
    });

    socket.on("disconnect", (reason) => {
      clearInterval(timer);
      logger.debug({ userId: identity.userId, reason }, "Socket disconnected");
    });
  });

  logger.info("Realtime gateway ready at /realtime");

  return io;
}

/**
 * Publishes an event to a room.
 *
 * Call this AFTER the transaction commits. The sequence number is allocated in
 * Redis so it stays monotonic across API instances.
 */
export async function publish<T>(
  room: string,
  event: RealtimeEvent,
  payload: T,
): Promise<void> {
  if (!io) {
    // In tests, or before the gateway is up, publishing is a no-op rather than
    // an error — an event that cannot be delivered must not fail the request
    // whose data has already been committed.
    return;
  }

  try {
    const sequence = await redis.incr(`seq:${room}`);

    const envelope: EventEnvelope<T> = {
      event,
      sequence,
      emittedAt: new Date().toISOString(),
      payload,
    };

    io.to(room).emit(event, envelope);
  } catch (error) {
    logger.error({ err: error, room, event }, "Failed to publish realtime event");
  }
}

/** Publishes the same event to several rooms. */
export async function publishToMany<T>(
  rooms: readonly string[],
  event: RealtimeEvent,
  payload: T,
): Promise<void> {
  await Promise.all(rooms.map((room) => publish(room, event, payload)));
}

/**
 * Closes every connection belonging to a user.
 *
 * Revoking sessions marks refresh-token rows revoked, which stops further
 * access tokens being minted and says nothing at all to a connection that is
 * already open. Blocking someone, or changing what they may do, has to reach
 * the tab in front of them and not only their next request. The Redis adapter
 * carries this to sockets held by other API instances.
 */
export function disconnectUserSockets(userId: string): void {
  if (!io) return;

  try {
    // `true` closes the underlying connection rather than only the namespace,
    // so the client reconnects — and is re-authorised — instead of lingering.
    io.in(`user:${userId}`).disconnectSockets(true);
  } catch (error) {
    logger.error({ err: error, userId }, "Failed to disconnect sockets for user");
  }
}

export async function closeRealtimeGateway(): Promise<void> {
  await io?.close();
  io = null;
}

// ── internals ───────────────────────────────────────────────────────────

function extractToken(socket: Socket): string | null {
  // Prefer the auth payload over a query parameter: query strings end up in
  // proxy and server access logs, and an access token should not.
  const fromAuth = socket.handshake.auth?.token;

  if (typeof fromAuth === "string" && fromAuth.length > 0) {
    return fromAuth;
  }

  const header = socket.handshake.headers.authorization;

  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}

/**
 * Re-reads what this connection may receive, and adjusts it.
 *
 * Runs on a timer for the life of the connection. Three outcomes: the account
 * may no longer act at all and the socket goes; the role changed and the feeds
 * follow it; nothing changed and the pass costs one primary-key lookup.
 */
async function reauthorise(socket: Socket): Promise<void> {
  const identity = socket.identity;

  if (!identity) return;

  // The handshake token has run out. Nothing is revoked by that on its own —
  // which is the problem — so the connection is closed and the client comes
  // back with a token it can still prove it is entitled to.
  if (identity.tokenExpiresAt.getTime() <= Date.now()) {
    socket.disconnect(true);
    return;
  }

  let role: UserRole | null;

  try {
    role = await effectiveRole(identity.userId);
  } catch (error) {
    // A database blip must not silently widen what a socket receives, and must
    // not drop a legitimate connection either. The membership from the last
    // successful pass stands until the next one.
    logger.error({ err: error, userId: identity.userId }, "Could not re-authorise socket");
    return;
  }

  if (!role) {
    // Blocked or deleted. There is nothing left to narrow.
    socket.disconnect(true);
    return;
  }

  identity.role = role;

  applyFeedRooms(socket, role);
  await pruneOrderRooms(socket, role);
}

/**
 * Brings the feed rooms in line with a role.
 *
 * Both directions, every time: a pass that only ever joins would leave a
 * demoted operator holding the order feed until they closed the tab.
 */
function applyFeedRooms(socket: Socket, role: UserRole): void {
  for (const permission of FEED_PERMISSIONS) {
    const room = feedRoom(permission);

    if (can(role, permission)) {
      void socket.join(room);
    } else {
      void socket.leave(room);
    }
  }
}

/**
 * Drops order rooms that a demotion has just made unreachable.
 *
 * `subscribe:order` grants staff a room on any order. When that capability
 * goes, the rooms it opened have to go with it — otherwise the one live feed
 * that survives a demotion is the one carrying customer addresses.
 */
async function pruneOrderRooms(socket: Socket, role: UserRole): Promise<void> {
  const identity = socket.identity;

  // Still entitled to every order, so nothing can have become unreachable.
  if (!identity || can(role, "orders.read")) return;

  // Snapshot: the loop leaves rooms as it goes, and the live set is the thing
  // being changed.
  for (const room of [...socket.rooms]) {
    if (!room.startsWith("order:")) continue;

    const orderId = room.slice("order:".length);

    if (!(await ownsOrder(identity.userId, orderId))) {
      void socket.leave(room);
    }
  }
}

async function canAccessOrder(identity: SocketIdentity, orderId: string): Promise<boolean> {
  // Asked as a capability and answered from the database, exactly as the REST
  // route asks it. This used to be `isStaffRole(identity.role)` against the
  // token's claim — "is this caller staff?", a question `orders.read` does not
  // ask, and one a demoted or blocked account went on answering yes to for as
  // long as its socket stayed open.
  const role = await effectiveRole(identity.userId);

  if (!role) return false;

  identity.role = role;

  if (can(role, "orders.read")) return true;

  return ownsOrder(identity.userId, orderId);
}

async function ownsOrder(userId: string, orderId: string): Promise<boolean> {
  const [order] = await db
    .select({ userId: schema.orders.userId })
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .limit(1);

  return order?.userId === userId;
}
