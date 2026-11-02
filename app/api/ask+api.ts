/**
 * POST /api/ask — asistentul. Primește { lang, question, context } și răspunde scurt, cald, în limba aplicației,
 * folosind jurnalul omului (rezumat trimis de aplicație). Garduri: fără doze, insulină, tratament, diagnostic.
 */
import { askText, LANG_NAME } from "../../src/server/claude";

type In = { lang?: string; question?: string; context?: string; name?: string };

const prompt = (b: In, lang: string) => `You are the in-app helper of Diabetoline, an app for older people with type 2 diabetes. Answer in ${LANG_NAME[lang]}, warmly, like a knowledgeable friend, in at most 4 short sentences (under 70 words). Use simple words, no jargon, no bullet lists, no markdown.
${b.name ? `The person's name is ${b.name}.` : ""}
Their recent journal (use it when relevant; refer to specific values and meals):
${b.context || "(no data yet)"}

Hard rules:
- Never give medication doses, insulin advice, treatment changes, or a diagnosis. If asked, say kindly that this is for their doctor and offer the doctor report in the app ("Raport pentru medic").
- If they describe an emergency (glucose under 60 or over 350, fainting, chest pain, confusion), tell them to call their doctor or the emergency number now, in one sentence, before anything else.
- You may give general food, portion, movement and everyday-habit guidance, and explain what their own numbers show.
- If the question is unrelated to food, diabetes or the app, answer in one friendly sentence and bring it back to how you can help.
Reply with ONLY JSON: {"answer": string, "emergency": boolean}

Question: ${(b.question ?? "").slice(0, 500)}`;

export async function POST(request: Request): Promise<Response> {
  let b: In;
  try { b = (await request.json()) as In; } catch { return Response.json({ ok: false, reason: "bad_request" }, { status: 400 }); }
  if (!b.question || b.question.trim().length < 2) return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });
  const lang = b.lang === "ro" || b.lang === "de" ? b.lang : "en";
  const r = await askText(prompt(b, lang), 500);
  if (!r.ok) return Response.json({ ok: false, reason: r.reason }, { status: r.status });
  const o = r.json as { answer?: unknown; emergency?: unknown };
  const answer = typeof o.answer === "string" ? o.answer.trim().slice(0, 900) : "";
  if (!answer) return Response.json({ ok: false, reason: "unreadable" }, { status: 422 });
  return Response.json({ ok: true, answer, emergency: o.emergency === true });
}
