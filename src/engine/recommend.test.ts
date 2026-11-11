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

test("pe țară: linkul și partenerii se aleg după regiune", async () => {
  const { LINKS, PARTNERS } = await import("../partners.ts");
  LINKS.US = { curalin: { url: "https://example.com/us" } };
  PARTNERS.DE = [{ id: "p-brot", placement: "ideas", name: "Brot", url: "https://example.com/brot", everyDays: 3, text: { ro: "r", en: "e", de: "d" } }];
  assert.equal(pickReco("glucose_high", undefined, now, "US")?.url, "https://example.com/us");
  assert.equal(pickReco("glucose_high", undefined, now, "RO")?.url.includes("diabetoline.com"), true);
  assert.equal(pickReco("ideas", undefined, now, "DE")?.id, "p-brot");            // partenerul țării are prioritate
  assert.equal(pickReco("ideas", undefined, now, "AT")?.id, "pasta");             // fără partener în AT → produsul nostru
  assert.equal(pickReco("ideas", markShown(undefined, "p-brot", now), now, "DE")?.id, "pasta"); // după partener, pasta
  delete LINKS.US; delete PARTNERS.DE;
});
