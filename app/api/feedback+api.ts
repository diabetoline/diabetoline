/** POST /api/feedback — { body, lang, role, build }: salvează sugestia în tabelul `feedback` (fără cont, fără date personale). */
import { createClient } from "@supabase/supabase-js";
const URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";
export async function POST(request: Request): Promise<Response> {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  let b: { body?: string; lang?: string; role?: string; build?: string };
  try { b = await request.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  const body = (b.body ?? "").trim().slice(0, 1000);
  if (body.length < 3) return Response.json({ ok: false }, { status: 400 });
  const admin = createClient(URL, key, { auth: { persistSession: false } });
  const lang = (b.lang ?? "").slice(0, 5), role = (b.role ?? "").slice(0, 10), build = (b.build ?? "").slice(0, 20);
  const { error } = await admin.from("feedback").insert({ body, lang, role, build });
  // email imediat către Alex (Resend), dacă e configurat; eșecul emailului nu strică salvarea
  const rk = process.env.RESEND_API_KEY, to = process.env.FEEDBACK_TO;
  if (rk && to) {
    const esc = (x: string) => x.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
    try {
      await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${rk}`, "content-type": "application/json" }, body: JSON.stringify({
        from: process.env.FEEDBACK_FROM ?? "Diabetoline <onboarding@resend.dev>", to: [to], subject: `Sugestie din aplicație (${lang || "?"}, ${role || "?"})`,
        html: `<p style="font-size:17px;white-space:pre-wrap">${esc(body)}</p><p style="color:#666">limbă ${esc(lang)} · rol ${esc(role)} · build ${esc(build)} · ${new Date().toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}</p>`,
      }) });
    } catch {}
  }
  return Response.json({ ok: !error });
}
