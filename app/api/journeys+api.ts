/**
 * GET /api/journeys?token=…&days=14 — ce fac oamenii în prima zi și cine revine (24 nov 2026, Alex: „de ce pleacă oamenii după prima zi”).
 * Doar citire, doar etichete de evenimente (fără valori medicale). Protejat cu `STATS_TOKEN`, ca `/api/stats`.
 * Răspuns: pentru fiecare telefon instalat în fereastră, secvența compactă din primele 24 h, dacă a revenit după 24 h,
 * plus agregate: revenire după numărul de scanări, după „produs negăsit”, după chestionar, după notificări, după țară/platformă/build.
 */
import { createClient } from "@supabase/supabase-js";
import { authorized } from "./stats+api";

const SB_URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";
type Ev = { device: string; name: string; props: Record<string, unknown> | null; country: string | null; platform: string | null; build: string | null; source: string | null; t: string };

const SHORT: Record<string, string> = {
  app_install: "I", app_open: "o", welcome_step: "w", welcome_done: "W", trial_start: "T", paywall_view: "P", purchase: "$", stay_free: "f",
  scan_result: "s", scan_notfound: "x", scan_network: "n", glucose_logged: "g", plate_result: "p", ask_used: "a", ideas_used: "i", report_made: "r",
  family_code: "F", family_linked: "L", med_added: "m", list_added: "l", notif_perm: "N", pay_prices: "€", pay_fail: "!", basics_pick: "b", basics_guess: "B",
  shop_mode: "S", shop_trip: "t", community_view: "c", community_post: "C", community_comment: "k", data_wiped: "D", push_registered: "u",
};

