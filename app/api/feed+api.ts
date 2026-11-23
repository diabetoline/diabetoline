/**
 * Comunitate (22 nov 2026, Alex: „să poată dialoga între ei”): postări pe țară + comentarii la postări.
 * GET  /api/feed?country=RO&device=…&before=<iso>      → { posts: [{ id, name, text, ref, t, likes, liked, n_comments, mine }] }
 * GET  /api/feed?post=<id>&device=…                     → { post, comments: [...] }
 * POST /api/feed { action: "post", device, name, text, ref?, lang, country }      (filtru AI înainte de publicare)
 * POST /api/feed { action: "comment", device, post, name, text, lang }
 * POST /api/feed { action: "like_post", device, id } · { action: "delete_post", device, id }
 * Blocările/interdicțiile/raportările sunt în /api/community (aceleași tabele).
 */
import { admin, cleanBadges, cleanDevice, cleanName, cleanText, moderate, photosFor } from "./community+api";
import { lang2, translateMany } from "../../src/server/translate";

/** Sub câte postări locale pe săptămână se arată „Din alte țări” (Alex, 23 nov 2026: „pe țară + din alte țări”). */
const THIN_FEED = 10;

const REPLY_TITLE: Record<string, (n: string) => string> = { ro: (n) => `${n} ți-a răspuns`, en: (n) => `${n} replied to you`, de: (n) => `${n} hat dir geantwortet` };
/** Push la autorul postării când cineva îi răspunde (23 nov 2026, aprobat de Alex): cel mult unul la 30 de minute per postare, ca să nu enerveze. */
async function pushReply(db: NonNullable<ReturnType<typeof admin>>, postId: number, fromDevice: string, fromName: string, text: string) {
  try {
    const { data: p } = await db.from("community_posts").select("device, last_push_at").eq("id", postId).maybeSingle();
    if (!p || p.device === fromDevice) return;
    if (p.last_push_at && Date.now() - new Date(p.last_push_at).getTime() < 30 * 60e3) return;
    const { data: tok } = await db.from("push_tokens").select("token, lang").eq("device", p.device).maybeSingle();
    if (!tok?.token) return;
    const lang = (tok.lang ?? "ro").slice(0, 2); const title = (REPLY_TITLE[lang] ?? REPLY_TITLE.ro)(fromName);
    await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify([{ to: tok.token, title, body: text.slice(0, 120), sound: "default", channelId: "reminders", data: { kind: "community", id: postId } }]) });
    await db.from("community_posts").update({ last_push_at: new Date().toISOString() }).eq("id", postId);
  } catch { /* push-ul nu e critic */ }
}

type Ref = { code?: string; name?: string; level?: string; kind?: "scan" | "plate"; photo?: string } | null;
const cleanRef = (r: unknown): Ref => {
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  const level = ["green", "yellow", "red"].includes(String(o.level)) ? String(o.level) : undefined;
  const name = o.name ? String(o.name).slice(0, 60) : undefined;
  if (!name) return null;
  const photo = typeof o.photo === "string" && o.photo.startsWith(`${process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co"}/storage/v1/object/public/plates/`) ? o.photo.slice(0, 300) : undefined;
  return { code: o.code ? String(o.code).replace(/[^A-Za-z0-9:_-]/g, "").slice(0, 40) : undefined, name, level, kind: o.kind === "plate" ? "plate" : "scan", photo };
};

async function hiddenAuthors(db: NonNullable<ReturnType<typeof admin>>, device: string): Promise<Set<string>> {
  const [{ data: blocks }, { data: bans }] = await Promise.all([
    device ? db.from("community_blocks").select("blocked").eq("device", device) : Promise.resolve({ data: [] }),
    db.from("community_bans").select("device"),
  ]);
  return new Set([...((blocks ?? []) as { blocked: string }[]).map((b) => b.blocked), ...((bans ?? []) as { device: string }[]).map((b) => b.device)]);
}

