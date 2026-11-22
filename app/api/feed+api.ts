/**
 * Comunitate (22 nov 2026, Alex: „să poată dialoga între ei”): postări pe țară + comentarii la postări.
 * GET  /api/feed?country=RO&device=…&before=<iso>      → { posts: [{ id, name, text, ref, t, likes, liked, n_comments, mine }] }
 * GET  /api/feed?post=<id>&device=…                     → { post, comments: [...] }
 * POST /api/feed { action: "post", device, name, text, ref?, lang, country }      (filtru AI înainte de publicare)
 * POST /api/feed { action: "comment", device, post, name, text, lang }
 * POST /api/feed { action: "like_post", device, id } · { action: "delete_post", device, id }
 * Blocările/interdicțiile/raportările sunt în /api/community (aceleași tabele).
 */
import { admin, cleanDevice, cleanName, cleanText, moderate } from "./community+api";

type Ref = { code?: string; name?: string; level?: string; kind?: "scan" | "plate" } | null;
const cleanRef = (r: unknown): Ref => {
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  const level = ["green", "yellow", "red"].includes(String(o.level)) ? String(o.level) : undefined;
  const name = o.name ? String(o.name).slice(0, 60) : undefined;
  if (!name) return null;
  return { code: o.code ? String(o.code).replace(/[^A-Za-z0-9:_-]/g, "").slice(0, 40) : undefined, name, level, kind: o.kind === "plate" ? "plate" : "scan" };
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
  const postId = Number(u.searchParams.get("post"));
  if (Number.isFinite(postId) && postId > 0) {
    const { data: p } = await db.from("community_posts").select("id, device, name, text, ref, t, likes, n_comments, hidden").eq("id", postId).maybeSingle();
    if (!p || (p.hidden && p.device !== device)) return Response.json({ ok: false, reason: "not_found" }, { status: 404 });
    const { data: rows } = await db.from("product_comments").select("id, device, name, text, t, likes").eq("post_id", postId).eq("hidden", false).order("t", { ascending: true }).limit(200);
    const list = ((rows ?? []) as { id: number; device: string; name: string; text: string; t: string; likes: number }[]).filter((r) => !hidden.has(r.device) || r.device === device);
    let liked = new Set<number>(); let likedPost = false;
    if (device) {
      if (list.length) { const { data } = await db.from("comment_likes").select("comment_id").eq("device", device).in("comment_id", list.map((r) => r.id)); liked = new Set(((data ?? []) as { comment_id: number }[]).map((x) => x.comment_id)); }
      const { data: pl } = await db.from("post_likes").select("post_id").eq("device", device).eq("post_id", postId).maybeSingle(); likedPost = !!pl;
    }
    return Response.json({ ok: true, post: { id: p.id, name: p.name, text: p.text, ref: p.ref, t: p.t, likes: p.likes, liked: likedPost, n_comments: p.n_comments, mine: p.device === device },
      comments: list.map((r) => ({ id: r.id, name: r.name, text: r.text, t: r.t, likes: r.likes, liked: liked.has(r.id), mine: r.device === device })) });
  }
  const country = (u.searchParams.get("country") ?? "").toUpperCase().slice(0, 2);
  const before = u.searchParams.get("before");
  let q = db.from("community_posts").select("id, device, name, text, ref, t, likes, n_comments").eq("hidden", false).order("t", { ascending: false }).limit(30);
  if (country) q = q.eq("country", country);
  if (before) q = q.lt("t", before);
  const { data } = await q;
  const posts = ((data ?? []) as { id: number; device: string; name: string; text: string; ref: Ref; t: string; likes: number; n_comments: number }[]).filter((p) => !hidden.has(p.device) || p.device === device);
  let liked = new Set<number>();
  if (device && posts.length) { const { data: pl } = await db.from("post_likes").select("post_id").eq("device", device).in("post_id", posts.map((p) => p.id)); liked = new Set(((pl ?? []) as { post_id: number }[]).map((x) => x.post_id)); }
  return Response.json({ ok: true, posts: posts.map((p) => ({ id: p.id, name: p.name, text: p.text, ref: p.ref, t: p.t, likes: p.likes, liked: liked.has(p.id), n_comments: p.n_comments, mine: p.device === device })) });
}

export async function POST(request: Request): Promise<Response> {
  const db = admin(); if (!db) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  let b: { action?: string; device?: string; name?: string; text?: string; ref?: unknown; lang?: string; country?: string; post?: number; id?: number };
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
    const { data, error } = await db.from("community_posts").insert({ device, name, text, ref, lang, country: String(b.country ?? "").toUpperCase().slice(0, 2) || null }).select("id, t").single();
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
    const { data, error } = await db.from("product_comments").insert({ post_id: post, device, name, text, lang, country: String(b.country ?? "").toUpperCase().slice(0, 2) || null }).select("id, t").single();
    if (error) return Response.json({ ok: false, reason: error.message }, { status: 500 });
    await db.rpc("bump_post", { pid: post, dlikes: 0, dcomments: 1 }).then(() => {}, () => {});
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
