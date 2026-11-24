import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { databaseError, jsonError, readJson, validationError } from "@/lib/api";
import { toConsultation } from "@/lib/consultations";
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

  // Filtering on user_id means admins get a 404 for other students' rows
  // here too. The admin view is read-only.
  const { data: existing, error: fetchError } = await supabase
    .from("consultations")
    .select("status, completed_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) return databaseError(fetchError);
  if (!existing) return jsonError(404, "Consultation not found");
  if (existing.status === "cancelled") {
    return jsonError(409, "Cancelled consultations cannot be modified");
  }

  const { scheduledAt, completed, status } = parsed.data;
  const changes: TablesUpdate<"consultations"> = {};

  if (scheduledAt !== undefined) changes.scheduled_at = scheduledAt;
  if (status !== undefined) changes.status = status;
  if (completed !== undefined) {
    // Keep the original completion time if it is already complete.
    changes.completed_at = completed
      ? (existing.completed_at ?? new Date().toISOString())
      : null;
  }

  const { data, error } = await supabase
    .from("consultations")
    .update(changes)
    .eq("id", id)
    .select()
    .single();

  if (error) return databaseError(error);
  return NextResponse.json({ consultation: toConsultation(data) });
}
