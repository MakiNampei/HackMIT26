import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serverClient: SupabaseClient | undefined;

export function getSupabaseServerClient(): SupabaseClient {
  if (serverClient) return serverClient;

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase backend requires SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  serverClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return serverClient;
}

