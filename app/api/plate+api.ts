/**
 * POST /api/plate — analizează poza unei farfurii (acasă sau la restaurant).
 * Primește { image: base64 JPEG, lang } și întoarce alimentele estimate (porție, carbohidrați, indice glicemic),
 * o propoziție de rezumat și până la 3 recomandări practice. Verdictul îl calculează aplicația (src/engine/plate.ts).
 * Poza nu se salvează pe server.
 */
import { askVision, LANG_NAME, readImageBody } from "../../src/server/claude";

const prompt = (lang: string) => `You help an older person with type 2 diabetes understand a meal from a photo of their plate.
Judge like an experienced, strict diabetes dietitian who is kind to the person: the standard is what keeps blood sugar steady, not what people usually eat. Be strict about sweets, sugary drinks, alcohol, white flour, fried food and big portions. Be lenient only about small slips (one square of chocolate, a spoonful, a taste): say honestly that it is not ideal, allow it without blame, and say what to do next (stop there, walk, measure in 2 hours). Never shame, never lecture.
Identify each food or drink in the photo (a plate, a bowl, a glass of wine or beer, a juice, a coffee with milk, a snack in hand: all count). For each, estimate the portion in grams (for drinks use millilitres as grams), the carbohydrates in grams for that portion, its glycemic index (GI, 0-100; null if the food has almost no carbohydrates, e.g. meat, fish, eggs, cheese, oil), and the position of its centre in the photo as percentages: "x" from the left (0-100) and "y" from the top (0-100).
For each food also set four booleans: "sweet" (contains added sugar or is a sweet: jam, honey, cake, biscuits, chocolate, candy, sweetened drinks, fruit juice, sweet yoghurt, dried fruit, dates, syrups), "fried" (deep-fried or breaded/pane), "refined" (white flour or refined starch: white bread, white rice, white pasta, French fries, breading, pastry), "veg" (vegetables or salad, not potatoes), "alcohol" (beer, wine, spirits, cocktails; for a multipack or bottle, estimate ONE serving the person would drink, e.g. 330-500 ml of beer, 150 ml of wine).
Then give "level": "green" if the meal is fine for a person with diabetes, "yellow" if it should be eaten with moderation, "red" if it is best avoided or kept to a tiny taste. Use these thresholds so your level matches the app's: glycemic load = sum of carbs × GI / 100 over the plate. Green if load ≤ 12 (≤ 18 when the plate has vegetables and nothing refined, fried or sweet) and carbs ≤ 45 g; red if load > 30 or carbs > 75 g; otherwise yellow. Sweets with added sugar are never green. A fried or breaded dish without vegetables is at most yellow. Alcohol is never green: one glass with food is yellow, more than one glass or a sweet drink (cocktail, liqueur, sweet wine) is red.
Then write, in ${LANG_NAME[lang]}, consistent with that level (a yellow or red meal must not be described as fine):
- "summary": one short, honest sentence (max 20 words) about the meal's likely effect on blood sugar, in the tone above.
- "tips": up to 3 short practical tips (max 12 words each) for THIS photo; for alcohol: drink it with food, not on an empty stomach, and keep it to one glass; e.g. eat the vegetables and protein first, leave part of the bread or potatoes, add a salad, take a walk after eating.
Never mention insulin, doses, medication changes, diagnoses or medical treatment.
Food names also in ${LANG_NAME[lang]}, short and everyday.
Reply with ONLY JSON:
{"ok":true,"foods":[{"name":string,"grams":number,"carbs":number,"gi":number|null,"sweet":boolean,"fried":boolean,"refined":boolean,"veg":boolean,"alcohol":boolean,"x":number,"y":number}],"level":"green"|"yellow"|"red","summary":string,"tips":[string]}
Only if the photo shows no food and no drink at all, reply {"ok":false,"reason":"no_food"}.`;

const n = (x: unknown, max: number) => (typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= max ? Math.round(x) : null);

export async function POST(request: Request): Promise<Response> {
  const body = await readImageBody(request);
  if (!body) return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });
  const r = await askVision(body.image, prompt(body.lang), 2500);
  if (!r.ok) return Response.json({ ok: false, reason: r.reason }, { status: r.status });
  const o = r.json as { ok?: boolean; reason?: string; foods?: unknown; summary?: unknown; tips?: unknown; level?: unknown };
  if (!o.ok) return Response.json({ ok: false, reason: o.reason === "no_food" ? "no_food" : "unreadable" }, { status: 422 });

  const foods = (Array.isArray(o.foods) ? o.foods : []).slice(0, 12).flatMap((f) => {
    const x = f as Record<string, unknown>;
    const name = typeof x.name === "string" ? x.name.trim().slice(0, 60) : "";
    const grams = n(x.grams, 2000), carbs = n(x.carbs, 400);
    if (!name || grams == null || carbs == null) return [];
    const px = n(x.x, 100), py = n(x.y, 100);
    const b = (k: string) => x[k] === true;
    return [{ name, grams, carbs, gi: n(x.gi, 110), sweet: b("sweet"), fried: b("fried"), refined: b("refined"), veg: b("veg"), alcohol: b("alcohol"), x: px, y: py }];
  });
  if (foods.length === 0) return Response.json({ ok: false, reason: "no_food" }, { status: 422 });
  const tips = (Array.isArray(o.tips) ? o.tips : []).filter((t): t is string => typeof t === "string").map((t) => t.trim().slice(0, 160)).filter(Boolean).slice(0, 3);
  const summary = typeof o.summary === "string" ? o.summary.trim().slice(0, 240) : "";
  const level = o.level === "green" || o.level === "yellow" || o.level === "red" ? o.level : undefined;
  return Response.json({ ok: true, foods, level, summary, tips });
}
