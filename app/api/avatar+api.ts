/**
 * Poza de profil pentru comunitate (23 nov 2026): POST { device, jpeg (base64, ≤ 200 KB, 256 px) } → urcă în bucket-ul public `avatars`
 * ca <device>.jpg și o pune în community_profiles.photo; DELETE { device } o șterge. Serverul verifică poza cu AI (doar o față de adult,
 * fără copii, documente, nuditate) înainte să o publice.
 */
import { admin, cleanDevice } from "./community+api";
import { askVision } from "../../src/server/claude";

const SB_URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";

async function checkPhoto(b64: string): Promise<boolean> {
  try {
    const r = await askVision(b64, 'Is this acceptable as a public profile photo in a health community app? ok=true only if it shows an adult person (face or portrait) or an innocuous object/pet/landscape; ok=false if it shows a child, nudity or sexual content, a document/ID/screen with text, violence, or hateful symbols. Reply with JSON only: {"ok": true} or {"ok": false}', 30, false, "avatar");
    return r.ok && r.json.ok === true;
  } catch { return false; }
}

export async function POST(request: Request): Promise<Response> {
  const db = admin(); if (!db) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  let b: { device?: string; jpeg?: string; name?: string }; try { b = await request.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  const device = cleanDevice(b.device); const b64 = String(b.jpeg ?? "").replace(/^data:image\/jpeg;base64,/, "");
  if (!device || b64.length < 100 || b64.length > 280_000) return Response.json({ ok: false }, { status: 400 });
  if (!(await checkPhoto(b64))) return Response.json({ ok: false, reason: "rejected" }, { status: 422 });
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const path = `${device}.jpg`;
  const { error } = await db.storage.from("avatars").upload(path, bytes, { contentType: "image/jpeg", upsert: true, cacheControl: "3600" });
  if (error) return Response.json({ ok: false, reason: error.message }, { status: 500 });
  const photo = `${SB_URL}/storage/v1/object/public/avatars/${path}?v=${Date.now()}`;
  await db.from("community_profiles").upsert({ device, photo, name: b.name ? String(b.name).slice(0, 40) : null, t: new Date().toISOString() });
  return Response.json({ ok: true, photo });
}

export async function DELETE(request: Request): Promise<Response> {
  const db = admin(); if (!db) return Response.json({ ok: false }, { status: 503 });
  let b: { device?: string }; try { b = await request.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  const device = cleanDevice(b.device); if (!device) return Response.json({ ok: false }, { status: 400 });
  await db.storage.from("avatars").remove([`${device}.jpg`]);
  await db.from("community_profiles").update({ photo: null }).eq("device", device);
  return Response.json({ ok: true });
}
