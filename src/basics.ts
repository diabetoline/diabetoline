/**
 * Alimente fără cod de bare (15 nov 2026): pâinea de la panificație, fructele, legumele, brânza la cântar.
 * Valori medii la 100 g (USDA / tabele RO), categorii în stilul Open Food Facts ca motorul să aleagă porția și regulile.
 * Codul produsului e `basic:<id>`; se adaugă în cache ca produs „user” și trece prin același `analyze`.
 */
import type { Product } from "./engine/types";
import { estimateGi } from "./engine/gi";
import type { Lang } from "./i18n";

export interface Basic { id: string; name: Record<Lang, string>; group: "bread" | "fruit" | "veg" | "dairy" | "meat" | "grain" | "ready" | "sweets" | "drinks" | "other"; carbs: number; sugars: number; fiber: number; protein?: number; cats: string[]; serving?: number; unit?: "g" | "ml"; gi?: number }

export const BASIC_GROUPS: Record<Basic["group"], Record<Lang, string>> = {
  fruit: { ro: "Fructe", en: "Fruit", de: "Obst" },
  veg: { ro: "Legume", en: "Vegetables", de: "Gemüse" },
  bread: { ro: "Pâine și panificație", en: "Bread & bakery", de: "Brot & Backwaren" },
  dairy: { ro: "Lactate la cântar", en: "Dairy (loose)", de: "Milchprodukte (lose)" },
  meat: { ro: "Carne, pește, ouă", en: "Meat, fish, eggs", de: "Fleisch, Fisch, Eier" },
  grain: { ro: "Cereale, leguminoase, nuci (vrac)", en: "Grains, pulses, nuts (loose)", de: "Getreide, Hülsenfrüchte, Nüsse (lose)" },
  ready: { ro: "Mâncare gata (piață, fast-food, cantină)", en: "Ready food (market, fast food, canteen)", de: "Fertiges Essen (Markt, Imbiss, Kantine)" },
  sweets: { ro: "Dulciuri de la cofetărie / piață", en: "Sweets from the bakery / market", de: "Süßes vom Konditor / Markt" },
  drinks: { ro: "Băuturi la pahar", en: "Drinks by the glass", de: "Getränke im Glas" },
  other: { ro: "Altele", en: "Other", de: "Sonstiges" },
};

const B = (id: string, ro: string, en: string, de: string, group: Basic["group"], carbs: number, sugars: number, fiber: number, cats: string[], extra: Partial<Basic> = {}): Basic =>
  ({ id, name: { ro, en, de }, group, carbs, sugars, fiber, cats, ...extra });
const F = ["en:fruits"], V = ["en:vegetables"], BR = ["en:breads"], CH = ["en:cheeses"], MT = ["en:meats"], SW = ["en:sweets", "en:cakes", "en:pastries"], RD = ["en:meals"], DR = ["en:beverages"];

