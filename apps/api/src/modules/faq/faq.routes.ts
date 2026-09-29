import { DEFAULT_FAQ_CATEGORY, FAQ_CATEGORIES } from "@mon/core";
import { db, schema } from "@mon/db";
import { and, asc, eq, isNull, max, or, type SQL } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams, validatedQuery } from "../../middleware/validate.js";
import { diffFields, recordAudit } from "../audit/audit.service.js";

const { faqEntries } = schema;

export const faqRouter: Router = Router();

const category = z.enum(FAQ_CATEGORIES);
const locale = z.enum(["de", "en", "ar", "tr"]);

const listQuery = z.object({
  locale: locale.default("de"),
  category: category.optional(),
});

/**
 * Public and per-locale.
 *
 * The legacy FAQ was a German-only table, which meant the Arabic and Turkish
 * versions of the site had no answers at all.
 *
 * `category` is always one of FAQ_CATEGORIES in the response: a row stored
 * without one reads as "general", so the website never has to handle null.
 * The optional `?category=` filter treats null the same way.
 */
faqRouter.get(
  "/",
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const { locale, category: only } = validatedQuery<z.infer<typeof listQuery>>(req);

    const conditions: SQL[] = [eq(faqEntries.locale, locale), eq(faqEntries.isPublished, true)];
    if (only) {
      conditions.push(
        only === DEFAULT_FAQ_CATEGORY
          ? (or(isNull(faqEntries.category), eq(faqEntries.category, only)) as SQL)
          : eq(faqEntries.category, only),
      );
    }

    const entries = await db
      .select({
        id: faqEntries.id,
        question: faqEntries.question,
        answer: faqEntries.answer,
        category: faqEntries.category,
      })
      .from(faqEntries)
      .where(and(...conditions))
      .orderBy(asc(faqEntries.sortOrder));

    res.json({
      locale,
      entries: entries.map((entry) => ({
        ...entry,
        category: entry.category ?? DEFAULT_FAQ_CATEGORY,
      })),
    });
  }),
);

/** One locale's entries in order, drafts included. */
function listAll(target: z.infer<typeof locale>) {
  return db
    .select()
    .from(faqEntries)
    .where(eq(faqEntries.locale, target))
    .orderBy(asc(faqEntries.sortOrder));
}

/**
 * Every entry of one locale, unpublished ones included, for the admin editor.
 *
 * The public list above hides drafts, so an editor who switched an answer off
 * could never find it again to switch it back on. Guarded by the same
 * capability as the writes: seeing drafts is part of editing them.
 */
faqRouter.get(
  "/all",
  requireAuth,
  requirePermission("content.write"),
  validate({ query: z.object({ locale: locale.default("de") }) }),
  asyncHandler(async (req, res) => {
    const { locale: target } = validatedQuery<{ locale: z.infer<typeof locale> }>(req);

    res.json({ locale: target, entries: await listAll(target) });
  }),
);

const entryBody = z.object({
  locale: locale.default("de"),
  question: z.string().trim().min(3).max(300),
  answer: z.string().trim().min(3).max(5000),
  // Null clears the topic, which the site then shows as "general".
  category: category.nullable().optional(),
  // Optional on create: (locale, sortOrder) is unique, so the old fixed
  // default of 0 made every entry added without one after the first fail.
  // Absent now means "at the end of that locale's list".
  sortOrder: z.number().int().min(0).optional(),
  isPublished: z.boolean().default(true),
});

type EntryBody = z.infer<typeof entryBody>;

faqRouter.post(
  "/",
  requireAuth,
  requirePermission("content.write"),
  validate({ body: entryBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as EntryBody;

    let sortOrder = body.sortOrder;
    if (sortOrder === undefined) {
      const [last] = await db
        .select({ value: max(faqEntries.sortOrder) })
        .from(faqEntries)
        .where(eq(faqEntries.locale, body.locale));
      sortOrder = (last?.value ?? 0) + 1;
    }

    const [created] = await db
      .insert(faqEntries)
      .values({ ...body, sortOrder })
      .returning();

    // The FAQ is public copy, so who wrote an answer is recorded as for any
    // other edit to the site.
    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "faq.created",
      entityType: "faq_entry",
      entityId: created!.id,
      changes: { locale: created!.locale, question: created!.question },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.status(201).json(created);
  }),
);

