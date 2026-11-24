import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { databaseError, jsonError, readJson, validationError } from "@/lib/api";
import { listOwnConsultations, toConsultation } from "@/lib/consultations";
import { createConsultationSchema } from "@/lib/validation";

// GET /api/consultations
// Lists the signed-in student's consultations, soonest first.
export async function GET() {
  const { supabase, userId } = await getCurrentUser();
  if (!userId) return jsonError(401, "Not signed in");

  try {
    const consultations = await listOwnConsultations(supabase, userId);
    return NextResponse.json({ consultations });
  } catch (error) {
    console.error("Failed to list consultations", error);
    return jsonError(500, "Something went wrong");
  }
}

// POST /api/consultations
// Books a new consultation for the signed-in student.
export async function POST(request: Request) {
  const { supabase, userId } = await getCurrentUser();
  if (!userId) return jsonError(401, "Not signed in");

  const parsed = createConsultationSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const { firstName, lastName, reason, scheduledAt } = parsed.data;

  const { data, error } = await supabase
    .from("consultations")
    .insert({
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      reason,
      scheduled_at: scheduledAt,
    })
    .select()
    .single();

  if (error) return databaseError(error);
  return NextResponse.json(
    { consultation: toConsultation(data) },
    { status: 201 },
  );
}
