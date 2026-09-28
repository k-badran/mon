import { DEFAULT_FAQ_CATEGORY, FAQ_CATEGORIES } from "@mon/core";
import { db, schema } from "@mon/db";
import { and, asc, eq, isNull, or, type SQL } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams, validatedQuery } from "../../middleware/validate.js";

const { faqEntries } = schema;

export const faqRouter: Router = Router();

const category = z.enum(FAQ_CATEGORIES);

const listQuery = z.object({
  locale: z.enum(["de", "en", "ar", "tr"]).default("de"),
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

const entryBody = z.object({
  locale: z.enum(["de", "en", "ar", "tr"]).default("de"),
  question: z.string().trim().min(3).max(300),
  answer: z.string().trim().min(3).max(5000),
  // Null clears the topic, which the site then shows as "general".
  category: category.nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(true),
});

faqRouter.post(
  "/",
  requireAuth,
  requirePermission("content.write"),
  validate({ body: entryBody }),
  asyncHandler(async (req, res) => {
    const [created] = await db.insert(faqEntries).values(req.body).returning();
    res.status(201).json(created);
  }),
);

faqRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("content.write"),
  validate({ params: z.object({ id: z.string().uuid() }), body: entryBody.partial() }),
  asyncHandler(async (req, res) => {
    const id = validatedParams<{ id: string }>(req).id;

    const [updated] = await db
      .update(faqEntries)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(faqEntries.id, id))
      .returning();

    if (!updated) {
      throw AppError.notFound("FAQ entry");
    }

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

    await db.delete(faqEntries).where(eq(faqEntries.id, id));

    res.status(204).send();
  }),
);
