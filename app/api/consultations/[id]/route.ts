import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { databaseError, jsonError, readJson, validationError } from "@/lib/api";
import { CONSULTATION_COLUMNS, toConsultation } from "@/lib/consultations";
import type { TablesUpdate } from "@/lib/database.types";
import {
  consultationIdSchema,
  updateConsultationSchema,
} from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/consultations/:id
// Body can contain any of:
//   { "scheduledAt": "<ISO date>" }   reschedule
//   { "completed": true | false }     mark complete / incomplete
//   { "status": "cancelled" }         cancel
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  if (!consultationIdSchema.safeParse(id).success) {
    return jsonError(404, "Consultation not found");
  }

  const { supabase, userId } = await getCurrentUser();
  if (!userId) return jsonError(401, "Not signed in");

  const parsed = updateConsultationSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const { scheduledAt, completed, status } = parsed.data;
  const changes: TablesUpdate<"consultations"> = {};

  if (scheduledAt !== undefined) changes.scheduled_at = scheduledAt;
  if (status !== undefined) changes.status = status;
  // The trigger decides the stored completion time; we only say yes or no.
  if (completed !== undefined) {
    changes.completed_at = completed ? new Date().toISOString() : null;
  }

  // Admins can read every row, but can only change their own, so the
  // user_id filter keeps this endpoint scoped to the caller.
  const { data, error } = await supabase
    .from("consultations")
    .update(changes)
    .eq("id", id)
    .eq("user_id", userId)
    .select(CONSULTATION_COLUMNS)
    .maybeSingle();

  if (error) return databaseError(error);
  if (!data) return jsonError(404, "Consultation not found");
  return NextResponse.json({ consultation: toConsultation(data) });
}
