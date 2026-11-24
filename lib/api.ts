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

// P0001 is what the consultations trigger raises for broken business rules.
// The handlers check the same rules first, so this mostly covers races.
export function databaseError(error: PostgrestError) {
  if (error.code === "P0001") return jsonError(409, error.message);
  if (error.code === "42501") return jsonError(403, "Not allowed");

  console.error("Database error", error);
  return jsonError(500, "Something went wrong");
}
