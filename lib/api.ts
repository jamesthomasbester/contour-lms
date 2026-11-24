import { NextResponse } from "next/server";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";

export function jsonError(status: number, error: string, fields?: unknown) {
  return NextResponse.json(fields ? { error, fields } : { error }, { status });
}

export function validationError(error: z.ZodError) {
  const { formErrors, fieldErrors } = z.flattenError(error);
  return jsonError(400, formErrors[0] ?? "Invalid request", fieldErrors);
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// LM001 is raised by the consultations trigger when a business rule is
// broken, e.g. editing a cancelled consultation.
export function databaseError(error: PostgrestError) {
  if (error.code === "LM001") return jsonError(409, error.message);
  if (error.code === "42501") return jsonError(403, "Not allowed");

  console.error("Database error", error);
  return jsonError(500, "Something went wrong");
}
