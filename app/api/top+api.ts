/**
 * Topul săptămânii (comunitate, treapta 1): cele mai scanate produse din țara telefonului în ultimele 7 zile,
 * verzi („cele mai căutate”) și roșii („capcanele săptămânii”), din evenimentele scan_result (props.code/name/level).
 * GET /api/top?country=RO → { ok, green: [{code,name,n}], red: [...] }. Răspuns pus în cache 1 oră.
 */
import { createClient } from "@supabase/supabase-js";
const SB_URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";

export async function GET(request: Request): Promise<Response> {
  const u = new URL(request.url);
  const country = (u.searchParams.get("country") ?? "").toUpperCase().slice(0, 2);
  const key = process.env.SUPABASE_SERVICE_KEY; if (!key) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  const db = createClient(SB_URL, key, { auth: { persistSession: false } });
  let q = db.from("events").select("device, props, country").eq("name", "scan_result").gte("t", new Date(Date.now() - 7 * 864e5).toISOString()).limit(20000);
  if (country) q = q.eq("country", country);
  const { data } = await q;
  const rows = (data ?? []) as { device: string; props: { code?: string; name?: string; level?: string } }[];
  // numărăm telefoane distincte pe produs (nu scanări), ca o persoană care scanează de 10 ori să conteze o dată
  const acc: Record<string, { name: string; level: string; devices: Set<string> }> = {};
  for (const r of rows) {
    const code = r.props?.code; const level = r.props?.level; if (!code || !level || code.startsWith("basic:")) continue;
    const a = acc[code] ?? (acc[code] = { name: r.props?.name ?? "", level, devices: new Set() });
    a.devices.add(r.device); if (!a.name && r.props?.name) a.name = r.props.name;
  }
  const list = Object.entries(acc).map(([code, a]) => ({ code, name: a.name || code, level: a.level, n: a.devices.size })).filter((x) => x.n >= 2);
  const pick = (level: string) => list.filter((x) => x.level === level).sort((a, b) => b.n - a.n).slice(0, 10);
  return Response.json({ ok: true, country: country || "*", green: pick("green"), red: pick("red") }, { headers: { "cache-control": "public, max-age=3600" } });
}
