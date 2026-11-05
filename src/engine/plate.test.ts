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

test("o lingură de dulceață: roșu, chiar dacă are puțini carbohidrați", () => {
  const v = mealVerdict([{ name: "dulceață de smochine", grams: 30, carbs: 19, gi: 55, sweet: true }]);
  assert.equal(v.level, "red");
});
test("un gust de dulce (sub o porție): galben, nu verde", () => {
  assert.equal(mealVerdict([{ name: "o bucățică de ciocolată", grams: 10, carbs: 6, gi: 45, sweet: true }]).level, "yellow");
});
test("cotlet pane prăjit, fără legume: cu măsură", () => {
  const v = mealVerdict([{ name: "cotlet pane prăjit", grams: 230, carbs: 22, gi: 55, fried: true, refined: true }]);
  assert.equal(v.level, "yellow");
});
test("cotlet pane cu salată mare lângă: tot cu măsură din cauza modelului", () => {
  const foods = [{ name: "cotlet pane", grams: 150, carbs: 15, gi: 55, fried: true, refined: true }, { name: "salată", grams: 150, carbs: 4, gi: 15, veg: true }];
  assert.equal(mealVerdict(foods).level, "green");
  assert.equal(mealVerdict(foods, "yellow").level, "yellow");
});
test("porție mare fără legume: cu măsură", () => {
  assert.equal(mealVerdict([{ name: "friptură", grams: 450, carbs: 0, gi: null }]).level, "yellow");
});
test("verdictul modelului nu poate face o masă grea verde", () => {
  assert.equal(mealVerdict([{ name: "paste", grams: 250, carbs: 75, gi: 55 }], "green").level, "red");
});

test("o bere (330 ml): cu măsură, nu potrivită", () => {
  assert.equal(mealVerdict([{ name: "bere blondă", grams: 330, carbs: 11, gi: 66, alcohol: true }]).level, "yellow");
});
test("o bere mare (500 ml) sau un cocktail dulce: roșu", () => {
  assert.equal(mealVerdict([{ name: "bere", grams: 500, carbs: 16, gi: 66, alcohol: true }]).level, "red");
  assert.equal(mealVerdict([{ name: "cocktail", grams: 200, carbs: 20, gi: 65, alcohol: true, sweet: true }]).level, "red");
});
test("un pahar de vin sec lângă o masă bună: cu măsură", () => {
  const foods = [{ name: "pește la grătar", grams: 150, carbs: 0, gi: null }, { name: "salată", grams: 120, carbs: 4, gi: 15, veg: true }, { name: "vin sec", grams: 150, carbs: 1, gi: null, alcohol: true }];
  assert.equal(mealVerdict(foods).level, "yellow");
});
