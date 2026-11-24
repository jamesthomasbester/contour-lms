import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { ADMIN_PAGE_SIZE, listAllConsultations } from "@/lib/consultations";
import { pageSchema } from "@/lib/validation";

// GET /api/admin/consultations?page=1
// Every consultation in the system, 20 per page. The role check here gives a
// clean 403; RLS is what actually stops students reading other rows.
export async function GET(request: NextRequest) {
  const { supabase, userId } = await getCurrentUser();
  if (!userId) return jsonError(401, "Not signed in");
  if (!(await isAdmin(supabase, userId))) return jsonError(403, "Admins only");

  const page = pageSchema.parse(request.nextUrl.searchParams.get("page"));

  try {
    const { consultations, total } = await listAllConsultations(supabase, page);
    return NextResponse.json({
      consultations,
      page,
      pageSize: ADMIN_PAGE_SIZE,
      total,
    });
  } catch (error) {
    console.error("Failed to list all consultations", error);
    return jsonError(500, "Something went wrong");
  }
}
