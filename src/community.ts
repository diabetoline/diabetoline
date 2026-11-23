/**
 * Comunitate, treapta 1 (22 nov 2026): „Alții au scanat”, Util / Nu e util, comentarii pe produs. Totul prin server
 * (`/api/community`), identitatea e doar prenumele scris de om; id-ul anonim al telefonului e cel din analytics.
 */
import { deviceId, track } from "./analytics";
import { deviceRegion } from "./money";

const API = process.env.EXPO_PUBLIC_API_URL || "https://curalife.expo.app";
/** Comunitatea se arată abia după ce migrarea 0013 e rulată în Supabase (Alex, 22 nov 2026: „ține asta on hold”). Pe true mâine. */
export const COMMUNITY_ON = true;
export type Comment = { id: number; name: string; text: string; t: string; likes: number; liked: boolean; mine: boolean; photo?: string | null; badges?: string[] };
export type ProductCommunity = { scans: number; levels: { green: number; yellow: number; red: number }; useful: number; notUseful: number; myVote: boolean | null; comments: Comment[] };
export type TopItem = { code: string; name: string; level: string; n: number };

async function post(body: Record<string, unknown>): Promise<{ ok: boolean; reason?: string; status: number; data?: Record<string, unknown> }> {
  const device = deviceId(); if (!device) return { ok: false, status: 0, reason: "no_device" };
  try {
    const r = await fetch(`${API}/api/community`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ device, ...body }) });
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: r.ok && j.ok !== false, status: r.status, reason: typeof j.reason === "string" ? j.reason : undefined, data: j };
  } catch { return { ok: false, status: 0, reason: "network" }; }
}

export async function loadProductCommunity(code: string): Promise<ProductCommunity | null> {
  try {
    const r = await fetch(`${API}/api/community?code=${encodeURIComponent(code)}&device=${encodeURIComponent(deviceId() ?? "")}`);
    if (!r.ok) return null; const j = (await r.json()) as ProductCommunity & { ok: boolean }; return j.ok ? j : null;
  } catch { return null; }
}
export async function vote(code: string, useful: boolean) { track("community_vote", { useful }); return post({ action: "vote", code, useful }); }
export async function comment(code: string, name: string, text: string, lang: string, badges: string[] = []) { track("community_comment"); return post({ action: "comment", code, name, text, lang, country: deviceRegion(), badges }); }
export async function like(id: number) { return post({ action: "like", id }); }
export async function report(id: number, reason?: string) { track("community_report"); return post({ action: "report", id, reason }); }
export async function blockAuthor(id: number) { return post({ action: "block_comment", id }); }
export async function remove(id: number) { return post({ action: "delete", id }); }

export async function loadTop(): Promise<{ green: TopItem[]; red: TopItem[] } | null> {
  try {
    const r = await fetch(`${API}/api/top?country=${encodeURIComponent(deviceRegion())}`);
    if (!r.ok) return null; const j = (await r.json()) as { ok: boolean; green: TopItem[]; red: TopItem[] }; return j.ok ? { green: j.green, red: j.red } : null;
  } catch { return null; }
}

// ——— feed-ul comunității (postări + comentarii la postări) ———
export type PostRef = { code?: string; name: string; level?: string; kind?: "scan" | "plate"; photo?: string } | null;
export type Post = { id: number; name: string; text: string; ref: PostRef; t: string; likes: number; liked: boolean; n_comments: number; mine: boolean; photo?: string | null; badges?: string[] };

