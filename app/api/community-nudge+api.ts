/**
 * Push-ul de comunitate (23 nov 2026, Alex: „ar trebui să dăm push notifications să îi încurajăm să posteze”).
 * POST /api/community-nudge — rulat zilnic din `community.yml` (16:00 RO). Reguli, ca să nu enerveze:
 *  - cel mult UN push de comunitate la 7 zile per telefon (ținut ca eveniment `community_nudge` în `events`, fără tabel nou);
 *  - nimic celor care au postat sau răspuns în ultimele 7 zile (ei sunt deja activi);
 *  - nimic în ziua în care telefonul a primit deja o ofertă comercială;
 *  - textul pornește de la ultima postare din țara omului („Maria: «…» — tu ce ai găsit azi?”); fără postări → încurajare generală;
 *  - apăsarea deschide fila Comunitate (`kind: community_feed`).
 * GET → câți ar primi și 3 exemple de text, fără să trimită.
 */
import { admin } from "./community+api";

const T: Record<string, { title: string; withPost: (n: string, q: string) => string; generic: string[] }> = {
  ro: { title: "Comunitatea Diabetoline", withPost: (n, q) => `${n}: „${q}” — tu ce ai găsit azi?`, generic: ["Ce ai găsit bun la raft săptămâna asta? Spune-le și celorlalți 😊", "Ce ai mâncat azi? O poză la farfurie îi ajută pe alții să aleagă.", "Oamenii din comunitate așteaptă și părerea ta: scanează un produs și spune ce ai găsit."] },
  en: { title: "Diabetoline community", withPost: (n, q) => `${n}: “${q}” — what did you find today?`, generic: ["Found something good on the shelf this week? Tell the others 😊", "What did you eat today? A photo of your plate helps others choose.", "The community would like your take too: scan a product and tell us what you found."] },
  de: { title: "Diabetoline-Community", withPost: (n, q) => `${n}: „${q}“ – was hast du heute gefunden?`, generic: ["Diese Woche etwas Gutes im Regal gefunden? Erzähl es den anderen 😊", "Was hast du heute gegessen? Ein Tellerfoto hilft anderen bei der Wahl.", "Die Community möchte auch deine Meinung: scanne ein Produkt und erzähl, was du gefunden hast."] },
};
const WEEK = 7 * 864e5;

async function run(dry: boolean) {
  const db = admin(); if (!db) return { ok: false, reason: "not_configured" };
  const since = new Date(Date.now() - WEEK).toISOString(); const today = new Date(Date.now() - 864e5).toISOString();
  const [{ data: toks }, { data: recentNudge }, { data: posters }, { data: commenters }, { data: offered }] = await Promise.all([
    db.from("push_tokens").select("device, token, lang, country").limit(5000),
    db.from("events").select("device").eq("name", "community_nudge").gte("t", since).limit(20000),
    db.from("community_posts").select("device").gte("t", since).limit(5000),
    db.from("product_comments").select("device").gte("t", since).limit(5000),
    db.from("offer_sends").select("device").gte("t", today).limit(20000),
  ]);
  const skip = new Set<string>();
  for (const rows of [recentNudge, posters, commenters, offered]) for (const r of (rows ?? []) as { device: string }[]) skip.add(r.device);
  const targets = ((toks ?? []) as { device: string; token: string; lang: string | null; country: string | null }[]).filter((r) => r.token && !skip.has(r.device));
  if (!targets.length) return { ok: true, sent: 0, candidates: 0 };
  // ultima postare pe țară (pentru text)
  const countries = [...new Set(targets.map((r) => (r.country ?? "").toUpperCase()).filter(Boolean))];
  const lastPost: Record<string, { name: string; text: string }> = {};
  for (const c of countries) {
    const { data } = await db.from("community_posts").select("name, text").eq("hidden", false).eq("country", c).gte("t", since).order("t", { ascending: false }).limit(1).maybeSingle();
    if (data) lastPost[c] = data as { name: string; text: string };
  }
  const week = Math.floor(Date.now() / WEEK);
  const msgs = targets.map((r) => {
    const l = (r.lang ?? "ro").slice(0, 2); const tx = T[l] ?? T.ro; const lp = lastPost[(r.country ?? "").toUpperCase()];
    const body = lp ? tx.withPost(lp.name, lp.text.length > 70 ? lp.text.slice(0, 67).trim() + "…" : lp.text) : tx.generic[week % tx.generic.length];
    return { to: r.token, title: tx.title, body, sound: "default", channelId: "reminders", data: { kind: "community_feed" } };
  });
  if (dry) return { ok: true, sent: 0, candidates: targets.length, sample: msgs.slice(0, 3).map((m) => m.body) };
  let sent = 0; const errors: string[] = [];
  for (let i = 0; i < msgs.length; i += 100) {
    const chunk = msgs.slice(i, i + 100); const devs = targets.slice(i, i + 100);
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(chunk) });
      const j = (await res.json().catch(() => ({}))) as { data?: { status: string; message?: string }[] };
      const ok = devs.filter((_, k) => j.data?.[k]?.status === "ok"); sent += ok.length;
      for (const [k, d] of (j.data ?? []).entries()) if (d.status !== "ok" && errors.length < 10) errors.push(`${devs[k].device}: ${d.message ?? d.status}`);
      if (ok.length) await db.from("events").insert(ok.map((r) => ({ device: r.device, name: "community_nudge", props: { lang: r.lang, country: r.country } })));
    } catch (e) { errors.push(String((e as Error)?.message ?? e)); }
  }
  return { ok: true, sent, candidates: targets.length, errors };
}

export async function POST(): Promise<Response> { return Response.json(await run(false)); }
export async function GET(): Promise<Response> { return Response.json(await run(true)); }
