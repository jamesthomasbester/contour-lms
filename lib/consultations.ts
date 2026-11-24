import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/database.types";

type Client = SupabaseClient<Database>;
type ConsultationRow = Tables<"consultations">;

// Shape sent to the browser. Kept separate from the table row so the API
// uses camelCase and doesn't leak columns the UI has no use for.
export type Consultation = {
  id: string;
  firstName: string;
  lastName: string;
  reason: string;
  scheduledAt: string;
  status: ConsultationRow["status"];
  completedAt: string | null;
  createdAt: string;
};

export function toConsultation(row: ConsultationRow): Consultation {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    reason: row.reason,
    scheduledAt: row.scheduled_at,
    status: row.status,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

// These run with the caller's session, so RLS decides what comes back.
// The explicit user_id filter in listOwn matters for admins, who can see
// every row but should only get their own here.

export async function listOwnConsultations(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("consultations")
    .select("*")
    .eq("user_id", userId)
    .order("scheduled_at");

  if (error) throw error;
  return data.map(toConsultation);
}

export async function listAllConsultations(supabase: Client) {
  const { data, error } = await supabase
    .from("consultations")
    .select("*")
    .order("scheduled_at");

  if (error) throw error;
  return data.map(toConsultation);
}
