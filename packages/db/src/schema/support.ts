import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { complaintAuthorEnum, complaintStatusEnum } from "./enums.js";
import { orders } from "./orders.js";
import { users } from "./identity.js";

/**
 * Customer reviews.
 *
 * One review per order, enforced by a unique index rather than by a
 * client-side check, so a double submit cannot create duplicates.
 */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    rating: integer("rating").notNull(), // 1-5, range-checked in the service layer
    comment: text("comment"),

    /** Admins moderate before a review appears publicly. */
    isPublished: boolean("is_published").notNull().default(false),
    adminReply: text("admin_reply"),
    adminRepliedAt: timestamp("admin_replied_at", { withTimezone: true }),
    adminRepliedBy: uuid("admin_replied_by").references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("reviews_order_idx").on(table.orderId),
    index("reviews_published_idx").on(table.isPublished),
    index("reviews_rating_idx").on(table.rating),
  ],
);

/**
 * A complaint thread attached to an order.
 *
 * Messages live in a separate table so the thread can stream over the
 * real-time channel, message by message, rather than as one blob.
 */
export const complaints = pgTable(
  "complaints",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    subject: text("subject").notNull(),
    status: complaintStatusEnum("status").notNull().default("open"),

    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Bumped on every new message, so the admin list can sort by activity.
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("complaints_status_updated_idx").on(table.status, table.updatedAt),
    index("complaints_order_idx").on(table.orderId),
    index("complaints_user_idx").on(table.userId),
  ],
);

export const complaintMessages = pgTable(
  "complaint_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    complaintId: uuid("complaint_id")
      .notNull()
      .references(() => complaints.id, { onDelete: "cascade" }),

    authorType: complaintAuthorEnum("author_type").notNull(),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),

    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("complaint_messages_thread_idx").on(table.complaintId, table.createdAt)],
);

/**
 * Assistant conversations, persisted so a page refresh no longer discards the
 * thread and so a human can take it over from the admin side.
 */
export const chatThreads = pgTable(
  "chat_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Nullable: anonymous visitors can chat before signing up.
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    /** Opaque cookie value identifying an anonymous visitor. */
    visitorId: text("visitor_id"),

    locale: text("locale").notNull().default("de"),
    /** True once a staff member joins; the assistant then stops replying. */
    isHumanHandled: boolean("is_human_handled").notNull().default(false),
    handledBy: uuid("handled_by").references(() => users.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("chat_threads_user_idx").on(table.userId),
    index("chat_threads_visitor_idx").on(table.visitorId),
    index("chat_threads_updated_idx").on(table.updatedAt),
  ],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => chatThreads.id, { onDelete: "cascade" }),

    /**
     * Roles are persisted server-side. The legacy widget sent the whole
     * transcript with each request, letting a client fabricate what the
     * assistant had supposedly said.
     */
    role: text("role").notNull(), // "user" | "assistant" | "staff"
    content: text("content").notNull(),
    /** Token usage, for cost tracking. */
    tokensUsed: integer("tokens_used"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("chat_messages_thread_idx").on(table.threadId, table.createdAt)],
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  order: one(orders, { fields: [reviews.orderId], references: [orders.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
}));

export const complaintsRelations = relations(complaints, ({ one, many }) => ({
  order: one(orders, { fields: [complaints.orderId], references: [orders.id] }),
  user: one(users, { fields: [complaints.userId], references: [users.id] }),
  messages: many(complaintMessages),
}));

export const complaintMessagesRelations = relations(complaintMessages, ({ one }) => ({
  complaint: one(complaints, {
    fields: [complaintMessages.complaintId],
    references: [complaints.id],
  }),
}));

export const chatThreadsRelations = relations(chatThreads, ({ one, many }) => ({
  user: one(users, { fields: [chatThreads.userId], references: [users.id] }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  thread: one(chatThreads, { fields: [chatMessages.threadId], references: [chatThreads.id] }),
}));

/**
 * The assistant's knowledge base.
 *
 * Answers live here rather than inside a model prompt, so the assistant can
 * only say what the company has actually written, and a change to the
 * cancellation policy is one row edit rather than a prompt rewrite that can
 * silently drift from the terms page.
 */
export const knowledgeEntries = pgTable(
  "knowledge_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    locale: text("locale").notNull().default("de"),
    /** Stable key, e.g. "cancellation". Used for analytics and tests. */
    intent: text("intent").notNull(),

    /** Words that signal this intent, stored as a JSON array of strings. */
    keywords: jsonb("keywords").$type<string[]>().notNull(),
    question: text("question").notNull(),
    answer: text("answer").notNull(),

    /** Breaks ties: a specific intent should beat a general one. */
    priority: integer("priority").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("knowledge_locale_intent_idx").on(table.locale, table.intent),
    index("knowledge_active_idx").on(table.isActive),
  ],
);

/**
 * Questions the assistant could not answer.
 *
 * The gap list: each row is a customer who asked something the knowledge base
 * does not cover. Reviewing these is how the assistant gets better, and it is
 * information the previous design threw away entirely.
 */
export const knowledgeGaps = pgTable(
  "knowledge_gaps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id").references(() => chatThreads.id, { onDelete: "set null" }),

    question: text("question").notNull(),
    locale: text("locale").notNull(),
    /** Best score achieved, so near-misses can be told from total misses. */
    bestScore: numeric("best_score", { precision: 4, scale: 3 }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("knowledge_gaps_created_idx").on(table.createdAt)],
);
