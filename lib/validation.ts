import { z } from "zod";

const name = z.string().trim().min(1, "Required").max(100, "Too long");

// The browser sends an ISO string built from the user's local time, e.g.
// new Date("2026-12-01T09:30").toISOString(), so the server only sees UTC.
const futureDateTime = z.iso
  .datetime({ offset: true, error: "Must be a valid date and time" })
  .refine((value) => new Date(value) > new Date(), "Must be in the future");

export const createConsultationSchema = z.object({
  firstName: name,
  lastName: name,
  reason: z.string().trim().min(1, "Required").max(1000, "Too long"),
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
