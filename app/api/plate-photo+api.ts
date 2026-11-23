/**
 * Poza unei farfurii distribuite în comunitate (23 nov 2026): POST { device, jpeg (base64, ≤ 500 KB, ~900 px) } → url public
 * în bucket-ul `plates` (<device>/<timestamp>.jpg), după verificarea AI (doar mâncare; fără persoane, copii, documente, ecrane).
 */
import { admin, cleanDevice } from "./community+api";
import { askVision } from "../../src/server/claude";
const SB_URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";

export async function POST(request: Request): Promise<Response> {
  const db = admin(); if (!db) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  let b: { device?: string; jpeg?: string }; try { b = await request.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  const device = cleanDevice(b.device); const b64 = String(b.jpeg ?? "").replace(/^data:image\/jpeg;base64,/, "");
  if (!device || b64.length < 100 || b64.length > 700_000) return Response.json({ ok: false }, { status: 400 });
  const { data: ban } = await db.from("community_bans").select("device").eq("device", device).maybeSingle();
  if (ban) return Response.json({ ok: false, reason: "banned" }, { status: 403 });
  const chk = await askVision(b64, 'Is this photo acceptable to share publicly in a diabetes food community? ok=true if it mainly shows food, a plate, a meal, a drink or a grocery product; ok=false if it shows a recognizable person\'s face, a child, a document/ID/screen with text, nudity, or anything violent or hateful. Reply with JSON only: {"ok": true} or {"ok": false}', 30, false, "plate_share").catch(() => null);
  if (!chk || !chk.ok || chk.json.ok !== true) return Response.json({ ok: false, reason: "rejected" }, { status: 422 });
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const path = `${device}/${Date.now()}.jpg`;
  const { error } = await db.storage.from("plates").upload(path, bytes, { contentType: "image/jpeg", cacheControl: "86400" });
  if (error) return Response.json({ ok: false, reason: error.message }, { status: 500 });
  return Response.json({ ok: true, url: `${SB_URL}/storage/v1/object/public/plates/${path}` });
}
