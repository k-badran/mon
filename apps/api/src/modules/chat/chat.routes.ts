import { randomUUID } from "node:crypto";

import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../../middleware/error-handler.js";
import { chatRateLimit } from "../../middleware/rate-limit.js";
import { optionalAuth, requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams, validatedQuery } from "../../middleware/validate.js";
import { recordAudit } from "../audit/audit.service.js";
import * as chatService from "./chat.service.js";

export const chatRouter: Router = Router();

const VISITOR_COOKIE = "mon_visitor";
const VISITOR_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const sendBody = z.object({
  // Bounded so one request cannot carry an essay.
  message: z.string().trim().min(1).max(2000),
  threadId: z.string().uuid().optional(),
  locale: z.enum(["de", "en", "ar", "tr"]).default("de"),
});

/**
 * Anonymous visitors may chat, but every caller is identified and rate limited.
 *
 * The assistant answers from the knowledge base, so this route works with no
 * external service and no API key — it can no longer return 503 because a
 * credential is missing.
 */
chatRouter.post(
  "/",
  optionalAuth,
  chatRateLimit,
  validate({ body: sendBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof sendBody>;
    const visitorId = ensureVisitorId(req, res);

    const result = await chatService.sendMessage(
      {
        userId: req.user?.id,
        visitorId: req.user ? undefined : visitorId,
        locale: body.locale,
      },
      body.message,
      body.threadId,
    );

    res.json(result);
  }),
);

/** Answers a suggestion the visitor tapped, without re-matching the text. */
chatRouter.post(
  "/:threadId/intent",
  optionalAuth,
  chatRateLimit,
  validate({
    params: z.object({ threadId: z.string().uuid() }),
    body: z.object({ intent: z.string().trim().min(1).max(80) }),
  }),
  asyncHandler(async (req, res) => {
    const threadId = validatedParams<{ threadId: string }>(req).threadId;
    const visitorId = ensureVisitorId(req, res);

    const result = await chatService.answerIntent(
      {
        userId: req.user?.id,
        visitorId: req.user ? undefined : visitorId,
        locale: "de",
      },
      req.body.intent,
      threadId,
    );

    res.json(result);
  }),
);

// ── The signed-in owner ─────────────────────────────────────────────────
//
// Declared before `/:threadId` so "mine" is not read as a malformed thread id.
// No capability is asked for: these return and change only the caller's own
// conversations, which ownership alone authorises — a customer holds no
// capabilities at all. Marking read is not audited, for the same reason a
// customer's own chat message is not: it is the owner's bookkeeping on their
// own data, not an act on anyone else's.

/** The caller's conversations, for the dashboard's Messages screen and badge. */
chatRouter.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const threads = await chatService.listUserThreads(req.user!.id);

    res.json({
      threads,
      // Summed here so the badge on every dashboard page needs one number,
      // not the list.
      unread: threads.reduce((total, thread) => total + thread.unread, 0),
    });
  }),
);

