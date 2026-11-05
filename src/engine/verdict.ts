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
  if (/seeds|nuts|chia|flax|sesame|almonds|walnuts|peanut/.test(cats)) return 30;
  if (/bran|oat-bran|wheat-bran|psyllium|fibre-mix|fiber/.test(cats)) return 30;
  if (/pastas|rices|grains|legumes/.test(cats)) return 75; // dry weight
  if (/pizzas|ready-meals|lasagne/.test(cats)) return 300;
  return 100;
}

/** Thresholds (per serving). Starting point, to be validated with a diabetologist before launch. */
export const T = {
  greenCarbs: 15, greenSugars: 5, greenSugarsDairy: 8,
  yellowCarbs: 30, yellowSugars: 12,
  fiberBonusSmall: 3, fiberBonusBig: 4,
  fiberBonusSmallCarbs: 5, fiberBonusBigCarbs: 7, // carbohidrați în plus permiși la verde, dacă are fibre
  glRed: 20,
  denseRed: 45, denseYellow: 25, // sugars per 100 g
  giHigh: 70, giHighRedCarbs: 20, // IG ridicat: niciodată verde; cu ≥ 20 g carbohidrați pe porție → roșu
  sugaryDrink: 4, sugaryMilk: 7,  // zahăr la 100 ml: băuturile dulci sunt roșii oricare ar fi porția; laptele/iaurtul de băut doar dacă e îndulcit
  alcoholRedMl: 400, alcoholRedSugars: 5,
  servingFloor: 0.6, // porția declarată nu poate fi mai mică de 60% din porția obișnuită a categoriei (contra „porțiilor de 10 g”)
};

const ALCOHOL = /alcoholic-beverages|\bbeers?\b|\bwines?\b|spirits|liqueurs|ciders|vodka|whisk|cognac|brandy|rum\b|gin\b|tequila|palinca|pălincă|țuică|tuica|rachiu|sparkling-wines|champagne|aperitif|vermouth/i;
const ALCOHOL_NAME = /\bbere\b|\bbier\b|\bbeer\b|\bvin\b|\bwein\b|\bwine\b|vodka|whisk|cognac|coniac|brandy|\brom\b|\brum\b|\bgin\b|tequila|lichior|liqueur|likör|pălinc|palinc|țuic|tuic|rachiu|prosecco|șampanie|champagne|cidru|cider/i;
/** Zahăr adăugat printre primele ingrediente (ketchup, cereale, sosuri): nu poate fi verde. */
const ADDED_SUGAR = /\b(sugar|sugars|zahăr|zahar|zucker|sucre|azúcar|zucchero|cukor|brown-sugar|cane-sugar|zahăr brun|rohrzucker|glucose|dextrose|fructose|syrup|sirop|sirup|honey|miere|honig)\b/i;
/** Lactate simple: zahărul e lactoză, nu zahăr adăugat. */
const PLAIN_DAIRY = /yogurts|plain-yogurts|natural-yogurts|greek-yogurts|skyr|kefir|cottage|milks|buttermilk|sana|iaurt|lapte|joghurt|milch/i;
const DAIRY_DRINK = /milks|dairy-drinks|plant-based-milks|kefir|drinking-yogurt|ayran|lapte|milch|milk/i;
/** Categorii cu porții declarate adesea „de marketing” (o napolitană, un pătrățel). */
const FLOORED = /chocolates|biscuits|cookies|wafers|cakes|pastries|breads|cereals|muesli|granola|spreads|jams|honey|crisps|snacks|candies|bars|crackers/i;

export function isAlcohol(p: Product): boolean {
  return ALCOHOL.test(p.categories.join(" ")) || ALCOHOL_NAME.test(p.name);
}

export function analyze(p: Product): Verdict {
  const usual = assumedServing(p);
  const cats = p.categories.join(" ");
  const floor = FLOORED.test(cats) ? T.servingFloor * usual : 0;
  const serving = p.serving == null ? usual : Math.max(p.serving, floor);
  const k = serving / 100;
  const carbs = p.carbs100 * k, sugars = p.sugars100 * k, fiber = p.fiber100 * k;
  const hidden = findHiddenSugars(p.ingredients);
  const bonus = fiber >= T.fiberBonusBig ? T.fiberBonusBigCarbs : fiber >= T.fiberBonusSmall ? T.fiberBonusSmallCarbs : 0;
  const addedSugar = p.ingredients.slice(0, 4).some((i) => ADDED_SUGAR.test(i));
  // iaurt natural, lapte, kefir: lactoza nu e zahăr adăugat; un pahar/un iaurt rămâne verde
  const plainDairy = PLAIN_DAIRY.test(cats + " " + p.name) && !addedSugar && !hidden.length && p.sugars100 <= 5.5;
  const greenSugars = plainDairy ? T.greenSugarsDairy : T.greenSugars;

  let level: Level =
    carbs <= T.greenCarbs + bonus && sugars <= greenSugars ? "green"
    : carbs <= T.yellowCarbs && sugars <= T.yellowSugars ? "yellow"
    : "red";

  const gl = p.gi == null ? null : (p.gi * carbs) / 100;
  if (gl != null && gl >= T.glRed) level = "red";
  // density rule: a product that is mostly sugar stays red even in a tiny declared serving
  const sugarDense = p.sugars100 >= T.denseRed;
  if (sugarDense) level = "red";
  else if (p.sugars100 >= T.denseYellow && level === "green") level = "yellow";
  if (hidden.length && level === "green") level = "yellow";
  if (addedSugar && level === "green") level = "yellow";

  const sweetClaim = p.claims.some((c) => ["no_added_sugar", "sugar_free", "for_diabetics"].includes(c));
  const labelTrap = sweetClaim && (hidden.length > 0 || sugars > T.greenSugars);
  if (labelTrap) level = "red";

  // indice glicemic ridicat (pâine albă, orez alb, fulgi de porumb): niciodată verde; cu o porție reală de carbohidrați, roșu
  const giHigh = p.gi != null && p.gi >= T.giHigh && carbs >= 5;
  if (giHigh && level === "green") level = "yellow";
  if (giHigh && carbs >= T.giHighRedCarbs) level = "red";

  // băuturi dulci: zahărul lichid intră direct în sânge; nu contează cât de mică e porția declarată
  const dairy = DAIRY_DRINK.test(cats + " " + p.name);
  const sugaryDrink = p.unit === "ml" && p.sugars100 >= (dairy ? T.sugaryMilk : T.sugaryDrink) && !isAlcohol(p);
  if (sugaryDrink) level = "red";

  // alcool: niciodată verde; mult sau dulce → roșu
  const alcohol = isAlcohol(p);
  if (alcohol) level = serving >= T.alcoholRedMl || sugars > T.alcoholRedSugars || level === "red" ? "red" : "yellow";

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
  else if (addedSugar && sugars > 0) reasons.push("added_sugar");
  if (labelTrap) reasons.push("label_trap");
  if (sugaryDrink) reasons.push("sugary_drink");
  if (alcohol) reasons.push("alcohol");

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
