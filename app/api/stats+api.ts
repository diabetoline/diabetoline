/**
 * GET /api/stats?token=…&days=30 — rezumatul evenimentelor pentru tabloul de bord (funcția SQL `app_stats`, migrarea 0009).
 * Protejat cu `STATS_TOKEN` (variabilă secretă EAS); fără ea ruta e închisă.
 */
import { createClient } from "@supabase/supabase-js";
// NU numi constanta `URL`: ascunde constructorul global și `new URL(...)` crapă pe server („t is not a constructor”, 16 nov 2026)
const SB_URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";

export async function statsFor(days: number): Promise<Record<string, unknown> | null> {
  const key = process.env.SUPABASE_SERVICE_KEY; if (!key) return null;
  const admin = createClient(SB_URL, key, { auth: { persistSession: false } });
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const { data, error } = await admin.rpc("app_stats", { p_since: since });
  if (error) return { error: error.message };
  return data as Record<string, unknown>;
}

export function authorized(request: Request): boolean {
  const want = process.env.STATS_TOKEN; if (!want) return false;
  const u = new URL(request.url);
  const got = u.searchParams.get("token") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return !!got && got === want;
}

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) return Response.json({ ok: false }, { status: 401 });
  const days = Math.min(365, Math.max(1, Number(new URL(request.url).searchParams.get("days") ?? 30) || 30));
  const data = await statsFor(days);
  if (!data) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  return Response.json({ ok: true, days, ...data }, { headers: { "cache-control": "no-store" } });
}