function pct(a: number, b: number) { return b ? Math.round((100 * a) / b) : 0; }
function bucket(map: Record<string, { n: number; back: number }>, key: string, back: boolean) {
  const m = (map[key] ??= { n: 0, back: 0 }); m.n++; if (back) m.back++;
}

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) return Response.json({ ok: false }, { status: 401 });
  const key = process.env.SUPABASE_SERVICE_KEY; if (!key) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  const days = Math.min(60, Math.max(2, Number(new URL(request.url).searchParams.get("days") ?? 14) || 14));
  const admin = createClient(SB_URL, key, { auth: { persistSession: false } });
  const since = new Date(Date.now() - days * 864e5).toISOString();
  // telefoanele instalate în fereastră (cu cel puțin 24 h de când s-au instalat, ca să putem judeca revenirea)
  const { data: inst, error } = await admin.from("events").select("device, t").eq("name", "app_install").gte("t", since).neq("device", "server-ai").order("t", { ascending: true }).limit(2000);
  if (error) return Response.json({ ok: false, reason: error.message }, { status: 500 });
  const cutoff = Date.now() - 864e5;
  const installs = (inst ?? []).filter((r) => new Date(r.t).getTime() < cutoff) as { device: string; t: string }[];
  const devices = installs.map((r) => r.device);
  if (!devices.length) return Response.json({ ok: true, days, n: 0 });
  // toate evenimentele acestor telefoane (în loturi de 200 de device-uri)
  const all: Ev[] = [];
  for (let i = 0; i < devices.length; i += 200) {
    const { data } = await admin.from("events").select("device, name, props, country, platform, build, source, t").in("device", devices.slice(i, i + 200)).order("t", { ascending: true }).limit(20000);
    for (const e of (data ?? []) as Ev[]) all.push(e);
  }
  const byDev = new Map<string, Ev[]>();
  for (const e of all) { const a = byDev.get(e.device); if (a) a.push(e); else byDev.set(e.device, [e]); }

  const rows: Record<string, unknown>[] = [];
  const agg = {
    n: 0, back: 0,
    byScans: {} as Record<string, { n: number; back: number }>, byNotfound: {} as Record<string, { n: number; back: number }>,
    byWelcome: {} as Record<string, { n: number; back: number }>, byNotif: {} as Record<string, { n: number; back: number }>,
    byCountry: {} as Record<string, { n: number; back: number }>, byPlatform: {} as Record<string, { n: number; back: number }>,
    byBuild: {} as Record<string, { n: number; back: number }>, bySource: {} as Record<string, { n: number; back: number }>,
    byFirstAction: {} as Record<string, { n: number; back: number }>, byLastDay0: {} as Record<string, { n: number; back: number }>,
    byGlucose: {} as Record<string, { n: number; back: number }>, byPlate: {} as Record<string, { n: number; back: number }>, byTrial: {} as Record<string, { n: number; back: number }>,
    byMinutes: {} as Record<string, { n: number; back: number }>, byOpensDay0: {} as Record<string, { n: number; back: number }>,
    byFirstVerdict: {} as Record<string, { n: number; back: number }>,
  };
  for (const ins of installs) {
    const evs = byDev.get(ins.device) ?? []; const t0 = new Date(ins.t).getTime();
    const day0 = evs.filter((e) => new Date(e.t).getTime() < t0 + 864e5 && e.name !== "app_install");
    const later = evs.filter((e) => new Date(e.t).getTime() >= t0 + 864e5);
    const back = later.length > 0;
    const names = day0.map((e) => e.name);
    const count = (n: string) => names.filter((x) => x === n).length;
    const scans = count("scan_result"), notfound = count("scan_notfound");
    const welcome = day0.filter((e) => e.name === "welcome_step").map((e) => String(e.props?.step ?? "")).pop() ?? (names.includes("welcome_done") ? "done" : "-");
    const notif = day0.find((e) => e.name === "notif_perm"); const notifV = notif ? (notif.props?.granted === true ? "yes" : notif.props?.granted === false ? "no" : String(notif.props?.ok ?? "?")) : "not_asked";
    const firstAction = names.find((n) => !["app_open", "welcome_step", "welcome_done", "push_registered", "install_referrer"].includes(n)) ?? "none";
    const lastDay0 = names.filter((n) => n !== "app_open").pop() ?? "none";
    const lastT = day0.length ? new Date(day0[day0.length - 1].t).getTime() : t0;
    const minutes = Math.round((lastT - t0) / 60000);
    const minB = minutes < 2 ? "<2" : minutes < 10 ? "2-10" : minutes < 60 ? "10-60" : minutes < 360 ? "1-6h" : "6-24h";
    const opens = count("app_open");
    const firstScan = day0.find((e) => e.name === "scan_result"); const fv = firstScan ? String(firstScan.props?.level ?? "?") : notfound ? "notfound_first" : "no_scan";
    const meta = evs[0];
    const seq = day0.map((e) => SHORT[e.name] ?? "?").join("");
    agg.n++; if (back) agg.back++;
    bucket(agg.byScans, scans === 0 ? "0" : scans < 3 ? "1-2" : scans < 10 ? "3-9" : "10+", back);
    bucket(agg.byNotfound, scans + notfound === 0 ? "no_scans" : notfound === 0 ? "all_found" : notfound >= scans ? "mostly_notfound" : "some_notfound", back);
    bucket(agg.byWelcome, welcome, back); bucket(agg.byNotif, notifV, back);
    bucket(agg.byCountry, meta?.country ?? "?", back); bucket(agg.byPlatform, meta?.platform ?? "?", back); bucket(agg.byBuild, meta?.build ?? "?", back);
    bucket(agg.bySource, meta?.source ?? "organic", back); bucket(agg.byFirstAction, firstAction, back); bucket(agg.byLastDay0, lastDay0, back);
    bucket(agg.byGlucose, count("glucose_logged") ? "yes" : "no", back); bucket(agg.byPlate, count("plate_result") ? "yes" : "no", back);
    bucket(agg.byTrial, names.includes("trial_start") ? "yes" : "no", back); bucket(agg.byMinutes, minB, back); bucket(agg.byOpensDay0, opens <= 1 ? "1" : opens <= 3 ? "2-3" : "4+", back);
    bucket(agg.byFirstVerdict, fv, back);
    rows.push({ d: ins.device.slice(0, 6), t: ins.t.slice(5, 16), c: meta?.country, p: meta?.platform, b: meta?.build, back, min: minutes, scans, notfound, seq: seq.slice(0, 60) });
  }
  const fmt = (m: Record<string, { n: number; back: number }>) => Object.fromEntries(Object.entries(m).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => [k, `${v.back}/${v.n} (${pct(v.back, v.n)}%)`]));
  const out: Record<string, unknown> = { ok: true, days, installs: agg.n, returned_after_24h: `${agg.back}/${agg.n} (${pct(agg.back, agg.n)}%)` };
  for (const [k, v] of Object.entries(agg)) if (k.startsWith("by")) out[k] = fmt(v as Record<string, { n: number; back: number }>);
  out.legend = SHORT; out.devices = rows;
  return Response.json(out, { headers: { "cache-control": "no-store" } });
}
