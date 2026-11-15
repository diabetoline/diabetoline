import { dayKeyLocal, gluClass } from "./engine/days";
import type { Strings } from "./i18n";
import type { State } from "./store";

/**
 * Rezumatul zilei (Alex, 15 nov 2026): seara, o notificare scurtă, la obiect, pe ton pozitiv — ce a notat omul azi.
 * Fără cifre-țintă, fără sfaturi medicale, fără ceartă: la glicemii în afara intervalului doar „mâine măsoară din nou”.
 * Întoarce null când nu e nimic notat (nu trimitem o notificare goală).
 */
export function daySummary(s: State, t: Strings, when = Date.now()): { title: string; body: string } | null {
  const day = dayKeyLocal(when);
  const glu = s.glucose.filter((g) => dayKeyLocal(g.t) === day);
  const meals = s.meals.filter((m) => dayKeyLocal(m.t) === day);
  const walk = (s.walks ?? []).filter((w) => dayKeyLocal(w.t) === day).reduce((a, w) => a + w.min, 0);
  const medsTotal = s.meds.reduce((a, m) => a + m.times.length, 0);
  const medsTaken = s.medLog.filter((l) => l.day === day).length;
  if (!glu.length && !meals.length && !walk && !medsTaken) return null;

  const parts: string[] = [];
  if (glu.length) {
    const out = glu.filter((g) => gluClass(g.v, g.ctx) !== "ok").length;
    parts.push(out === 0 ? t.sum_glu_ok(glu.length) : t.sum_glu_out(glu.length, out));
  }
  if (meals.length) {
    const red = meals.filter((m) => m.level === "red").length, green = meals.filter((m) => m.level === "green").length;
    parts.push(red === 0 ? t.sum_meals_ok(meals.length, green) : t.sum_meals_heavy(meals.length, red));
  }
  if (walk) parts.push(t.sum_walk(walk));
  if (medsTotal) parts.push(medsTaken >= medsTotal ? t.sum_meds_all : t.sum_meds_some(Math.min(medsTaken, medsTotal), medsTotal));
  const good = (!glu.length || glu.every((g) => gluClass(g.v, g.ctx) === "ok")) && !meals.some((m) => m.level === "red");
  return { title: good ? t.sum_title_good : t.sum_title, body: parts.join(" ") + " " + (good ? t.sum_close_good : t.sum_close) };
}
