import { Router } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { hasPermission, requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams, validatedQuery } from "../../middleware/validate.js";
import { eventsFor } from "./orders.state-machine.js";
import { publishToMany } from "../../realtime/gateway.js";
import * as ordersService from "./orders.service.js";
import { changeStatusSchema, createOrderSchema, listOrdersSchema } from "./orders.schema.js";

export const ordersRouter: Router = Router();

// Every order route requires a verified identity. There is no client-side
// guard anywhere in this stack.
ordersRouter.use(requireAuth);

const idParam = z.object({ id: z.string().uuid() });

/** Book a quote. The price comes from the stored quote, never the request. */
ordersRouter.post(
  "/",
  validate({ body: createOrderSchema }),
  asyncHandler(async (req, res) => {
    const order = await ordersService.createOrder(req.body, req.user!.id, {
      actor: { id: req.user!.id, email: req.user!.email },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    // Emitted only once the transaction above has committed, so the admin
    // board never shows an order the database rolled back.
    await publishToMany(
      ["role:staff", `user:${req.user!.id}`],
      "order.created",
      { id: order.id, reference: order.reference, status: order.status },
    );

    res.status(201).json(order);
  }),
);

/**
 * Customers see only their own orders; staff holding `orders.read` see all.
 *
 * No route-level guard: a customer is entitled to this route, just to a
 * narrower result. The filter is forced server-side rather than read from a
 * query param, so widening it is not something a client can ask for.
 */
ordersRouter.get(
  "/",
  validate({ query: listOrdersSchema }),
  asyncHandler(async (req, res) => {
    const seesEveryOrder = await hasPermission(req.user!.id, "orders.read");
    const query = validatedQuery<z.infer<typeof listOrdersSchema>>(req);

    const result = await ordersService.listOrders({
      ...query,
      userId: seesEveryOrder ? undefined : req.user!.id,
    });

    res.json(result);
  }),
);

/**
 * Readable by the customer who placed it, and by staff holding `orders.read`.
 *
 * Ownership is checked first and on its own terms: the permission only widens
 * who else may read, it never stands in for the owner check.
 */
ordersRouter.get(
  "/:id",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const order = await ordersService.getOrderById(validatedParams<{ id: string }>(req).id);

    if (
      order.userId !== req.user!.id &&
      !(await hasPermission(req.user!.id, "orders.read"))
    ) {
      // 404 rather than 403: confirming an order exists but is not yours leaks
      // its existence to anyone probing ids.
      throw AppError.notFound("Order");
    }

    res.json(order);
  }),
);

/** Status changes are staff-only and pass through the state machine. */
ordersRouter.patch(
  "/:id/status",
  requirePermission("orders.write"),
  validate({ params: idParam, body: changeStatusSchema }),
  asyncHandler(async (req, res) => {
    // Cancelling is a separate capability, and this route can reach it through
    // the status body. Checked here so a role that may edit an order but not
    // call it off cannot do so by choosing "cancelled" from the dropdown.
    if (req.body.status === "cancelled" && !(await hasPermission(req.user!.id, "orders.cancel"))) {
      throw AppError.insufficientRole("orders.cancel");
    }

    const order = await ordersService.changeStatus(validatedParams<{ id: string }>(req).id, req.body.status, {
      actor: { id: req.user!.id, email: req.user!.email },
      reason: req.body.reason,
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    for (const event of eventsFor(order.status)) {
      await publishToMany(
        ["role:staff", `user:${order.userId}`, `order:${order.id}`],
        event,
        { id: order.id, reference: order.reference, status: order.status },
      );
    }

    res.json(order);
  }),
);

/**
 * A customer may cancel their own order; the fee is computed server-side.
 * Staff holding `orders.cancel` may cancel on anyone's behalf.
 */
ordersRouter.post(
  "/:id/cancel",
  validate({ params: idParam, body: z.object({ reason: z.string().trim().max(500).optional() }) }),
  asyncHandler(async (req, res) => {
    const existing = await ordersService.getOrderById(validatedParams<{ id: string }>(req).id);

    if (
      existing.userId !== req.user!.id &&
      !(await hasPermission(req.user!.id, "orders.cancel"))
    ) {
      throw AppError.notFound("Order");
    }

    const order = await ordersService.changeStatus(validatedParams<{ id: string }>(req).id, "cancelled", {
      actor: { id: req.user!.id, email: req.user!.email },
      reason: req.body.reason,
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    for (const event of eventsFor(order.status)) {
      await publishToMany(
        ["role:staff", `user:${order.userId}`, `order:${order.id}`],
        event,
        { id: order.id, reference: order.reference, status: order.status },
      );
    }

    res.json(order);
  }),
);
