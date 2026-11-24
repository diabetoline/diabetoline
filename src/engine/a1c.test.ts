import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateA1c } from "./a1c";
const D = 864e5, now = 100 * D;
test("prea puține date → null", () => { assert.equal(estimateA1c([{ t: now - D, v: 120 }], now), null); });
test("14 zile, 14 măsurători, media 154 → ≈ 7,0 %", () => {
  const g = Array.from({ length: 14 }, (_, i) => ({ t: now - i * D, v: 154 }));
  const r = estimateA1c(g, now)!; assert.ok(r); assert.equal(Math.round(r.a1c * 10) / 10, 7); assert.equal(r.n, 14);
});
test("multe măsurători în 3 zile nu ajung", () => {
  const g = Array.from({ length: 30 }, (_, i) => ({ t: now - (i % 3) * D - i, v: 130 }));
  assert.equal(estimateA1c(g, now), null);
});
