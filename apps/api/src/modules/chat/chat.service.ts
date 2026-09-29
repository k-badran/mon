import { answer, type AssistantReply, type KnowledgeEntry } from "@mon/core";
import { db, schema } from "@mon/db";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { AppError } from "../../lib/errors.js";
import { redis } from "../../lib/redis.js";
import { feedRoom, publishToMany } from "../../realtime/gateway.js";

const { chatThreads, chatMessages, knowledgeEntries, knowledgeGaps, users } = schema;

/**
 * The support assistant.
 *
 * Rebuilt to be self-contained. The previous version forwarded every message to
 * an external model, which meant:
 *
 *   - no API key, no assistant — the route simply returned 503;
 *   - unbounded per-message cost with no ceiling;
 *   - the model could state a cancellation fee or a price that contradicted the
 *     actual business rules, because nothing constrained it to them.
 *
 * Answers now come from a knowledge base in the database. The assistant can
 * only say what the company has written; when it does not know, it says so and
 * offers a human rather than guessing. Every unanswered question is recorded,
 * so the gaps are visible and fixable.
 */

const KNOWLEDGE_CACHE_KEY = "knowledge:v1";
const KNOWLEDGE_CACHE_TTL_SECONDS = 300;

export interface ChatIdentity {
  userId?: string | undefined;
  visitorId?: string | undefined;
  locale: string;
}

export interface SendResult {
  threadId: string;
  reply: AssistantReply;
  isHumanHandled: boolean;
}

/** Loads the knowledge base, cached. Invalidated when an admin edits it. */
export async function loadKnowledge(): Promise<KnowledgeEntry[]> {
  const cached = await redis.get(KNOWLEDGE_CACHE_KEY).catch(() => null);

  if (cached) {
    return JSON.parse(cached) as KnowledgeEntry[];
  }

  const rows = await db
    .select()
    .from(knowledgeEntries)
    .where(eq(knowledgeEntries.isActive, true));

  const entries: KnowledgeEntry[] = rows.map((row) => ({
    id: row.id,
    locale: row.locale,
    intent: row.intent,
    keywords: row.keywords,
    question: row.question,
    answer: row.answer,
    priority: row.priority,
  }));

  await redis
    .set(KNOWLEDGE_CACHE_KEY, JSON.stringify(entries), "EX", KNOWLEDGE_CACHE_TTL_SECONDS)
    .catch(() => undefined);

  return entries;
}

export async function invalidateKnowledgeCache(): Promise<void> {
  await redis.del(KNOWLEDGE_CACHE_KEY).catch(() => undefined);
}

export async function resolveThread(identity: ChatIdentity, threadId?: string) {
  if (threadId) {
    const [existing] = await db
      .select()
      .from(chatThreads)
      .where(eq(chatThreads.id, threadId))
      .limit(1);

    if (!existing) {
      throw AppError.notFound("Conversation");
    }

    // A thread belongs to whoever opened it. Anything else is a 404, so an id
    // cannot be probed for existence.
    const ownsIt =
      (identity.userId !== undefined && existing.userId === identity.userId) ||
      (identity.visitorId !== undefined && existing.visitorId === identity.visitorId);

    if (!ownsIt) {
      throw AppError.notFound("Conversation");
    }

    return existing;
  }

  const [created] = await db
    .insert(chatThreads)
    .values({
      userId: identity.userId ?? null,
      visitorId: identity.visitorId ?? null,
      locale: identity.locale,
    })
    .returning();

  return created!;
}

/**
 * The tie-break for messages stored in one statement.
 *
 * A tapped suggestion stores the question and its answer in a single insert,
 * so both carry the same `now()`; ordered by time alone the answer could come
 * before the question, and a thread's "last message" could be the question.
 * The customer's message sorts first among equals.
 */
const answersLast = sql<number>`case when ${chatMessages.role} = 'user' then 0 else 1 end`;

export async function getMessages(threadId: string) {
  return db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId))
    .orderBy(asc(chatMessages.createdAt), asc(answersLast));
}

