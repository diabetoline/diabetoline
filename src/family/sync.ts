import { supabase, ensureUser } from "./client";
import type { ListItem, State } from "../store";

/**
 * Urcă jurnalul părintelui pe server, ca să-l vadă copilul. Doar când legătura e activă și părintele a acceptat.
 * Pozele nu se urcă; la mese se trimit numele, verdictul și carbohidrații.
 */
export type Entry = { client_id: string; kind: "glucose" | "meal" | "med" | "walk" | "scan" | "weight"; t: string; data: Record<string, unknown> };

export function entriesFrom(s: State): Entry[] {
  const iso = (t: number) => new Date(t).toISOString();
  const out: Entry[] = [];
  for (const g of s.glucose) out.push({ client_id: `g${g.id}`, kind: "glucose", t: iso(g.t), data: { v: g.v, ctx: g.ctx, note: g.note } });
  for (const m of s.meals) out.push({ client_id: `m${m.id}`, kind: "meal", t: iso(m.t), data: { name: m.name ?? null, level: m.level ?? null, slot: m.slot, carbs: m.carbs ?? null, gl: m.gl ?? null, summary: m.analysis?.summary ?? null } });
  for (const l of s.medLog) { const med = s.meds.find((x) => x.id === l.medId); out.push({ client_id: `d${l.id}`, kind: "med", t: iso(l.t), data: { name: med?.name ?? "", time: l.time } }); }
  for (const w of s.walks ?? []) out.push({ client_id: `w${w.id}`, kind: "walk", t: iso(w.t), data: { min: w.min } });
  for (const w of s.weights ?? []) out.push({ client_id: `k${w.id}`, kind: "weight", t: iso(w.t), data: { kg: w.kg } });
  for (const h of s.history.slice(0, 50)) out.push({ client_id: `s${h.code}`, kind: "scan", t: iso(h.t), data: { name: h.name, level: h.level, code: h.code } });
  return out;
}

let lastPushed = "";
/** Trimite ce s-a schimbat (idempotent: upsert pe user_id + client_id). */
export async function pushEntries(s: State): Promise<void> {
  const entries = entriesFrom(s);
  const sig = JSON.stringify(entries.map((e) => e.client_id + (e.kind === "meal" ? JSON.stringify(e.data) : "")));
  if (sig === lastPushed) return;
  const uid = await ensureUser();
  const rows = entries.map((e) => ({ ...e, user_id: uid }));
  // în loturi, ca să nu depășim limita unei cereri
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase().from("entries").upsert(rows.slice(i, i + 200), { onConflict: "user_id,client_id" });
    if (error) throw error;
  }
  lastPushed = sig;
}

/** Șterge de pe server notările șterse local. Întoarce ce s-a șters, ca să fie scos din `trash`. */
export async function pushDeletes(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const uid = await ensureUser();
  const { error } = await supabase().from("entries").delete().eq("user_id", uid).in("client_id", ids);
  if (error) throw error;
  return ids;
}

