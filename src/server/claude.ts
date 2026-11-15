/** Apel comun către modelul de vedere, folosit doar de rutele de server (app/api). Cheia nu ajunge în aplicație. */
export const VISION_MODEL = "claude-haiku-5-5";
const MAX_B64 = 3_500_000;

/**
 * Contorizarea apelurilor AI (15 nov 2026, Alex: „să verifici constant creditul”): fiecare apel scrie în `events`
 * (device "server", name "ai_call", props { route, in, out, ok }) prin cheia service_role; /api/watch le adună zilnic.
 * La „credit epuizat”/limită (HTTP 400 cu „credit”, 402, 429) trimite email imediat (Resend, FEEDBACK_TO), cel mult o dată la 6 ore.
 */
import { createClient } from "@supabase/supabase-js";
const SB_URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";
function admin() { const key = process.env.SUPABASE_SERVICE_KEY; return key ? createClient(SB_URL, key, { auth: { persistSession: false } }) : null; }
export async function logAiCall(route: string, ok: boolean, usage?: { input_tokens?: number; output_tokens?: number }, err?: string): Promise<void> {
  const db = admin(); if (!db) return;
  try { await db.from("events").insert({ device: "server-ai", name: "ai_call", props: { route, ok, in: usage?.input_tokens ?? 0, out: usage?.output_tokens ?? 0, ...(err ? { err: err.slice(0, 40) } : {}) }, platform: "server" }); } catch {}
}
async function alertCredit(detail: string): Promise<void> {
  const rk = process.env.RESEND_API_KEY, to = process.env.FEEDBACK_TO; if (!rk || !to) return;
  const db = admin();
  try {
    if (db) {
      const since = new Date(Date.now() - 6 * 3600e3).toISOString();
      const { count } = await db.from("events").select("id", { count: "exact", head: true }).eq("name", "ai_credit_alert").gte("t", since);
      if ((count ?? 0) > 0) return;
      await db.from("events").insert({ device: "server-ai", name: "ai_credit_alert", props: { detail: detail.slice(0, 40) }, platform: "server" });
    }
    await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${rk}`, "content-type": "application/json" }, body: JSON.stringify({
      from: process.env.FEEDBACK_FROM ?? "Diabetoline <onboarding@resend.dev>", to: [to], subject: "⚠ Diabetoline: AI-ul refuză apelurile — verifică creditul Anthropic",
      html: `<p style="font:16px system-ui">Serverul a primit de la Anthropic: <b>${detail.replace(/[<>&]/g, "")}</b>.<br>Pozele la farfurie/etichetă, „Întreabă” și „Ce mănânc azi?” nu merg până nu faci top-up la <a href="https://console.anthropic.com/settings/billing">console.anthropic.com → Billing</a>.</p>`,
    }) });
  } catch {}
}
/** Trimite cererea la Anthropic; întoarce răspunsul sau eroarea, contorizează, și alertează la credit. */
async function callClaude(route: string, body: Record<string, unknown>): Promise<{ ok: true; data: { content?: { type: string; text?: string }[]; stop_reason?: string; usage?: { input_tokens?: number; output_tokens?: number } } } | { ok: false; status: number; reason: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, status: 503, reason: "not_configured" };
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: VISION_MODEL, ...body }) });
  } catch (e) { const r = `upstream: ${String((e as Error)?.message ?? e).slice(0, 80)}`; await logAiCall(route, false, undefined, r); return { ok: false, status: 502, reason: r }; }
  if (!res.ok) {
    const txt = (await res.text().catch(() => "")).slice(0, 160);
    const r = `upstream ${res.status} ${txt}`;
    await logAiCall(route, false, undefined, r);
    if (res.status === 402 || res.status === 429 || /credit|billing|quota/i.test(txt)) await alertCredit(`HTTP ${res.status} ${txt}`);
    return { ok: false, status: 502, reason: r };
  }
  const data = await res.json();
  await logAiCall(route, true, data.usage);
  return { ok: true, data };
}

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
export async function askVision(image: string, prompt: string, maxTokens = 800, retry = true, route = "vision"): Promise<VisionResult> {
  const r = await callClaude(route, { max_tokens: maxTokens, messages: [{ role: "user", content: [
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
    { type: "text", text: prompt },
  ] }] });
  if (!r.ok) return r;
  const data = r.data;
  const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  const m = text.match(/\{[\s\S]*\}/);
  const stop = data.stop_reason ?? "?";
  // răspuns tăiat la limită (15 nov 2026, eticheta cu ingrediente lungi): o singură reîncercare cu limită dublă
  if (stop === "max_tokens" && retry) return askVision(image, prompt + "\nBe brief: output only the JSON, no explanation.", maxTokens * 2, false, route);
  if (!m) return { ok: false, status: 422, reason: `unreadable: ${text.slice(0, 120)}` };
  try { return { ok: true, json: JSON.parse(m[0]) as Record<string, unknown> }; }
  catch { return { ok: false, status: 422, reason: `unreadable: truncated? ${text.length} chars, stop=${stop}` }; }
}

/** Apel doar cu text; întoarce textul brut al răspunsului. */
export async function askPlain(prompt: string, maxTokens = 500, route = "ask"): Promise<{ ok: true; text: string } | { ok: false; status: number; reason: string }> {
  const r = await callClaude(route, { max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] });
  if (!r.ok) return r;
  const data = r.data;
  const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("").trim();
  return text ? { ok: true, text } : { ok: false, status: 422, reason: `unreadable ${JSON.stringify(data).slice(0, 200)}` };
}

export const LANG_NAME: Record<string, string> = { ro: "Romanian", en: "English", de: "German" };

/** Apel doar cu text (fără imagine); întoarce obiectul JSON din răspuns. */
export async function askText(prompt: string, maxTokens = 1200, route = "ideas"): Promise<VisionResult> {
  const r = await callClaude(route, { max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] });
  if (!r.ok) return r;
  const data = r.data;
  const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return { ok: false, status: 422, reason: `unreadable: ${text.slice(0, 120)}` };
  try { return { ok: true, json: JSON.parse(m[0]) as Record<string, unknown> }; }
  catch { return { ok: false, status: 422, reason: `unreadable: truncated? ${text.length} chars, stop=${data.stop_reason ?? "?"}` }; }
}
