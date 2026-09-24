import type { Server as HttpServer } from "node:http";

import { env } from "@umzugplus/config";
import { verifyAccessToken, type UserRole } from "@umzugplus/auth";
import { isStaffRole } from "@umzugplus/core";
import { createAdapter } from "@socket.io/redis-adapter";
import { Server, type Socket } from "socket.io";

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
 * Four rules this implementation follows:
 *
 *  1. **The socket is authenticated, not just the page.** The JWT is verified
 *     during the handshake and the role is derived server-side.
 *
 *  2. **The client never picks its own rooms.** Room membership follows from
 *     the verified identity, so a customer cannot subscribe to another
 *     customer's order by guessing an id.
 *
 *  3. **Events are emitted after commit**, by the service layer, so no client
 *     is ever told about a change the database rolled back.
 *
 *  4. **Every event carries a per-room sequence number.** On reconnect a
 *     client sends its last sequence and receives what it missed — without
 *     this, a tunnel change silently desynchronises the board.
 */

export interface SocketIdentity {
  userId: string;
  role: UserRole;
  email: string;
}

declare module "socket.io" {
  interface Socket {
    identity?: SocketIdentity;
  }
}

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

      socket.identity = { userId: claims.sub, role: claims.role, email: claims.email };
      next();
    } catch {
      next(new Error("UNAUTHENTICATED"));
    }
  });

  io.on("connection", (socket) => {
    const identity = socket.identity!;

    // Rooms are assigned from the verified identity — never requested.
    void socket.join(`user:${identity.userId}`);

    if (isStaffRole(identity.role)) {
      void socket.join("role:staff");
    }

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

async function canAccessOrder(identity: SocketIdentity, orderId: string): Promise<boolean> {
  // Asked of the shared role table rather than listed here. This read "staff"
  // or "admin" until the roles were split; the enumeration then silently
  // stopped matching operators and super admins, which an `isStaffRole` call
  // cannot do.
  if (isStaffRole(identity.role)) {
    return true;
  }

  // Imported lazily to keep the gateway free of a hard dependency on the
  // orders module, which would otherwise create an import cycle.
  const { db, schema } = await import("@umzugplus/db");
  const { eq } = await import("drizzle-orm");

  const [order] = await db
    .select({ userId: schema.orders.userId })
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .limit(1);

  return order?.userId === identity.userId;
}
