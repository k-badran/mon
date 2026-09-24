import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { userRoleEnum, userStatusEnum } from "./enums.js";

/**
 * Users own their credentials here rather than in an external provider.
 *
 * `role` is deliberately NOT writable by the client. In the legacy app the
 * browser could issue `update({ role })` directly against the database; role
 * changes now only happen through an admin-only endpoint.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    email: text("email").notNull(),
    // Argon2id hash. Never a plaintext or reversible value.
    passwordHash: text("password_hash").notNull(),

    fullName: text("full_name").notNull(),
    phone: text("phone"),

    role: userRoleEnum("role").notNull().default("customer"),
    status: userStatusEnum("status").notNull().default("active"),

    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),

    // Preferred UI language, used for emails, PDFs and assistant replies.
    locale: text("locale").notNull().default("de"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Case-insensitive uniqueness: "Ali@x.de" and "ali@x.de" are one account.
    uniqueIndex("users_email_lower_idx").on(table.email),
    index("users_role_idx").on(table.role),
  ],
);

/**
 * Refresh tokens are stored hashed and one row per session, so a single device
 * can be revoked without logging the user out everywhere.
 *
 * Rotation: on each refresh the old row is marked `revokedAt` and a new row is
 * written with `rotatedFromId` pointing back. Presenting an already-rotated
 * token means the token leaked — the service then revokes the whole chain.
 */
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    rotatedFromId: uuid("rotated_from_id"),

    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("refresh_tokens_hash_idx").on(table.tokenHash),
    index("refresh_tokens_user_idx").on(table.userId),
    index("refresh_tokens_expires_idx").on(table.expiresAt),
  ],
);

/**
 * Single-use tokens for password reset and email confirmation.
 * Stored hashed for the same reason as refresh tokens: a database leak must
 * not hand an attacker a working reset link.
 */
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    tokenHash: text("token_hash").notNull(),
    purpose: text("purpose").notNull(), // "password_reset" | "email_verification"
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("verification_tokens_hash_idx").on(table.tokenHash),
    index("verification_tokens_user_purpose_idx").on(table.userId, table.purpose),
  ],
);

/**
 * Append-only audit trail. Written ONLY by the server, inside the same
 * transaction as the change it records, with the actor taken from the verified
 * access token rather than from the request body.
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Nullable: system actions (cron, webhooks) have no user.
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorEmail: text("actor_email"),
    actorIsSystem: boolean("actor_is_system").notNull().default(false),

    action: text("action").notNull(), // e.g. "order.status_changed"
    entityType: text("entity_type").notNull(), // e.g. "order"
    entityId: text("entity_id"),

    // Before/after snapshots of the changed fields only.
    changes: text("changes"),
    ipAddress: text("ip_address"),
    requestId: text("request_id"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_actor_idx").on(table.actorId),
    index("audit_logs_created_idx").on(table.createdAt),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  verificationTokens: many(verificationTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

export const verificationTokensRelations = relations(verificationTokens, ({ one }) => ({
  user: one(users, { fields: [verificationTokens.userId], references: [users.id] }),
}));
