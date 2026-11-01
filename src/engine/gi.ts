/** Glycemic index estimation from product category and composition.
 *  GI cannot be read from a label; it is measured in human studies. We map the product
 *  to the closest reference food (international GI tables, University of Sydney) and
 *  adjust for fiber. Always surfaced to the user as "estimated". */

interface Rule { match: RegExp; gi: number }

/** Order matters: first match wins, so specific rules come before generic ones. */
const RULES: Rule[] = [
  // drinks
  { match: /waters|mineral-water|sparkling-water|unsweetened-tea|coffees|diet-sod|zero/i, gi: 0 },
  { match: /fruit-juice|orange-juice|apple-juice|nectar/i, gi: 50 },
  { match: /sodas|soft-drink|energy-drink|iced-tea|lemonade/i, gi: 63 },
  // bread & bakery
  { match: /rye-bread|pumpernickel|sourdough/i, gi: 50 },
  { match: /whole-grain-bread|wholemeal|wholegrain-bread|multigrain/i, gi: 55 },
  { match: /white-bread|baguette|toast|burger-bun|sandwich-bread|breads/i, gi: 75 },
  { match: /crackers|rice-cakes|breadsticks|crispbread/i, gi: 70 },
  { match: /croissant|pastries|viennoiserie|donut|cakes|muffin/i, gi: 67 },
  // breakfast cereals
  { match: /oat-flakes|rolled-oats|porridge|oats/i, gi: 55 },
  { match: /muesli|granola/i, gi: 57 },
  { match: /corn-flakes|puffed-rice|rice-krispies|chocolate-cereals|breakfast-cereals/i, gi: 77 },
  // grains, pasta, rice
  { match: /basmati/i, gi: 58 },
  { match: /brown-rice|wild-rice/i, gi: 55 },
  { match: /rices|white-rice|rice-noodles|sticky-rice/i, gi: 73 },
  { match: /whole-wheat-pasta|wholegrain-pasta|legume-pasta|lentil-pasta/i, gi: 42 },
  { match: /pastas|noodles|spaghetti|couscous|gnocchi/i, gi: 50 },
  { match: /quinoa|bulgur|barley|buckwheat/i, gi: 48 },
  { match: /mashed-potato|instant-potato|french-fries|chips-and-fries/i, gi: 80 },
  { match: /potatoes/i, gi: 70 },
  { match: /sweet-potato/i, gi: 61 },
  // legumes
  { match: /lentils|chickpeas|beans|hummus|legumes/i, gi: 30 },
  // dairy
  { match: /flavoured-yogurt|fruit-yogurt|sweetened-yogurt|drinking-yogurt/i, gi: 40 },
  { match: /greek-yogurt|plain-yogurt|natural-yogurt|yogurts|skyr|kefir|cottage/i, gi: 20 },
  { match: /milks|dairy-drinks/i, gi: 30 },
  { match: /cheeses|butter|cream/i, gi: 0 },
  { match: /ice-cream/i, gi: 55 },
  // sweets
  { match: /dark-chocolate|chocolate-with-high-cocoa|85|70-cocoa/i, gi: 23 },
  { match: /milk-chocolate|white-chocolate|chocolates|chocolate-bar/i, gi: 43 },
  { match: /gummies|candies|jelly|marshmallow|hard-candy/i, gi: 78 },
  { match: /biscuits|cookies|wafers|shortbread/i, gi: 65 },
  { match: /jams|marmalade|spreads-sweet|honey|syrup/i, gi: 60 },
  { match: /chocolate-spread|hazelnut-spread/i, gi: 55 },
  // fruit & veg
  { match: /dates|dried-fruit|raisins|dried-mango/i, gi: 62 },
  { match: /bananas/i, gi: 51 },
  { match: /watermelon|melon|pineapple/i, gi: 70 },
  { match: /grapes|mango|cherries/i, gi: 55 },
  { match: /apples|pears|berries|strawberr|citrus|oranges|peaches|plums|kiwi/i, gi: 38 },
  { match: /fruits/i, gi: 45 },
  { match: /carrots|beetroot|corn|sweetcorn|peas|pumpkin/i, gi: 50 },
  { match: /vegetables|salads|leafy|tomatoes|cucumbers|peppers|mushrooms/i, gi: 15 },
  // nuts, meat, fish, eggs, fats
  { match: /nuts|seeds|almonds|walnuts|peanut/i, gi: 15 },
  { match: /meats|poultry|fish|seafood|eggs|oils|fats|sausages|charcuterie/i, gi: 0 },
  // snacks & sauces
  { match: /crisps|potato-chips|popcorn|pretzels|salty-snacks/i, gi: 60 },
  { match: /ketchup|barbecue|sweet-sauce|sweet-chili/i, gi: 55 },
  { match: /sauces|mayonnaise|mustard|dressings|vinegar/i, gi: 15 },
  { match: /pizzas|lasagne|ready-meals|sandwiches/i, gi: 60 },
  { match: /soups/i, gi: 45 },
  { match: /flours|wheat-flour|semolina/i, gi: 70 },
  { match: /sugars|sweeteners/i, gi: 65 },
  { match: /protein-bars|cereal-bars|snack-bars/i, gi: 55 },
];

export interface GiEstimate { gi: number | null; source: "estimated" | "none"; basis: string }

export function estimateGi(opts: { categories: string[]; carbs100: number; fiber100: number; sugars100: number; name?: string }): GiEstimate {
  const { categories, carbs100, fiber100, sugars100 } = opts;
  if (carbs100 < 2) return { gi: null, source: "none", basis: "no_carbs" };
  // most specific category tag comes last in Open Food Facts; check from the end
  const tags = [...categories].reverse().map((c) => c.replace(/^[a-z]{2}:/, ""));
  const haystack = tags.join(" ") + " " + (opts.name ?? "").toLowerCase().replace(/\s+/g, "-");
  let gi: number | null = null;
  let basis = "generic";
  for (const r of RULES) {
    if (r.match.test(haystack)) { gi = r.gi; basis = r.match.source.split("|")[0]; break; }
  }
  if (gi === null) {
    // fallback from composition: sugar-heavy → higher, fiber-heavy → lower
    const sugarShare = carbs100 > 0 ? sugars100 / carbs100 : 0;
    gi = 55 + Math.round(sugarShare * 15);
    basis = "composition";
  }
  // fiber adjustment: ≥6 g/100 g lowers the estimate, capped
  if (fiber100 >= 6 && gi > 20) gi = Math.max(20, gi - 8);
  else if (fiber100 >= 3 && gi > 20) gi = Math.max(20, gi - 4);
  return { gi: Math.min(100, Math.max(0, gi)), source: "estimated", basis };
}
