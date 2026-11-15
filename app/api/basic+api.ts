/**
 * POST /api/basic — aliment fără cod de bare scris de om („plăcintă cu dovleac de la piață”), pe care nu-l avem în lista `src/basics.ts`.
 * Modelul estimează valorile medii la 100 g, porția obișnuită, IG și categoriile OFF; omul confirmă pe ecranul produsului.
 * Nu e introducere manuală de la zero: omul scrie doar numele, cifrele vin de la model și trec prin același motor de verdict.
 */
import { askText, LANG_NAME } from "../../src/server/claude";

type In = { name?: string; lang?: string };

export async function POST(request: Request): Promise<Response> {
  let b: In;
  try { b = (await request.json()) as In; } catch { return Response.json({ ok: false, reason: "bad_request" }, { status: 400 }); }
  const name = (b.name ?? "").trim().slice(0, 80);
  if (name.length < 2) return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });
  const lang = b.lang === "ro" || b.lang === "de" ? b.lang : "en";
  const prompt = `A person with type 2 diabetes typed the name of a food or drink that has no barcode (market, bakery, canteen, home cooking, restaurant). Name, in ${LANG_NAME[lang]}: "${name}".
Give typical average nutrition values per 100 g (or per 100 ml for drinks) from standard food tables (USDA / national tables), a usual single portion in grams or ml, the glycemic index if known for this food (null if not), and 1–3 Open Food Facts style category tags (e.g. "en:fruits", "en:vegetables", "en:breads", "en:cheeses", "en:meats", "en:fishes", "en:pastas", "en:rices", "en:legumes", "en:sweets", "en:cakes", "en:pastries", "en:fried-foods", "en:meals", "en:soups", "en:beverages", "en:fruit-juices", "en:alcoholic-beverages", "en:beers", "en:wines", "en:nuts", "en:dairies", "en:yogurts").
Also a clean short display name in ${LANG_NAME[lang]} (fix typos, keep the person's meaning) and "kind": one of "sweet" (contains added sugar or is a dessert), "fried", "refined" (white flour / white rice / potatoes), "alcohol", "plain" (anything else).
If the text is not a food or drink, reply {"food":false}.
Reply with ONLY JSON:
{"food":true,"name":string,"carbs100":number,"sugars100":number,"fiber100":number,"protein100":number,"serving":number,"unit":"g"|"ml","gi":number|null,"cats":[string],"kind":string}`;
  const r = await askText(prompt, 600, "basic");
  if (!r.ok) return Response.json({ ok: false, reason: r.reason }, { status: r.status });
  const j = r.json as Record<string, unknown>;
  if (j.food === false) return Response.json({ ok: false, reason: "not_food" }, { status: 422 });
  const num = (x: unknown, max: number) => (typeof x === "number" && isFinite(x) && x >= 0 && x <= max ? Math.round(x * 10) / 10 : null);
  const carbs100 = num(j.carbs100, 100), sugars100 = num(j.sugars100, 100) ?? 0, fiber100 = num(j.fiber100, 60) ?? 0, protein100 = num(j.protein100, 100) ?? undefined;
  if (carbs100 == null) return Response.json({ ok: false, reason: "unreadable" }, { status: 422 });
  const unit = j.unit === "ml" ? "ml" : "g";
  const serving = num(j.serving, 1000) || (unit === "ml" ? 250 : 100);
  const gi = num(j.gi, 120);
  const cats = Array.isArray(j.cats) ? j.cats.filter((c): c is string => typeof c === "string" && /^en:[a-z0-9-]+$/.test(c)).slice(0, 4) : [];
  const kind = typeof j.kind === "string" && ["sweet", "fried", "refined", "alcohol", "plain"].includes(j.kind) ? j.kind : "plain";
  // „sweet” fără categorie dulce → adăugăm una, ca motorul să nu dea verde unei prăjituri de casă
  if (kind === "sweet" && !cats.some((c) => /sweet|cake|pastr|dessert|chocolate|ice-cream|jam|honey|biscuit/.test(c))) cats.push("en:sweets");
  if (kind === "fried" && !cats.includes("en:fried-foods")) cats.push("en:fried-foods");
  if (kind === "alcohol" && !cats.includes("en:alcoholic-beverages")) cats.push("en:alcoholic-beverages");
  return Response.json({ ok: true, product: { name: typeof j.name === "string" && j.name.trim() ? j.name.trim().slice(0, 80) : name, carbs100, sugars100: Math.min(sugars100, carbs100), fiber100, protein100, serving, unit, gi, cats, kind } });
}
