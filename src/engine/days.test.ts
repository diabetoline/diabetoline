import { test } from "node:test";
import assert from "node:assert/strict";
import { dayKeyLocal, dayStatuses } from "./days.ts";

const day = new Date(2026, 10, 2, 13, 0).getTime();
const k = dayKeyLocal(day);

test("zi bună: glicemii în interval, fără mese grele", () => {
  assert.equal(dayStatuses([{ v: 110, ctx: "fasting", t: day }], [{ level: "green", t: day }], []).get(k), "good");
});
test("masă grea fără plimbare → mai puțin bună", () => {
  assert.equal(dayStatuses([], [{ level: "red", t: day }], []).get(k), "less");
});
test("masă grea urmată de plimbare → bună", () => {
  assert.equal(dayStatuses([], [{ level: "red", t: day }], [{ t: day + 1 }]).get(k), "good");
});
test("glicemie mare → mai puțin bună", () => {
  assert.equal(dayStatuses([{ v: 220, ctx: "post2h", t: day }], [], [{ t: day }]).get(k), "less");
});
test("doar o plimbare, nimic notat → fără culoare", () => {
  assert.equal(dayStatuses([], [], [{ t: day }]).get(k), undefined);
});
