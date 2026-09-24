import { db, schema } from "@umzugplus/db";
import { and, asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { redis } from "../../lib/redis.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams, validatedQuery } from "../../middleware/validate.js";
import { recordAudit } from "../audit/audit.service.js";

const { siteSettings, contentBlocks } = schema;

export const siteRouter: Router = Router();

const SETTINGS_CACHE_KEY = "site:settings:v1";
const CONTENT_CACHE_PREFIX = "site:content:v1:";
const CACHE_TTL_SECONDS = 300;

/**
 * The website's theme and content, managed from the dashboard.
 *
 * Two audiences: the website reads the published values anonymously on every
 * render, and admins edit them. The read path is cached because it runs on
 * every page view; every write invalidates that cache immediately, so a change
 * is visible on the next request rather than after a TTL.
 */

// ── Public: what the website renders with ───────────────────────────────

/**
 * Theme tokens.
 *
 * Returned as a flat map the site turns into CSS custom properties. Only
 * theme and brand keys are public — contact and SEO groups are included too
 * since they appear on the page anyway, but nothing operational is.
 */
siteRouter.get(
  "/theme",
  asyncHandler(async (_req, res) => {
    const cached = await redis.get(SETTINGS_CACHE_KEY).catch(() => null);

    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const rows = await db
      .select({ key: siteSettings.key, value: siteSettings.value, group: siteSettings.group })
      .from(siteSettings);

    const payload = {
      theme: Object.fromEntries(
        rows.filter((r) => r.group === "theme").map((r) => [r.key, r.value]),
      ),
      brand: Object.fromEntries(
        rows.filter((r) => r.group === "brand").map((r) => [r.key, r.value]),
      ),
      contact: Object.fromEntries(
        rows.filter((r) => r.group === "contact").map((r) => [r.key, r.value]),
      ),
      seo: Object.fromEntries(rows.filter((r) => r.group === "seo").map((r) => [r.key, r.value])),
    };

    await redis
      .set(SETTINGS_CACHE_KEY, JSON.stringify(payload), "EX", CACHE_TTL_SECONDS)
      .catch(() => undefined);

    res.json(payload);
  }),
);

const contentQuery = z.object({
  locale: z.enum(["de", "en", "ar", "tr"]).default("de"),
  section: z.string().trim().max(60).optional(),
});

/** Published content for a locale, grouped by section. */
siteRouter.get(
  "/content",
  validate({ query: contentQuery }),
  asyncHandler(async (req, res) => {
    const { locale, section } = validatedQuery<z.infer<typeof contentQuery>>(req);
    const cacheKey = `${CONTENT_CACHE_PREFIX}${locale}:${section ?? "all"}`;

    const cached = await redis.get(cacheKey).catch(() => null);

    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const filters = [eq(contentBlocks.locale, locale), eq(contentBlocks.isPublished, true)];
    if (section) filters.push(eq(contentBlocks.section, section));

    const rows = await db
      .select({
        section: contentBlocks.section,
        slot: contentBlocks.slot,
        value: contentBlocks.value,
      })
      .from(contentBlocks)
      .where(and(...filters))
      .orderBy(asc(contentBlocks.section), asc(contentBlocks.sortOrder));

    // Nested by section so a page pulls only what it renders.
    const grouped: Record<string, Record<string, string>> = {};

    for (const row of rows) {
      grouped[row.section] ??= {};
      grouped[row.section]![row.slot] = row.value;
    }

    const payload = { locale, sections: grouped };

    await redis.set(cacheKey, JSON.stringify(payload), "EX", CACHE_TTL_SECONDS).catch(() => undefined);

    res.json(payload);
  }),
);

// ── Staff: editing ──────────────────────────────────────────────────────

// Settings and content are separate capabilities: an editor who may rewrite
// page copy is not thereby allowed to repaint the site, and vice versa.
const themeEditor = [requireAuth, requirePermission("theme.write")] as const;
const contentEditor = [requireAuth, requirePermission("content.write")] as const;

/** Every setting with its editor metadata, so the UI builds itself. */
siteRouter.get(
  "/settings",
  ...themeEditor,
  asyncHandler(async (_req, res) => {
    const settings = await db
      .select()
      .from(siteSettings)
      .orderBy(asc(siteSettings.group), asc(siteSettings.sortOrder));

    res.json({ settings });
  }),
);

/** Colours are validated as hex so a typo cannot produce an unstyled site. */
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const settingBody = z.object({ value: z.string().trim().max(2000) });

siteRouter.patch(
  "/settings/:key",
  ...themeEditor,
  validate({ params: z.object({ key: z.string().min(1).max(80) }), body: settingBody }),
  asyncHandler(async (req, res) => {
    const key = validatedParams<{ key: string }>(req).key;

    const [before] = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);

    if (!before) {
      throw AppError.notFound("Setting");
    }

    const value = req.body.value as string;

    // The kind recorded with the setting is what it is validated against —
    // a colour field must not be able to hold prose.
    if (before.kind === "color" && !HEX.test(value)) {
      throw AppError.unprocessable("Expected a hex colour such as #D71635.");
    }

    if (before.kind === "email" && !z.string().email().safeParse(value).success) {
      throw AppError.unprocessable("Expected a valid email address.");
    }

    if (before.kind === "url" && !z.string().url().safeParse(value).success) {
      throw AppError.unprocessable("Expected a valid URL.");
    }

    if (before.kind === "number" && Number.isNaN(Number(value))) {
      throw AppError.unprocessable("Expected a number.");
    }

    const [updated] = await db
      .update(siteSettings)
      .set({ value, updatedAt: new Date(), updatedBy: req.user!.id })
      .where(eq(siteSettings.key, key))
      .returning();

    await invalidateSiteCache();

    // A theme change is visible to every visitor, so who made it is recorded.
    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "site.setting_updated",
      entityType: "site_setting",
      entityId: key,
      changes: { value: { from: before.value, to: value } },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.json(updated);
  }),
);

