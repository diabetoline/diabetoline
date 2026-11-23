/**
 * Traducerea postărilor/comentariilor din alte țări (23 nov 2026, Alex: „pe țară + din alte țări”).
 * O traducere per text și limbă, ținută în `community_translations`; modelul e chemat o singură dată, apoi e cache.
 * Numele de produse/mărci rămân ca în original.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { askPlain } from "./claude";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, "public", "public", any, any>;
type Item = { kind: "p" | "c"; id: number; text: string; lang?: string | null };
const LANG_NAME: Record<string, string> = { ro: "Romanian", en: "English", de: "German" };
export const lang2 = (l?: string | null) => String(l ?? "").toLowerCase().slice(0, 2);

/** Întoarce textul tradus per item (sau originalul când e deja în limba cerută / nu se poate traduce). */
export async function translateMany(db: DB, items: Item[], target: string, maxNew = 8): Promise<Map<string, string>> {
  const tgt = lang2(target) || "en"; const out = new Map<string, string>();
  const need = items.filter((it) => lang2(it.lang) !== tgt);
  if (!need.length) return out;
  const { data: cached } = await db.from("community_translations").select("kind, id, text").eq("lang", tgt)
    .in("id", [...new Set(need.map((x) => x.id))]);
  const have = new Set<string>();
  for (const r of (cached ?? []) as { kind: string; id: number; text: string }[]) { out.set(`${r.kind}:${r.id}`, r.text); have.add(`${r.kind}:${r.id}`); }
  const missing = need.filter((it) => !have.has(`${it.kind}:${it.id}`)).slice(0, maxNew);
  if (!missing.length) return out;
  const prompt = `Translate each numbered text into ${LANG_NAME[tgt] ?? tgt}. These are short posts from people with diabetes in a food app. Keep product and brand names, numbers and emoji unchanged; keep the tone casual. Reply ONLY with a JSON object mapping each number (as a string) to its translation, no commentary.
${missing.map((it, i) => `${i + 1}: ${JSON.stringify(it.text)}`).join("\n")}`;
  const r = await askPlain(prompt, 1500, "translate");
  if (!r.ok) return out;
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(r.text.replace(/^```(?:json)?\s*|\s*```$/g, "")); } catch { return out; }
  const rows: { kind: string; id: number; lang: string; text: string }[] = [];
  missing.forEach((it, i) => {
    const tr = parsed[String(i + 1)]; if (typeof tr !== "string" || !tr.trim()) return;
    const text = tr.trim().slice(0, 700); out.set(`${it.kind}:${it.id}`, text); rows.push({ kind: it.kind, id: it.id, lang: tgt, text });
  });
  if (rows.length) await db.from("community_translations").upsert(rows).then(() => {}, () => {});
  return out;
}
