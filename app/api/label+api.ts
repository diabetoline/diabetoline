/**
 * POST /api/label — citește tabelul nutrițional dintr-o poză a etichetei.
 * Primește { image: base64 JPEG, lang } și întoarce valorile la 100 g / 100 ml.
 * Cheia ANTHROPIC_API_KEY stă doar pe server (variabilă secretă în EAS), niciodată în aplicație.
 * Poza nu se salvează nicăieri: se trimite la model și se uită.
 */
import { askVision, readImageBody } from "../../src/server/claude";

const PROMPT = `You read food packaging photos. Extract the nutrition table values PER 100 g or PER 100 ml (never per serving; if only per-serving values are printed, convert them using the serving size).
Reply with ONLY a JSON object, no prose:
{"ok":true,"name":string|null,"brand":string|null,"unit":"g"|"ml","carbs100":number|null,"sugars100":number|null,"fiber100":number|null,"protein100":number|null,"serving":number|null,"ingredients":string|null}
"carbs100" is total carbohydrates (not "of which sugars"). Use null for anything not legible. Numbers use a dot as decimal separator.
If the photo shows no nutrition table, reply {"ok":false,"reason":"no_table"}.`;

type Out = {
  ok: boolean; reason?: string; name?: string | null; brand?: string | null; unit?: "g" | "ml";
  carbs100?: number | null; sugars100?: number | null; fiber100?: number | null; protein100?: number | null;
  serving?: number | null; ingredients?: string | null;
};

const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 100 ? Math.round(x * 10) / 10 : null);

export async function POST(request: Request): Promise<Response> {
  const body = await readImageBody(request);
  if (!body) return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });
  const r = await askVision(body.image, PROMPT, 600);
  if (!r.ok) return Response.json({ ok: false, reason: r.reason }, { status: r.status });
  const o = r.json as Out;
  if (!o.ok) return Response.json({ ok: false, reason: o.reason ?? "no_table" }, { status: 422 });
  if (num(o.carbs100) == null && num(o.sugars100) == null) return Response.json({ ok: false, reason: "no_table" }, { status: 422 });

  return Response.json({
    ok: true,
    name: typeof o.name === "string" ? o.name.slice(0, 120) : null,
    brand: typeof o.brand === "string" ? o.brand.slice(0, 60) : null,
    unit: o.unit === "ml" ? "ml" : "g",
    carbs100: num(o.carbs100), sugars100: num(o.sugars100), fiber100: num(o.fiber100), protein100: num(o.protein100),
    serving: typeof o.serving === "number" && o.serving > 0 && o.serving < 2000 ? Math.round(o.serving) : null,
    ingredients: typeof o.ingredients === "string" ? o.ingredients.slice(0, 2000) : null,
  });
}
