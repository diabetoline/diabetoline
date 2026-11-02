/**
 * POST /api/plate — analizează poza unei farfurii (acasă sau la restaurant).
 * Primește { image: base64 JPEG, lang } și întoarce alimentele estimate (porție, carbohidrați, indice glicemic),
 * o propoziție de rezumat și până la 3 recomandări practice. Verdictul îl calculează aplicația (src/engine/plate.ts).
 * Poza nu se salvează pe server.
 */
import { askVision, LANG_NAME, readImageBody } from "../../src/server/claude";

const prompt = (lang: string) => `You help an older person with diabetes understand a meal from a photo of their plate.
Identify each food on the plate. For each, estimate the portion in grams, the carbohydrates in grams for that portion, and its glycemic index (GI, 0-100; null if the food has almost no carbohydrates, e.g. meat, fish, eggs, cheese, oil).
Then write, in ${LANG_NAME[lang]}:
- "summary": one short, kind sentence about the meal's likely effect on blood sugar (no blame).
- "tips": up to 3 short practical tips (max 18 words each) for THIS plate, e.g. eat the vegetables and protein first, leave part of the bread or potatoes, add a salad, take a walk after eating.
Never mention insulin, doses, medication changes, diagnoses or medical treatment.
Food names also in ${LANG_NAME[lang]}, short and everyday.
Reply with ONLY JSON:
{"ok":true,"foods":[{"name":string,"grams":number,"carbs":number,"gi":number|null}],"summary":string,"tips":[string]}
If the photo shows no food, reply {"ok":false,"reason":"no_food"}.`;

const n = (x: unknown, max: number) => (typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= max ? Math.round(x) : null);

export async function POST(request: Request): Promise<Response> {
  const body = await readImageBody(request);
  if (!body) return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });
  const r = await askVision(body.image, prompt(body.lang), 900);
  if (!r.ok) return Response.json({ ok: false, reason: r.reason }, { status: r.status });
  const o = r.json as { ok?: boolean; reason?: string; foods?: unknown; summary?: unknown; tips?: unknown };
  if (!o.ok) return Response.json({ ok: false, reason: o.reason === "no_food" ? "no_food" : "unreadable" }, { status: 422 });

  const foods = (Array.isArray(o.foods) ? o.foods : []).slice(0, 12).flatMap((f) => {
    const x = f as Record<string, unknown>;
    const name = typeof x.name === "string" ? x.name.trim().slice(0, 60) : "";
    const grams = n(x.grams, 2000), carbs = n(x.carbs, 400);
    if (!name || grams == null || carbs == null) return [];
    return [{ name, grams, carbs, gi: n(x.gi, 110) }];
  });
  if (foods.length === 0) return Response.json({ ok: false, reason: "no_food" }, { status: 422 });
  const tips = (Array.isArray(o.tips) ? o.tips : []).filter((t): t is string => typeof t === "string").map((t) => t.trim().slice(0, 160)).filter(Boolean).slice(0, 3);
  const summary = typeof o.summary === "string" ? o.summary.trim().slice(0, 240) : "";
  return Response.json({ ok: true, foods, summary, tips });
}
