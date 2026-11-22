/**
 * GET /api/moderate?token=STATS_TOKEN — pagina de moderare a comunității pentru Alex (telefon): comentariile raportate
 * (ascunse automat la raportare) și ultimele comentarii publicate. Butoane: Repune · Șterge · Interzice autorul.
 * POST /api/moderate?token=… { action: "restore"|"delete"|"ban", id }
 */
import { createClient } from "@supabase/supabase-js";
import { authorized } from "./stats+api";
const SB_URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) return new Response("401", { status: 401 });
  const key = process.env.SUPABASE_SERVICE_KEY; if (!key) return new Response("not configured", { status: 503 });
  const db = createClient(SB_URL, key, { auth: { persistSession: false } });
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const [{ data: reports }, { data: recent }, { count: bans }, { data: posts }] = await Promise.all([
    db.from("community_reports").select("id, comment_id, post_id, reason, t, product_comments(id, code, name, text, country, hidden), community_posts(id, name, text, country, hidden)").eq("resolved", false).order("t", { ascending: false }).limit(50),
    db.from("product_comments").select("id, code, name, text, country, t, likes, hidden").order("t", { ascending: false }).limit(30),
    db.from("community_bans").select("device", { count: "exact", head: true }),
    db.from("community_posts").select("id, name, text, country, t, likes, n_comments, hidden").order("t", { ascending: false }).limit(30),
  ]);
  type R = { id: number; comment_id: number | null; post_id: number | null; reason: string | null; t: string; product_comments: { id: number; code: string | null; name: string; text: string; country: string | null; hidden: boolean } | null; community_posts: { id: number; name: string; text: string; country: string | null; hidden: boolean } | null };
  const row = (kind: "c" | "p", id: number, name: string, text: string, code: string | null, country: string | null, extra: string) =>
    `<div class="c"><b>${esc(name)}</b> <small>${kind === "p" ? "postare" : "comentariu"} · ${esc(country ?? "")}${code ? " · " + esc(code) : ""}</small>${extra}<div>${esc(text)}</div>
     <div class="row"><button onclick="act('restore',${id},'${kind}')">Repune</button><button class="bad" onclick="act('delete',${id},'${kind}')">Șterge</button><button class="bad" onclick="act('ban',${id},'${kind}')">Interzice autorul</button></div></div>`;
  const rep = ((reports ?? []) as unknown as R[]).map((r) => r.product_comments ? row("c", r.product_comments.id, r.product_comments.name, r.product_comments.text, r.product_comments.code, r.product_comments.country, `<small> · raportat: ${esc(r.reason ?? "—")}</small>`)
    : r.community_posts ? row("p", r.community_posts.id, r.community_posts.name, r.community_posts.text, null, r.community_posts.country, `<small> · raportat: ${esc(r.reason ?? "—")}</small>`) : "").join("") || "<p class='muted'>Nimic raportat.</p>";
  const rp = ((posts ?? []) as { id: number; name: string; text: string; country: string | null; t: string; likes: number; n_comments: number; hidden: boolean }[]).map((c) => row("p", c.id, c.name, c.text, null, c.country, `<small> · ${new Date(c.t).toLocaleString("ro-RO")} · 👍 ${c.likes} · 💬 ${c.n_comments}${c.hidden ? " · <b>ascuns</b>" : ""}</small>`)).join("") || "<p class='muted'>Nicio postare încă.</p>";
  const rec = ((recent ?? []) as { id: number; code: string | null; name: string; text: string; country: string | null; t: string; likes: number; hidden: boolean }[]).map((c) => row("c", c.id, c.name, c.text, c.code, c.country, `<small> · ${new Date(c.t).toLocaleString("ro-RO")} · 👍 ${c.likes}${c.hidden ? " · <b>ascuns</b>" : ""}</small>`)).join("") || "<p class='muted'>Niciun comentariu încă.</p>";
  const html = `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Diabetoline – moderare</title>
<style>:root{--bg:#F3F5F7;--card:#fff;--ink:#14222B;--muted:#4B5A63;--line:#DDE3E7;--acc:#2E7D4F;--bad:#B3261E}
@media(prefers-color-scheme:dark){:root{--bg:#0F1519;--card:#18222A;--ink:#EDF2F5;--muted:#9AA7AE;--line:#2A3740}}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.4 system-ui,sans-serif;padding:16px;max-width:600px;margin:auto}
h1{font-size:22px;margin:0 0 4px}h2{font-size:18px;margin:22px 0 8px}.muted,small{color:var(--muted);font-size:14px}
.c{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px;margin:10px 0}.c>div{margin-top:6px}
.row{display:flex;gap:8px;flex-wrap:wrap}button{font:600 15px system-ui;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--ink)}
button.bad{color:var(--bad)}</style></head><body>
<h1>Moderare comunitate</h1><div class="muted">Raportările ascund comentariul pe loc; tu decizi. Interziși: ${bans ?? 0}.</div>
<h2>Raportate</h2>${rep}<h2>Ultimele postări</h2>${rp}<h2>Ultimele comentarii</h2>${rec}
<script>async function act(a,id,kind){const r=await fetch('/api/moderate?token=${encodeURIComponent(token)}',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:a,id,kind})});if(r.ok)location.reload();else alert('eroare '+r.status)}</script>
</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  if (!authorized(request)) return Response.json({ ok: false }, { status: 401 });
  const key = process.env.SUPABASE_SERVICE_KEY; if (!key) return Response.json({ ok: false }, { status: 503 });
  const db = createClient(SB_URL, key, { auth: { persistSession: false } });
  let b: { action?: string; id?: number; kind?: string }; try { b = await request.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  const id = Number(b.id); if (!Number.isFinite(id)) return Response.json({ ok: false }, { status: 400 });
  const table = b.kind === "p" ? "community_posts" : "product_comments"; const col = b.kind === "p" ? "post_id" : "comment_id";
  if (b.action === "restore") { await db.from(table).update({ hidden: false }).eq("id", id); }
  else if (b.action === "delete") { await db.from(table).delete().eq("id", id); }
  else if (b.action === "ban") {
    const { data: c } = await db.from(table).select("device").eq("id", id).maybeSingle();
    if (c) { await db.from("community_bans").upsert({ device: c.device, reason: `${table} #${id}` }); await db.from("product_comments").update({ hidden: true }).eq("device", c.device); await db.from("community_posts").update({ hidden: true }).eq("device", c.device); }
  } else return Response.json({ ok: false }, { status: 400 });
  await db.from("community_reports").update({ resolved: true }).eq(col, id);
  return Response.json({ ok: true });
}
