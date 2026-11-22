/**
 * Comunitate, treapta 1 (22 nov 2026): „Alții au scanat” + Util / Nu e util + comentarii pe produs, cu 👍, raportare, blocare.
 * GET  /api/community?code=…&device=…        → { scans, levels, useful, notUseful, myVote, comments[] }
 * POST /api/community { action, device, … }   → vote | comment | like | report | block | delete
 * Comentariile trec prin filtrul AI înainte de publicare (fără doze/medicamente/tratamente, insulte, linkuri, telefoane).
 * Identitatea e doar prenumele (+ inițiala), pe care omul îl scrie singur; nu se stochează nimic altceva despre el.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { askPlain } from "../../src/server/claude";
import { notifyModeration } from "../../src/server/alerts";

const SB_URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, "public", "public", any, any>;
export const admin = (): DB | null => { const k = process.env.SUPABASE_SERVICE_KEY; return k ? createClient(SB_URL, k, { auth: { persistSession: false } }) : null; };
const cleanCode = (x: unknown) => String(x ?? "").replace(/[^A-Za-z0-9:_-]/g, "").slice(0, 40);
export const cleanDevice = (x: unknown) => { const d = String(x ?? "").slice(0, 64); return d.length >= 8 ? d : ""; };
export const cleanName = (x: unknown) => String(x ?? "").replace(/[\n\r\t]/g, " ").trim().slice(0, 40);
export const cleanText = (x: unknown) => String(x ?? "").replace(/\r/g, "").replace(/[ \t]+/g, " ").trim().slice(0, 300);

export type Comment = { id: number; name: string; text: string; t: string; likes: number; liked: boolean; mine: boolean };

async function stats(db: DB, code: string, device: string) {
  const { data: scans } = await db.from("events").select("props, device").eq("name", "scan_result").eq("props->>code", code).limit(5000);
  const levels = { green: 0, yellow: 0, red: 0 }; const devices = new Set<string>();
  for (const r of (scans ?? []) as { props: { level?: string }; device: string }[]) { devices.add(r.device); const l = r.props?.level; if (l === "green" || l === "yellow" || l === "red") levels[l]++; }
  const { data: votes } = await db.from("product_votes").select("device, useful").eq("code", code);
  let useful = 0, notUseful = 0; let myVote: boolean | null = null;
  for (const v of (votes ?? []) as { device: string; useful: boolean }[]) { if (v.useful) useful++; else notUseful++; if (v.device === device) myVote = v.useful; }
  return { scans: devices.size, levels, useful, notUseful, myVote };
}

async function comments(db: DB, code: string, device: string): Promise<Comment[]> {
  const [{ data: rows }, { data: blocks }, { data: bans }] = await Promise.all([
    db.from("product_comments").select("id, device, name, text, t, likes").eq("code", code).eq("hidden", false).order("t", { ascending: false }).limit(50),
    device ? db.from("community_blocks").select("blocked").eq("device", device) : Promise.resolve({ data: [] }),
    db.from("community_bans").select("device"),
  ]);
  const hidden = new Set([...((blocks ?? []) as { blocked: string }[]).map((b) => b.blocked), ...((bans ?? []) as { device: string }[]).map((b) => b.device)]);
  const list = ((rows ?? []) as { id: number; device: string; name: string; text: string; t: string; likes: number }[]).filter((r) => !hidden.has(r.device) || r.device === device);
  let liked = new Set<number>();
  if (device && list.length) { const { data } = await db.from("comment_likes").select("comment_id").eq("device", device).in("comment_id", list.map((r) => r.id)); liked = new Set(((data ?? []) as { comment_id: number }[]).map((x) => x.comment_id)); }
  return list.map((r) => ({ id: r.id, name: r.name, text: r.text, t: r.t, likes: r.likes, liked: liked.has(r.id), mine: r.device === device }));
}

export async function GET(request: Request): Promise<Response> {
  const u = new URL(request.url);
  const code = cleanCode(u.searchParams.get("code")); const device = cleanDevice(u.searchParams.get("device"));
  if (code.length < 6) return Response.json({ ok: false }, { status: 400 });
  const db = admin(); if (!db) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  const [s, c] = await Promise.all([stats(db, code, device), comments(db, code, device)]);
  return Response.json({ ok: true, ...s, comments: c });
}

/** Filtrul de comunitate: fără sfaturi de doze/medicamente/tratamente, fără insulte, linkuri, telefoane, reclame. */
export async function moderate(text: string, lang: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (/https?:\/\/|www\.|\b\d{9,}\b|@[a-z0-9_.]{3,}/i.test(text)) return { ok: false, reason: "link" };
  const prompt = `You moderate short comments in a diabetes app's product community (language: ${lang}). Reply with exactly one word.
ALLOW if the comment is a harmless opinion about a food product (taste, where to buy, price, how it affected the person's own glucose in general terms, tips like "half a portion"), encouragement, or a question about the product.
BLOCK if it: gives medication or insulin advice or doses, tells others to change/stop/start a treatment or doctor, claims cures, sells or advertises anything, insults anyone, contains hate, sexual content, personal data (phone, address, full names of third parties), or is spam/gibberish.
Comment: """${text.replace(/"""/g, '"')}"""
Answer ALLOW or BLOCK:`;
  const r = await askPlain(prompt, 5, "community");
  if (!r.ok) return { ok: false, reason: "unavailable" };
  return /ALLOW/i.test(r.text) ? { ok: true } : { ok: false, reason: "blocked" };
}

