import type { Product } from "../engine/types";
import { estimateGi } from "../engine/gi";
import { BASIC_PREFIX } from "../basics";
const API = process.env.EXPO_PUBLIC_API_URL || "https://curalife.expo.app";

export interface BasicGuess { name: string; carbs100: number; sugars100: number; fiber100: number; protein100?: number; serving: number; unit: "g" | "ml"; gi: number | null; cats: string[]; kind: string }

/** Aliment scris de om, fără cod: serverul estimează valorile, aici devine un produs „user” cu cod `basic:ai:<nume>`. */
export async function guessBasic(name: string, lang: string): Promise<{ ok: true; product: Product } | { ok: false; error: "not_food" | "network" | "not_configured" }> {
  try {
    const res = await fetch(`${API}/api/basic`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, lang }) });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; reason?: string; product?: BasicGuess };
    if (body.ok && body.product) {
      const g = body.product;
      const slug = g.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
      const gi = g.gi != null ? { gi: g.gi, source: "measured" as const } : estimateGi({ categories: g.cats, carbs100: g.carbs100, fiber100: g.fiber100, sugars100: g.sugars100, name: g.name });
      const product: Product = { code: `${BASIC_PREFIX}ai:${slug}`, name: g.name, carbs100: g.carbs100, sugars100: g.sugars100, fiber100: g.fiber100, protein100: g.protein100, serving: g.serving, unit: g.unit, ingredients: g.kind === "sweet" ? ["sugar"] : [], categories: g.cats, claims: [], gi: gi.gi, giSource: gi.source, source: "user" };
      return { ok: true, product };
    }
    if (body.reason === "not_food") return { ok: false, error: "not_food" };
    if (body.reason === "not_configured" || res.status === 404 || res.status === 503) return { ok: false, error: "not_configured" };
    return { ok: false, error: "network" };
  } catch { return { ok: false, error: "network" }; }
}
