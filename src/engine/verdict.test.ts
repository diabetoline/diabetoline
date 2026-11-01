import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "./verdict.ts";
import { normalize } from "../api/off.ts";
import { estimateGi } from "./gi.ts";

// Fixtures shaped like real Open Food Facts responses
const nutella = {
  code: "3017624010701", product_name: "Nutella", brands: "Ferrero", quantity: "400 g", serving_quantity: 15,
  nutriments: { carbohydrates_100g: 57.5, sugars_100g: 56.3, fiber_100g: 0, proteins_100g: 6.3 },
  ingredients_text_en: "Sugar, palm oil, hazelnuts 13%, skimmed milk powder 8.7%, fat-reduced cocoa 7.4%, emulsifier: lecithins (soya), vanillin",
  categories_tags: ["en:spreads", "en:sweet-spreads", "en:hazelnut-spreads", "en:chocolate-spreads"], labels_tags: [],
};
const oats = {
  code: "1", product_name: "Rolled oats", quantity: "500 g",
  nutriments: { carbohydrates_100g: 59, sugars_100g: 1, fiber_100g: 10, proteins_100g: 13 },
  ingredients_text_en: "Wholegrain oats 100%",
  categories_tags: ["en:breakfast-cereals", "en:flakes", "en:rolled-oats"], labels_tags: ["en:whole-grain"],
};
const trapBiscuits = {
  code: "2", product_name: "Biscuits no added sugar", quantity: "150 g", serving_quantity: 30,
  nutriments: { carbohydrates_100g: 68, sugars_100g: 4, fiber_100g: 3 },
  ingredients_text_en: "Wheat flour, maltodextrin, vegetable oil, sweetener: maltitol, salt",
  categories_tags: ["en:snacks", "en:biscuits"], labels_tags: ["en:no-added-sugar"],
};
const water = {
  code: "3", product_name: "Still mineral water", quantity: "500 ml",
  nutriments: { carbohydrates_100g: 0, sugars_100g: 0, fiber_100g: 0 },
  ingredients_text_en: "Natural mineral water", categories_tags: ["en:beverages", "en:waters", "en:mineral-waters"], labels_tags: [],
};
const cola = {
  code: "4", product_name: "Cola", quantity: "330 ml", serving_quantity: 330,
  nutriments: { carbohydrates_100g: 10.6, sugars_100g: 10.6, fiber_100g: 0 },
  ingredients_text_en: "Carbonated water, sugar, colour: caramel E150d, phosphoric acid, flavourings, caffeine",
  categories_tags: ["en:beverages", "en:carbonated-drinks", "en:sodas", "en:colas"], labels_tags: [],
};

test("Nutella: tiny serving, but 56% sugar → red by density", () => {
  const v = analyze(normalize(nutella));
  assert.equal(v.level, "red");
  assert.equal(v.serving, 15);
  assert.ok(v.sugars > 8);
  assert.ok(v.reasons.includes("sugar_dense"));
});

test("oats: assumed serving 40 g, fiber bonus, not red", () => {
  const p = normalize(oats);
  const v = analyze(p);
  assert.equal(v.serving, 40);
  assert.equal(v.servingAssumed, true);
  assert.ok(v.reasons.includes("fiber_good"));
  assert.notEqual(v.level, "red");
  assert.equal(p.gi, 55 - 8); // oats 55 minus fiber adjustment
});

test("'no added sugar' biscuits with maltodextrin are a label trap → red", () => {
  const p = normalize(trapBiscuits);
  assert.ok(p.claims.includes("no_added_sugar"));
  const v = analyze(p);
  assert.ok(v.hiddenSugars.includes("maltodextrin"));
  assert.ok(v.hiddenSugars.includes("maltitol"));
  assert.equal(v.labelTrap, true);
  assert.equal(v.level, "red");
});

test("water is green with no GI", () => {
  const p = normalize(water);
  assert.equal(p.unit, "ml");
  assert.equal(p.gi, null);
  const v = analyze(p);
  assert.equal(v.level, "green");
  assert.equal(v.walkMinutes, 0);
});

test("cola: 330 ml serving, red by GL", () => {
  const p = normalize(cola);
  const v = analyze(p);
  assert.equal(v.serving, 330);
  assert.equal(v.level, "red");
  assert.ok(v.gl != null && v.gl >= 20);
  assert.equal(v.walkMinutes, 15);
});

test("GI: specific category beats generic, fiber lowers", () => {
  assert.equal(estimateGi({ categories: ["en:breads", "en:rye-breads"], carbs100: 40, fiber100: 8, sugars100: 2 }).gi, 42);
  assert.equal(estimateGi({ categories: ["en:breads", "en:white-breads"], carbs100: 49, fiber100: 2.5, sugars100: 4 }).gi, 75);
  assert.equal(estimateGi({ categories: [], carbs100: 50, fiber100: 0, sugars100: 50 }).basis, "composition");
});
