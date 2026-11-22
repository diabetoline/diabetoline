/**
 * POST /api/offer?token=STATS_TOKEN — trimite un push comercial (22 nov 2026). Regula lui Alex: cel mult 2 pe săptămână
 * per telefon; serverul o impune aici (numără `offer_sends` din ultimele 7 zile), indiferent cine apasă.
 * Corp: { id, title: {ro,en,de}, body: {ro,en,de}, url, country?: "RO", lang?: "ro", platform?: "android", dry?: true, limit?: 5000 }
 * `url` = linkul produsului de pe diabetoline.com (aplicația îl deschide prin `order(url, "push")`, cu APP10 și atributul comenzii).
 * GET ?token= — câte telefoane sunt eligibile acum (fără a trimite).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { authorized } from "./stats+api";
const URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";
const WEEK = 7 * 864e5;
type Row = { device: string; token: string; lang: string | null; country: string | null; platform: string | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function eligible(db: SupabaseClient<any, "public", "public", any, any>, f: { country?: string; lang?: string; platform?: string }, limit: number): Promise<Row[]> {
  let q = db.from("push_tokens").select("device,token,lang,country,platform").eq("offers", true).limit(limit);
  if (f.country) q = q.eq("country", f.country.toUpperCase());
  if (f.lang) q = q.eq("lang", f.lang);
  if (f.platform) q = q.eq("platform", f.platform);
  const { data } = await q;
  const rows = (data ?? []) as Row[];
  if (!rows.length) return [];
  const since = new Date(Date.now() - WEEK).toISOString();
  const { data: sends } = await db.from("offer_sends").select("device").gte("t", since).in("device", rows.map((r) => r.device));
  const count: Record<string, number> = {};
  for (const s of (sends ?? []) as { device: string }[]) count[s.device] = (count[s.device] ?? 0) + 1;
  return rows.filter((r) => (count[r.device] ?? 0) < 2);
}

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) return Response.json({ ok: false }, { status: 401 });
  const key = process.env.SUPABASE_SERVICE_KEY; if (!key) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  const db = createClient(URL, key, { auth: { persistSession: false } });
  const u = new URL(request.url);
  const rows = await eligible(db, { country: u.searchParams.get("country") ?? undefined, lang: u.searchParams.get("lang") ?? undefined, platform: u.searchParams.get("platform") ?? undefined }, 10000);
  const { count } = await db.from("push_tokens").select("device", { count: "exact", head: true });
  const byCountry: Record<string, number> = {};
  for (const r of rows) byCountry[r.country ?? "?"] = (byCountry[r.country ?? "?"] ?? 0) + 1;
  return Response.json({ ok: true, registered: count ?? 0, eligible: rows.length, byCountry });
}

export async function POST(request: Request): Promise<Response> {
  if (!authorized(request)) return Response.json({ ok: false }, { status: 401 });
  const key = process.env.SUPABASE_SERVICE_KEY; if (!key) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  let b: { id?: string; title?: Record<string, string>; body?: Record<string, string>; url?: string; country?: string; lang?: string; platform?: string; dry?: boolean; limit?: number; device?: string };
  try { b = await request.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  const id = String(b.id ?? "").slice(0, 40);
  if (!id || !b.title?.ro || !b.body?.ro || !b.url) return Response.json({ ok: false, reason: "id/title.ro/body.ro/url required" }, { status: 400 });
  const db = createClient(URL, key, { auth: { persistSession: false } });
  let rows = await eligible(db, { country: b.country, lang: b.lang, platform: b.platform }, Math.min(b.limit ?? 5000, 20000));
  // test pe un singur telefon (pagina /api/offers): nu numără în limita de 2/săptămână
  const testOnly = typeof b.device === "string" && b.device.length >= 8;
  if (testOnly) { const { data: one } = await db.from("push_tokens").select("device,token,lang,country,platform").eq("device", b.device).maybeSingle(); rows = one ? [one as Row] : []; }
  if (b.dry) return Response.json({ ok: true, dry: true, would_send: rows.length });
  const pick = (m: Record<string, string>, lang: string | null) => m[lang ?? "ro"] ?? m.en ?? m.ro;
  let sent = 0; const errors: string[] = [];
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const msgs = chunk.map((r) => ({ to: r.token, title: pick(b.title!, r.lang), body: pick(b.body!, r.lang), sound: "default", channelId: "reminders", data: { kind: "offer", url: b.url, id } }));
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(msgs) });
      const j = (await res.json().catch(() => ({}))) as { data?: { status: string; message?: string }[] };
      const ok = chunk.filter((_, k) => j.data?.[k]?.status === "ok");
      sent += ok.length;
      for (const [k, d] of (j.data ?? []).entries()) if (d.status !== "ok" && errors.length < 10) errors.push(`${chunk[k].device}: ${d.message ?? d.status}`);
      if (ok.length && !testOnly) await db.from("offer_sends").insert(ok.map((r) => ({ device: r.device, offer: id })));
    } catch (e) { errors.push(String((e as Error)?.message ?? e)); }
  }
  if (!testOnly) await db.from("events").insert({ device: "server-offer", name: "offer_sent", props: { id, n: sent, country: b.country ?? "", url: String(b.url).slice(0, 40) }, platform: "server" }).then(() => {}, () => {});
  return Response.json({ ok: true, sent, eligible: rows.length, errors });
}
