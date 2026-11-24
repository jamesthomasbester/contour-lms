import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/database.types";

type Client = SupabaseClient<Database>;
type ConsultationRow = Tables<"consultations">;

// The columns the API and UI actually use.
export const CONSULTATION_COLUMNS =
  "id, first_name, last_name, reason, scheduled_at, status, completed_at, created_at";

type SelectedRow = Pick<
  ConsultationRow,
  | "id"
  | "first_name"
  | "last_name"
  | "reason"
  | "scheduled_at"
  | "status"
  | "completed_at"
  | "created_at"
>;

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

export function toConsultation(row: SelectedRow): Consultation {
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
    .select(CONSULTATION_COLUMNS)
    .eq("user_id", userId)
    .order("scheduled_at");

  if (error) throw error;
  return data.map(toConsultation);
}

export const ADMIN_PAGE_SIZE = 20;

// One page of every consultation, plus the total so the UI can page through.
// Without a range, hosted Supabase would quietly cap the result at 1000 rows.
export async function listAllConsultations(supabase: Client, page: number) {
  const from = (page - 1) * ADMIN_PAGE_SIZE;

  const { data, error, count } = await supabase
    .from("consultations")
    .select(CONSULTATION_COLUMNS, { count: "exact" })
    .order("scheduled_at")
    .order("id")
    .range(from, from + ADMIN_PAGE_SIZE - 1);

  // PGRST103 means the page is past the end, which is an empty page.
  if (error?.code === "PGRST103") {
    const { count: total } = await supabase
      .from("consultations")
      .select("id", { count: "exact", head: true });
    return { consultations: [], total: total ?? 0 };
  }
  if (error) throw error;

  return { consultations: data.map(toConsultation), total: count ?? 0 };
}
