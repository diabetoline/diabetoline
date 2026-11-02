/** Apel comun către modelul de vedere, folosit doar de rutele de server (app/api). Cheia nu ajunge în aplicație. */
export const VISION_MODEL = "claude-haiku-5-5";
const MAX_B64 = 3_500_000;

export type VisionResult = { ok: true; json: Record<string, unknown> } | { ok: false; status: number; reason: string };

/** Citește corpul cererii { image, lang } și verifică poza. */
export async function readImageBody(request: Request): Promise<{ image: string; lang: string } | null> {
  try {
    const body = (await request.json()) as { image?: unknown; lang?: unknown };
    if (typeof body.image !== "string" || body.image.length < 1000) return null;
    const image = body.image.replace(/^data:image\/\w+;base64,/, "");
    if (image.length > MAX_B64) return null;
    const lang = body.lang === "ro" || body.lang === "de" ? body.lang : "en";
    return { image, lang };
  } catch { return null; }
}

/** Trimite poza și instrucțiunea; întoarce obiectul JSON din răspuns. */
export async function askVision(image: string, prompt: string, maxTokens = 800): Promise<VisionResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, status: 503, reason: "not_configured" };
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: VISION_MODEL, max_tokens: maxTokens,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
          { type: "text", text: prompt },
        ] }],
      }),
    });
  } catch { return { ok: false, status: 502, reason: "upstream" }; }
  if (!res.ok) return { ok: false, status: 502, reason: "upstream" };
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return { ok: false, status: 422, reason: "unreadable" };
  try { return { ok: true, json: JSON.parse(m[0]) as Record<string, unknown> }; }
  catch { return { ok: false, status: 422, reason: "unreadable" }; }
}

/** Apel doar cu text; întoarce textul brut al răspunsului. */
export async function askPlain(prompt: string, maxTokens = 500): Promise<{ ok: true; text: string } | { ok: false; status: number; reason: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, status: 503, reason: "not_configured" };
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: VISION_MODEL, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
    });
  } catch { return { ok: false, status: 502, reason: "upstream" }; }
  if (!res.ok) return { ok: false, status: 502, reason: "upstream" };
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("").trim();
  return text ? { ok: true, text } : { ok: false, status: 422, reason: "unreadable" };
}

export const LANG_NAME: Record<string, string> = { ro: "Romanian", en: "English", de: "German" };

/** Apel doar cu text (fără imagine); întoarce obiectul JSON din răspuns. */
export async function askText(prompt: string, maxTokens = 1200): Promise<VisionResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, status: 503, reason: "not_configured" };
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: VISION_MODEL, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
    });
  } catch { return { ok: false, status: 502, reason: "upstream" }; }
  if (!res.ok) return { ok: false, status: 502, reason: "upstream" };
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return { ok: false, status: 422, reason: "unreadable" };
  try { return { ok: true, json: JSON.parse(m[0]) as Record<string, unknown> }; }
  catch { return { ok: false, status: 422, reason: "unreadable" }; }
}