export async function GET(request: Request): Promise<Response> {
  const db = admin(); if (!db) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  const u = new URL(request.url); const device = cleanDevice(u.searchParams.get("device"));
  const hidden = await hiddenAuthors(db, device);
  // bulina din meniu: câte răspunsuri noi la postările mele de la ultima vizită
  const since = u.searchParams.get("inbox");
  if (since !== null && device) {
    const { data: mine } = await db.from("community_posts").select("id").eq("device", device).limit(200);
    const ids = ((mine ?? []) as { id: number }[]).map((x) => x.id);
    if (!ids.length) return Response.json({ ok: true, n: 0 });
    let q = db.from("product_comments").select("id", { count: "exact", head: true }).in("post_id", ids).neq("device", device).eq("hidden", false);
    if (since) q = q.gt("t", since);
    const { count } = await q;
    return Response.json({ ok: true, n: count ?? 0 });
  }
  const postId = Number(u.searchParams.get("post"));
  if (Number.isFinite(postId) && postId > 0) {
    const { data: p } = await db.from("community_posts").select("id, device, name, text, ref, t, likes, n_comments, hidden, badges, lang, country").eq("id", postId).maybeSingle();
    if (!p || (p.hidden && p.device !== device)) return Response.json({ ok: false, reason: "not_found" }, { status: 404 });
    const { data: rows } = await db.from("product_comments").select("id, device, name, text, t, likes, badges, lang").eq("post_id", postId).eq("hidden", false).order("t", { ascending: true }).limit(200);
    const list = ((rows ?? []) as { id: number; device: string; name: string; text: string; t: string; likes: number; badges?: string[]; lang?: string | null }[]).filter((r) => !hidden.has(r.device) || r.device === device);
    const photos = await photosFor(db, [p.device, ...list.map((r) => r.device)]);
    const lang = lang2(u.searchParams.get("lang"));
    const tr = lang ? await translateMany(db, [{ kind: "p", id: p.id, text: p.text, lang: p.lang }, ...list.map((r) => ({ kind: "c" as const, id: r.id, text: r.text, lang: r.lang }))], lang, 12) : new Map<string, string>();
    let liked = new Set<number>(); let likedPost = false;
    if (device) {
      if (list.length) { const { data } = await db.from("comment_likes").select("comment_id").eq("device", device).in("comment_id", list.map((r) => r.id)); liked = new Set(((data ?? []) as { comment_id: number }[]).map((x) => x.comment_id)); }
      const { data: pl } = await db.from("post_likes").select("post_id").eq("device", device).eq("post_id", postId).maybeSingle(); likedPost = !!pl;
    }
    const pt = tr.get(`p:${p.id}`);
    return Response.json({ ok: true, post: { id: p.id, name: p.name, text: pt ?? p.text, translated: !!pt, country: p.country ?? null, ref: p.ref, t: p.t, likes: p.likes, liked: likedPost, n_comments: p.n_comments, mine: p.device === device, photo: photos[p.device] ?? null, badges: p.badges ?? [] },
      comments: list.map((r) => { const ct = tr.get(`c:${r.id}`); return { id: r.id, name: r.name, text: ct ?? r.text, translated: !!ct, t: r.t, likes: r.likes, liked: liked.has(r.id), mine: r.device === device, photo: photos[r.device] ?? null, badges: r.badges ?? [] }; }) });
  }
  const country = (u.searchParams.get("country") ?? "").toUpperCase().slice(0, 2);
  const before = u.searchParams.get("before");
  let q = db.from("community_posts").select("id, device, name, text, ref, t, likes, n_comments, badges").eq("hidden", false).order("t", { ascending: false }).limit(30);
  if (country) q = q.eq("country", country);
  if (before) q = q.lt("t", before);
  const { data } = await q;
  const posts = ((data ?? []) as { id: number; device: string; name: string; text: string; ref: Ref; t: string; likes: number; n_comments: number; badges?: string[] }[]).filter((p) => !hidden.has(p.device) || p.device === device);
  const photos = await photosFor(db, posts.map((p) => p.device));
  let liked = new Set<number>();
  if (device && posts.length) { const { data: pl } = await db.from("post_likes").select("post_id").eq("device", device).in("post_id", posts.map((p) => p.id)); liked = new Set(((pl ?? []) as { post_id: number }[]).map((x) => x.post_id)); }
  const shape = (p: typeof posts[number], extra: Record<string, unknown> = {}) => ({ id: p.id, name: p.name, text: p.text, ref: p.ref, t: p.t, likes: p.likes, liked: liked.has(p.id), n_comments: p.n_comments, mine: p.device === device, photo: photos[p.device] ?? null, badges: p.badges ?? [], ...extra });
  // „Din alte țări”: doar la prima pagină, când țara are puține postări în ultima săptămână; textul tradus în limba telefonului
  let abroad: ReturnType<typeof shape>[] = [];
  const lang = lang2(u.searchParams.get("lang"));
  if (country && lang && !before) {
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const recent = posts.filter((p) => p.t >= weekAgo).length;
    if (recent < THIN_FEED) {
      const { data: ab } = await db.from("community_posts").select("id, device, name, text, ref, t, likes, n_comments, badges, lang, country").eq("hidden", false).neq("country", country).order("t", { ascending: false }).limit(15);
      const list = ((ab ?? []) as (typeof posts[number] & { lang?: string | null; country?: string | null })[]).filter((p) => !hidden.has(p.device));
      if (list.length) {
        const [tr, ph] = await Promise.all([translateMany(db, list.map((p) => ({ kind: "p" as const, id: p.id, text: p.text, lang: p.lang })), lang), photosFor(db, list.map((p) => p.device))]);
        Object.assign(photos, ph);
        if (device) { const { data: pl } = await db.from("post_likes").select("post_id").eq("device", device).in("post_id", list.map((p) => p.id)); for (const x of (pl ?? []) as { post_id: number }[]) liked.add(x.post_id); }
        abroad = list.map((p) => { const tt = tr.get(`p:${p.id}`); return shape(p, { text: tt ?? p.text, translated: !!tt, country: p.country ?? null }); });
      }
    }
  }
  return Response.json({ ok: true, posts: posts.map((p) => shape(p)), abroad });
}

