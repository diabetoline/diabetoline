import type { Product } from "../engine/types";
import { analyze } from "../engine/verdict";
import { normalize } from "./off";

/**
 * Alternative verzi din aceeași categorie, pentru un produs roșu/galben.
 * Întâi din ce a scanat deja omul (cache), apoi din Open Food Facts: produsele populare
 * din categoria cea mai specifică, trecute prin motorul nostru de verdict; păstrăm doar verzile.
 */
const SEARCH = "https://world.openfoodfacts.org/api/v2/search";
const FIELDS = "code,product_name,product_name_en,product_name_de,product_name_ro,brands,image_front_small_url,nutriments,serving_quantity,quantity,ingredients_text,ingredients,categories_tags,labels_tags,labels,countries_tags";
const memo = new Map<string, Product[]>();

/** Categorii prea generale ca să dea alternative cu sens. */
const GENERIC = /^(en:)?(foods?|beverages|drinks|snacks|sweet-snacks|salty-snacks|plant-based-foods(-and-beverages)?|dairies|meals|groceries|cereals-and-potatoes|cereals-and-their-products|breakfasts|desserts|farming-products|fermented-foods|fermented-milk-products|frozen-foods|canned-foods|dried-products|spreads|condiments|sauces|fats|meats|fishes|seafood|fruits-and-vegetables-based-foods)$/;

export function pickCategories(categories: string[]): string[] {
  // OFF listează de la general la specific; luăm ultimele 3 care nu sunt generice, cea mai specifică prima
  return categories.filter((c) => c.startsWith("en:") && !GENERIC.test(c)).slice(-3).reverse();
}

export function greenFromCache(p: Product, cache: Record<string, Product>): Product[] {
  const cats = new Set(pickCategories(p.categories));
  if (!cats.size) return [];
  return Object.values(cache)
    .filter((q) => q.code !== p.code && !q.incomplete && q.categories.some((c) => cats.has(c)) && analyze(q).level === "green")
    .slice(0, 3);
}

export async function fetchGreenAlternatives(p: Product, lang: string, country?: string): Promise<Product[]> {
  const cats = pickCategories(p.categories);
  if (!cats.length) return [];
  const key = cats[0] + "|" + lang + "|" + (country ?? "");
  const hit = memo.get(key);
  if (hit) return hit;
  const out: Product[] = [];
  for (const cat of cats) {
    const params = new URLSearchParams({ categories_tags: cat, fields: FIELDS, sort_by: "unique_scans_n", page_size: "40", lc: lang });
    if (country) params.set("countries_tags", country);
    let rows: Record<string, any>[] = [];
    try {
      const res = await fetch(`${SEARCH}?${params}`, { headers: { "User-Agent": "Diabetoline/1.0 (contact@diabetoline.com)" } });
      if (!res.ok) continue;
      rows = ((await res.json()) as { products?: Record<string, any>[] }).products ?? [];
    } catch { continue; }
    for (const r of rows) {
      if (!r.code || r.code === p.code || !r.product_name) continue;
      const q = normalize(r, lang);
      if (q.incomplete || analyze(q).level !== "green") continue;
      if (!out.some((o) => o.code === q.code)) out.push(q);
      if (out.length >= 3) break;
    }
    if (out.length >= 2) break; // destule din categoria specifică; nu urcăm la părinte
  }
  memo.set(key, out);
  return out;
}