async function postFeed(body: Record<string, unknown>): Promise<{ ok: boolean; reason?: string; status: number; data?: Record<string, unknown> }> {
  const device = deviceId(); if (!device) return { ok: false, status: 0, reason: "no_device" };
  try {
    const r = await fetch(`${API}/api/feed`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ device, ...body }) });
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: r.ok && j.ok !== false, status: r.status, reason: typeof j.reason === "string" ? j.reason : undefined, data: j };
  } catch { return { ok: false, status: 0, reason: "network" }; }
}
export async function loadFeed(before?: string): Promise<Post[] | null> {
  try {
    const r = await fetch(`${API}/api/feed?country=${encodeURIComponent(deviceRegion())}&device=${encodeURIComponent(deviceId() ?? "")}${before ? `&before=${encodeURIComponent(before)}` : ""}`);
    if (!r.ok) return null; const j = (await r.json()) as { ok: boolean; posts: Post[] }; return j.ok ? j.posts : null;
  } catch { return null; }
}
export async function loadPost(id: number): Promise<{ post: Post; comments: Comment[] } | null> {
  try {
    const r = await fetch(`${API}/api/feed?post=${id}&device=${encodeURIComponent(deviceId() ?? "")}`);
    if (!r.ok) return null; const j = (await r.json()) as { ok: boolean; post: Post; comments: Comment[] }; return j.ok ? { post: j.post, comments: j.comments } : null;
  } catch { return null; }
}
export async function createPost(name: string, text: string, lang: string, ref?: PostRef, badges: string[] = []) { track("community_post", { ref: ref?.kind ?? "none" }); return postFeed({ action: "post", name, text, lang, ref: ref ?? null, country: deviceRegion(), badges }); }
export async function commentPost(post: number, name: string, text: string, lang: string, badges: string[] = []) { track("community_comment", { on: "post" }); return postFeed({ action: "comment", post, name, text, lang, country: deviceRegion(), badges }); }
export async function likePost(id: number) { return postFeed({ action: "like_post", id }); }
export async function deletePost(id: number) { return postFeed({ action: "delete_post", id }); }
export async function reportPost(id: number) { track("community_report", { on: "post" }); return post({ action: "report_post", id }); }
export async function blockPostAuthor(id: number) { return post({ action: "block_post", id }); }

/** Răspunsuri noi la postările mele de la `since` (ISO) — pentru bulina din meniu. */
export async function loadInbox(since?: string): Promise<number> {
  try {
    const r = await fetch(`${API}/api/feed?inbox=${encodeURIComponent(since ?? "")}&device=${encodeURIComponent(deviceId() ?? "")}`);
    if (!r.ok) return 0; const j = (await r.json()) as { ok: boolean; n: number }; return j.ok ? j.n : 0;
  } catch { return 0; }
}

// ——— profil: poza și insignele (23 nov 2026) ———
export const BADGE_ICON: Record<string, string> = { glu7: "🩸7", scan30: "🛒30", walk7: "🚶7", fam: "👨‍👩‍👧" };
/** Insignele calculate din jurnalul propriu, trimise odată cu postarea (nu se stochează nimic altceva despre om). */
export function myBadges(s: { glucose: { t: number }[]; history: unknown[]; walks?: { t: number }[]; family: { role: string | null; children: unknown[] } }): string[] {
  const days = (xs: { t: number }[]) => { const d = new Set(xs.filter((x) => Date.now() - x.t < 8 * 864e5).map((x) => new Date(x.t).toDateString())); return d.size; };
  const out: string[] = [];
  if (days(s.glucose) >= 7) out.push("glu7");
  if (s.history.length >= 30) out.push("scan30");
  if (days(s.walks ?? []) >= 7) out.push("walk7");
  if (s.family.role === "parent" ? s.family.children.length > 0 : s.family.role === "child") out.push("fam");
  return out;
}
export async function uploadAvatar(jpegBase64: string, name: string): Promise<{ ok: boolean; photo?: string; reason?: string }> {
  const device = deviceId(); if (!device) return { ok: false, reason: "no_device" };
  try {
    const r = await fetch(`${API}/api/avatar`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ device, jpeg: jpegBase64, name }) });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; photo?: string; reason?: string };
    if (r.ok && j.ok) { track("community_photo"); return { ok: true, photo: j.photo }; }
    return { ok: false, reason: j.reason ?? String(r.status) };
  } catch { return { ok: false, reason: "network" }; }
}
export async function removeAvatar(): Promise<void> {
  const device = deviceId(); if (!device) return;
  try { await fetch(`${API}/api/avatar`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ device }) }); } catch {}
}

/** Poza farfuriei pentru o postare: micșorată pe telefon (~900 px), verificată pe server, în bucket-ul public `plates`. */
export async function uploadPlatePhoto(jpegBase64: string): Promise<{ ok: boolean; url?: string; reason?: string }> {
  const device = deviceId(); if (!device) return { ok: false, reason: "no_device" };
  try {
    const r = await fetch(`${API}/api/plate-photo`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ device, jpeg: jpegBase64 }) });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; url?: string; reason?: string };
    return r.ok && j.ok && j.url ? { ok: true, url: j.url } : { ok: false, reason: j.reason ?? String(r.status) };
  } catch { return { ok: false, reason: "network" }; }
}