export async function POST(request: Request): Promise<Response> {
  const db = admin(); if (!db) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  let b: { action?: string; device?: string; name?: string; text?: string; ref?: unknown; lang?: string; country?: string; post?: number; id?: number; badges?: unknown };
  try { b = await request.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  const device = cleanDevice(b.device); if (!device) return Response.json({ ok: false }, { status: 400 });
  const { data: ban } = await db.from("community_bans").select("device").eq("device", device).maybeSingle();
  if (ban && ["post", "comment", "like_post"].includes(String(b.action))) return Response.json({ ok: false, reason: "banned" }, { status: 403 });
  const lang = String(b.lang ?? "ro").slice(0, 5);

  if (b.action === "post") {
    const name = cleanName(b.name); const text = cleanText(b.text).slice(0, 600); const ref = cleanRef(b.ref);
    if (!name || text.length < 2) return Response.json({ ok: false }, { status: 400 });
    const { count } = await db.from("community_posts").select("id", { count: "exact", head: true }).eq("device", device).gte("t", new Date(Date.now() - 864e5).toISOString());
    if ((count ?? 0) >= 5) return Response.json({ ok: false, reason: "limit" }, { status: 429 });
    const m = await moderate(text, lang);
    if (!m.ok) return Response.json({ ok: false, reason: m.reason }, { status: m.reason === "unavailable" ? 503 : 422 });
    const { data, error } = await db.from("community_posts").insert({ device, name, text, ref, lang, country: String(b.country ?? "").toUpperCase().slice(0, 2) || null, badges: cleanBadges(b.badges) }).select("id, t").single();
    if (error) return Response.json({ ok: false, reason: error.message }, { status: 500 });
    return Response.json({ ok: true, id: data.id, t: data.t });
  }
  if (b.action === "comment") {
    const post = Number(b.post); const name = cleanName(b.name); const text = cleanText(b.text);
    if (!Number.isFinite(post) || !name || text.length < 2) return Response.json({ ok: false }, { status: 400 });
    const { count } = await db.from("product_comments").select("id", { count: "exact", head: true }).eq("device", device).gte("t", new Date(Date.now() - 864e5).toISOString());
    if ((count ?? 0) >= 20) return Response.json({ ok: false, reason: "limit" }, { status: 429 });
    const m = await moderate(text, lang);
    if (!m.ok) return Response.json({ ok: false, reason: m.reason }, { status: m.reason === "unavailable" ? 503 : 422 });
    const { data, error } = await db.from("product_comments").insert({ post_id: post, device, name, text, lang, country: String(b.country ?? "").toUpperCase().slice(0, 2) || null, badges: cleanBadges(b.badges) }).select("id, t").single();
    if (error) return Response.json({ ok: false, reason: error.message }, { status: 500 });
    await db.rpc("bump_post", { pid: post, dlikes: 0, dcomments: 1 }).then(() => {}, () => {});
    await pushReply(db, post, device, name, text);
    return Response.json({ ok: true, id: data.id, t: data.t });
  }
  if (b.action === "like_post") {
    const id = Number(b.id); if (!Number.isFinite(id)) return Response.json({ ok: false }, { status: 400 });
    const { data: had } = await db.from("post_likes").select("post_id").eq("device", device).eq("post_id", id).maybeSingle();
    if (had) { await db.from("post_likes").delete().eq("device", device).eq("post_id", id); await db.rpc("bump_post", { pid: id, dlikes: -1, dcomments: 0 }).then(() => {}, () => {}); return Response.json({ ok: true, liked: false }); }
    await db.from("post_likes").insert({ device, post_id: id });
    await db.rpc("bump_post", { pid: id, dlikes: 1, dcomments: 0 }).then(() => {}, () => {});
    return Response.json({ ok: true, liked: true });
  }
  if (b.action === "delete_post") {
    const id = Number(b.id); if (!Number.isFinite(id)) return Response.json({ ok: false }, { status: 400 });
    await db.from("community_posts").delete().eq("id", id).eq("device", device);
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false }, { status: 400 });
}
