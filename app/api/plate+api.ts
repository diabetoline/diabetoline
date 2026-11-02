/**
 * POST /api/plate — analizează poza unei farfurii (acasă sau la restaurant).
 * Primește { image: base64 JPEG, lang } și întoarce alimentele estimate (porție, carbohidrați, indice glicemic),
 * o propoziție de rezumat și până la 3 recomandări practice. Verdictul îl calculează aplicația (src/engine/plate.ts).
 * Poza nu se salvează pe server.
 */
import { askVision, LANG_NAME, readImageBody } from "../../src/server/claude";

const prompt = (lang: string) => `You help an older person with diabetes understand a meal from a photo of their plate.
Identify each food on the plate. For each, estimate the portion in grams, the carbohydrates in grams for that portion, its glycemic index (GI, 0-100; null if the food has almost no carbohydrates, e.g. meat, fish, eggs, cheese, oil), and the position of its centre in the photo as percentages: "x" from the left (0-100) and "y" from the top (0-100).
Then write, in ${LANG_NAME[lang]}:
- "summary": one short, kind sentence (max 20 words) about the meal's likely effect on blood sugar (no blame).
- "tips": up to 3 short practical tips (max 12 words each) for THIS plate, e.g. eat the vegetables and protein first, leave part of the bread or potatoes, add a salad, take a walk after eating.
Never mention insulin, doses, medication changes, diagnoses or medical treatment.
Food names also in ${LANG_NAME[lang]}, short and everyday.
Reply with ONLY JSON:
{"ok":true,"foods":[{"name":string,"grams":number,"carbs":number,"gi":number|null,"x":number,"y":number}],"summary":string,"tips":[string]}
If the photo shows no food, reply {"ok":false,"reason":"no_food"}.`;

const n = (x: unknown, max: number) => (typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= max ? Math.round(x) : null);

export async function POST(request: Request): Promise<Response> {
  const body = await readImageBody(request);
  if (!body) return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });
  const r = await askVision(body.image, prompt(body.lang), 2500);
  if (!r.ok) return Response.json({ ok: false, reason: r.reason }, { status: r.status });
  const o = r.json as { ok?: boolean; reason?: string; foods?: unknown; summary?: unknown; tips?: unknown };
  if (!o.ok) return Response.json({ ok: false, reason: o.reason === "no_food" ? "no_food" : "unreadable" }, { status: 422 });

  const foods = (Array.isArray(o.foods) ? o.foods : []).slice(0, 12).flatMap((f) => {
    const x = f as Record<string, unknown>;
    const name = typeof x.name === "string" ? x.name.trim().slice(0, 60) : "";
    const grams = n(x.grams, 2000), carbs = n(x.carbs, 400);
    if (!name || grams == null || carbs == null) return [];
    const px = n(x.x, 100), py = n(x.y, 100);
    return [{ name, grams, carbs, gi: n(x.gi, 110), x: px, y: py }];
  });
  if (foods.length === 0) return Response.json({ ok: false, reason: "no_food" }, { status: 422 });
  const tips = (Array.isArray(o.tips) ? o.tips : []).filter((t): t is string => typeof t === "string").map((t) => t.trim().slice(0, 160)).filter(Boolean).slice(0, 3);
  const summary = typeof o.summary === "string" ? o.summary.trim().slice(0, 240) : "";
  return Response.json({ ok: true, foods, summary, tips });
}
