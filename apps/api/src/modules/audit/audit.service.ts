import { db, schema } from "@umzugplus/db";

import { logger } from "../../lib/logger.js";

const { auditLogs } = schema;

/**
 * Server-side audit trail.
 *
 * In the legacy app `logAction` inserted into `audit_logs` from the browser
 * with the actor's email passed as a plain string, so entries could be forged
 * under any identity — and the call could simply be omitted, since every
 * mutation happened whether or not it was logged. Several call sites also
 * dropped the `await`, losing entries on navigation.
 *
 * Here the actor always comes from the verified access token, and writes
 * happen inside the caller's transaction so a change and its audit record
 * commit or roll back together. An audit entry that can be skipped proves
 * nothing; one that is part of the same transaction does.
 */

export interface AuditActor {
  id?: string | undefined;
  email?: string | undefined;
  isSystem?: boolean;
}

export interface AuditEntry {
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId?: string | undefined;
  /** Before/after of the changed fields only — never a whole row. */
  changes?: Record<string, unknown> | undefined;
  ipAddress?: string | undefined;
  requestId?: string | undefined;
}

/** Any Drizzle executor: the pool, or an open transaction. */
type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function recordAudit(entry: AuditEntry, tx?: Executor): Promise<void> {
  const executor = tx ?? db;

  try {
    await executor.insert(auditLogs).values({
      actorId: entry.actor.id ?? null,
      actorEmail: entry.actor.email ?? null,
      actorIsSystem: entry.actor.isSystem ?? false,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      changes: entry.changes ? JSON.stringify(entry.changes) : null,
      ipAddress: entry.ipAddress ?? null,
      requestId: entry.requestId ?? null,
    });
  } catch (error) {
    // Outside a transaction, a failed audit write must not fail the request
    // that succeeded — but it is a genuine operational problem, so it is
    // logged at error level. Inside a transaction the throw propagates and
    // correctly rolls the whole change back.
    if (tx) throw error;

    logger.error({ err: error, action: entry.action }, "Audit write failed");
  }
}

/** Diff helper: returns only the fields that actually changed. */
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  for (const [key, nextValue] of Object.entries(after)) {
    if (nextValue !== undefined && before[key] !== nextValue) {
      changes[key] = { from: before[key], to: nextValue };
    }
  }

  return changes;
}
