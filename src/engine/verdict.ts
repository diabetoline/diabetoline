import type { Product, Verdict, Level } from "./types";
import { findHiddenSugars } from "./hiddenSugar";

/** Default serving when the label declares none, by unit and category. */
export function assumedServing(p: Product): number {
  const cats = p.categories.join(" ");
  if (p.unit === "ml") return /sodas|juice|drinks|beverage|milks/.test(cats) ? 250 : 200;
  if (/breads/.test(cats)) return 50;
  if (/cereals|muesli|granola|oats/.test(cats)) return 40;
  if (/yogurts|dairy-desserts/.test(cats)) return 150;
  if (/chocolates|biscuits|cookies|candies|bars/.test(cats)) return 25;
  if (/sauces|ketchup|spreads|jams|honey/.test(cats)) return 15;
  if (/pastas|rices|grains|legumes/.test(cats)) return 75; // dry weight
  if (/pizzas|ready-meals|lasagne/.test(cats)) return 300;
  return 100;
}

/** Thresholds (per serving). Starting point, to be validated with a diabetologist before launch. */
export const T = {
  greenCarbs: 15, greenSugars: 5,
  yellowCarbs: 30, yellowSugars: 12,
  fiberBonusSmall: 3, fiberBonusBig: 4,
  glRed: 20,
  denseRed: 45, denseYellow: 25, // sugars per 100 g
};

export function analyze(p: Product): Verdict {
  const serving = p.serving ?? assumedServing(p);
  const k = serving / 100;
  const carbs = p.carbs100 * k, sugars = p.sugars100 * k, fiber = p.fiber100 * k;
  const hidden = findHiddenSugars(p.ingredients);
  const bonus = fiber >= T.fiberBonusBig ? 10 : fiber >= T.fiberBonusSmall ? 5 : 0;

  let level: Level =
    carbs <= T.greenCarbs + bonus && sugars <= T.greenSugars ? "green"
    : carbs <= T.yellowCarbs && sugars <= T.yellowSugars ? "yellow"
    : "red";

  const gl = p.gi == null ? null : (p.gi * carbs) / 100;
  if (gl != null && gl >= T.glRed) level = "red";
  // density rule: a product that is mostly sugar stays red even in a tiny declared serving
  const sugarDense = p.sugars100 >= T.denseRed;
  if (sugarDense) level = "red";
  else if (p.sugars100 >= T.denseYellow && level === "green") level = "yellow";
  if (hidden.length && level === "green") level = "yellow";

  const sweetClaim = p.claims.some((c) => ["no_added_sugar", "sugar_free", "for_diabetics"].includes(c));
  const labelTrap = sweetClaim && (hidden.length > 0 || sugars > T.greenSugars);
  if (labelTrap) level = "red";

  const reasons: string[] = [];
  if (carbs <= T.greenCarbs + bonus) reasons.push("carbs_low");
  else if (carbs <= T.yellowCarbs) reasons.push("carbs_mid");
  else reasons.push("carbs_high");
  if (sugars > T.yellowSugars) reasons.push("sugars_high");
  else if (sugars > T.greenSugars) reasons.push("sugars_mid");
  if (bonus) reasons.push("fiber_good");
  if (p.gi != null && p.gi >= 70) reasons.push("gi_high");
  if (gl != null && gl >= T.glRed) reasons.push("gl_high");
  if (sugarDense) reasons.push("sugar_dense");
  if (hidden.length) reasons.push("hidden_sugar");
  if (labelTrap) reasons.push("label_trap");

  const walkMinutes = carbs < 15 ? 0 : carbs < 25 ? 10 : carbs < 40 ? 15 : 20;

  return {
    level, carbs: r1(carbs), sugars: r1(sugars), fiber: r1(fiber), serving,
    servingAssumed: p.serving == null, gl: gl == null ? null : Math.round(gl),
    hiddenSugars: hidden, labelTrap, reasons, walkMinutes,
  };
}

const r1 = (x: number) => Math.round(x * 10) / 10;

export const giLevel = (gi: number) => (gi <= 55 ? "low" : gi <= 69 ? "mid" : "high");
export const glLevel = (gl: number) => (gl <= 10 ? "low" : gl < 20 ? "mid" : "high");
