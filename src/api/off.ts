import type { Product } from "../engine/types";
import { estimateGi } from "../engine/gi";
import { findClaims } from "../engine/hiddenSugar";

const BASE = "https://world.openfoodfacts.org/api/v2/product/";
const FIELDS = [
  "code", "product_name", "product_name_en", "product_name_de", "product_name_ro", "brands", "image_front_small_url",
  "nutriments", "serving_quantity", "serving_size", "quantity", "ingredients_text", "ingredients_text_en", "ingredients",
  "categories_tags", "labels_tags", "labels", "nutriscore_grade", "nova_group",
].join(",");

export class NotFound extends Error {}

/** Raw Open Food Facts payload (only the fields we read). */
export interface OffPayload {
  status: number;
  product?: Record<string, any>;
}

export async function fetchProduct(barcode: string, lang = "en"): Promise<Product> {
  const res = await fetch(`${BASE}${encodeURIComponent(barcode)}.json?fields=${FIELDS}&lc=${lang}`, {
    headers: { "User-Agent": "DiabetolineScan/1.0 (contact@diabetoline.com)" },
  });
  if (res.status === 404) throw new NotFound(barcode);
  if (!res.ok) throw new Error(`OFF ${res.status}`);
  const data = (await res.json()) as OffPayload;
  if (data.status !== 1 || !data.product) throw new NotFound(barcode);
  return normalize(data.product, lang);
}

/** Convert an OFF product into our Product. Exported so it can be unit-tested with fixtures. */
export function normalize(o: Record<string, any>, lang = "en"): Product {
  const n = o.nutriments ?? {};
  const num = (k: string) => { const v = Number(n[k]); return Number.isFinite(v) ? v : 0; };
  const unit: "g" | "ml" = /\bml\b|\bl\b|\bcl\b/i.test(String(o.quantity ?? "")) || (o.categories_tags ?? []).some((c: string) => /beverages|drinks|juices|waters|milks/.test(c)) ? "ml" : "g";
  const servingRaw = Number(o.serving_quantity);
  const serving = Number.isFinite(servingRaw) && servingRaw > 0 ? servingRaw : undefined;

  const ingText: string = o[`ingredients_text_${lang}`] || o.ingredients_text_en || o.ingredients_text || "";
  const ingredients: string[] = Array.isArray(o.ingredients) && o.ingredients.length
    ? o.ingredients.map((i: any) => String(i.text ?? i.id ?? "")).filter(Boolean)
    : ingText.split(/[,;()]/).map((s: string) => s.trim()).filter(Boolean);

  const categories: string[] = o.categories_tags ?? [];
  const labelText = [o.product_name, o.labels, ...(o.labels_tags ?? [])].filter(Boolean).join(" ");
  const claims = findClaims(labelText);
  const name = o[`product_name_${lang}`] || o.product_name_en || o.product_name || "Produs fără nume";

  const carbs100 = num("carbohydrates_100g"), sugars100 = num("sugars_100g"), fiber100 = num("fiber_100g");
  const gi = estimateGi({ categories, carbs100, fiber100, sugars100, name });

  return {
    code: String(o.code), name, brand: o.brands || undefined, imageUrl: o.image_front_small_url || undefined,
    carbs100, sugars100, fiber100, protein100: num("proteins_100g"),
    serving, unit, ingredients, categories, claims, gi: gi.gi, giSource: gi.source,
  };
}
