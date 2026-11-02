import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReport } from "./report.ts";
import { dayKeyLocal } from "./days.ts";

const now = new Date(2026, 10, 2, 12, 0).getTime();
const d = (daysAgo: number, h = 8) => { const x = new Date(now); x.setDate(x.getDate() - daysAgo); x.setHours(h, 0, 0, 0); return x.getTime(); };

test("medii, interval și numărători pe 30 de zile", () => {
  const r = buildReport({
    glucose: [{ v: 100, ctx: "fasting", t: d(1) }, { v: 200, ctx: "post2h", t: d(2) }, { v: 60, ctx: "other", t: d(3) }, { v: 120, ctx: "fasting", t: d(40) }],
    meals: [{ level: "red", t: d(2), slot: "lunch", carbs: 80 }, { level: "green", t: d(1), slot: "dinner", carbs: 20 }],
    walks: [{ t: d(2), min: 20 }],
    meds: [{ id: "m", name: "Metformin", times: ["08:00", "20:00"] }],
    medLog: [{ medId: "m", time: "08:00", day: dayKeyLocal(d(1)) }, { medId: "m", time: "20:00", day: dayKeyLocal(d(1)) }, { medId: "m", time: "08:00", day: dayKeyLocal(d(45)) }],
  }, 30, now);
  assert.equal(r.glucose.count, 3);               // cea de acum 40 de zile e în afara perioadei
  assert.equal(r.glucose.avg, 120);
  assert.equal(r.glucose.inRange, 33);
  assert.equal(r.glucose.low, 1); assert.equal(r.glucose.high, 1);
  assert.equal(r.meals.red, 1); assert.equal(r.meals.avgCarbs, 50);
  assert.equal(r.walks.minutes, 20);
  assert.deepEqual(r.meds[0], { name: "Metformin", expected: 60, taken: 2, pct: 3 });
  assert.equal(r.goodDays + r.lessDays, 3);
  assert.equal(r.byDay.length, 3);
  const two = r.byDay.find((x) => x.red === 1)!;
  assert.equal(two.walkMin, 20); assert.equal(two.status, "less"); // glicemie 200 în ziua aceea
});
test("fără date → valori nule, nu erori", () => {
  const r = buildReport({ glucose: [], meals: [], walks: [], meds: [], medLog: [] }, 30, now);
  assert.equal(r.glucose.avg, null); assert.equal(r.glucose.inRange, null); assert.equal(r.meals.avgCarbs, null);
});
