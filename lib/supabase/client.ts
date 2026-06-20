import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Singleton browser client. Returns null when env vars are missing so the app
// can run in pure local mode (the whole point of local-first: the network is
// optional). Everything sync-related no-ops gracefully when this is null.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let _client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured) return null;
  if (!_client) {
    _client = createClient<Database>(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return _client;
}
