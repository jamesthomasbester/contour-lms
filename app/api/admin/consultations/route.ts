import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { listAllConsultations } from "@/lib/consultations";

// GET /api/admin/consultations
// Every consultation in the system. The role check here gives a clean 403;
// RLS is what actually stops a student from reading other students' rows.
export async function GET() {
  const { supabase, userId } = await getCurrentUser();
  if (!userId) return jsonError(401, "Not signed in");
  if (!(await isAdmin(supabase, userId))) return jsonError(403, "Admins only");

  try {
    const consultations = await listAllConsultations(supabase);
    return NextResponse.json({ consultations });
  } catch (error) {
    console.error("Failed to list all consultations", error);
    return jsonError(500, "Something went wrong");
  }
}
