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

// ——— Cazuri „capcană” (5 nov 2026, Alex: „aici nu putem greși”) ———
const mk = (o: Record<string, unknown>) => normalize({ code: "t", labels_tags: [], ...o });

test("pâine albă, felie de 30 g declarată: niciodată verde (IG ridicat)", () => {
  const v = analyze(mk({ product_name: "Pâine albă feliată", quantity: "500 g", serving_quantity: 30, nutriments: { carbohydrates_100g: 50, sugars_100g: 2, fiber_100g: 2.5 }, ingredients_text_en: "wheat flour, water, yeast, salt", categories_tags: ["en:breads", "en:white-breads"] }));
  assert.notEqual(v.level, "green");
});
test("pâine albă, 50 g: roșu (IG ridicat + 25 g carbohidrați)", () => {
  const v = analyze(mk({ product_name: "Baghetă", quantity: "250 g", nutriments: { carbohydrates_100g: 52, sugars_100g: 2, fiber_100g: 2 }, ingredients_text_en: "wheat flour, water, yeast, salt", categories_tags: ["en:breads", "en:baguettes"] }));
  assert.equal(v.level, "red");
});
test("pâine integrală cu semințe, 50 g: cu măsură, nu roșu", () => {
  const v = analyze(mk({ product_name: "Pâine integrală cu semințe", quantity: "500 g", serving_quantity: 50, nutriments: { carbohydrates_100g: 41, sugars_100g: 2.5, fiber_100g: 7 }, ingredients_text_en: "wholemeal wheat flour, sunflower seeds, water, yeast, salt", categories_tags: ["en:breads", "en:wholemeal-breads"] }));
  assert.equal(v.level, "yellow");
});
test("bere scanată: niciodată verde; 500 ml → roșu", () => {
  const b330 = mk({ product_name: "Bere blondă", quantity: "330 ml", serving_quantity: 330, nutriments: { carbohydrates_100g: 3.2, sugars_100g: 0, fiber_100g: 0 }, ingredients_text_en: "water, barley malt, hops", categories_tags: ["en:beverages", "en:alcoholic-beverages", "en:beers"] });
  assert.equal(analyze(b330).level, "yellow");
  assert.ok(analyze(b330).reasons.includes("alcohol"));
  const b500 = mk({ product_name: "Bere blondă", quantity: "500 ml", serving_quantity: 500, nutriments: { carbohydrates_100g: 3.2, sugars_100g: 0, fiber_100g: 0 }, ingredients_text_en: "water, barley malt, hops", categories_tags: ["en:beverages", "en:alcoholic-beverages", "en:beers"] });
  assert.equal(analyze(b500).level, "red");
});
test("vin sec, 150 ml: cu măsură; vin dulce → roșu", () => {
  const sec = mk({ product_name: "Vin roșu sec", quantity: "750 ml", serving_quantity: 150, nutriments: { carbohydrates_100g: 0.3, sugars_100g: 0.3, fiber_100g: 0 }, ingredients_text_en: "grapes", categories_tags: ["en:beverages", "en:alcoholic-beverages", "en:wines", "en:red-wines"] });
  assert.equal(analyze(sec).level, "yellow");
  const dulce = mk({ product_name: "Vin dulce", quantity: "750 ml", serving_quantity: 150, nutriments: { carbohydrates_100g: 8, sugars_100g: 8, fiber_100g: 0 }, ingredients_text_en: "grapes", categories_tags: ["en:beverages", "en:alcoholic-beverages", "en:wines"] });
  assert.equal(analyze(dulce).level, "red");
});
test("suc de portocale, porție declarată 100 ml: tot roșu (zahăr lichid)", () => {
  const v = analyze(mk({ product_name: "Suc de portocale 100%", quantity: "1 l", serving_quantity: 100, nutriments: { carbohydrates_100g: 10, sugars_100g: 9, fiber_100g: 0.2 }, ingredients_text_en: "orange juice", categories_tags: ["en:beverages", "en:juices", "en:fruit-juices", "en:orange-juices"] }));
  assert.equal(v.level, "red");
  assert.ok(v.reasons.includes("sugary_drink"));
});
test("lapte simplu (lactoză 4,8): nu e băutură dulce; lapte cu ciocolată → roșu", () => {
  const lapte = mk({ product_name: "Lapte 1,5%", quantity: "1 l", serving_quantity: 200, nutriments: { carbohydrates_100g: 4.8, sugars_100g: 4.8, fiber_100g: 0 }, ingredients_text_en: "milk", categories_tags: ["en:dairies", "en:milks"] });
  assert.notEqual(analyze(lapte).level, "red");
  const cioc = mk({ product_name: "Lapte cu ciocolată", quantity: "500 ml", serving_quantity: 200, nutriments: { carbohydrates_100g: 11, sugars_100g: 10.5, fiber_100g: 0 }, ingredients_text_en: "milk, sugar, cocoa", categories_tags: ["en:dairies", "en:dairy-drinks", "en:chocolate-milks"] });
  assert.equal(analyze(cioc).level, "red");
});
test("ciocolată cu lapte, porție declarată 10 g: porția urcă la cel puțin 15 g → nu verde", () => {
  const v = analyze(mk({ product_name: "Ciocolată cu lapte", quantity: "100 g", serving_quantity: 10, nutriments: { carbohydrates_100g: 58, sugars_100g: 54, fiber_100g: 2 }, ingredients_text_en: "sugar, cocoa butter, milk powder, cocoa mass", categories_tags: ["en:snacks", "en:chocolates", "en:milk-chocolates"] }));
  assert.equal(v.level, "red");
  assert.ok(v.serving >= 15);
});
test("ciocolată neagră 85%, 20 g: verde-galben, nu roșu (un pătrățel e în regulă)", () => {
  const v = analyze(mk({ product_name: "Ciocolată neagră 85%", quantity: "100 g", serving_quantity: 20, nutriments: { carbohydrates_100g: 19, sugars_100g: 14, fiber_100g: 12 }, ingredients_text_en: "cocoa mass, cocoa butter, sugar", categories_tags: ["en:snacks", "en:chocolates", "en:dark-chocolates"] }));
  assert.notEqual(v.level, "red");
});
test("fulgi de porumb, 30 g: roșu (IG ridicat, 25 g carbohidrați)", () => {
  const v = analyze(mk({ product_name: "Corn flakes", quantity: "500 g", serving_quantity: 30, nutriments: { carbohydrates_100g: 84, sugars_100g: 8, fiber_100g: 3 }, ingredients_text_en: "maize, sugar, salt, barley malt extract", categories_tags: ["en:breakfast-cereals", "en:corn-flakes"] }));
  assert.equal(v.level, "red");
});
test("orez alb, 75 g uscat: roșu", () => {
  const v = analyze(mk({ product_name: "Orez cu bob lung", quantity: "1 kg", nutriments: { carbohydrates_100g: 78, sugars_100g: 0, fiber_100g: 1 }, ingredients_text_en: "rice", categories_tags: ["en:cereals-and-potatoes", "en:rices", "en:white-rices"] }));
  assert.equal(v.level, "red");
});
test("fulgi de ovăz, 40 g: cu măsură (nu verde, 24 g carbohidrați)", () => {
  const v = analyze(mk({ product_name: "Fulgi de ovăz", quantity: "500 g", nutriments: { carbohydrates_100g: 60, sugars_100g: 1, fiber_100g: 10 }, ingredients_text_en: "oat flakes", categories_tags: ["en:breakfast-cereals", "en:oat-flakes"] }));
  assert.equal(v.level, "yellow");
});
test("curmale: roșu (zahăr concentrat)", () => {
  const v = analyze(mk({ product_name: "Curmale", quantity: "200 g", serving_quantity: 30, nutriments: { carbohydrates_100g: 68, sugars_100g: 63, fiber_100g: 8 }, ingredients_text_en: "dates", categories_tags: ["en:fruits", "en:dried-fruits", "en:dates"] }));
  assert.equal(v.level, "red");
});
test("iaurt natural 150 g: verde; iaurt cu fructe: roșu", () => {
  const nat = mk({ product_name: "Iaurt natural 3,5%", quantity: "400 g", serving_quantity: 150, nutriments: { carbohydrates_100g: 4, sugars_100g: 4, fiber_100g: 0 }, ingredients_text_en: "milk, cultures", categories_tags: ["en:dairies", "en:yogurts", "en:plain-yogurts"] });
  assert.equal(analyze(nat).level, "green");
  const fr = mk({ product_name: "Iaurt cu căpșuni", quantity: "150 g", serving_quantity: 150, nutriments: { carbohydrates_100g: 13, sugars_100g: 12, fiber_100g: 0 }, ingredients_text_en: "milk, sugar, strawberries 6%", categories_tags: ["en:dairies", "en:yogurts", "en:fruit-yogurts"] });
  assert.equal(analyze(fr).level, "red");
});
test("ketchup, 15 g: nu verde (zahăr în ingrediente)", () => {
  const v = analyze(mk({ product_name: "Ketchup", quantity: "500 g", serving_quantity: 15, nutriments: { carbohydrates_100g: 24, sugars_100g: 22, fiber_100g: 0 }, ingredients_text_en: "tomatoes, sugar, vinegar, salt", categories_tags: ["en:sauces", "en:ketchup"] }));
  assert.notEqual(v.level, "green");
});
test("porție declarată absurdă (1 g sau 1000 g) e ignorată", () => {
  const p = normalize({ code: "x", product_name: "X", serving_quantity: 1, nutriments: { carbohydrates_100g: 50, sugars_100g: 40 }, categories_tags: ["en:snacks", "en:biscuits"], labels_tags: [] });
  assert.equal(p.serving, undefined);
});
test("nuci, brânză, ouă, carne, apă: verde", () => {
  for (const [name, cats, n] of [
    ["Nuci", ["en:nuts", "en:walnuts"], { carbohydrates_100g: 7, sugars_100g: 2.6, fiber_100g: 6.7 }],
    ["Telemea", ["en:dairies", "en:cheeses"], { carbohydrates_100g: 1, sugars_100g: 1, fiber_100g: 0 }],
    ["Piept de pui", ["en:meats", "en:poultry"], { carbohydrates_100g: 0, sugars_100g: 0, fiber_100g: 0 }],
  ] as const) {
    assert.equal(analyze(mk({ product_name: name, quantity: "200 g", nutriments: n, ingredients_text_en: name, categories_tags: [...cats] })).level, "green", name);
  }
});
