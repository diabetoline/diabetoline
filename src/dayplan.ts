import { dayKeyLocal, gluClass } from "./engine/days";
import type { State } from "./store";

/** Pașii zilei, aceiași în antet (inelul), în lista „Azi” și în rezumatul de seară — o singură sursă de adevăr. */
export interface DayStep { key: "glu" | "meal" | "move" | "meds"; ok: boolean }
export function dayProgress(s: State, when = Date.now()) {
  const day = dayKeyLocal(when);
  const glu = s.glucose.filter((g) => dayKeyLocal(g.t) === day).sort((a, b) => a.t - b.t);
  const meals = s.meals.filter((m) => dayKeyLocal(m.t) === day);
  const walkMin = (s.walks ?? []).filter((w) => dayKeyLocal(w.t) === day).reduce((a, w) => a + w.min, 0);
  const nowHM = new Date(when).toTimeString().slice(0, 5);
  const medsDue = s.meds.flatMap((m) => m.times.filter((time) => time <= nowHM).map((time) => ({ m, time })));
  const medsTaken = medsDue.filter(({ m, time }) => s.medLog.some((l) => l.medId === m.id && l.time === time && l.day === day)).length;
  const medsTotal = s.meds.reduce((a, m) => a + m.times.length, 0);
  const steps: DayStep[] = [
    { key: "glu", ok: glu.length > 0 },
    { key: "meal", ok: meals.length > 0 },
    { key: "move", ok: walkMin > 0 },
    ...(s.meds.length ? [{ key: "meds" as const, ok: medsDue.length > 0 && medsTaken === medsDue.length }] : []),
  ];
  const gluOut = glu.some((g) => gluClass(g.v, g.ctx) !== "ok");
  const anyOut = gluOut || meals.some((m) => m.level === "red" && walkMin === 0);
  return { day, glu, meals, walkMin, medsDue, medsTaken, medsTotal, steps, done: steps.filter((x) => x.ok).length, gluOut, anyOut, nothing: glu.length === 0 && meals.length === 0 && walkMin === 0 };
}
