/**
 * POST /api/alert — părintele (autentificat anonim la Supabase) raportează o alertă; serverul trimite push copiilor legați.
 * Primește { token: <jwt Supabase>, kind: "high"|"low"|"heavy", text: Record<lang,string> }.
 * Serverul verifică identitatea cu cheia service_role (doar pe server), găsește legăturile active și trimite prin Expo Push.
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";

export async function POST(request: Request): Promise<Response> {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  let b: { token?: string; kind?: string; text?: Record<string, string>; title?: Record<string, string> };
  try { b = await request.json(); } catch { return Response.json({ ok: false, reason: "bad_request" }, { status: 400 }); }
  if (!b.token || !b.text) return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });

  const admin = createClient(URL, key, { auth: { persistSession: false } });
  const { data: u, error: ue } = await admin.auth.getUser(b.token);
  if (ue || !u.user) return Response.json({ ok: false, reason: "unauthorized" }, { status: 401 });

  const { data: links } = await admin.from("links").select("child_push_token, child_lang, parent_name").eq("parent_id", u.user.id).eq("status", "active");
  const msgs = (links ?? []).filter((l) => l.child_push_token).map((l) => {
    const lang = (l.child_lang as string) in b.text! ? (l.child_lang as string) : "en";
    return { to: l.child_push_token as string, sound: "default", title: b.title?.[lang] ?? "Diabetoline", body: b.text![lang], data: { kind: b.kind ?? "alert" } };
  });
  if (!msgs.length) return Response.json({ ok: true, sent: 0 });
  const r = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(msgs) });
  return Response.json({ ok: r.ok, sent: msgs.length });
}
