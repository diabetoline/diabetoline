/**
 * POST /api/tts — { text, lang } → audio/mpeg. Vocea naturală (OpenAI), aceeași peste tot în aplicație.
 * Fără OPENAI_API_KEY întoarce 503 și telefonul folosește vocea lui.
 */
const VOICE = "nova"; // caldă, clară; aceeași pentru ro/en/de
export async function POST(request: Request): Promise<Response> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  let b: { text?: string; lang?: string };
  try { b = await request.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  const text = (b.text ?? "").trim().slice(0, 1500);
  if (!text) return Response.json({ ok: false }, { status: 400 });
  const lang = b.lang === "ro" ? "Romanian" : b.lang === "de" ? "German" : "English";
  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: VOICE, input: text, response_format: "mp3", speed: 0.95,
      instructions: `Speak ${lang}, warmly and calmly, like a kind nurse talking to an older person. Clear articulation, unhurried, no drama.` }),
  });
  if (!r.ok) return Response.json({ ok: false, reason: "upstream", status: r.status }, { status: 502 });
  return new Response(r.body, { status: 200, headers: { "content-type": "audio/mpeg", "cache-control": "private, max-age=86400" } });
}