const orderBody = z.object({
  locale,
  ids: z.array(z.string().uuid()).min(1).max(500),
});

/**
 * Rewrites one locale's order in a single step.
 *
 * Moving an entry is a swap of two positions, and (locale, sortOrder) is a
 * unique index, so two PATCHes would collide on the first. Taking the whole
 * list also keeps positions at 1..n instead of letting them drift. The list
 * must be exactly the locale's entries: an editor working from a stale list
 * gets a conflict rather than a reorder that silently misplaces a new row.
 */
faqRouter.post(
  "/reorder",
  requireAuth,
  requirePermission("content.write"),
  validate({ body: orderBody }),
  asyncHandler(async (req, res) => {
    const { locale: target, ids } = req.body as z.infer<typeof orderBody>;

    await db.transaction(async (tx) => {
      const current = await tx
        .select({ id: faqEntries.id, sortOrder: faqEntries.sortOrder })
        .from(faqEntries)
        .where(eq(faqEntries.locale, target));

      const known = new Set(current.map((row) => row.id));
      const sameSet =
        ids.length === known.size && new Set(ids).size === ids.length && ids.every((id) => known.has(id));

      if (!sameSet) {
        throw AppError.conflict("CONFLICT", "The FAQ changed since it was loaded. Reload and try again.");
      }

      // Two passes: first clear of every existing position, then into place.
      // A single pass would trip the unique index on the first swap.
      const offset = Math.max(0, ...current.map((row) => row.sortOrder)) + 1;

      for (const [index, id] of ids.entries()) {
        await tx.update(faqEntries).set({ sortOrder: offset + index }).where(eq(faqEntries.id, id));
      }

      for (const [index, id] of ids.entries()) {
        await tx
          .update(faqEntries)
          .set({ sortOrder: index + 1, updatedAt: new Date() })
          .where(eq(faqEntries.id, id));
      }

      await recordAudit(
        {
          actor: { id: req.user!.id, email: req.user!.email },
          action: "faq.reordered",
          entityType: "faq_entry",
          changes: { locale: target, ids },
          ipAddress: req.ip,
          requestId: req.requestId,
        },
        tx,
      );
    });

    res.json({ locale: target, entries: await listAll(target) });
  }),
);

faqRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("content.write"),
  validate({ params: z.object({ id: z.string().uuid() }), body: entryBody.partial() }),
  asyncHandler(async (req, res) => {
    const id = validatedParams<{ id: string }>(req).id;
    const patch = req.body as Partial<EntryBody>;

    const [before] = await db.select().from(faqEntries).where(eq(faqEntries.id, id));

    if (!before) {
      throw AppError.notFound("FAQ entry");
    }

    const [updated] = await db
      .update(faqEntries)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(faqEntries.id, id))
      .returning();

    if (!updated) {
      throw AppError.notFound("FAQ entry");
    }

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "faq.updated",
      entityType: "faq_entry",
      entityId: id,
      changes: diffFields<Record<string, unknown>>(before, patch),
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.json(updated);
  }),
);

faqRouter.delete(
  "/:id",
  requireAuth,
  requirePermission("content.write"),
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const id = validatedParams<{ id: string }>(req).id;

    const [removed] = await db.delete(faqEntries).where(eq(faqEntries.id, id)).returning();

    if (removed) {
      // The text goes into the log because the row itself is gone: without it
      // a deleted answer could be neither identified nor restored.
      await recordAudit({
        actor: { id: req.user!.id, email: req.user!.email },
        action: "faq.deleted",
        entityType: "faq_entry",
        entityId: id,
        changes: { locale: removed.locale, question: removed.question, answer: removed.answer },
        ipAddress: req.ip,
        requestId: req.requestId,
      });
    }

    res.status(204).send();
  }),
);
