import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Supabase client bound to the caller's cookies, plus their user id
// (undefined when signed out). getClaims() verifies the JWT, unlike
// getSession() which only reads the cookie.
//
// Both helpers are wrapped in cache() so the header and the page share one
// lookup per request.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims.sub };
});

export const isAdmin = cache(async (
  supabase: SupabaseClient<Database>,
  userId: string,
) => {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return data?.role === "admin";
});
