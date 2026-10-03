import { db, schema } from "@mon/db";
import { and, asc, desc, eq, gte, ilike, isNotNull, lt, or, sql, type SQL } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedQuery } from "../../middleware/validate.js";

const { auditLogs, users } = schema;

/**
 * Reading the audit trail.
 *
 * Read-only by construction: there is no route here that writes, edits or
 * deletes an entry. Entries are only ever created by `recordAudit`, inside the
 * transaction of the change they describe, so the trail cannot be tidied up
 * from the same screen that displays it.
 */
export const auditRouter: Router = Router();

auditRouter.use(requireAuth, requirePermission("audit.read"));

/**
 * Keyset cursor: the last row's timestamp and id.
 *
 * The id breaks ties — several entries written by one request share a
 * timestamp to the microsecond, and a timestamp-only cursor would skip or
 * repeat them at a page boundary. The timestamp travels as Postgres's own text
 * with full microsecond precision; a JavaScript Date would round it to the
 * millisecond and silently move the boundary.
 */
const CURSOR_PATTERN =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z)_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const listQuery = z
  .object({
    action: z.string().trim().min(1).max(80).optional(),
    actorId: z.string().uuid().optional(),
    // Instants, not calendar days: the browser turns the viewer's chosen days
    // into their own midnights, so "today" means the viewer's today.
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    search: z.string().trim().max(120).optional(),
    cursor: z.string().regex(CURSOR_PATTERN).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .refine((query) => !query.from || !query.to || new Date(query.from) < new Date(query.to), {
    message: "`from` must be before `to`.",
    path: ["to"],
  });

type ListQuery = z.infer<typeof listQuery>;

/** Microsecond UTC text, the format the cursor carries. */
const createdAtText = sql<string>`to_char(${auditLogs.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

auditRouter.get(
  "/",
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const query = validatedQuery<ListQuery>(req);
    const conditions: SQL[] = [];

    if (query.action) conditions.push(eq(auditLogs.action, query.action));
    if (query.actorId) conditions.push(eq(auditLogs.actorId, query.actorId));
    if (query.from) conditions.push(gte(auditLogs.createdAt, new Date(query.from)));
    if (query.to) conditions.push(lt(auditLogs.createdAt, new Date(query.to)));

    if (query.search) {
      // Escaped so a `%` or `_` typed into the box is searched for, not
      // treated as a wildcard that matches every row.
      const term = `%${query.search.replace(/[\\%_]/g, "\\$&")}%`;
      conditions.push(
        or(
          ilike(auditLogs.action, term),
          ilike(auditLogs.entityType, term),
          ilike(auditLogs.entityId, term),
          ilike(auditLogs.actorEmail, term),
          ilike(users.fullName, term),
        )!,
      );
    }

    if (query.cursor) {
      const [, at, id] = CURSOR_PATTERN.exec(query.cursor)!;
      conditions.push(
        sql`(${auditLogs.createdAt}, ${auditLogs.id}) < (${at}::timestamptz, ${id}::uuid)`,
      );
    }

    const rows = await db
      .select({
        id: auditLogs.id,
        createdAt: auditLogs.createdAt,
        cursorAt: createdAtText,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        changes: auditLogs.changes,
        actorId: auditLogs.actorId,
        actorEmail: auditLogs.actorEmail,
        actorIsSystem: auditLogs.actorIsSystem,
        // The name is read live from the account; the email was captured at
        // the time, so an entry still says who acted after the account is
        // renamed or deleted.
        actorName: users.fullName,
        ipAddress: auditLogs.ipAddress,
        requestId: auditLogs.requestId,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      // One extra row tells us whether another page exists.
      .limit(query.limit + 1);

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page.at(-1);

    res.json({
      items: page.map(({ cursorAt: _cursorAt, changes, ...row }) => ({
        ...row,
        changes: parseChanges(changes),
      })),
      nextCursor: hasMore && last ? `${last.cursorAt}_${last.id}` : undefined,
    });
  }),
);

/**
 * What the filters can offer: the actions and actors that actually occur.
 *
 * Read from the table rather than from a list in the code, so an action added
 * to some module next month is filterable the day it is first written.
 */
auditRouter.get(
  "/facets",
  asyncHandler(async (_req, res) => {
    const [actions, actors] = await Promise.all([
      db
        .selectDistinct({ action: auditLogs.action })
        .from(auditLogs)
        .orderBy(asc(auditLogs.action)),
      db
        .selectDistinct({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
        })
        .from(auditLogs)
        .innerJoin(users, eq(users.id, auditLogs.actorId))
        .where(isNotNull(auditLogs.actorId))
        .orderBy(asc(users.fullName))
        // Actors are overwhelmingly staff; the cap only stops a pathological
        // table from turning a dropdown into a download.
        .limit(200),
    ]);

    res.json({ actions: actions.map((row) => row.action), actors });
  }),
);

/**
 * `changes` is stored as JSON text. An entry that somehow is not valid JSON
 * is still shown — as the raw text — rather than failing the whole page.
 */
function parseChanges(value: string | null): unknown {
  if (value === null) return null;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