export async function sendMessage(
  identity: ChatIdentity,
  text: string,
  threadId?: string,
): Promise<SendResult> {
  const thread = await resolveThread(identity, threadId);

  await db.insert(chatMessages).values({
    threadId: thread.id,
    role: "user",
    content: text,
  });

  await db.update(chatThreads).set({ updatedAt: new Date() }).where(eq(chatThreads.id, thread.id));

  // Notify staff so a live conversation is visible on the admin side.
  await publishToMany([feedRoom("messages.read"), `thread:${thread.id}`], "chat.message", {
    threadId: thread.id,
    role: "user",
    content: text,
  });

  // Once a person has taken over, the assistant stays quiet so the two do not
  // talk over each other. The message is stored and delivered to staff.
  if (thread.isHumanHandled) {
    return {
      threadId: thread.id,
      reply: { kind: "handoff", text: "" },
      isHumanHandled: true,
    };
  }

  const knowledge = await loadKnowledge();
  const reply = answer(text, knowledge, thread.locale);

  // Record what could not be answered. This list is how the knowledge base
  // improves; the previous design discarded the information entirely.
  if (reply.kind !== "answer") {
    await db
      .insert(knowledgeGaps)
      .values({ threadId: thread.id, question: text, locale: thread.locale })
      .catch(() => undefined);
  }

  // A clarify reply is stored as its question list so the transcript reads
  // sensibly when a human later opens the thread.
  const stored =
    reply.kind === "clarify"
      ? [reply.text, ...(reply.suggestions ?? []).map((s) => `• ${s.question}`)].join("\n")
      : reply.text;

  await db.insert(chatMessages).values({
    threadId: thread.id,
    role: "assistant",
    content: stored,
  });

  return { threadId: thread.id, reply, isHumanHandled: false };
}

/** Answers a suggestion the visitor picked, by intent, with no re-matching. */
export async function answerIntent(
  identity: ChatIdentity,
  intent: string,
  threadId: string,
): Promise<SendResult> {
  const thread = await resolveThread(identity, threadId);

  const [entry] = await db
    .select()
    .from(knowledgeEntries)
    .where(
      and(
        eq(knowledgeEntries.intent, intent),
        eq(knowledgeEntries.locale, thread.locale),
        eq(knowledgeEntries.isActive, true),
      ),
    )
    .limit(1);

  if (!entry) {
    throw AppError.notFound("Answer");
  }

  await db.insert(chatMessages).values([
    { threadId: thread.id, role: "user", content: entry.question },
    { threadId: thread.id, role: "assistant", content: entry.answer },
  ]);

  return {
    threadId: thread.id,
    reply: { kind: "answer", text: entry.answer, intent: entry.intent },
    isHumanHandled: thread.isHumanHandled,
  };
}

/** Staff takeover: the assistant stands down and a person answers. */
export async function takeOver(threadId: string, staffId: string): Promise<void> {
  const ownerId = await threadOwner(threadId);

  await db
    .update(chatThreads)
    .set({ isHumanHandled: true, handledBy: staffId, updatedAt: new Date() })
    .where(eq(chatThreads.id, threadId));

  await publishToMany(staffRooms(threadId, ownerId), "chat.message", {
    threadId,
    role: "system",
    content: "handover",
  });
}

export async function postStaffMessage(
  threadId: string,
  staffId: string,
  body: string,
): Promise<void> {
  const ownerId = await threadOwner(threadId);

  await db.transaction(async (tx) => {
    await tx.insert(chatMessages).values({ threadId, role: "staff", content: body });

    await tx
      .update(chatThreads)
      .set({ isHumanHandled: true, handledBy: staffId, updatedAt: new Date() })
      .where(eq(chatThreads.id, threadId));
  });

  // Emitted after commit, so the visitor never sees a message that was rolled back.
  // The owner's own room carries it too: a signed-in socket is in that room on
  // every page, so the dashboard's unread badge moves without the Messages
  // screen being open.
  await publishToMany(staffRooms(threadId, ownerId), "chat.message", {
    threadId,
    role: "staff",
    content: body,
  });
}

// ── The staff inbox ─────────────────────────────────────────────────────

/**
 * Whether a conversation is waiting on a person.
 *
 * The customer's latest message must be newer than the last staff reply, and
 * then either:
 *
 *   - the conversation has been taken over — the assistant is silent by then,
 *     so nobody else will answer; or
 *   - the assistant could not answer that latest message. A miss is recorded
 *     as a knowledge gap in the same request, after the customer's message is
 *     stored, so a gap at or after it means the last thing the customer heard
 *     was "I can't answer that". A later question the assistant did answer
 *     clears it, rather than leaving the thread waiting for good.
 *
 * A conversation the assistant is answering well is not waiting, which keeps
 * the top of the inbox to the threads a person actually has to open.
 *
 * Qualified names throughout, for the reason given on `unreadCount` below.
 */
