import { test } from "node:test";
import assert from "node:assert/strict";
import { mealVerdict } from "./plate.ts";

test("salată cu pui: potrivită", () => {
  const v = mealVerdict([{ name: "piept de pui", grams: 150, carbs: 0, gi: null }, { name: "salată verde", grams: 100, carbs: 3, gi: 15 }]);
  assert.equal(v.level, "green"); assert.equal(v.carbs, 3);
});
test("paste cu sos: grea", () => {
  const v = mealVerdict([{ name: "paste", grams: 250, carbs: 75, gi: 55 }, { name: "sos de roșii", grams: 100, carbs: 8, gi: 30 }]);
  assert.equal(v.level, "red"); assert.equal(v.gl, 44);
});
test("cartofi și friptură: cu măsură", () => {
  const v = mealVerdict([{ name: "cartofi la cuptor", grams: 120, carbs: 22, gi: 78 }, { name: "friptură", grams: 150, carbs: 0, gi: null }]);
  assert.equal(v.level, "yellow");
});
test("carbohidrați negativi ignorați", () => {
  assert.equal(mealVerdict([{ name: "x", grams: 10, carbs: -5, gi: 50 }]).carbs, 0);
});
