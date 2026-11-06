/** GET /api/health — spune dacă serverul are cheile configurate (fără să le dezvăluie) și dacă cheia Supabase e de administrator. */
import { createClient } from "@supabase/supabase-js";
const URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";
export async function GET(): Promise<Response> {
  const key = process.env.SUPABASE_SERVICE_KEY;
  let admin: string = "no_key";
  if (key) {
    try {
      const c = createClient(URL, key, { auth: { persistSession: false } });
      const { error } = await c.auth.admin.listUsers({ perPage: 1 });
      admin = error ? `not_admin: ${error.message}` : "admin";
    } catch (e) { admin = "error: " + String(e); }
  }
  return Response.json({ ok: true, ai: Boolean(process.env.ANTHROPIC_API_KEY), openai: Boolean(process.env.OPENAI_API_KEY), resend: Boolean(process.env.RESEND_API_KEY), supabase: admin, keyPrefix: key ? key.slice(0, 10) : null, at: new Date().toISOString() });
}
