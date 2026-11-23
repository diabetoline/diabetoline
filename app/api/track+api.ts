/**
 * POST /api/track — evenimente anonime de utilizare (vezi `src/analytics.ts`, migrarea 0009).
 * Corp: { device, country, lang, platform, build, source, events: [{ name, props?, t }] } — maximum 50 pe apel.
 * Acceptă doar numele din lista de mai jos și proprietăți scurte; nimic personal, nimic medical.
 */
import { createClient } from "@supabase/supabase-js";
import { alertOnEvents } from "../../src/server/alerts";
const URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";
export const EVENT_NAMES = new Set([
  "app_install", "app_open", "welcome_step", "welcome_done", "trial_start", "paywall_view", "purchase", "restore", "stay_free",
  "scan_result", "scan_notfound", "scan_network", "glucose_logged", "plate_result", "ask_used", "ideas_used", "report_made",
  "family_linked", "family_code", "med_added", "list_added", "reco_tap", "reco_dismiss", "feedback_sent", "data_wiped", "shop_mode", "shop_trip", "basics_pick", "basics_guess", "shop_order_tap", "offer_open", "push_registered", "purchase_product", "offer_sent", "install_referrer", "notif_test", "notif_perm", "pay_prices", "pay_fail", "community_vote", "community_comment", "community_report", "community_post", "community_view", "community_photo",
]);
const short = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : null);

export async function POST(request: Request): Promise<Response> {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  let b: { device?: string; country?: string; lang?: string; platform?: string; build?: string; source?: string; events?: { name?: string; props?: Record<string, unknown>; t?: number }[] };
  try { b = await request.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  const device = short(b.device, 64);
  if (!device || device.length < 8 || !Array.isArray(b.events)) return Response.json({ ok: false }, { status: 400 });
  const now = Date.now();
  const rows = b.events.slice(0, 50).filter((e) => e && typeof e.name === "string" && EVENT_NAMES.has(e.name)).map((e) => {
    // proprietăți: doar chei scurte cu valori scurte (string/number/boolean), maximum 8
    const props: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(e.props ?? {}).slice(0, 8)) {
      if (typeof v === "number" || typeof v === "boolean") props[k.slice(0, 20)] = v;
      else if (typeof v === "string") props[k.slice(0, 20)] = v.slice(0, 40);
    }
    const t = typeof e.t === "number" && e.t > now - 30 * 864e5 && e.t < now + 6e5 ? new Date(e.t).toISOString() : new Date(now).toISOString();
    return { device, name: e.name as string, props, country: short(b.country, 2), lang: short(b.lang, 5), platform: short(b.platform, 10), build: short(b.build, 20), source: short(b.source, 40), t };
  });
  if (!rows.length) return Response.json({ ok: true, n: 0 });
  const admin = createClient(URL, key, { auth: { persistSession: false } });
  // app_install o singură dată per telefon (23 nov 2026: coada retrimitea evenimentul când răspunsul se pierdea → instalări duble în tablou)
  let dedup = rows;
  if (rows.some((r) => r.name === "app_install")) {
    const { data: had } = await admin.from("events").select("device").eq("device", rows[0].device).eq("name", "app_install").limit(1);
    if (had && had.length) dedup = rows.filter((r) => r.name !== "app_install");
    if (!dedup.length) return Response.json({ ok: true, n: 0 });
  }
  const { error } = await admin.from("events").insert(dedup);
  // la eroare răspundem 500, ca telefonul să păstreze coada și să reîncerce (16 nov 2026: până la migrarea 0009 răspundeam 200 și evenimentele se pierdeau)
  if (error) return Response.json({ ok: false, reason: error.message }, { status: 500 });
  // alerte pe telefonul lui Alex (ntfy) la instalări, probe, plăți — după ce evenimentele sunt scrise
  await alertOnEvents(dedup);
  return Response.json({ ok: true, n: dedup.length });
}
