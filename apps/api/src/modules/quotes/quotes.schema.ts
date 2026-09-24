import { z } from "zod";

/** Mirrors core's QuoteInput. Validated here so no unchecked field reaches pricing. */
export const quoteInputSchema = z.object({
  serviceType: z.enum(["moving", "disposal", "cleaning"]),
  customerType: z.enum(["private", "business"]).default("private"),

  originAddress: z.string().trim().min(5).max(300),
  destinationAddress: z.string().trim().min(5).max(300).optional(),
  originFloor: z.number().int().min(0).max(20).default(0),
  destinationFloor: z.number().int().min(0).max(20).default(0),
  originHasElevator: z.boolean().default(false),
  destinationHasElevator: z.boolean().default(false),

  calculationMethod: z.enum(["area", "items"]),
  areaSqm: z.number().int().positive().max(2000).optional(),
  selectedItems: z.record(z.string().uuid(), z.number().int().min(0).max(999)).optional(),

  extras: z
    .object({
      packingService: z.boolean().default(false),
      parkingZone: z.boolean().default(false),
      transportInsurance: z.boolean().default(false),
      assemblyItems: z.record(z.string().uuid(), z.number().int().min(0).max(999)).optional(),
      disassemblyItems: z.record(z.string().uuid(), z.number().int().min(0).max(999)).optional(),
    })
    .default({}),

  crewSize: z.union([z.literal(2), z.literal(3)]).default(2),
  secondVan: z.boolean().default(false),

  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD.").optional(),
  discountCode: z.string().trim().max(40).optional(),
})
  // A price cannot be produced without a scope, and the two methods need
  // different fields — caught here rather than deep inside the engine.
  .refine((v) => v.calculationMethod !== "area" || v.areaSqm !== undefined, {
    message: "areaSqm is required when calculationMethod is 'area'.",
    path: ["areaSqm"],
  })
  .refine(
    (v) =>
      v.calculationMethod !== "items" ||
      Object.values(v.selectedItems ?? {}).some((q) => q > 0),
    { message: "At least one item must be selected.", path: ["selectedItems"] },
  )
  .refine((v) => v.serviceType !== "moving" || v.destinationAddress !== undefined, {
    message: "destinationAddress is required for a move.",
    path: ["destinationAddress"],
  });

export const createQuoteSchema = z.object({ input: quoteInputSchema });
