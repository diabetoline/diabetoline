/**
 * Datele raportului pentru medic, pe ultimele N zile. Calcul pur, fără UI, ca să fie testabil.
 * Nu interpretăm nimic medical: doar cifre, medii și numărători.
 */
import { dayKeyLocal, dayStatuses, gluClass } from "./days";

type Glu = { v: number; ctx: string; t: number; note?: string };
type Meal = { level?: "green" | "yellow" | "red"; t: number; name?: string; slot: string; carbs?: number };
type Walk = { t: number; min: number };
type Weight = { t: number; kg: number };
type Med = { id: string; name: string; times: string[] };
type MedLog = { medId: string; time: string; day: string };

export interface ReportData {
  from: number; to: number; days: number;
  glucose: { count: number; avg: number | null; min: number | null; max: number | null; inRange: number | null; low: number; high: number;
    byCtx: { ctx: string; count: number; avg: number }[]; entries: Glu[] };
  meals: { count: number; green: number; yellow: number; red: number; avgCarbs: number | null };
  walks: { count: number; minutes: number; days: number };
  weight: { first: number; last: number; change: number } | null;
  meds: { name: string; expected: number; taken: number; pct: number }[];
  goodDays: number; lessDays: number;
  /** din zilele cu masă grea, câte au avut și plimbare (procent); null dacă nu au fost mese grele */
  walkDaysPct: number | null;
  /** o linie pe zi cu date, cea mai recentă prima */
  byDay: { day: string; t: number; gluAvg: number | null; gluCount: number; green: number; yellow: number; red: number; walkMin: number; status: "good" | "less" | null }[];
}

export function buildReport(input: { glucose: Glu[]; meals: Meal[]; walks: Walk[]; meds: Med[]; medLog: MedLog[]; weights?: Weight[] }, days = 30, now = Date.now()): ReportData {
  const from = now - days * 864e5;
  const g = input.glucose.filter((x) => x.t >= from && x.t <= now).sort((a, b) => a.t - b.t);
  const m = input.meals.filter((x) => x.t >= from && x.t <= now);
  const w = input.walks.filter((x) => x.t >= from && x.t <= now);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

  const cls = g.map((x) => gluClass(x.v, x.ctx));
  const ctxs = [...new Set(g.map((x) => x.ctx))];
  const byCtx = ctxs.map((ctx) => { const xs = g.filter((x) => x.ctx === ctx).map((x) => x.v); return { ctx, count: xs.length, avg: avg(xs) ?? 0 }; });

  // aderență: câte prize erau de luat în perioadă (de la adăugarea medicamentului, aproximat prin primele log-uri sau toată perioada)
  const dayKeys: string[] = [];
  for (let d = 0; d < days; d++) dayKeys.push(dayKeyLocal(from + (d + 1) * 864e5));
  const meds = input.meds.map((med) => {
    const expected = med.times.length * days;
    const taken = input.medLog.filter((l) => l.medId === med.id && dayKeys.includes(l.day)).length;
    return { name: med.name, expected, taken, pct: expected ? Math.min(100, Math.round((100 * taken) / expected)) : 0 };
  });

  const statuses = dayStatuses(g, m, w);
  let goodDays = 0, lessDays = 0;
  for (const st of statuses.values()) st === "good" ? goodDays++ : lessDays++;
  const carbsKnown = m.filter((x) => typeof x.carbs === "number").map((x) => x.carbs as number);

  const byDay = dayKeys.map((day, i) => {
    const gs = g.filter((x) => dayKeyLocal(x.t) === day), ms = m.filter((x) => dayKeyLocal(x.t) === day), ws = w.filter((x) => dayKeyLocal(x.t) === day);
    return { day, t: from + (i + 1) * 864e5, gluAvg: avg(gs.map((x) => x.v)), gluCount: gs.length,
      green: ms.filter((x) => x.level === "green").length, yellow: ms.filter((x) => x.level === "yellow").length, red: ms.filter((x) => x.level === "red").length,
      walkMin: ws.reduce((a, x) => a + x.min, 0), status: statuses.get(day) ?? null };
  }).filter((d) => d.gluCount || d.green || d.yellow || d.red || d.walkMin).reverse();

  return {
    from, to: now, days,
    glucose: {
      count: g.length, avg: avg(g.map((x) => x.v)),
      min: g.length ? Math.min(...g.map((x) => x.v)) : null, max: g.length ? Math.max(...g.map((x) => x.v)) : null,
      inRange: g.length ? Math.round((100 * cls.filter((c) => c === "ok").length) / g.length) : null,
      low: cls.filter((c) => c === "low").length, high: cls.filter((c) => c === "high").length,
      byCtx, entries: g,
    },
    meals: { count: m.length, green: m.filter((x) => x.level === "green").length, yellow: m.filter((x) => x.level === "yellow").length, red: m.filter((x) => x.level === "red").length, avgCarbs: avg(carbsKnown) },
    walks: { count: w.length, minutes: w.reduce((a, x) => a + x.min, 0), days: new Set(w.map((x) => dayKeyLocal(x.t))).size },
    weight: (() => { const ws = (input.weights ?? []).filter((x) => x.t >= from - 7 * 864e5 && x.t <= now).sort((a, b) => a.t - b.t); if (ws.length < 1) return null; const first = ws[0].kg, last = ws[ws.length - 1].kg; return { first, last, change: Math.round((last - first) * 10) / 10 }; })(),
    meds, goodDays, lessDays, byDay,
    walkDaysPct: (() => { const heavy = byDay.filter((d) => d.red > 0); return heavy.length ? Math.round((100 * heavy.filter((d) => d.walkMin > 0).length) / heavy.length) : null; })(),
  };
}
