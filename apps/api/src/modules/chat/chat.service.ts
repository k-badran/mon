import { answer, type AssistantReply, type KnowledgeEntry } from "@umzugplus/core";
import { db, schema } from "@umzugplus/db";
import { and, asc, eq } from "drizzle-orm";

import { AppError } from "../../lib/errors.js";
import { redis } from "../../lib/redis.js";
import { feedRoom, publishToMany } from "../../realtime/gateway.js";

const { chatThreads, chatMessages, knowledgeEntries, knowledgeGaps } = schema;

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
    .orderBy(asc(chatMessages.createdAt));
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
  await db
    .update(chatThreads)
    .set({ isHumanHandled: true, handledBy: staffId, updatedAt: new Date() })
    .where(eq(chatThreads.id, threadId));

  await publishToMany([`thread:${threadId}`], "chat.message", {
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
  await db.transaction(async (tx) => {
    await tx.insert(chatMessages).values({ threadId, role: "staff", content: body });

    await tx
      .update(chatThreads)
      .set({ isHumanHandled: true, handledBy: staffId, updatedAt: new Date() })
      .where(eq(chatThreads.id, threadId));
  });

  // Emitted after commit, so the visitor never sees a message that was rolled back.
  await publishToMany([`thread:${threadId}`], "chat.message", {
    threadId,
    role: "staff",
    content: body,
  });
}

/** Threads needing attention, for the staff inbox. */
export async function listActiveThreads(limit = 25) {
  return db
    .select({
      id: chatThreads.id,
      userId: chatThreads.userId,
      locale: chatThreads.locale,
      isHumanHandled: chatThreads.isHumanHandled,
      updatedAt: chatThreads.updatedAt,
    })
    .from(chatThreads)
    .orderBy(asc(chatThreads.updatedAt))
    .limit(limit);
}

/** Unanswered questions, newest first — the list that drives improvements. */
export async function listGaps(limit = 50) {
  return db.select().from(knowledgeGaps).limit(limit);
}
