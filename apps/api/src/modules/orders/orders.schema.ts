import { z } from "zod";

export const createOrderSchema = z.object({
  quoteId: z.string().uuid(),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().toLowerCase().email(),
  contactPhone: z.string().trim().min(5).max(40),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD."),
  scheduledTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:MM."),
  notes: z.string().trim().max(2000).optional(),
  locale: z.enum(["de", "en", "ar", "tr"]).optional(),
});

export const changeStatusSchema = z.object({
  status: z.enum(["quoted", "confirmed", "cancelled", "completed"]),
  reason: z.string().trim().max(500).optional(),
});

export const listOrdersSchema = z.object({
  status: z.enum(["quoted", "confirmed", "cancelled", "completed"]).optional(),
  search: z.string().trim().max(120).optional(),
  // Capped: an unbounded limit is how the legacy admin panel downloaded the
  // entire orders table on every page load.
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().datetime().optional(),
  // By creation time either way, because that is the column the cursor walks.
  // Staff working through a backlog read it oldest first.
  sort: z.enum(["newest", "oldest"]).default("newest"),
});
