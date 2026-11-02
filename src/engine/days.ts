/**
 * Calendarul zilelor: o zi e „bună” când glicemiile notate sunt în interval
 * și fiecare masă grea a fost urmată de o plimbare. Altfel e „mai puțin bună”.
 * Zilele fără nimic notat nu primesc culoare.
 */
export type DayStatus = "good" | "less";
type Glu = { v: number; ctx: string; t: number };
type Meal = { level?: "green" | "yellow" | "red"; t: number };
type Walk = { t: number };

export const dayKeyLocal = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export const gluClass = (v: number, ctx: string) => (v < 70 ? "low" : (ctx === "fasting" && v > 130) || v > 180 ? "high" : "ok");

export function dayStatuses(glucose: Glu[], meals: Meal[], walks: Walk[]): Map<string, DayStatus> {
  const by = new Map<string, { out: number; heavy: number; walks: number; any: boolean }>();
  const get = (t: number) => { const k = dayKeyLocal(t); let d = by.get(k); if (!d) { d = { out: 0, heavy: 0, walks: 0, any: false }; by.set(k, d); } return d; };
  for (const g of glucose) { const d = get(g.t); d.any = true; if (gluClass(g.v, g.ctx) !== "ok") d.out++; }
  for (const m of meals) { const d = get(m.t); d.any = true; if (m.level === "red") d.heavy++; }
  for (const w of walks) { const d = get(w.t); d.walks++; }
  const out = new Map<string, DayStatus>();
  for (const [k, d] of by) if (d.any) out.set(k, d.out > 0 || d.heavy > d.walks ? "less" : "good");
  return out;
}
