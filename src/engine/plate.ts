import type { Level } from "./types";

/** Un aliment recunoscut în poza farfuriei (estimări). */
export interface PlateFood {
  name: string; grams: number; carbs: number; gi: number | null; x?: number | null; y?: number | null;
  /** Semnalele date de model despre felul alimentului (lipsesc la analizele vechi). */
  sweet?: boolean;   // dulce cu zahăr: dulceață, prăjitură, bomboane, suc, miere, băutură îndulcită
  fried?: boolean;   // prăjit în ulei / pane
  refined?: boolean; // făinoase albe: pâine albă, orez alb, paste albe, cartofi prăjiți, pesmet
  veg?: boolean;     // legume sau salată
  alcohol?: boolean; // bere, vin, tărie, cocktail
}
export interface PlateAnalysis { foods: PlateFood[]; summary: string; tips: string[]; level?: Level }
export interface MealVerdict { level: Level; carbs: number; gl: number }

/**
 * Pragurile pentru o masă întreagă (nu pentru o porție dintr-un produs).
 * Punct de pornire, de validat cu diabetologul, ca și pragurile din verdict.ts.
 */
export const MEAL_T = { glYellow: 12, glRed: 25, carbsYellow: 45, carbsRed: 75, sweetRed: 12, bigPlate: 400, alcoholRed: 400 };

/** Indicele glicemic implicit când modelul nu dă unul pentru un aliment cu carbohidrați. */
const GI_FALLBACK = 55;

const RANK: Record<Level, number> = { green: 0, yellow: 1, red: 2 };
const worst = (a: Level, b: Level): Level => (RANK[a] >= RANK[b] ? a : b);

/**
 * Verdictul mesei: cantitatea de carbohidrați și încărcătura glicemică, plus reguli pe felul alimentelor
 * (o lingură de dulceață are puțini carbohidrați, dar e zahăr curat; un pane prăjit fără legume nu e „potrivit”).
 * Dacă modelul a dat și el un verdict, rămâne cel mai sever dintre cele două.
 */
export function mealVerdict(foods: PlateFood[], modelLevel?: Level | null): MealVerdict {
  let carbs = 0, gl = 0, grams = 0, sweetCarbs = 0, alcoholMl = 0, sweetAlcohol = false;
  let fried = false, refined = false, veg = false;
  for (const f of foods) {
    const c = Math.max(0, f.carbs);
    carbs += c; grams += Math.max(0, f.grams);
    gl += (c * (f.gi ?? GI_FALLBACK)) / 100;
    if (f.sweet) sweetCarbs += c;
    if (f.fried) fried = true;
    if (f.refined) refined = true;
    if (f.veg) veg = true;
    if (f.alcohol) { alcoholMl += Math.max(0, f.grams); if (f.sweet) sweetAlcohol = true; }
  }
  carbs = Math.round(carbs); gl = Math.round(gl);
  let level: Level = gl > MEAL_T.glRed || carbs > MEAL_T.carbsRed ? "red"
    : gl > MEAL_T.glYellow || carbs > MEAL_T.carbsYellow ? "yellow" : "green";
  // dulciuri cu zahăr: niciodată verde; de la o porție obișnuită în sus, roșu
  if (sweetCarbs > 0) level = worst(level, sweetCarbs >= MEAL_T.sweetRed ? "red" : "yellow");
  // prăjit sau făinoase albe fără legume lângă: cel puțin „cu măsură”
  if ((fried || refined) && !veg) level = worst(level, "yellow");
  // porție mare fără nicio legumă: cel puțin „cu măsură”
  if (grams >= MEAL_T.bigPlate && !veg) level = worst(level, "yellow");
  // alcool: niciodată verde; un pahar → cu măsură (cu mâncare); mult sau dulce (cocktail, lichior, vin dulce) → roșu
  if (alcoholMl > 0) level = worst(level, alcoholMl >= MEAL_T.alcoholRed || sweetAlcohol ? "red" : "yellow");
  if (modelLevel) level = worst(level, modelLevel);
  return { level, carbs, gl };
}

export const giBand = (gi: number) => (gi < 56 ? "low" : gi < 70 ? "mid" : "high") as "low" | "mid" | "high";
