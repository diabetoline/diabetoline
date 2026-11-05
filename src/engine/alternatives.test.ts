import { test } from "node:test";
import assert from "node:assert/strict";
import { greenFromCache, pickCategories } from "../api/alternatives.ts";
import type { Product } from "./types.ts";

const base = (o: Partial<Product>): Product => ({
  code: "0", name: "x", carbs100: 0, sugars100: 0, fiber100: 0, unit: "g", ingredients: [], categories: [], claims: [], gi: null, giSource: "none", ...o,
});

test("pickCategories: cele mai specifice întâi, fără generice", () => {
  const cats = ["en:snacks", "en:sweet-snacks", "en:biscuits-and-cakes", "en:biscuits", "en:cocoa-biscuits"];
  assert.deepEqual(pickCategories(cats), ["en:cocoa-biscuits", "en:biscuits", "en:biscuits-and-cakes"]);
  assert.deepEqual(pickCategories(["en:foods", "en:snacks"]), []);
  assert.deepEqual(pickCategories(["fr:biscuits", "en:breads"]), ["en:breads"]);
});

test("greenFromCache: doar verzi din aceeași categorie, nu produsul însuși", () => {
  const red = base({ code: "1", name: "Biscuiți cu cremă", carbs100: 68, sugars100: 32, serving: 40, categories: ["en:snacks", "en:biscuits"] });
  const cache: Record<string, Product> = {
    "1": red,
    "2": base({ code: "2", name: "Biscuiți ovăz fără zahăr", carbs100: 55, sugars100: 2, fiber100: 9, serving: 25, categories: ["en:snacks", "en:biscuits"] }),
    "3": base({ code: "3", name: "Brânză de vaci", carbs100: 3.5, sugars100: 3.5, categories: ["en:dairies", "en:cheeses"] }),
    "4": base({ code: "4", name: "Biscuiți cu miere", carbs100: 70, sugars100: 30, serving: 30, categories: ["en:biscuits"] }),
  };
  assert.deepEqual(greenFromCache(red, cache).map((p) => p.code), ["2"]);
});
