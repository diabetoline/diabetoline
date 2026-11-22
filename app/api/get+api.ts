/**
 * GET /api/get?src=meta — link scurt pentru reclame (22 nov 2026): Meta nu acceptă linkul Play la obiectivul Trafic,
 * așa că reclama trimite aici, iar noi redirecționăm la Google Play cu `referrer=utm_source=<src>` (Play Console arată
 * instalările pe sursă, fără cod în aplicație) și numărăm clickul ca eveniment `ad_click` (device "server-ads").
 */
import { createClient } from "@supabase/supabase-js";
const SB_URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";
const PLAY = "https://play.google.com/store/apps/details?id=com.curalife.diabetoline";
export async function GET(request: Request): Promise<Response> {
  const u = new URL(request.url);
  const src = (u.searchParams.get("src") ?? "link").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 30) || "link";
  const camp = (u.searchParams.get("c") ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
  const ref = encodeURIComponent(`utm_source=${src}&utm_medium=paid${camp ? `&utm_campaign=${camp}` : ""}`);
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (key) {
    try {
      const db = createClient(SB_URL, key, { auth: { persistSession: false } });
      const ua = request.headers.get("user-agent") ?? "";
      await db.from("events").insert({ device: "server-ads", name: "ad_click", props: { src, c: camp, android: /android/i.test(ua) }, platform: "server", country: request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry") ?? null });
    } catch {}
  }
  return Response.redirect(`${PLAY}&referrer=${ref}`, 302);
}