const lastUserAt = sql`(
  select max(u."created_at") from "chat_messages" u
  where u."thread_id" = "chat_threads"."id" and u."role" = 'user'
)`;

const lastStaffAt = sql`coalesce((
  select max(s."created_at") from "chat_messages" s
  where s."thread_id" = "chat_threads"."id" and s."role" = 'staff'
), 'epoch'::timestamptz)`;

const waitingForStaff = sql<boolean>`(
  coalesce(${lastUserAt} > ${lastStaffAt}, false)
  and (
    "chat_threads"."is_human_handled"
    or exists (
      select 1 from "knowledge_gaps" g
      where g."thread_id" = "chat_threads"."id" and g."created_at" >= ${lastUserAt}
    )
  )
)`;

/** Who took the conversation over, by name, for the inbox's status line. */
const handledByName = sql<string | null>`(
  select h."full_name" from "users" h where h."id" = "chat_threads"."handled_by"
)`;

export type StaffThreadFilter = "all" | "waiting" | "assistant" | "human";

function staffFilter(filter: StaffThreadFilter) {
  switch (filter) {
    case "waiting":
      return waitingForStaff;
    case "assistant":
      return eq(chatThreads.isHumanHandled, false);
    case "human":
      return eq(chatThreads.isHumanHandled, true);
    default:
      return undefined;
  }
}

/**
 * Conversations for the staff inbox: waiting ones first, then by activity.
 *
 * Replaces a list sorted oldest-first with no customer, no last message and no
 * way to tell a thread the assistant had handled from one nobody had answered —
 * a list of ids rather than an inbox. A thread with no messages in it is left
 * out: there is nothing to answer.
 */
export async function listStaffThreads(filter: StaffThreadFilter, limit = 50) {
  const threads = await db
    .select({
      id: chatThreads.id,
      locale: chatThreads.locale,
      isHumanHandled: chatThreads.isHumanHandled,
      handledByName,
      createdAt: chatThreads.createdAt,
      updatedAt: chatThreads.updatedAt,
      waiting: waitingForStaff,
      customerId: users.id,
      customerName: users.fullName,
      customerEmail: users.email,
    })
    .from(chatThreads)
    .leftJoin(users, eq(users.id, chatThreads.userId))
    .where(
      and(
        sql`exists (select 1 from "chat_messages" x where x."thread_id" = "chat_threads"."id")`,
        staffFilter(filter),
      ),
    )
    .orderBy(desc(waitingForStaff), desc(chatThreads.updatedAt))
    .limit(limit);

  const lastMessages = await lastMessageOf(threads.map((thread) => thread.id));

  return threads.map(({ customerId, customerName, customerEmail, ...thread }) => ({
    ...thread,
    customer: toCustomer(customerId, customerName, customerEmail),
    lastMessage: lastMessages.get(thread.id) ?? null,
  }));
}

/** How many conversations are waiting on a person, for the nav badge. */
export async function countWaitingThreads(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatThreads)
    .where(waitingForStaff);

  return row?.count ?? 0;
}

/**
 * One conversation, for staff, whoever owns it.
 *
 * `resolveThread` answers a stranger's id with a 404 so an id cannot be
 * probed. Staff are not strangers to the inbox; the route's `messages.read`
 * check is what guards this read instead.
 */
export async function getStaffThread(threadId: string) {
  const [thread] = await db
    .select({
      id: chatThreads.id,
      locale: chatThreads.locale,
      isHumanHandled: chatThreads.isHumanHandled,
      handledByName,
      createdAt: chatThreads.createdAt,
      waiting: waitingForStaff,
      customerId: users.id,
      customerName: users.fullName,
      customerEmail: users.email,
    })
    .from(chatThreads)
    .leftJoin(users, eq(users.id, chatThreads.userId))
    .where(eq(chatThreads.id, threadId))
    .limit(1);

  if (!thread) {
    throw AppError.notFound("Conversation");
  }

  const { customerId, customerName, customerEmail, ...rest } = thread;

  return {
    ...rest,
    customer: toCustomer(customerId, customerName, customerEmail),
    messages: await getMessages(threadId),
  };
}

/** Null for an anonymous visitor, rather than an object of nulls. */
function toCustomer(id: string | null, name: string | null, email: string | null) {
  return id ? { id, name: name ?? "", email: email ?? "" } : null;
}

