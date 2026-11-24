import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/database.types";

type Client = SupabaseClient<Database>;
type ConsultationRow = Tables<"consultations">;

// What the API and UI work with: camelCase, and only the columns we show.
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

// Both run with the caller's session, so RLS still applies. The user_id
// filter matters for admins, who would otherwise get everyone's rows.
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
