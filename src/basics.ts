/**
 * Alimente fără cod de bare (15 nov 2026): pâinea de la panificație, fructele, legumele, brânza la cântar.
 * Valori medii la 100 g (USDA / tabele RO), categorii în stilul Open Food Facts ca motorul să aleagă porția și regulile.
 * Codul produsului e `basic:<id>`; se adaugă în cache ca produs „user” și trece prin același `analyze`.
 */
import type { Product } from "./engine/types";
import { estimateGi } from "./engine/gi";
import type { Lang } from "./i18n";

export interface Basic { id: string; name: Record<Lang, string>; group: "bread" | "fruit" | "veg" | "dairy" | "meat" | "grain" | "other"; carbs: number; sugars: number; fiber: number; protein?: number; cats: string[]; serving?: number; unit?: "g" | "ml"; gi?: number }

export const BASIC_GROUPS: Record<Basic["group"], Record<Lang, string>> = {
  bread: { ro: "Pâine și panificație", en: "Bread & bakery", de: "Brot & Backwaren" },
  fruit: { ro: "Fructe", en: "Fruit", de: "Obst" },
  veg: { ro: "Legume", en: "Vegetables", de: "Gemüse" },
  dairy: { ro: "Lactate la cântar", en: "Dairy (loose)", de: "Milchprodukte (lose)" },
  meat: { ro: "Carne, pește, ouă", en: "Meat, fish, eggs", de: "Fleisch, Fisch, Eier" },
  grain: { ro: "Cereale, leguminoase (vrac)", en: "Grains, pulses (loose)", de: "Getreide, Hülsenfrüchte (lose)" },
  other: { ro: "Altele", en: "Other", de: "Sonstiges" },
};

const B = (id: string, ro: string, en: string, de: string, group: Basic["group"], carbs: number, sugars: number, fiber: number, cats: string[], extra: Partial<Basic> = {}): Basic =>
  ({ id, name: { ro, en, de }, group, carbs, sugars, fiber, cats, ...extra });

