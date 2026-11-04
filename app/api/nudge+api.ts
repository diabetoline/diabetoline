/**
 * POST /api/nudge — rulat o dată pe zi (GitHub Actions). Pentru fiecare legătură activă cu push la copil:
 *  - „quiet”: părintele n-a notat nimic de 3 zile (nici glicemie, nici masă, nici medicament) → copilul dă un telefon
 *  - „noglu”: a folosit aplicația, dar n-a notat glicemia de 2 zile
 * O singură alertă pe legătură la cel mult 3 zile, ca să nu devină sâcâitoare. Fără secret: apelurile repetate nu trimit nimic în plus.
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";
const DAY = 864e5;
const TEXT = {
  quiet: { ro: (n: string) => `${n} nu a mai notat nimic în aplicație de 3 zile. Poate merită un telefon.`, en: (n: string) => `${n} hasn't logged anything in the app for 3 days. Maybe worth a call.`, de: (n: string) => `${n} hat seit 3 Tagen nichts in der App eingetragen. Vielleicht einen Anruf wert.` },
  noglu: { ro: (n: string) => `${n} nu și-a notat glicemia de 2 zile.`, en: (n: string) => `${n} hasn't logged a glucose reading for 2 days.`, de: (n: string) => `${n} hat seit 2 Tagen keinen Blutzucker notiert.` },
};
const TITLE = { ro: "Diabetoline · familie", en: "Diabetoline · family", de: "Diabetoline · Familie" };
const NAME = { ro: "Părintele", en: "Your parent", de: "Dein Elternteil" };

export async function POST(): Promise<Response> {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  const admin = createClient(URL, key, { auth: { persistSession: false } });
  const { data: links, error } = await admin.from("links").select("id, parent_id, parent_name, child_push_token, child_lang, last_nudge").eq("status", "active").not("child_push_token", "is", null);
  if (error) return Response.json({ ok: false, reason: error.message }, { status: 500 });
  const now = Date.now(); const msgs: object[] = []; const updates: { id: string; kind: string }[] = [];
  for (const l of links ?? []) {
    if (l.last_nudge && now - new Date(l.last_nudge as string).getTime() < 3 * DAY) continue;
    const since = new Date(now - 3 * DAY).toISOString();
    const { data: recent } = await admin.from("entries").select("kind, t").eq("user_id", l.parent_id).gte("t", since).neq("kind", "scan");
    const { count: everAny } = await admin.from("entries").select("id", { count: "exact", head: true }).eq("user_id", l.parent_id);
    if (!everAny) continue;                                   // n-a început încă să folosească aplicația: nu alarmăm
    const any = (recent ?? []).length > 0;
    const gluRecent = (recent ?? []).some((e) => e.kind === "glucose" && now - new Date(e.t as string).getTime() < 2 * DAY);
    const kind = !any ? "quiet" : !gluRecent ? "noglu" : null;
    if (!kind) continue;
    const lang = (["ro", "en", "de"].includes(l.child_lang as string) ? l.child_lang : "en") as "ro" | "en" | "de";
    const name = (l.parent_name as string) || NAME[lang];
    msgs.push({ to: l.child_push_token, sound: "default", title: TITLE[lang], body: TEXT[kind][lang](name), data: { kind } });
    updates.push({ id: l.id as string, kind });
  }
  if (msgs.length) {
    const r = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(msgs) });
    if (!r.ok) return Response.json({ ok: false, reason: "push_failed" }, { status: 502 });
    for (const u of updates) await admin.from("links").update({ last_nudge: new Date(now).toISOString(), last_nudge_kind: u.kind }).eq("id", u.id);
  }
  return Response.json({ ok: true, sent: msgs.length, checked: (links ?? []).length });
}
