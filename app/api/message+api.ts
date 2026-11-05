/**
 * POST /api/message — după ce expeditorul a scris mesajul în tabelul `messages` (cu RLS), serverul trimite push destinatarului.
 * Primește { token: <jwt Supabase>, linkId, body, from: <numele expeditorului> }.
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";
const TITLE: Record<string, (n: string) => string> = { ro: (n) => `Mesaj de la ${n}`, en: (n) => `Message from ${n}`, de: (n) => `Nachricht von ${n}` };

export async function POST(request: Request): Promise<Response> {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  let b: { token?: string; linkId?: string; body?: string; from?: string };
  try { b = await request.json(); } catch { return Response.json({ ok: false, reason: "bad_request" }, { status: 400 }); }
  if (!b.token || !b.linkId || !b.body) return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });

  const admin = createClient(URL, key, { auth: { persistSession: false } });
  const { data: u, error: ue } = await admin.auth.getUser(b.token);
  if (ue || !u.user) return Response.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  const { data: l } = await admin.from("links").select("parent_id, child_id, child_push_token, child_lang, parent_push_token, parent_lang, parent_name, child_name").eq("id", b.linkId).eq("status", "active").single();
  if (!l) return Response.json({ ok: false, reason: "no_link" }, { status: 404 });
  const isParent = l.parent_id === u.user.id, isChild = l.child_id === u.user.id;
  if (!isParent && !isChild) return Response.json({ ok: false, reason: "unauthorized" }, { status: 401 });

  const to = isParent ? l.child_push_token : l.parent_push_token;
  const lang = (isParent ? l.child_lang : l.parent_lang) ?? "ro";
  const from = (b.from || (isParent ? l.parent_name : l.child_name) || "Diabetoline").slice(0, 40);
  if (!to) return Response.json({ ok: true, sent: 0 });
  const msg = { to, sound: "default", title: (TITLE[lang] ?? TITLE.en)(from), body: b.body.slice(0, 200), data: { kind: "message", linkId: b.linkId } };
  const r = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify([msg]) });
  return Response.json({ ok: r.ok, sent: 1 });
}
