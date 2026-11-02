/**
 * POST /api/ideas — idei de mese și gustări pentru azi, pe baza produselor scanate și a meselor recente.
 * Primește { lang, slot, products: [{name, level}], recentMeals: [string], avoid: [string] } și întoarce 3 idei.
 * Fără sfaturi medicale: doar mâncare simplă, cu carbohidrați estimați.
 */
import { askText, LANG_NAME } from "../../src/server/claude";

type In = { lang?: string; slot?: string; products?: { name: string; level: string }[]; recentMeals?: string[]; avoid?: string[] };

const prompt = (b: In, lang: string) => {
  const good = (b.products ?? []).filter((p) => p.level === "green").map((p) => p.name).slice(0, 25);
  const mod = (b.products ?? []).filter((p) => p.level === "yellow").map((p) => p.name).slice(0, 10);
  const bad = (b.products ?? []).filter((p) => p.level === "red").map((p) => p.name).slice(0, 10);
  return `You suggest simple meals for an older person with type 2 diabetes who is not a confident cook. Write in ${LANG_NAME[lang]}, with everyday local food (for Romanian: supă, ciorbă, tocană, salată, ouă, brânză, legume, carne slabă, pește; keep it familiar).
Meal slot now: ${b.slot ?? "lunch"}.
Products they recently scanned and that are GOOD for them (prefer using these): ${good.join("; ") || "none"}.
Products OK in moderation (use small amounts, optional): ${mod.join("; ") || "none"}.
Products to AVOID (never include): ${bad.join("; ") || "none"}.
Meals they had recently (do not repeat): ${(b.recentMeals ?? []).slice(0, 8).join("; ") || "none"}.
Rules: low glycemic load (vegetables first, protein, fibre; small portions of bread/potatoes/rice/pasta); max 5 steps per idea, each step under 15 words; ingredients with rough quantities; no insulin, no doses, no medical claims; friendly tone; portions for one person.
Reply with ONLY JSON:
{"ideas":[{"title":string,"why":string,"carbs":number,"minutes":number,"ingredients":[string],"steps":[string],"uses":[string]}]}
"carbs" = estimated grams of carbohydrates for the portion. "uses" = names from the GOOD list used in this idea (may be empty). Exactly 3 ideas: the first the simplest (no cooking or 10 minutes), the others a bit more.`;
};

export async function POST(request: Request): Promise<Response> {
  let b: In;
  try { b = (await request.json()) as In; } catch { return Response.json({ ok: false, reason: "bad_request" }, { status: 400 }); }
  const lang = b.lang === "ro" || b.lang === "de" ? b.lang : "en";
  const r = await askText(prompt(b, lang), 1400);
  if (!r.ok) return Response.json({ ok: false, reason: r.reason }, { status: r.status });
  const raw = Array.isArray((r.json as { ideas?: unknown }).ideas) ? ((r.json as { ideas: unknown[] }).ideas) : [];
  const str = (x: unknown, n: number) => (typeof x === "string" ? x.trim().slice(0, n) : "");
  const list = (x: unknown, n: number, len: number) => (Array.isArray(x) ? x.filter((y): y is string => typeof y === "string").map((y) => y.trim().slice(0, len)).filter(Boolean).slice(0, n) : []);
  const ideas = raw.slice(0, 3).map((i) => { const x = i as Record<string, unknown>; return {
    title: str(x.title, 80), why: str(x.why, 200),
    carbs: typeof x.carbs === "number" && x.carbs >= 0 && x.carbs <= 300 ? Math.round(x.carbs) : null,
    minutes: typeof x.minutes === "number" && x.minutes > 0 && x.minutes <= 180 ? Math.round(x.minutes) : null,
    ingredients: list(x.ingredients, 12, 80), steps: list(x.steps, 6, 120), uses: list(x.uses, 6, 80),
  }; }).filter((i) => i.title && i.steps.length);
  if (!ideas.length) return Response.json({ ok: false, reason: "unreadable" }, { status: 422 });
  return Response.json({ ok: true, ideas });
}