/** Unanswered questions, newest first — the list that drives improvements. */
export async function listGaps(limit = 50) {
  return db.select().from(knowledgeGaps).limit(limit);
}

// ── The owner's side ────────────────────────────────────────────────────

/**
 * Staff replies the owner has not seen yet.
 *
 * Only a person's reply counts. The assistant answers in the same request that
 * carried the customer's message, so its reply has been read by the time it is
 * stored; counting it would badge every question the customer just asked.
 *
 * Written with qualified names on purpose. Drizzle leaves column references
 * unqualified in a single-table select, and inside this subquery a bare "id"
 * binds to the message, not the thread — every count silently comes out zero.
 */
const unreadCount = sql<number>`(
  select count(*)::int from "chat_messages" m
  where m."thread_id" = "chat_threads"."id"
    and m."role" = 'staff'
    and ("chat_threads"."customer_read_at" is null or m."created_at" > "chat_threads"."customer_read_at")
)`;

/**
 * The signed-in user's own conversations, freshest first, each with its last
 * message and unread count.
 *
 * Only threads opened while signed in are listed. An anonymous thread is keyed
 * to a browser cookie, and adopting it on sign-in would hand a conversation
 * typed on a shared computer to whoever signs in next.
 */
export async function listUserThreads(userId: string, limit = 50) {
  const threads = await db
    .select({
      id: chatThreads.id,
      isHumanHandled: chatThreads.isHumanHandled,
      createdAt: chatThreads.createdAt,
      updatedAt: chatThreads.updatedAt,
      unread: unreadCount,
    })
    .from(chatThreads)
    .where(eq(chatThreads.userId, userId))
    .orderBy(desc(chatThreads.updatedAt))
    .limit(limit);

  if (threads.length === 0) return [];

  const lastMessages = await lastMessageOf(threads.map((thread) => thread.id));

  return threads.map((thread) => ({ ...thread, lastMessage: lastMessages.get(thread.id) ?? null }));
}

/**
 * Records that the owner has read a conversation up to now.
 *
 * Scoped by owner in the same statement, so another user's thread id updates
 * nothing and reads as a 404 — the same answer `resolveThread` gives.
 */
export async function markRead(userId: string, threadId: string): Promise<void> {
  const [updated] = await db
    .update(chatThreads)
    // The database's clock, not this process's: messages are stamped by
    // `defaultNow()`, and comparing against an API host whose clock lags the
    // database's would leave a just-read reply counted as unread.
    .set({ customerReadAt: sql`now()` })
    .where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)))
    .returning({ id: chatThreads.id });

  if (!updated) {
    throw AppError.notFound("Conversation");
  }
}

/** Each thread's newest message, in one query rather than one per thread. */
async function lastMessageOf(threadIds: string[]) {
  type Last = { role: string; content: string; createdAt: Date };
  if (threadIds.length === 0) return new Map<string, Last>();

  const last = await db
    .selectDistinctOn([chatMessages.threadId], {
      threadId: chatMessages.threadId,
      role: chatMessages.role,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(inArray(chatMessages.threadId, threadIds))
    .orderBy(chatMessages.threadId, desc(chatMessages.createdAt), desc(answersLast));

  return new Map<string, Last>(last.map(({ threadId, ...message }) => [threadId, message]));
}

/**
 * The thread's owner, or a 404 when there is no such thread.
 *
 * The staff writes used to go ahead regardless: a takeover of an unknown id
 * updated nothing and answered 204, and a reply to one failed on the foreign
 * key as a 500.
 */
async function threadOwner(threadId: string): Promise<string | null> {
  const [row] = await db
    .select({ userId: chatThreads.userId })
    .from(chatThreads)
    .where(eq(chatThreads.id, threadId))
    .limit(1);

  if (!row) {
    throw AppError.notFound("Conversation");
  }

  return row.userId;
}

/** An anonymous visitor has no user room; the thread room is all they have. */
function ownerRooms(ownerId: string | null): string[] {
  return ownerId ? [`user:${ownerId}`] : [];
}

/**
 * Where a staff action on a thread is announced: the thread, its owner, and
 * the staff feed — the last so a colleague's inbox stops showing the thread as
 * waiting once someone has picked it up.
 */
function staffRooms(threadId: string, ownerId: string | null): string[] {
  return [`thread:${threadId}`, feedRoom("messages.read"), ...ownerRooms(ownerId)];
}
