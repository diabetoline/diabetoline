/**
 * Alerte în timp real pe telefonul lui Alex (19 nov 2026, Alex: „alerte în timp real pentru instalări noi… să le primesc pe telefon”).
 * Canal: ntfy (aplicația ntfy pe iPhone/Android, abonată la subiectul `NTFY_TOPIC`; fără cont, fără chei). Rezervă: email prin Resend.
 * Ce alertează: app_install (țară, platformă, sursă, a câta de azi), trial_start, purchase, family_linked, feedback_sent.
 * Protecție la volum: după `BURST` instalări într-o zi, instalările se anunță doar din 10 în 10 (restul evenimentelor rămân instant).
 */
import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";
const TOPIC = process.env.NTFY_TOPIC ?? "diabetoline-32adf13ea3a7";
const NTFY = process.env.NTFY_URL ?? "https://ntfy.sh";
const BURST = Number(process.env.ALERT_BURST ?? 30);

const FLAG: Record<string, string> = { RO: "🇷🇴", DE: "🇩🇪", AT: "🇦🇹", CH: "🇨🇭", GB: "🇬🇧", US: "🇺🇸", HU: "🇭🇺", FR: "🇫🇷", IT: "🇮🇹", ES: "🇪🇸", NL: "🇳🇱", BE: "🇧🇪", PL: "🇵🇱", CZ: "🇨🇿", MD: "🇲🇩", DK: "🇩🇰", SE: "🇸🇪", NO: "🇳🇴", FI: "🇫🇮", PT: "🇵🇹", IE: "🇮🇪" };
const flag = (c?: string | null) => (c ? `${FLAG[c] ?? "🌍"} ${c}` : "🌍 ?");
const plat = (p?: string | null) => (p === "ios" ? "iPhone" : p === "android" ? "Android" : p ?? "?");

type Row = { name: string; country: string | null; platform: string | null; source: string | null; props: Record<string, unknown> };

async function push(title: string, message: string, tags: string, priority = 3): Promise<void> {
  try {
    await fetch(`${NTFY}/${TOPIC}`, { method: "POST", headers: { Title: title, Tags: tags, Priority: String(priority), "Content-Type": "text/plain; charset=utf-8" }, body: message });
  } catch { /* alerta nu trebuie să strice evenimentul */ }
}

/** Numărul de instalări de azi (ora României), ca să știm a câta e și dacă am depășit pragul. */
async function installsToday(): Promise<number> {
  const key = process.env.SUPABASE_SERVICE_KEY; if (!key) return 0;
  try {
    const db = createClient(SB_URL, key, { auth: { persistSession: false } });
    const now = new Date(); const ro = new Date(now.getTime() + 2 * 3600e3); // UTC+2 (iarna)
    const start = new Date(Date.UTC(ro.getUTCFullYear(), ro.getUTCMonth(), ro.getUTCDate()) - 2 * 3600e3).toISOString();
    const { count } = await db.from("events").select("id", { count: "exact", head: true }).eq("name", "app_install").gte("t", start);
    return count ?? 0;
  } catch { return 0; }
}

/** Chemată după ce evenimentele au fost scrise; nu aruncă niciodată. */
export async function alertOnEvents(rows: Row[]): Promise<void> {
  const installs = rows.filter((r) => r.name === "app_install");
  const others = rows.filter((r) => ["trial_start", "purchase", "family_linked", "feedback_sent"].includes(r.name));
  if (installs.length) {
    const n = await installsToday(); // include și cele tocmai scrise
    const src = installs[0].source && installs[0].source !== "organic" ? ` · din ${installs[0].source}` : "";
    if (n <= BURST) {
      await push(`Instalare nouă · a ${n}-a azi`, `${flag(installs[0].country)} · ${plat(installs[0].platform)}${src}`, "inbox_tray", 3);
    } else if (n % 10 === 0) {
      await push(`${n} instalări azi`, `ultima: ${flag(installs[0].country)} · ${plat(installs[0].platform)}${src}`, "chart_with_upwards_trend", 3);
    }
  }
  for (const r of others) {
    if (r.name === "purchase") await push("💰 Abonament nou!", `${flag(r.country)} · ${plat(r.platform)} · ${String(r.props.plan ?? "")}`, "moneybag", 4);
    else if (r.name === "trial_start") await push("Probă pornită", `${flag(r.country)} · ${plat(r.platform)}`, "hourglass_flowing_sand", 2);
    else if (r.name === "family_linked") await push("Familie legată", `${flag(r.country)} · ${plat(r.platform)}`, "family", 3);
    else if (r.name === "feedback_sent") await push("Sugestie nouă în aplicație", `${flag(r.country)} — vezi Supabase → feedback`, "speech_balloon", 3);
  }
}

/** Notificare de test (ruta /api/ping). */
export async function testPush(): Promise<boolean> {
  try {
    const r = await fetch(`${NTFY}/${TOPIC}`, { method: "POST", headers: { Title: "Diabetoline · test", Tags: "white_check_mark", "Content-Type": "text/plain; charset=utf-8" }, body: "Alertele merg. De acum primești aici instalările, probele și plățile." });
    return r.ok;
  } catch { return false; }
}

/** Raportare în comunitate (22 nov 2026): Alex află imediat și vede coada la /api/moderate. */
export async function notifyModeration(commentId: number, excerpt: string): Promise<void> {
  await push("Comentariu raportat", `${excerpt.slice(0, 140)}\n→ verifică în pagina de moderare (#${commentId})`, "warning", 4);
}