export const BASICS: Basic[] = [
  // ——— fructe (porția: un fruct mediu / o mână; valori la 100 g, USDA) ———
  B("apple", "Măr", "Apple", "Apfel", "fruit", 13, 10, 2.4, [...F, "en:apples"], { serving: 150, gi: 36 }),
  B("pear", "Pară", "Pear", "Birne", "fruit", 15, 10, 3, [...F, "en:pears"], { serving: 150, gi: 38 }),
  B("quince", "Gutuie", "Quince", "Quitte", "fruit", 14, 9, 1.9, [...F], { serving: 150, gi: 35 }),
  B("banana", "Banană", "Banana", "Banane", "fruit", 22, 12, 2.6, [...F, "en:bananas"], { serving: 120, gi: 51 }),
  B("grapes", "Struguri", "Grapes", "Trauben", "fruit", 17, 16, 0.9, [...F, "en:grapes"], { serving: 150, gi: 59 }),
  B("orange", "Portocală", "Orange", "Orange", "fruit", 12, 9, 2.4, [...F, "en:oranges"], { serving: 150, gi: 43 }),
  B("mandarin", "Mandarine, clementine", "Mandarins, clementines", "Mandarinen, Clementinen", "fruit", 13, 10.6, 1.8, [...F], { serving: 120, gi: 47 }),
  B("grapefruit", "Grepfrut", "Grapefruit", "Grapefruit", "fruit", 8, 7, 1.6, [...F], { serving: 150, gi: 25 }),
  B("lemon", "Lămâie, lime", "Lemon, lime", "Zitrone, Limette", "fruit", 9, 2.5, 2.8, [...F], { serving: 30, gi: 20 }),
  B("berries", "Fructe de pădure (zmeură, mure, afine)", "Berries (raspberries, blackberries, blueberries)", "Beeren (Himbeeren, Brombeeren, Heidelbeeren)", "fruit", 10, 6, 4, [...F, "en:berries"], { serving: 150, gi: 25 }),
  B("strawberries", "Căpșuni", "Strawberries", "Erdbeeren", "fruit", 8, 5, 2, [...F, "en:strawberries"], { serving: 150, gi: 40 }),
  B("cherries", "Cireșe, vișine", "Cherries, sour cherries", "Kirschen, Sauerkirschen", "fruit", 16, 13, 2, [...F, "en:cherries"], { serving: 150, gi: 22 }),
  B("plums", "Prune", "Plums", "Pflaumen", "fruit", 11, 10, 1.4, [...F, "en:plums"], { serving: 150, gi: 40 }),
  B("apricots", "Caise", "Apricots", "Aprikosen", "fruit", 11, 9, 2, [...F, "en:apricots"], { serving: 150, gi: 34 }),
  B("peaches", "Piersici, nectarine", "Peaches, nectarines", "Pfirsiche, Nektarinen", "fruit", 10, 8, 1.5, [...F, "en:peaches"], { serving: 150, gi: 42 }),
  B("watermelon", "Pepene roșu", "Watermelon", "Wassermelone", "fruit", 8, 6, 0.4, [...F, "en:watermelons"], { serving: 200, gi: 76 }),
  B("melon", "Pepene galben", "Cantaloupe / honeydew melon", "Zuckermelone", "fruit", 8, 8, 0.9, [...F, "en:melons"], { serving: 200, gi: 65 }),
  B("kiwi", "Kiwi", "Kiwi", "Kiwi", "fruit", 15, 9, 3, [...F, "en:kiwis"], { serving: 100, gi: 50 }),
  B("pineapple", "Ananas", "Pineapple", "Ananas", "fruit", 13, 10, 1.4, [...F, "en:pineapples"], { serving: 150, gi: 59 }),
  B("mango", "Mango", "Mango", "Mango", "fruit", 15, 14, 1.6, [...F, "en:mangoes"], { serving: 150, gi: 51 }),
  B("figs", "Smochine proaspete", "Fresh figs", "Frische Feigen", "fruit", 19, 16, 2.9, [...F, "en:figs"], { serving: 100, gi: 51 }),
  B("pomegranate", "Rodie", "Pomegranate", "Granatapfel", "fruit", 19, 14, 4, [...F], { serving: 100, gi: 53 }),
  B("avocado", "Avocado", "Avocado", "Avocado", "fruit", 8.5, 0.7, 6.7, [...F, "en:avocados"], { serving: 100, gi: 15 }),
  B("coconut", "Nucă de cocos", "Coconut", "Kokosnuss", "fruit", 15, 6, 9, [...F], { serving: 50, gi: 45 }),
  B("dried-fruit", "Fructe uscate (curmale, stafide, smochine)", "Dried fruit (dates, raisins, figs)", "Trockenfrüchte (Datteln, Rosinen, Feigen)", "fruit", 70, 60, 6, ["en:dried-fruits"], { serving: 30, gi: 62 }),
  B("prunes", "Prune uscate, caise uscate", "Prunes, dried apricots", "Dörrpflaumen, getrocknete Aprikosen", "fruit", 63, 38, 7, ["en:dried-fruits"], { serving: 30, gi: 35 }),
  // ——— legume ———
  B("tomato", "Roșii", "Tomatoes", "Tomaten", "veg", 3.9, 2.6, 1.2, [...V, "en:tomatoes"], { serving: 150, gi: 15 }),
  B("cucumber", "Castraveți", "Cucumber", "Gurke", "veg", 3.6, 1.7, 0.5, [...V], { serving: 150, gi: 15 }),
  B("salad", "Salată verde, spanac, rucola", "Leafy salad, spinach, rocket", "Blattsalat, Spinat, Rucola", "veg", 3, 1, 2, [...V, "en:leaf-vegetables"], { serving: 100, gi: 15 }),
  B("cabbage", "Varză (albă, roșie)", "Cabbage (white, red)", "Kohl (Weiß-, Rotkohl)", "veg", 6, 3, 2.5, [...V, "en:cabbages"], { serving: 150, gi: 15 }),
  B("sauerkraut", "Varză murată", "Sauerkraut", "Sauerkraut", "veg", 4, 2, 3, [...V, "en:sauerkraut"], { serving: 150, gi: 15 }),
  B("pickles", "Murături (castraveți, gogonele)", "Pickles (cucumbers, green tomatoes)", "Eingelegtes (Gurken, grüne Tomaten)", "veg", 2.5, 1.5, 1, [...V, "en:pickles"], { serving: 100, gi: 15 }),
  B("broccoli", "Broccoli, conopidă", "Broccoli, cauliflower", "Brokkoli, Blumenkohl", "veg", 6, 1.5, 2.5, [...V], { serving: 150, gi: 15 }),
  B("kale", "Kale, varză creață", "Kale", "Grünkohl", "veg", 4.4, 1, 4, [...V, "en:leaf-vegetables"], { serving: 100, gi: 15 }),
  B("pepper", "Ardei gras, capia", "Bell pepper", "Paprika", "veg", 6, 4, 2, [...V, "en:peppers"], { serving: 150, gi: 15 }),
  B("hot-pepper", "Ardei iute", "Chili pepper", "Chili", "veg", 9, 5, 1.5, [...V, "en:peppers"], { serving: 20, gi: 15 }),
  B("carrot", "Morcovi", "Carrots", "Karotten", "veg", 10, 4.7, 2.8, [...V, "en:carrots"], { serving: 100, gi: 39 }),
  B("beetroot", "Sfeclă roșie", "Beetroot", "Rote Bete", "veg", 10, 7, 2.8, [...V, "en:beetroots"], { serving: 100, gi: 64 }),
  B("celeriac", "Țelină, păstârnac, pătrunjel rădăcină", "Celeriac, parsnip, parsley root", "Sellerie, Pastinake, Petersilienwurzel", "veg", 9, 2, 2, [...V], { serving: 100, gi: 35 }),
  B("radish", "Ridichi", "Radishes", "Radieschen", "veg", 3.4, 1.9, 1.6, [...V], { serving: 100, gi: 15 }),
  B("onion", "Ceapă, usturoi, praz", "Onion, garlic, leek", "Zwiebel, Knoblauch, Lauch", "veg", 9, 4, 1.7, [...V, "en:onions"], { serving: 50, gi: 15 }),
  B("zucchini", "Dovlecel", "Courgette / zucchini", "Zucchini", "veg", 3.1, 2.5, 1, [...V], { serving: 150, gi: 15 }),
  B("eggplant", "Vinete", "Aubergine / eggplant", "Aubergine", "veg", 6, 3.5, 3, [...V], { serving: 150, gi: 15 }),
  B("green-beans", "Fasole verde, mazăre verde", "Green beans, green peas", "Grüne Bohnen, Erbsen", "veg", 9, 3, 3.5, [...V], { serving: 150, gi: 30 }),
  B("asparagus", "Sparanghel, anghinare", "Asparagus, artichoke", "Spargel, Artischocke", "veg", 4, 2, 2, [...V], { serving: 150, gi: 15 }),
  B("potato", "Cartofi", "Potatoes", "Kartoffeln", "veg", 17, 0.8, 2.2, [...V, "en:potatoes"], { serving: 150, gi: 78 }),
  B("sweet-potato", "Cartofi dulci", "Sweet potatoes", "Süßkartoffeln", "veg", 20, 4, 3, [...V, "en:sweet-potatoes"], { serving: 150, gi: 63 }),
  B("corn", "Porumb (fiert, pe știulete)", "Sweetcorn (boiled, on the cob)", "Mais (gekocht, am Kolben)", "veg", 19, 6, 2.7, [...V, "en:corn"], { serving: 150, gi: 52 }),
  B("pumpkin", "Dovleac", "Pumpkin", "Kürbis", "veg", 6.5, 2.8, 0.5, [...V, "en:pumpkins"], { serving: 150, gi: 64 }),
  B("mushrooms", "Ciuperci", "Mushrooms", "Pilze", "veg", 3.3, 2, 1, [...V, "en:mushrooms"], { serving: 150, gi: 15 }),
  B("olives", "Măsline", "Olives", "Oliven", "veg", 3, 0, 3, [...V, "en:olives"], { serving: 30, gi: 15 }),
  B("herbs", "Verdețuri (pătrunjel, mărar, leuștean)", "Fresh herbs (parsley, dill)", "Kräuter (Petersilie, Dill)", "veg", 6, 1, 3, [...V], { serving: 10, gi: 15 }),
  // ——— pâine și panificație (porția motorului: 50 g = 1–2 felii) ———
  B("white-bread", "Pâine albă", "White bread", "Weißbrot", "bread", 49, 3, 2.5, [...BR, "en:white-breads"], { gi: 75 }),
  B("wholegrain-bread", "Pâine integrală, neagră", "Wholegrain bread", "Vollkornbrot", "bread", 41, 4, 7, [...BR, "en:wholemeal-breads"], { gi: 55 }),
  B("rye-bread", "Pâine de secară", "Rye bread", "Roggenbrot", "bread", 44, 3.5, 6, [...BR, "en:rye-breads"], { gi: 55 }),
  B("seed-bread", "Pâine cu semințe", "Seeded bread", "Körnerbrot", "bread", 40, 3, 7, [...BR, "en:wholemeal-breads"], { gi: 52 }),
  B("baguette", "Baghetă, franzelă", "Baguette", "Baguette", "bread", 55, 2.5, 2.5, [...BR], { gi: 85 }),
  B("lipie", "Lipie, pită, chiflă", "Flatbread, pita, bread roll", "Fladenbrot, Pita, Brötchen", "bread", 52, 2, 2.5, [...BR], { gi: 70 }),
  B("corn-bread", "Mălai, pâine de mălai", "Cornbread", "Maisbrot", "bread", 45, 5, 2, [...BR], { gi: 70 }),
  B("croissant", "Croissant, corn cu unt", "Croissant", "Croissant", "bread", 45, 11, 2.5, ["en:pastries", "en:viennoiseries"], { serving: 60, gi: 67 }),
  B("covrig", "Covrig", "Pretzel ring", "Brezel", "bread", 60, 3, 2.5, [...BR, "en:pretzels"], { serving: 60, gi: 80 }),
  B("pateu", "Pateuri, merdenele, ștrudel cu brânză", "Cheese pastry (puff)", "Käse-Blätterteigtasche", "bread", 35, 3, 1.5, ["en:pastries", "en:savory-pastries"], { serving: 100, gi: 65 }),
  B("placinta", "Plăcintă cu brânză / carne / varză", "Savoury pie (cheese / meat / cabbage)", "Herzhafte Pastete (Käse / Fleisch / Kraut)", "bread", 30, 3, 1.5, ["en:pastries", "en:savory-pastries"], { serving: 150, gi: 65 }),
  B("langos", "Langoș, gogoși sărate", "Lángos (fried dough)", "Langosch", "bread", 42, 3, 1.5, ["en:fried-foods", "en:breads"], { serving: 150, gi: 75 }),
  B("rusks", "Pesmeți, grisine, biscuiți sărați", "Rusks, breadsticks, crackers", "Zwieback, Grissini, Cracker", "bread", 70, 4, 3, ["en:crackers", "en:snacks"], { serving: 30, gi: 70 }),
  // ——— lactate la cântar ———
  B("telemea", "Telemea, brânză de vaci, urdă", "Feta-style / cottage cheese", "Schafskäse / Hüttenkäse", "dairy", 2, 2, 0, [...CH], { serving: 50, protein: 15 }),
  B("cheese", "Cașcaval, brânză tare", "Hard cheese", "Hartkäse", "dairy", 1, 1, 0, [...CH], { serving: 40, protein: 25 }),
  B("mozzarella", "Mozzarella, brânză moale", "Mozzarella, soft cheese", "Mozzarella, Weichkäse", "dairy", 2.5, 1, 0, [...CH], { serving: 50, protein: 20 }),
  B("cream-cheese", "Cremă de brânză, brânză topită", "Cream cheese, processed cheese", "Frischkäse, Schmelzkäse", "dairy", 4, 3, 0, [...CH], { serving: 30, protein: 8 }),
  B("sour-cream", "Smântână", "Sour cream", "Sauerrahm / Schmand", "dairy", 3.5, 3.5, 0, ["en:dairies", "en:creams"], { serving: 30, protein: 2.5 }),
  B("butter", "Unt", "Butter", "Butter", "dairy", 0.7, 0.7, 0, ["en:fats", "en:butters"], { serving: 10 }),
  B("yogurt-plain", "Iaurt simplu, sana, kefir, lapte bătut", "Plain yoghurt, kefir, buttermilk", "Naturjoghurt, Kefir, Buttermilch", "dairy", 4.5, 4.5, 0, ["en:dairies", "en:yogurts", "en:plain-yogurts"], { serving: 150, unit: "g", protein: 4 }),
  B("yogurt-fruit", "Iaurt cu fructe (îndulcit)", "Fruit yoghurt (sweetened)", "Fruchtjoghurt (gesüßt)", "dairy", 14, 13, 0, ["en:dairies", "en:yogurts", "en:fruit-yogurts"], { serving: 150, unit: "g", protein: 3.5 }),
  B("milk", "Lapte", "Milk", "Milch", "dairy", 4.8, 4.8, 0, ["en:dairies", "en:milks"], { serving: 200, unit: "ml", protein: 3.3 }),
  // ——— carne, pește, ouă ———
  B("chicken", "Pui, curcan (piept, pulpe)", "Chicken, turkey", "Hähnchen, Pute", "meat", 0, 0, 0, [...MT, "en:poultries"], { serving: 150, protein: 25 }),
  B("pork", "Porc (cotlet, ceafă, pulpă)", "Pork", "Schwein", "meat", 0, 0, 0, [...MT, "en:pork"], { serving: 150, protein: 22 }),
  B("beef", "Vită, vițel, miel", "Beef, veal, lamb", "Rind, Kalb, Lamm", "meat", 0, 0, 0, [...MT, "en:beef"], { serving: 150, protein: 22 }),
  B("minced", "Carne tocată", "Minced meat", "Hackfleisch", "meat", 0, 0, 0, [...MT], { serving: 150, protein: 18 }),
  B("liver", "Ficat, organe", "Liver, offal", "Leber, Innereien", "meat", 4, 0, 0, [...MT, "en:offals"], { serving: 120, protein: 20 }),
  B("bacon", "Slănină, bacon, kaizer", "Bacon, pork belly", "Speck, Bauchspeck", "meat", 0.5, 0, 0, [...MT, "en:bacon"], { serving: 40, protein: 12 }),
  B("ham", "Șuncă, jambon, mușchi file", "Ham", "Schinken", "meat", 1.5, 1, 0, [...MT, "en:prepared-meats", "en:hams"], { serving: 50, protein: 18 }),
  B("sausage", "Cârnați, salam, parizer, crenvurști", "Sausages, salami, cold cuts", "Wurst, Salami, Aufschnitt", "meat", 2, 1, 0, [...MT, "en:prepared-meats", "en:sausages"], { serving: 50, protein: 14 }),
  B("fish", "Pește (crap, păstrăv, somon, cod)", "Fish (carp, trout, salmon, cod)", "Fisch (Karpfen, Forelle, Lachs, Kabeljau)", "meat", 0, 0, 0, ["en:fishes"], { serving: 150, protein: 20 }),
  B("smoked-fish", "Pește afumat, sărat, hering", "Smoked / salted fish, herring", "Räucherfisch, Hering", "meat", 0, 0, 0, ["en:fishes", "en:smoked-fishes"], { serving: 80, protein: 22 }),
  B("seafood", "Fructe de mare, creveți", "Seafood, shrimp", "Meeresfrüchte, Garnelen", "meat", 1, 0, 0, ["en:seafood"], { serving: 120, protein: 20 }),
  B("eggs", "Ouă", "Eggs", "Eier", "meat", 0.7, 0.7, 0, ["en:eggs"], { serving: 100, protein: 13 }),
  B("tofu", "Tofu, tempeh", "Tofu, tempeh", "Tofu, Tempeh", "meat", 2, 0.5, 1, ["en:tofu"], { serving: 120, protein: 12 }),
  // ——— cereale, leguminoase, nuci (vrac; uscate, porția motorului 75 g) ———
  B("white-rice", "Orez alb", "White rice", "Weißer Reis", "grain", 79, 0.1, 1.3, ["en:cereals-and-potatoes", "en:rices", "en:white-rices"], { gi: 73 }),
  B("brown-rice", "Orez brun, basmati, sălbatic", "Brown / basmati / wild rice", "Vollkorn-/Basmatireis", "grain", 76, 0.7, 3.5, ["en:cereals-and-potatoes", "en:rices", "en:brown-rices"], { gi: 58 }),
  B("pasta-white", "Paste albe, tăiței", "White pasta, noodles", "Nudeln (Weizen)", "grain", 73, 2.7, 3, ["en:pastas"], { gi: 49 }),
  B("pasta-wholegrain", "Paste integrale", "Wholegrain pasta", "Vollkornnudeln", "grain", 66, 3, 10, ["en:pastas", "en:whole-wheat-pastas"], { gi: 42 }),
  B("couscous", "Cușcuș, griș, mălai (crud)", "Couscous, semolina, cornmeal (dry)", "Couscous, Grieß, Maisgrieß (roh)", "grain", 73, 1, 3, ["en:cereals-and-potatoes", "en:grains"], { gi: 65 }),
  B("buckwheat", "Hrișcă, quinoa, bulgur, mei", "Buckwheat, quinoa, bulgur, millet", "Buchweizen, Quinoa, Bulgur, Hirse", "grain", 65, 1, 8, ["en:cereals-and-potatoes", "en:grains"], { gi: 50 }),
  B("oats", "Fulgi de ovăz", "Rolled oats", "Haferflocken", "grain", 60, 1, 10, ["en:cereals", "en:oats"], { serving: 40, gi: 55 }),
  B("muesli", "Musli, granola (vrac)", "Muesli, granola (loose)", "Müsli, Granola (lose)", "grain", 62, 18, 7, ["en:breakfast-cereals", "en:mueslis"], { serving: 40, gi: 57 }),
  B("flour", "Făină albă", "White flour", "Weißmehl", "grain", 73, 0.5, 2.5, ["en:flours"], { serving: 50, gi: 70 }),
  B("beans", "Fasole, linte, năut, mazăre (uscate)", "Beans, lentils, chickpeas, split peas (dry)", "Bohnen, Linsen, Kichererbsen, Erbsen (trocken)", "grain", 60, 2, 15, ["en:legumes"], { gi: 30 }),
  B("nuts", "Nuci, alune, migdale (vrac)", "Walnuts, hazelnuts, almonds (loose)", "Walnüsse, Haselnüsse, Mandeln (lose)", "grain", 14, 4, 8, ["en:nuts"], { serving: 30, gi: 20 }),
  B("peanuts", "Arahide, fistic, caju", "Peanuts, pistachios, cashews", "Erdnüsse, Pistazien, Cashews", "grain", 20, 5, 7, ["en:nuts"], { serving: 30, gi: 15 }),
  B("seeds", "Semințe (floarea-soarelui, dovleac, in, chia)", "Seeds (sunflower, pumpkin, flax, chia)", "Samen (Sonnenblumen, Kürbis, Lein, Chia)", "grain", 15, 2, 10, ["en:seeds"], { serving: 30, gi: 20 }),
  // ——— mâncare gata (piață, fast-food, cantină, de la mama) ———
  B("mici", "Mici (3 bucăți)", "Mici / grilled meat rolls (3)", "Mici / Cevapcici (3 Stück)", "ready", 2, 0, 0, [...MT, "en:grilled-meats"], { serving: 150, protein: 17 }),
  B("mici-bread", "Mici cu pâine și muștar", "Mici with bread and mustard", "Mici mit Brot und Senf", "ready", 20, 2, 1.5, [...RD], { serving: 250, gi: 70 }),
  B("sarmale", "Sarmale (cu mămăligă)", "Cabbage rolls (with polenta)", "Krautwickel (mit Polenta)", "ready", 14, 2, 2, [...RD], { serving: 350, gi: 60 }),
  B("mamaliga", "Mămăligă", "Polenta", "Polenta", "ready", 15, 0.3, 1, ["en:cereals-and-potatoes", "en:polenta"], { serving: 200, gi: 68 }),
  B("ciorba", "Ciorbă, supă (de legume, de burtă, de pui)", "Soup (vegetable, tripe, chicken)", "Suppe (Gemüse, Kutteln, Huhn)", "ready", 4, 1.5, 1, ["en:soups"], { serving: 400, unit: "ml", gi: 40 }),
  B("fries", "Cartofi prăjiți", "French fries", "Pommes frites", "ready", 35, 0.5, 3, ["en:fried-foods", "en:french-fries"], { serving: 150, gi: 75 }),
  B("schnitzel", "Șnițel, pane (pui, porc)", "Breaded schnitzel", "Schnitzel, paniert", "ready", 15, 1, 1, ["en:fried-foods", "en:meals"], { serving: 150, gi: 60 }),
  B("stew", "Tocăniță, gulaș, friptură cu sos", "Stew, goulash, roast with sauce", "Eintopf, Gulasch, Braten mit Soße", "ready", 6, 2, 1.5, [...RD], { serving: 300, gi: 45 }),
  B("fasole-batuta", "Fasole bătută, iahnie de fasole", "Bean purée / bean stew", "Bohnenpüree / Bohneneintopf", "ready", 15, 1.5, 6, ["en:legumes", "en:meals"], { serving: 200, gi: 35 }),
  B("zacusca", "Zacuscă, salată de vinete", "Vegetable spread, aubergine salad", "Gemüseaufstrich, Auberginensalat", "ready", 7, 4, 2.5, ["en:spreads", "en:vegetables"], { serving: 60, gi: 25 }),
  B("boeuf", "Salată de boeuf, salată orientală", "Russian salad, potato salad", "Russischer Salat, Kartoffelsalat", "ready", 12, 2, 2, [...RD, "en:salads"], { serving: 200, gi: 55 }),
  B("pizza-slice", "Pizza (o felie / porție)", "Pizza (slice / portion)", "Pizza (Stück / Portion)", "ready", 30, 3.5, 2, ["en:pizzas"], { serving: 150, gi: 60 }),
  B("shaorma", "Șaorma, kebab, dürüm", "Shawarma, kebab, wrap", "Döner, Dürüm", "ready", 22, 3, 2, ["en:sandwiches", "en:meals"], { serving: 400, gi: 65 }),
  B("burger", "Burger cu chiflă", "Burger with bun", "Burger mit Brötchen", "ready", 24, 5, 1.5, ["en:sandwiches", "en:burgers"], { serving: 250, gi: 66 }),
  B("hotdog", "Hot dog, crenvurști cu pâine", "Hot dog", "Hot Dog", "ready", 22, 4, 1, ["en:sandwiches"], { serving: 150, gi: 70 }),
  B("sandwich", "Sandviș, sendviș cu șuncă și brânză", "Ham & cheese sandwich", "Schinken-Käse-Sandwich", "ready", 25, 3, 2, ["en:sandwiches"], { serving: 180, gi: 65 }),
  B("pilaf", "Pilaf, orez cu legume / pui", "Rice pilaf with vegetables / chicken", "Reispfanne mit Gemüse / Huhn", "ready", 25, 1, 1.5, ["en:rices", "en:meals"], { serving: 250, gi: 70 }),
  B("pasta-dish", "Paste cu sos (bolognese, carbonara)", "Pasta with sauce (bolognese, carbonara)", "Nudeln mit Soße (Bolognese, Carbonara)", "ready", 25, 3, 2, ["en:pastas", "en:meals"], { serving: 300, gi: 55 }),
  B("omelette", "Omletă, ochiuri, papară", "Omelette, fried eggs", "Omelett, Spiegeleier", "ready", 1.5, 1, 0, ["en:eggs", "en:meals"], { serving: 150, protein: 12 }),
  B("grill-plate", "Grătar cu salată (fără garnitură)", "Grilled meat with salad (no sides)", "Gegrilltes mit Salat (ohne Beilage)", "ready", 3, 2, 1.5, [...MT, "en:meals"], { serving: 300, protein: 20 }),
  B("sushi", "Sushi (8 bucăți)", "Sushi (8 pieces)", "Sushi (8 Stück)", "ready", 30, 4, 1, ["en:sushi"], { serving: 200, gi: 55 }),
  // ——— dulciuri de la cofetărie / piață ———
  B("pastry-shop", "Prăjitură, tort (o felie)", "Cake, gateau (one slice)", "Kuchen, Torte (ein Stück)", "sweets", 50, 35, 1.5, [...SW], { serving: 100, gi: 65 }),
  B("cozonac", "Cozonac, pască, panettone", "Sweet bread (cozonac), panettone", "Hefezopf, Panettone", "sweets", 50, 22, 2, [...SW, "en:brioches"], { serving: 80, gi: 65 }),
  B("gogosi", "Gogoși, papanași, clătite cu dulceață", "Doughnuts, pancakes with jam", "Krapfen, Pfannkuchen mit Marmelade", "sweets", 45, 20, 1.5, [...SW, "en:fried-foods"], { serving: 150, gi: 70 }),
  B("strudel", "Ștrudel cu mere, plăcintă dulce", "Apple strudel, sweet pie", "Apfelstrudel, süße Pastete", "sweets", 38, 18, 2, [...SW], { serving: 120, gi: 65 }),
  B("biscuits-loose", "Biscuiți, fursecuri (vrac)", "Biscuits, cookies (loose)", "Kekse, Plätzchen (lose)", "sweets", 68, 25, 2, ["en:biscuits", "en:sweets"], { serving: 40, gi: 65 }),
  B("ice-cream", "Înghețată (o cupă)", "Ice cream (one scoop)", "Eis (eine Kugel)", "sweets", 25, 21, 0.5, ["en:ice-creams", "en:sweets"], { serving: 80, gi: 60 }),
  B("halva", "Halva, rahat, baclava", "Halva, Turkish delight, baklava", "Halva, Lokum, Baklava", "sweets", 60, 45, 2, [...SW], { serving: 50, gi: 65 }),
  B("chocolate-loose", "Ciocolată, bomboane (vrac)", "Chocolate, candy (loose)", "Schokolade, Bonbons (lose)", "sweets", 58, 52, 3, ["en:chocolates", "en:sweets"], { serving: 30, gi: 50 }),
  B("jam", "Dulceață, gem, magiun", "Jam, marmalade", "Marmelade, Konfitüre", "sweets", 60, 58, 1, ["en:jams", "en:spreads"], { serving: 20, gi: 65 }),
  B("honey", "Miere", "Honey", "Honig", "sweets", 82, 82, 0, ["en:sweeteners", "en:honeys"], { serving: 15, gi: 60 }),
  B("sugar", "Zahăr (o linguriță)", "Sugar (one teaspoon)", "Zucker (ein Teelöffel)", "sweets", 100, 100, 0, ["en:sweeteners", "en:sugars"], { serving: 5, gi: 65 }),
  // ——— băuturi la pahar (nu au cod) ———
  B("fresh-juice", "Suc proaspăt de fructe (fresh)", "Fresh fruit juice", "Frisch gepresster Saft", "drinks", 10, 9, 0.2, [...DR, "en:fruit-juices"], { serving: 250, unit: "ml", gi: 50 }),
  B("lemonade", "Limonadă, socată (îndulcite)", "Lemonade (sweetened)", "Limonade (gesüßt)", "drinks", 9, 9, 0, [...DR, "en:lemonades"], { serving: 300, unit: "ml", gi: 60 }),
  B("coffee-sweet", "Cafea / ceai cu zahăr (2 lingurițe)", "Coffee / tea with sugar (2 tsp)", "Kaffee / Tee mit Zucker (2 TL)", "drinks", 5, 5, 0, [...DR, "en:coffees"], { serving: 200, unit: "ml", gi: 65 }),
  B("coffee-plain", "Cafea / ceai fără zahăr", "Coffee / tea, no sugar", "Kaffee / Tee ohne Zucker", "drinks", 0, 0, 0, [...DR, "en:coffees"], { serving: 200, unit: "ml" }),
  B("latte", "Cappuccino, latte (fără sirop)", "Cappuccino, latte (no syrup)", "Cappuccino, Latte (ohne Sirup)", "drinks", 4, 4, 0, [...DR, "en:coffees", "en:milks"], { serving: 250, unit: "ml" }),
  B("ayran", "Ayran, lapte bătut la pahar", "Ayran", "Ayran", "drinks", 3, 3, 0, [...DR, "en:dairies", "en:ayran"], { serving: 250, unit: "ml" }),
  B("beer", "Bere (halbă)", "Beer (pint)", "Bier (0,5 l)", "drinks", 3.5, 0, 0, [...DR, "en:alcoholic-beverages", "en:beers"], { serving: 500, unit: "ml" }),
  B("wine", "Vin (un pahar)", "Wine (one glass)", "Wein (ein Glas)", "drinks", 2.5, 1, 0, [...DR, "en:alcoholic-beverages", "en:wines"], { serving: 150, unit: "ml" }),
  B("spirits", "Țuică, pălincă, tărie (un păhărel)", "Spirits (one shot)", "Schnaps (ein Gläschen)", "drinks", 0, 0, 0, [...DR, "en:alcoholic-beverages", "en:spirits"], { serving: 50, unit: "ml" }),
  // ——— altele ———
  B("olive-oil", "Ulei, untură", "Oil, lard", "Öl, Schmalz", "other", 0, 0, 0, ["en:fats"], { serving: 10 }),
  B("mayo", "Maioneză, sos de usturoi", "Mayonnaise, garlic sauce", "Mayonnaise, Knoblauchsoße", "other", 2, 1.5, 0, ["en:sauces", "en:mayonnaises"], { serving: 15 }),
  B("ketchup", "Ketchup, sos dulce", "Ketchup, sweet sauce", "Ketchup, süße Soße", "other", 25, 22, 0, ["en:sauces", "en:ketchup"], { serving: 15, gi: 55 }),
  B("hummus", "Humus, pastă de năut", "Hummus", "Hummus", "other", 14, 0.5, 6, ["en:spreads", "en:legumes"], { serving: 50, gi: 25 }),
];

export const BASIC_PREFIX = "basic:";
export function basicProduct(b: Basic, lang: Lang): Product {
  const name = b.name[lang] ?? b.name.en;
  const gi = b.gi != null ? { gi: b.gi, source: "measured" as const } : estimateGi({ categories: b.cats, carbs100: b.carbs, fiber100: b.fiber, sugars100: b.sugars, name });
  return { code: BASIC_PREFIX + b.id, name, carbs100: b.carbs, sugars100: b.sugars, fiber100: b.fiber, protein100: b.protein, serving: b.serving, unit: b.unit ?? "g", ingredients: [], categories: b.cats, claims: [], gi: gi.gi, giSource: gi.source, source: "user" };
}
export function findBasic(code: string): Basic | undefined { return code.startsWith(BASIC_PREFIX) ? BASICS.find((b) => BASIC_PREFIX + b.id === code) : undefined; }
