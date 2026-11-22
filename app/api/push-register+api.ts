/**
 * POST /api/push-register — tokenul de push al telefonului, anonim (22 nov 2026, pentru ofertele comerciale).
 * Corp: { device, token, lang, country, platform, offers }. Scris cu service_role în `push_tokens` (migrarea 0011).
 */
import { createClient } from "@supabase/supabase-js";
const URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";
export async function POST(request: Request): Promise<Response> {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  let b: { device?: string; token?: string; lang?: string; country?: string; platform?: string; offers?: boolean };
  try { b = await request.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  const device = typeof b.device === "string" ? b.device.slice(0, 64) : "";
  const token = typeof b.token === "string" ? b.token.slice(0, 200) : "";
  if (device.length < 8 || !/^Expo(nent)?PushToken\[/.test(token)) return Response.json({ ok: false }, { status: 400 });
  const db = createClient(URL, key, { auth: { persistSession: false } });
  const { error } = await db.from("push_tokens").upsert({ device, token, lang: String(b.lang ?? "").slice(0, 5) || null, country: String(b.country ?? "").slice(0, 2) || null, platform: String(b.platform ?? "").slice(0, 10) || null, offers: b.offers !== false, updated_at: new Date().toISOString() });
  if (error) return Response.json({ ok: false, reason: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
