/** GET /api/health — spune dacă serverul are cheile configurate (fără să le dezvăluie) și dacă cheia Supabase e de administrator. */
import { createClient } from "@supabase/supabase-js";
const URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";
export async function GET(): Promise<Response> {
  const key = process.env.SUPABASE_SERVICE_KEY;
  let admin: string = "no_key";
  // tabelele din migrările noi (0009 events, 0010 products_user): spune dacă există și câte rânduri au, ca să verificăm fără token
  const tables: Record<string, string | number | Record<string, number>> = {};
  if (key) {
    try {
      const c = createClient(URL, key, { auth: { persistSession: false } });
      const { error } = await c.auth.admin.listUsers({ perPage: 1 });
      admin = error ? `not_admin: ${error.message}` : "admin";
      for (const t of ["events", "products_user", "feedback"]) {
        const { count, error: e } = await c.from(t).select("*", { count: "exact", head: true });
        tables[t] = e ? `lipsă: ${e.message}` : count ?? 0;
      }
      // ce evenimente au venit în ultimele 24 h (doar numele, fără conținut) — ca să vedem dacă telefoanele trimit
      const { data: ev } = await c.from("events").select("name,platform,build").gte("t", new Date(Date.now() - 864e5).toISOString()).limit(1000);
      const names: Record<string, number> = {}; const builds: Record<string, number> = {};
      for (const r of ev ?? []) { names[r.name] = (names[r.name] ?? 0) + 1; const b = `${r.platform ?? "?"} ${r.build ?? "?"}`; builds[b] = (builds[b] ?? 0) + 1; }
      tables.last24h = names; tables.builds24h = builds;
    } catch (e) { admin = "error: " + String(e); }
  }
  return Response.json({ ok: true, ai: Boolean(process.env.ANTHROPIC_API_KEY), openai: Boolean(process.env.OPENAI_API_KEY), resend: Boolean(process.env.RESEND_API_KEY), stats: Boolean(process.env.STATS_TOKEN), supabase: admin, tables, keyPrefix: key ? key.slice(0, 10) : null, at: new Date().toISOString() });
}
