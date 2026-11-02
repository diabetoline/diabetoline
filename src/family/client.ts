import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Clientul Supabase (serverul din UE pentru contul de familie).
 * Cheia de mai jos e cea PUBLICĂ (publishable): e făcută să stea în aplicație; accesul la date îl dau regulile RLS din supabase/migrations.
 */
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";
const KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? "sb_publishable_AlwTBwk-pXstS9PGH6_8Qw_nJ8O4fHY";

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!client) client = createClient(URL, KEY, { auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  return client;
}

/** Utilizator anonim: fără e-mail, fără parolă. Se creează la prima nevoie și rămâne pe telefon. */
export async function ensureUser(): Promise<string> {
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  if (data.session?.user) return data.session.user.id;
  const { data: anon, error } = await sb.auth.signInAnonymously();
  if (error || !anon.user) throw error ?? new Error("no user");
  return anon.user.id;
}
