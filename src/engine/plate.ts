import type { Level } from "./types";

/** Un aliment recunoscut în poza farfuriei (estimări). */
export interface PlateFood { name: string; grams: number; carbs: number; gi: number | null }
export interface PlateAnalysis { foods: PlateFood[]; summary: string; tips: string[] }
export interface MealVerdict { level: Level; carbs: number; gl: number }

/**
 * Pragurile pentru o masă întreagă (nu pentru o porție dintr-un produs).
 * Punct de pornire, de validat cu diabetologul, ca și pragurile din verdict.ts.
 */
export const MEAL_T = { glYellow: 15, glRed: 25, carbsYellow: 45, carbsRed: 75 };

/** Indicele glicemic implicit când modelul nu dă unul pentru un aliment cu carbohidrați. */
const GI_FALLBACK = 55;

export function mealVerdict(foods: PlateFood[]): MealVerdict {
  let carbs = 0, gl = 0;
  for (const f of foods) {
    const c = Math.max(0, f.carbs);
    carbs += c;
    gl += (c * (f.gi ?? GI_FALLBACK)) / 100;
  }
  carbs = Math.round(carbs); gl = Math.round(gl);
  const level: Level = gl > MEAL_T.glRed || carbs > MEAL_T.carbsRed ? "red"
    : gl > MEAL_T.glYellow || carbs > MEAL_T.carbsYellow ? "yellow" : "green";
  return { level, carbs, gl };
}

export const giBand = (gi: number) => (gi < 56 ? "low" : gi < 70 ? "mid" : "high") as "low" | "mid" | "high";