export const BASICS: Basic[] = [
  // pâine și panificație (porția motorului: 50 g = 1–2 felii)
  B("white-bread", "Pâine albă", "White bread", "Weißbrot", "bread", 49, 3, 2.5, ["en:breads", "en:white-breads"], { gi: 75 }),
  B("wholegrain-bread", "Pâine integrală", "Wholegrain bread", "Vollkornbrot", "bread", 41, 4, 7, ["en:breads", "en:wholemeal-breads"], { gi: 55 }),
  B("rye-bread", "Pâine de secară", "Rye bread", "Roggenbrot", "bread", 44, 3.5, 6, ["en:breads", "en:rye-breads"], { gi: 55 }),
  B("baguette", "Baghetă", "Baguette", "Baguette", "bread", 55, 2.5, 2.5, ["en:breads"], { gi: 85 }),
  B("croissant", "Croissant", "Croissant", "Croissant", "bread", 45, 11, 2.5, ["en:pastries", "en:viennoiseries"], { serving: 60, gi: 67 }),
  B("covrig", "Covrig", "Pretzel ring", "Brezel", "bread", 60, 3, 2.5, ["en:breads", "en:pretzels"], { serving: 60, gi: 80 }),
  // fructe (porția: 150 g, un fruct mediu)
  B("apple", "Măr", "Apple", "Apfel", "fruit", 13, 10, 2.4, ["en:fruits", "en:apples"], { serving: 150, gi: 36 }),
  B("pear", "Pară", "Pear", "Birne", "fruit", 15, 10, 3, ["en:fruits", "en:pears"], { serving: 150, gi: 38 }),
  B("banana", "Banană", "Banana", "Banane", "fruit", 22, 12, 2.6, ["en:fruits", "en:bananas"], { serving: 120, gi: 51 }),
  B("grapes", "Struguri", "Grapes", "Trauben", "fruit", 17, 16, 0.9, ["en:fruits", "en:grapes"], { serving: 150, gi: 59 }),
  B("orange", "Portocală", "Orange", "Orange", "fruit", 12, 9, 2.4, ["en:fruits", "en:oranges"], { serving: 150, gi: 43 }),
  B("berries", "Fructe de pădure", "Berries", "Beeren", "fruit", 10, 6, 4, ["en:fruits", "en:berries"], { serving: 150, gi: 25 }),
  B("strawberries", "Căpșuni", "Strawberries", "Erdbeeren", "fruit", 8, 5, 2, ["en:fruits", "en:strawberries"], { serving: 150, gi: 40 }),
  B("watermelon", "Pepene roșu", "Watermelon", "Wassermelone", "fruit", 8, 6, 0.4, ["en:fruits", "en:watermelons"], { serving: 200, gi: 76 }),
  B("cherries", "Cireșe", "Cherries", "Kirschen", "fruit", 16, 13, 2, ["en:fruits", "en:cherries"], { serving: 150, gi: 22 }),
  B("dried-fruit", "Fructe uscate (curmale, stafide)", "Dried fruit (dates, raisins)", "Trockenfrüchte (Datteln, Rosinen)", "fruit", 70, 60, 6, ["en:dried-fruits"], { serving: 30, gi: 62 }),
  // legume (porția: 150 g)
  B("tomato", "Roșii", "Tomatoes", "Tomaten", "veg", 3.9, 2.6, 1.2, ["en:vegetables", "en:tomatoes"], { serving: 150, gi: 15 }),
  B("cucumber", "Castraveți", "Cucumber", "Gurke", "veg", 3.6, 1.7, 0.5, ["en:vegetables"], { serving: 150, gi: 15 }),
  B("salad", "Salată verde, spanac", "Leafy salad, spinach", "Blattsalat, Spinat", "veg", 3, 1, 2, ["en:vegetables", "en:leaf-vegetables"], { serving: 100, gi: 15 }),
  B("cabbage", "Varză", "Cabbage", "Kohl", "veg", 6, 3, 2.5, ["en:vegetables", "en:cabbages"], { serving: 150, gi: 15 }),
  B("broccoli", "Broccoli, conopidă", "Broccoli, cauliflower", "Brokkoli, Blumenkohl", "veg", 6, 1.5, 2.5, ["en:vegetables"], { serving: 150, gi: 15 }),
  B("pepper", "Ardei", "Bell pepper", "Paprika", "veg", 6, 4, 2, ["en:vegetables", "en:peppers"], { serving: 150, gi: 15 }),
  B("carrot", "Morcovi", "Carrots", "Karotten", "veg", 10, 4.7, 2.8, ["en:vegetables", "en:carrots"], { serving: 100, gi: 39 }),
  B("onion", "Ceapă, usturoi", "Onion, garlic", "Zwiebel, Knoblauch", "veg", 9, 4, 1.7, ["en:vegetables", "en:onions"], { serving: 50, gi: 15 }),
  B("potato", "Cartofi", "Potatoes", "Kartoffeln", "veg", 17, 0.8, 2.2, ["en:vegetables", "en:potatoes"], { serving: 150, gi: 78 }),
  B("sweet-potato", "Cartofi dulci", "Sweet potatoes", "Süßkartoffeln", "veg", 20, 4, 3, ["en:vegetables", "en:sweet-potatoes"], { serving: 150, gi: 63 }),
  B("corn", "Porumb", "Sweetcorn", "Mais", "veg", 19, 6, 2.7, ["en:vegetables", "en:corn"], { serving: 150, gi: 52 }),
  B("pumpkin", "Dovleac", "Pumpkin", "Kürbis", "veg", 6.5, 2.8, 0.5, ["en:vegetables", "en:pumpkins"], { serving: 150, gi: 64 }),
  B("mushrooms", "Ciuperci", "Mushrooms", "Pilze", "veg", 3.3, 2, 1, ["en:vegetables", "en:mushrooms"], { serving: 150, gi: 15 }),
  // lactate la cântar
  B("telemea", "Telemea, brânză de vaci", "Feta-style / cottage cheese", "Schafskäse / Hüttenkäse", "dairy", 2, 2, 0, ["en:cheeses"], { serving: 50, protein: 15 }),
  B("cheese", "Cașcaval, brânză tare", "Hard cheese", "Hartkäse", "dairy", 1, 1, 0, ["en:cheeses"], { serving: 40, protein: 25 }),
  B("yogurt-plain", "Iaurt simplu, sana, kefir", "Plain yoghurt, kefir", "Naturjoghurt, Kefir", "dairy", 4.5, 4.5, 0, ["en:dairies", "en:yogurts", "en:plain-yogurts"], { serving: 150, unit: "g", protein: 4 }),
  B("milk", "Lapte", "Milk", "Milch", "dairy", 4.8, 4.8, 0, ["en:dairies", "en:milks"], { serving: 200, unit: "ml", protein: 3.3 }),
  // carne, pește, ouă (fără carbohidrați)
  B("meat", "Carne (pui, porc, vită)", "Meat (chicken, pork, beef)", "Fleisch (Hähnchen, Schwein, Rind)", "meat", 0, 0, 0, ["en:meats"], { serving: 150, protein: 22 }),
  B("fish", "Pește", "Fish", "Fisch", "meat", 0, 0, 0, ["en:fishes"], { serving: 150, protein: 20 }),
  B("eggs", "Ouă", "Eggs", "Eier", "meat", 0.7, 0.7, 0, ["en:eggs"], { serving: 100, protein: 13 }),
  B("sausage", "Mezeluri, cârnați", "Cold cuts, sausages", "Wurst, Aufschnitt", "meat", 2, 1, 0, ["en:meats", "en:prepared-meats", "en:sausages"], { serving: 50, protein: 14 }),
  // cereale și leguminoase vrac (uscate; porția motorului 75 g uscat)
  B("white-rice", "Orez alb", "White rice", "Weißer Reis", "grain", 79, 0.1, 1.3, ["en:cereals-and-potatoes", "en:rices", "en:white-rices"], { gi: 73 }),
  B("brown-rice", "Orez brun, integral", "Brown rice", "Vollkornreis", "grain", 76, 0.7, 3.5, ["en:cereals-and-potatoes", "en:rices", "en:brown-rices"], { gi: 68 }),
  B("pasta-white", "Paste albe", "White pasta", "Nudeln (Weizen)", "grain", 73, 2.7, 3, ["en:pastas"], { gi: 49 }),
  B("pasta-wholegrain", "Paste integrale", "Wholegrain pasta", "Vollkornnudeln", "grain", 66, 3, 10, ["en:pastas", "en:whole-wheat-pastas"], { gi: 42 }),
  B("oats", "Fulgi de ovăz", "Rolled oats", "Haferflocken", "grain", 60, 1, 10, ["en:cereals", "en:oats"], { serving: 40, gi: 55 }),
  B("beans", "Fasole, linte, năut (uscate)", "Beans, lentils, chickpeas (dry)", "Bohnen, Linsen, Kichererbsen (trocken)", "grain", 60, 2, 15, ["en:legumes"], { gi: 30 }),
  B("buckwheat", "Hrișcă, quinoa, bulgur", "Buckwheat, quinoa, bulgur", "Buchweizen, Quinoa, Bulgur", "grain", 65, 1, 8, ["en:cereals-and-potatoes", "en:grains"], { gi: 50 }),
  // altele
  B("nuts", "Nuci, alune, semințe (vrac)", "Nuts & seeds (loose)", "Nüsse & Samen (lose)", "other", 14, 4, 8, ["en:nuts", "en:seeds"], { serving: 30, gi: 20 }),
  B("honey", "Miere", "Honey", "Honig", "other", 82, 82, 0, ["en:sweeteners", "en:honeys"], { serving: 15, gi: 60 }),
  B("sugar", "Zahăr", "Sugar", "Zucker", "other", 100, 100, 0, ["en:sweeteners", "en:sugars"], { serving: 10, gi: 65 }),
  B("olive-oil", "Ulei, unt, untură", "Oil, butter, lard", "Öl, Butter, Schmalz", "other", 0, 0, 0, ["en:fats"], { serving: 10 }),
  B("pastry-shop", "Prăjitură, cozonac (de la cofetărie)", "Cake, pastry (bakery)", "Kuchen, Gebäck (Konditorei)", "other", 55, 35, 1.5, ["en:cakes", "en:pastries"], { serving: 100, gi: 65 }),
];

export const BASIC_PREFIX = "basic:";
export function basicProduct(b: Basic, lang: Lang): Product {
  const name = b.name[lang] ?? b.name.en;
  const gi = b.gi != null ? { gi: b.gi, source: "measured" as const } : estimateGi({ categories: b.cats, carbs100: b.carbs, fiber100: b.fiber, sugars100: b.sugars, name });
  return { code: BASIC_PREFIX + b.id, name, carbs100: b.carbs, sugars100: b.sugars, fiber100: b.fiber, protein100: b.protein, serving: b.serving, unit: b.unit ?? "g", ingredients: [], categories: b.cats, claims: [], gi: gi.gi, giSource: gi.source, source: "user" };
}
export function findBasic(code: string): Basic | undefined { return code.startsWith(BASIC_PREFIX) ? BASICS.find((b) => BASIC_PREFIX + b.id === code) : undefined; }
