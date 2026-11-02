import type { State } from "../store";
import type { Strings } from "../i18n";
import { dayKeyLocal, gluClass } from "../engine/days";

const API = process.env.EXPO_PUBLIC_API_URL || "https://curalife.expo.app";

/** Rezumatul jurnalului pe ultimele 7 zile, ca text scurt pentru asistent (fără poze, fără date de identificare). */
export function journalContext(s: State, t: Strings): string {
  const since = Date.now() - 7 * 864e5;
  const u = (v: number) => (s.unit === "mg" ? `${Math.round(v)} mg/dL` : `${(v / 18).toFixed(1)} mmol/L`);
  const when = (x: number) => new Date(x).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
  const lines: string[] = [];
  for (const g of s.glucose.filter((x) => x.t >= since).slice(-20)) lines.push(`glucose ${u(g.v)} (${t.ctx[g.ctx]}, ${gluClass(g.v, g.ctx)}) ${when(g.t)}`);
  for (const m of s.meals.filter((x) => x.t >= since).slice(-15)) lines.push(`meal ${m.name ?? m.slot}${m.level ? ` [${m.level}]` : ""}${m.carbs != null ? ` ${m.carbs} g carbs` : ""} ${when(m.t)}`);
  for (const w of (s.walks ?? []).filter((x) => x.t >= since)) lines.push(`walk ${w.min} min ${when(w.t)}`);
  const today = dayKeyLocal(Date.now());
  for (const med of s.meds) lines.push(`medication "${med.name}" at ${med.times.join(", ")}; taken today: ${med.times.filter((tm) => s.medLog.some((l) => l.medId === med.id && l.time === tm && l.day === today)).join(", ") || "none yet"}`);
  const lw = s.weights?.[s.weights.length - 1]; if (lw) lines.push(`weight ${lw.kg} kg (${new Date(lw.t).toLocaleDateString()})`);
  for (const h of s.history.slice(0, 10)) lines.push(`scanned ${h.name} [${h.level}]`);
  return lines.join("\n");
}

export async function ask(input: { lang: string; question: string; context: string; name?: string }): Promise<{ ok: true; answer: string; emergency: boolean } | { ok: false; error: "not_configured" | "network" }> {
  try {
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 40_000);
    const res = await fetch(`${API}/api/ask`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input), signal: ctrl.signal }).finally(() => clearTimeout(timer));
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; reason?: string; answer?: string; emergency?: boolean };
    if (body.ok && body.answer) return { ok: true, answer: body.answer, emergency: !!body.emergency };
    if (body.reason === "not_configured" || res.status === 404 || res.status === 503) return { ok: false, error: "not_configured" };
    return { ok: false, error: "network" };
  } catch { return { ok: false, error: "network" }; }
}