const blocksQuery = z.object({
  locale: z.enum(["de", "en", "ar", "tr"]).default("de"),
  section: z.string().trim().max(60).optional(),
});

/** All blocks including unpublished ones, for the editor. */
siteRouter.get(
  "/blocks",
  ...contentEditor,
  validate({ query: blocksQuery }),
  asyncHandler(async (req, res) => {
    const { locale, section } = validatedQuery<z.infer<typeof blocksQuery>>(req);

    const filters = [eq(contentBlocks.locale, locale)];
    if (section) filters.push(eq(contentBlocks.section, section));

    const blocks = await db
      .select()
      .from(contentBlocks)
      .where(and(...filters))
      .orderBy(asc(contentBlocks.section), asc(contentBlocks.sortOrder));

    res.json({ locale, blocks });
  }),
);

siteRouter.patch(
  "/blocks/:id",
  ...contentEditor,
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
      value: z.string().trim().max(10_000).optional(),
      isPublished: z.boolean().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const id = validatedParams<{ id: string }>(req).id;

    const [before] = await db.select().from(contentBlocks).where(eq(contentBlocks.id, id)).limit(1);

    if (!before) {
      throw AppError.notFound("Content block");
    }

    const [updated] = await db
      .update(contentBlocks)
      .set({ ...req.body, updatedAt: new Date(), updatedBy: req.user!.id })
      .where(eq(contentBlocks.id, id))
      .returning();

    await invalidateSiteCache();

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "site.content_updated",
      entityType: "content_block",
      entityId: id,
      changes: {
        slot: `${before.section}.${before.slot}`,
        locale: before.locale,
        ...(req.body.value !== undefined ? { value: { from: before.value, to: req.body.value } } : {}),
        ...(req.body.isPublished !== undefined ? { isPublished: req.body.isPublished } : {}),
      },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.json(updated);
  }),
);

/**
 * Restores every theme setting to its seeded default.
 *
 * The escape hatch for an admin who has made the site unreadable — without it,
 * a bad contrast choice could only be undone by editing the database.
 */
siteRouter.post(
  "/settings/reset-theme",
  ...themeEditor,
  asyncHandler(async (req, res) => {
    const { THEME_DEFAULTS } = await import("@umzugplus/db/site-defaults");

    for (const setting of THEME_DEFAULTS) {
      await db
        .update(siteSettings)
        .set({ value: setting.value, updatedAt: new Date(), updatedBy: req.user!.id })
        .where(eq(siteSettings.key, setting.key));
    }

    await invalidateSiteCache();

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "site.theme_reset",
      entityType: "site_setting",
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.status(204).send();
  }),
);

/** Clears both caches so an edit is live on the next request, not after a TTL. */
async function invalidateSiteCache(): Promise<void> {
  await redis.del(SETTINGS_CACHE_KEY).catch(() => undefined);

  // Scanned rather than enumerated. `section` is a free-text query parameter,
  // so the cached key space is whatever has been requested — every `page-*`
  // frame, not the five names the old list happened to carry. Enumerating left
  // an edit to any other section waiting out the full TTL, which read as the
  // dashboard silently ignoring the change.
  let cursor = "0";

  try {
    do {
      const [next, keys] = await redis.scan(
        cursor,
        "MATCH",
        `${CONTENT_CACHE_PREFIX}*`,
        "COUNT",
        250,
      );

      cursor = next;

      if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== "0");
  } catch {
    // The write itself is already committed. A cache that cannot be cleared
    // must not turn that into a failed request; the entries expire on their
    // own TTL.
  }
}