/** Copilul: citește jurnalul părintelui pe ultimele N zile. */
export async function fetchParentEntries(parentId: string, days = 14) {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const { data, error } = await supabase().from("entries").select("client_id,kind,t,data").eq("user_id", parentId).gte("t", since).order("t", { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []) as Entry[];
}

/** Părintele: creează un cod de 6 cifre, valabil o zi. */
export async function createCode(parentName: string): Promise<{ code: string; linkId: string }> {
  await ensureUser();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const { data, error } = await supabase().from("links").insert({ parent_id: (await supabase().auth.getUser()).data.user!.id, code, parent_name: parentName.slice(0, 60) }).select("id").single();
  if (error) throw error;
  return { code, linkId: data.id as string };
}

/** Copilul: introduce codul primit de la părinte. */
export async function claimCode(code: string, childName: string): Promise<{ linkId: string; parentName: string; parentId: string }> {
  await ensureUser();
  const { data, error } = await supabase().rpc("claim_link", { p_code: code.replace(/\D/g, ""), p_child_name: childName });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as { link_id: string; parent_name: string };
  const { data: link } = await supabase().from("links").select("parent_id").eq("id", row.link_id).single();
  return { linkId: row.link_id, parentName: row.parent_name, parentId: link?.parent_id as string };
}

/** Starea legăturilor mele (ca părinte sau ca copil). */
export async function myLinks() {
  await ensureUser();
  const { data, error } = await supabase().from("links").select("id,parent_id,child_id,status,parent_name,child_name,code,expires_at").neq("status", "revoked");
  if (error) throw error;
  return data ?? [];
}

/** Părintele rupe legătura: copilul nu mai vede nimic (regula RLS cere status = active). */
export async function revokeLink(linkId: string) {
  const { error } = await supabase().from("links").update({ status: "revoked" }).eq("id", linkId);
  if (error) throw error;
}

/** Șterge contul și toate datele de pe server. */
export async function deleteServerData() {
  const { error } = await supabase().rpc("delete_me");
  if (error) throw error;
  await supabase().auth.signOut();
}

/* ---------- Lista de cumpărături (părinte ↔ copil) ---------- */
export type ShopRow = { client_id: string; name: string; code: string | null; level: "green" | "yellow" | "red" | null; done: boolean; added_by: "parent" | "child"; updated_at: string };

/**
 * Părintele: urcă lista lui, șterge ce a scos și ia înapoi ce a pus copilul.
 * Întoarce lista îmbinată: rândurile de pe server mai noi (puse sau bifate de copil) câștigă.
 */
export async function syncList(local: ListItem[], trash: string[]): Promise<ListItem[]> {
  const uid = await ensureUser();
  const db = supabase();
  const gone = trash.filter((x) => x.startsWith("l")).map((x) => x.slice(1));
  if (gone.length) { const { error } = await db.from("shopping").delete().eq("parent_id", uid).in("client_id", gone); if (error) throw error; }
  const { data, error } = await db.from("shopping").select("client_id,name,code,level,done,added_by,updated_at").eq("parent_id", uid);
  if (error) throw error;
  const server = new Map((data as ShopRow[] ?? []).map((r) => [r.client_id, r]));
  const merged: ListItem[] = local.map((it) => {
    const r = server.get(it.id);
    if (r && new Date(r.updated_at).getTime() > it.t) return { ...it, done: r.done, t: new Date(r.updated_at).getTime() };
    return it;
  });
  for (const r of server.values()) if (!local.some((it) => it.id === r.client_id) && !gone.includes(r.client_id))
    merged.push({ id: r.client_id, name: r.name, code: r.code ?? undefined, level: r.level ?? undefined, done: r.done, t: new Date(r.updated_at).getTime(), by: r.added_by === "child" ? "child" : "me" });
  const rows = merged.map((it) => ({ parent_id: uid, client_id: it.id, name: it.name, code: it.code ?? null, level: it.level ?? null, done: it.done, added_by: it.by === "child" ? "child" : "parent", updated_at: new Date(it.t).toISOString() }));
  if (rows.length) { const { error: e2 } = await db.from("shopping").upsert(rows, { onConflict: "parent_id,client_id" }); if (e2) throw e2; }
  return merged.sort((a, b) => b.t - a.t);
}

/** Copilul: lista părintelui. */
export async function fetchParentList(parentId: string): Promise<ShopRow[]> {
  await ensureUser();
  const { data, error } = await supabase().from("shopping").select("client_id,name,code,level,done,added_by,updated_at").eq("parent_id", parentId).order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ShopRow[];
}
/** Copilul pune ceva pe lista părintelui. */
export async function addToParentList(parentId: string, name: string) {
  const { error } = await supabase().from("shopping").insert({ parent_id: parentId, client_id: "c" + Date.now(), name: name.slice(0, 80), added_by: "child" });
  if (error) throw error;
}
/** Copilul bifează / debifează. */
export async function tickParentList(parentId: string, clientId: string, done: boolean) {
  const { error } = await supabase().from("shopping").update({ done, updated_at: new Date().toISOString() }).eq("parent_id", parentId).eq("client_id", clientId);
  if (error) throw error;
}