export async function POST(request: Request): Promise<Response> {
  const db = admin(); if (!db) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  let b: { action?: string; device?: string; code?: string; useful?: boolean; name?: string; text?: string; lang?: string; country?: string; id?: number; blocked?: string; reason?: string };
  try { b = await request.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  const device = cleanDevice(b.device); if (!device) return Response.json({ ok: false }, { status: 400 });
  const { data: ban } = await db.from("community_bans").select("device").eq("device", device).maybeSingle();
  if (ban && ["comment", "like", "vote"].includes(String(b.action))) return Response.json({ ok: false, reason: "banned" }, { status: 403 });

  if (b.action === "vote") {
    const code = cleanCode(b.code); if (code.length < 6 || typeof b.useful !== "boolean") return Response.json({ ok: false }, { status: 400 });
    const { error } = await db.from("product_votes").upsert({ device, code, useful: b.useful, t: new Date().toISOString() });
    return Response.json({ ok: !error });
  }
  if (b.action === "comment") {
    const code = cleanCode(b.code); const name = cleanName(b.name); const text = cleanText(b.text); const lang = String(b.lang ?? "ro").slice(0, 5);
    if (code.length < 6 || !name || text.length < 2) return Response.json({ ok: false }, { status: 400 });
    // cel mult 10 comentarii pe zi de pe un telefon (contra spamului)
    const { count } = await db.from("product_comments").select("id", { count: "exact", head: true }).eq("device", device).gte("t", new Date(Date.now() - 864e5).toISOString());
    if ((count ?? 0) >= 10) return Response.json({ ok: false, reason: "limit" }, { status: 429 });
    const m = await moderate(text, lang);
    if (!m.ok) return Response.json({ ok: false, reason: m.reason }, { status: m.reason === "unavailable" ? 503 : 422 });
    const { data, error } = await db.from("product_comments").insert({ code, device, name, text, lang, country: String(b.country ?? "").slice(0, 2) || null }).select("id, t").single();
    if (error) return Response.json({ ok: false, reason: error.message }, { status: 500 });
    return Response.json({ ok: true, id: data.id, t: data.t });
  }
  if (b.action === "like") {
    const id = Number(b.id); if (!Number.isFinite(id)) return Response.json({ ok: false }, { status: 400 });
    const { data: had } = await db.from("comment_likes").select("comment_id").eq("device", device).eq("comment_id", id).maybeSingle();
    if (had) { await db.from("comment_likes").delete().eq("device", device).eq("comment_id", id); await db.rpc("bump_comment_likes", { cid: id, delta: -1 }).then(() => {}, () => {}); return Response.json({ ok: true, liked: false }); }
    await db.from("comment_likes").insert({ device, comment_id: id });
    await db.rpc("bump_comment_likes", { cid: id, delta: 1 }).then(() => {}, () => {});
    return Response.json({ ok: true, liked: true });
  }
  if (b.action === "report" || b.action === "report_post") {
    const id = Number(b.id); if (!Number.isFinite(id)) return Response.json({ ok: false }, { status: 400 });
    const isPost = b.action === "report_post";
    await db.from("community_reports").insert({ [isPost ? "post_id" : "comment_id"]: id, device, reason: String(b.reason ?? "").slice(0, 120) || null });
    // conținutul raportat dispare imediat, până îl verifică Alex
    const { data: c } = await db.from(isPost ? "community_posts" : "product_comments").update({ hidden: true }).eq("id", id).select("name, text").maybeSingle();
    await notifyModeration(id, (isPost ? "[postare] " : "") + (c ? `${c.name}: ${c.text}` : `#${id}`));
    return Response.json({ ok: true });
  }
  if (b.action === "block_post") {
    const id = Number(b.id); if (!Number.isFinite(id)) return Response.json({ ok: false }, { status: 400 });
    const { data: c } = await db.from("community_posts").select("device").eq("id", id).maybeSingle();
    if (c && c.device !== device) await db.from("community_blocks").upsert({ device, blocked: c.device });
    return Response.json({ ok: true });
  }
  if (b.action === "block") {
    const blocked = cleanDevice(b.blocked); if (!blocked || blocked === device) return Response.json({ ok: false }, { status: 400 });
    await db.from("community_blocks").upsert({ device, blocked });
    return Response.json({ ok: true });
  }
  if (b.action === "block_comment") {
    // blochează autorul unui comentariu fără ca telefonul să-i cunoască id-ul (nu expunem device-urile altora)
    const id = Number(b.id); if (!Number.isFinite(id)) return Response.json({ ok: false }, { status: 400 });
    const { data: c } = await db.from("product_comments").select("device").eq("id", id).maybeSingle();
    if (c && c.device !== device) await db.from("community_blocks").upsert({ device, blocked: c.device });
    return Response.json({ ok: true });
  }
  if (b.action === "delete") {
    const id = Number(b.id); if (!Number.isFinite(id)) return Response.json({ ok: false }, { status: 400 });
    await db.from("product_comments").delete().eq("id", id).eq("device", device);
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false }, { status: 400 });
}
