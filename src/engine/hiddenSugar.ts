/** Ingredients that raise blood glucose but are not called "sugar" on the label.
 *  Keys are matched case-insensitively against ingredient text in RO / EN / DE / FR. */
const HIDDEN: Array<{ key: RegExp; id: string }> = [
  { key: /maltodextrin/i, id: "maltodextrin" },
  { key: /glucose[- ]fructose|fructose[- ]glucose|glukose[- ]fruktose|isoglucos|high[- ]fructose|hfcs/i, id: "glucose_fructose_syrup" },
  { key: /glucose syrup|sirop de glucoz|glukosesirup|sirop de glucose/i, id: "glucose_syrup" },
  { key: /dextros|dextrose|traubenzucker/i, id: "dextrose" },
  { key: /\bfructo[sz]|fruktose|fruchtzucker/i, id: "fructose" },
  { key: /maltitol|maltit\b/i, id: "maltitol" },
  { key: /\bmiere\b|\bhoney\b|\bhonig\b|\bmiel\b/i, id: "honey" },
  { key: /invert|invertzucker/i, id: "invert_sugar" },
  { key: /rice syrup|sirop de orez|reissirup|agave|corn syrup|sirop de porumb|maissirup|date syrup|sirop de curmale|caramel/i, id: "other_syrup" },
  { key: /molass|melas[ăa]|melasse/i, id: "molasses" },
  { key: /concentrat(ed)? (fruit|apple|grape) juice|suc concentrat|fruchtsaftkonzentrat/i, id: "juice_concentrate" },
  { key: /maltose|maltoz|malz/i, id: "maltose" },
];

export function findHiddenSugars(ingredients: string[]): string[] {
  const found: string[] = [];
  for (const raw of ingredients) {
    for (const h of HIDDEN) {
      if (h.key.test(raw) && !found.includes(h.id)) found.push(h.id);
    }
  }
  return found;
}

/** Label claims that often hide a high-sugar product. */
export const CLAIM_PATTERNS: Array<{ key: RegExp; id: string }> = [
  { key: /no added sugar|ohne zuckerzusatz|f[ăa]r[ăa] zah[ăa]r ad[ăa]ugat|sans sucres? ajout/i, id: "no_added_sugar" },
  { key: /sugar[- ]free|zuckerfrei|f[ăa]r[ăa] zah[ăa]r|sans sucre/i, id: "sugar_free" },
  { key: /diabeti|diabetic|diab[eé]tique/i, id: "for_diabetics" },
  { key: /\blight\b|\bleicht\b|reduced sugar|weniger zucker|mai pu[țt]in zah/i, id: "light" },
];

export function findClaims(text: string): string[] {
  return CLAIM_PATTERNS.filter((c) => c.key.test(text)).map((c) => c.id);
}
