import { test } from "node:test";
import assert from "node:assert/strict";
import { markShown, pickReco, snooze } from "../recommend.ts";

const DAY = 864e5; const now = 1_800_000_000_000;
test("Curalin la glicemie mare, apoi pauză 4 zile", () => {
  const r = pickReco("glucose_high", undefined, now); assert.equal(r?.id, "curalin");
  const rs = markShown(undefined, "curalin", now);
  assert.equal(pickReco("glucose_high", rs, now + DAY), null);
  assert.equal(pickReco("meal_heavy", rs, now + DAY), null);          // același produs, alt loc: tot pauză
  assert.equal(pickReco("glucose_high", rs, now + 5 * DAY)?.id, "curalin");
});
test("Nu acum → 14 zile fără", () => {
  const rs = snooze(undefined, "cream", 14, now);
  assert.equal(pickReco("home", rs, now + 13 * DAY), null);
  assert.equal(pickReco("home", rs, now + 15 * DAY)?.id, "cream");
});
test("pastele doar la idei", () => { assert.equal(pickReco("ideas", undefined, now)?.id, "pasta"); assert.equal(pickReco("home", undefined, now)?.id, "cream"); });
