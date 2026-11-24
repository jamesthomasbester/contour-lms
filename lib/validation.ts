import { z } from "zod";

const requiredText = (max: number) =>
  z
    .string({ error: "Required" })
    .trim()
    .min(1, "Required")
    .max(max, "Too long");

// The browser sends an ISO string built from the user's local time, e.g.
// new Date("2026-12-01T09:30").toISOString(), so the server only sees UTC.
const futureDateTime = z.iso
  .datetime({ offset: true, error: "Must be a valid date and time" })
  .refine((value) => new Date(value) > new Date(), "Must be in the future");

export const createConsultationSchema = z.object({
  firstName: requiredText(100),
  lastName: requiredText(100),
  reason: requiredText(1000),
  scheduledAt: futureDateTime,
});

// A PATCH can reschedule, toggle completion or cancel. Unknown keys are
// rejected so a typo doesn't silently do nothing.
export const updateConsultationSchema = z
  .strictObject({
    scheduledAt: futureDateTime,
    completed: z.boolean(),
    status: z.literal("cancelled"),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, "Nothing to update");

export const consultationIdSchema = z.uuid();

export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;
export type UpdateConsultationInput = z.infer<typeof updateConsultationSchema>;

// ?page= from the URL. Anything missing or invalid falls back to page 1.
export const pageSchema = z.coerce.number().int().min(1).max(100_000).catch(1);
