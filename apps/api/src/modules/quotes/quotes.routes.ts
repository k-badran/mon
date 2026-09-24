import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../../middleware/error-handler.js";
import { optionalAuth } from "../../middleware/require-auth.js";
import { hasPermission } from "../../middleware/require-permission.js";
import { quoteRateLimit } from "../../middleware/rate-limit.js";
import { validate, validatedParams } from "../../middleware/validate.js";
import { estimateDistanceKm } from "../geocoding/geocoding.service.js";
import * as quotesService from "./quotes.service.js";
import { createQuoteSchema } from "./quotes.schema.js";

export const quotesRouter: Router = Router();

/**
 * The calculator is deliberately open to anonymous visitors — requiring an
 * account before showing a price was the biggest drop-off in the old funnel.
 * The quote is adopted by the account at signup.
 */
quotesRouter.post(
  "/",
  optionalAuth,
  quoteRateLimit,
  validate({ body: createQuoteSchema }),
  asyncHandler(async (req, res) => {
    const { input } = req.body;

    // Distance is resolved server-side. The client cannot assert a shorter
    // trip to lower the price.
    const distanceKm =
      input.serviceType === "moving" && input.destinationAddress
        ? await estimateDistanceKm(input.originAddress, input.destinationAddress)
        : 0;

    const quote = await quotesService.createQuote(input, {
      userId: req.user?.id,
      distanceKm,
    });

    res.status(201).json(quote);
  }),
);

quotesRouter.get(
  "/:id",
  optionalAuth,
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const quote = await quotesService.getQuote(validatedParams<{ id: string }>(req).id);

    // An anonymous quote is readable by anyone holding its unguessable id;
    // one tied to an account is not readable by a different account. Staff
    // working the enquiry need that same quote, so ownership is widened by
    // capability rather than replaced by it: a caller without `quotes.read`
    // still reaches nothing but their own. The capability is only consulted
    // once ownership has failed, so owners and anonymous holders pay nothing
    // for the extra lookup.
    if (quote.userId && quote.userId !== req.user?.id) {
      const staffMayRead = req.user
        ? await hasPermission(req.user.id, "quotes.read")
        : false;

      if (!staffMayRead) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Quote was not found.", requestId: req.requestId } });
        return;
      }
    }

    res.json(quote);
  }),
);
