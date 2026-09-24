import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams, validatedQuery } from "../../middleware/validate.js";
import * as availabilityService from "./availability.service.js";

export const availabilityRouter: Router = Router();

const monthQuery = z.object({
  year: z.coerce.number().int().min(2024).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  capacity: z.coerce.number().int().min(1).max(4).default(1),
});

/**
 * Public: the calendar must render before a visitor has an account.
 * This is advisory only — the authoritative check happens at booking time.
 */
availabilityRouter.get(
  "/",
  validate({ query: monthQuery }),
  asyncHandler(async (req, res) => {
    const { year, month, capacity } = validatedQuery<z.infer<typeof monthQuery>>(req);
    const days = await availabilityService.getMonthAvailability(year, month, capacity);

    res.json({ year, month, days });
  }),
);

const dayBody = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().min(1).max(200),
});

/**
 * Blocking a day removes capacity from the calendar, which is dispatch work
 * rather than administration — operators own the schedule. Naming the
 * capability keeps this route out of the way when the set of roles changes.
 */
availabilityRouter.post(
  "/blocked",
  requireAuth,
  requirePermission("availability.write"),
  validate({ body: dayBody }),
  asyncHandler(async (req, res) => {
    await availabilityService.setDayBlocked(
      req.body.day as never,
      req.body.reason,
      req.user!.id,
    );
    res.status(204).send();
  }),
);

availabilityRouter.delete(
  "/blocked/:day",
  requireAuth,
  requirePermission("availability.write"),
  validate({ params: z.object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }) }),
  asyncHandler(async (req, res) => {
    await availabilityService.unblockDay(validatedParams<{ day: string }>(req).day as never);
    res.status(204).send();
  }),
);