chatRouter.post(
  "/:threadId/read",
  requireAuth,
  validate({ params: z.object({ threadId: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const threadId = validatedParams<{ threadId: string }>(req).threadId;
    await chatService.markRead(req.user!.id, threadId);
    res.status(204).send();
  }),
);

chatRouter.get(
  "/:threadId",
  optionalAuth,
  validate({ params: z.object({ threadId: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const threadId = validatedParams<{ threadId: string }>(req).threadId;

    // resolveThread enforces ownership; someone else's thread is a 404.
    const thread = await chatService.resolveThread(
      {
        userId: req.user?.id,
        visitorId: req.cookies?.[VISITOR_COOKIE] as string | undefined,
        locale: "de",
      },
      threadId,
    );

    res.json({
      threadId,
      isHumanHandled: thread.isHumanHandled,
      messages: await chatService.getMessages(threadId),
    });
  }),
);

// ── Staff ───────────────────────────────────────────────────────────────
//
// These endpoints are the authorisation boundary for the support inbox.
// The admin UI hides them from customers, but that is presentation; what makes
// them safe is the capability check here, re-read from the database per request.

const staffThreadsQuery = z.object({
  status: z.enum(["all", "waiting", "assistant", "human"]).default("all"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * The staff inbox: every conversation, the ones waiting on a person first.
 *
 * The customer's name and email are part of it. Answering someone without
 * knowing who they are is not answering them, and `messages.read` is held
 * only by roles that also hold `customers.read`.
 */
chatRouter.get(
  "/staff/threads",
  requireAuth,
  requirePermission("messages.read"),
  validate({ query: staffThreadsQuery }),
  asyncHandler(async (req, res) => {
    const { status, limit } = validatedQuery<z.infer<typeof staffThreadsQuery>>(req);
    res.json({ threads: await chatService.listStaffThreads(status, limit) });
  }),
);

/**
 * The number behind the inbox's nav badge. Its own route so the badge on every
 * staff page costs one count, not the list.
 */
chatRouter.get(
  "/staff/waiting",
  requireAuth,
  requirePermission("messages.read"),
  asyncHandler(async (_req, res) => {
    res.json({ waiting: await chatService.countWaitingThreads() });
  }),
);

/** One conversation's full history, whoever owns it. */
chatRouter.get(
  "/staff/threads/:threadId",
  requireAuth,
  requirePermission("messages.read"),
  validate({ params: z.object({ threadId: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const threadId = validatedParams<{ threadId: string }>(req).threadId;
    res.json(await chatService.getStaffThread(threadId));
  }),
);

/**
 * Questions the assistant could not answer.
 *
 * This is the list that makes the assistant better over time — and the reason
 * a knowledge base beats a model prompt operationally: the gaps are visible.
 */
chatRouter.get(
  "/staff/gaps",
  requireAuth,
  requirePermission("messages.read"),
  asyncHandler(async (_req, res) => {
    res.json({ gaps: await chatService.listGaps() });
  }),
);

/**
 * Taking a conversation over silences the assistant and puts the staff member
 * on the hook for it, so it is a write on the conversation rather than a read
 * of one — anyone who may answer may also take over.
 */
chatRouter.post(
  "/:threadId/takeover",
  requireAuth,
  requirePermission("messages.write"),
  validate({ params: z.object({ threadId: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const threadId = validatedParams<{ threadId: string }>(req).threadId;
    await chatService.takeOver(threadId, req.user!.id);

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "chat.taken_over",
      entityType: "chat_thread",
      entityId: threadId,
      requestId: req.requestId,
    });

    res.status(204).send();
  }),
);

chatRouter.post(
  "/:threadId/reply",
  requireAuth,
  requirePermission("messages.write"),
  validate({
    params: z.object({ threadId: z.string().uuid() }),
    body: z.object({ body: z.string().trim().min(1).max(5000) }),
  }),
  asyncHandler(async (req, res) => {
    const threadId = validatedParams<{ threadId: string }>(req).threadId;
    await chatService.postStaffMessage(threadId, req.user!.id, req.body.body);

    // The message row records that staff wrote it, not which of them. The
    // audit entry is where that is kept; the text itself is not copied, since
    // it is already in the conversation.
    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "chat.replied",
      entityType: "chat_thread",
      entityId: threadId,
      changes: { length: req.body.body.length },
      requestId: req.requestId,
    });

    res.status(201).json({ threadId });
  }),
);

/**
 * Gives an anonymous visitor a stable id so their conversation survives a
 * reload. httpOnly, so page scripts cannot read or forge it.
 */
function ensureVisitorId(
  req: { cookies?: Record<string, unknown>; user?: unknown },
  res: { cookie: (name: string, value: string, options: Record<string, unknown>) => void },
): string | undefined {
  if (req.user) return undefined;

  const existing = req.cookies?.[VISITOR_COOKIE];
  if (typeof existing === "string" && existing.length > 0) return existing;

  const visitorId = randomUUID();

  res.cookie(VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: VISITOR_COOKIE_MAX_AGE_MS,
  });

  return visitorId;
}
