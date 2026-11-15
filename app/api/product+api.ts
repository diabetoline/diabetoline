/**
 * Baza comună de produse citite din poză (migrarea 0010).
 * GET  /api/product?code=…  → { ok, product } (sau 404)
 * POST /api/product { product, lang } → salvează/actualizează valorile confirmate de om (validate, fără date personale).
 */
import { createClient } from "@supabase/supabase-js";
const URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";
const admin = () => { const k = process.env.SUPABASE_SERVICE_KEY; return k ? createClient(URL, k, { auth: { persistSession: false } }) : null; };
const num = (x: unknown, max = 100) => (typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= max ? Math.round(x * 10) / 10 : 0);

export async function GET(request: Request): Promise<Response> {
  const code = (new URL(request.url).searchParams.get("code") ?? "").replace(/\D/g, "");
  if (code.length < 6) return Response.json({ ok: false }, { status: 400 });
  const db = admin(); if (!db) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  const { data } = await db.from("products_user").select("product").eq("code", code).maybeSingle();
  if (!data) return Response.json({ ok: false, reason: "not_found" }, { status: 404 });
  return Response.json({ ok: true, product: data.product }, { headers: { "cache-control": "public, max-age=3600" } });
}

export async function POST(request: Request): Promise<Response> {
  const db = admin(); if (!db) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  let b: { product?: Record<string, unknown>; lang?: string };
  try { b = await request.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  const p = b.product ?? {};
  const code = String(p.code ?? "").replace(/\D/g, "");
  if (code.length < 6 || code.length > 20) return Response.json({ ok: false }, { status: 400 });
  const product = {
    code, name: String(p.name ?? "").slice(0, 120) || `Produs ${code.slice(-4)}`, brand: p.brand ? String(p.brand).slice(0, 60) : undefined,
    carbs100: num(p.carbs100), sugars100: num(p.sugars100), fiber100: num(p.fiber100), protein100: num(p.protein100),
    serving: typeof p.serving === "number" && p.serving > 0 && p.serving < 2000 ? Math.round(p.serving) : undefined,
    unit: p.unit === "ml" ? "ml" : "g",
    ingredients: Array.isArray(p.ingredients) ? p.ingredients.slice(0, 60).map((x) => String(x).slice(0, 60)) : [],
    categories: [], claims: [], source: "user",
  };
  if (product.sugars100 > product.carbs100) { const t = product.carbs100; product.carbs100 = product.sugars100; product.sugars100 = t; }
  const { data: old } = await db.from("products_user").select("confirmations").eq("code", code).maybeSingle();
  const { error } = await db.from("products_user").upsert({ code, product, lang: (b.lang ?? "").slice(0, 5), confirmations: (old?.confirmations ?? 0) + 1, updated_at: new Date().toISOString() });
  return Response.json({ ok: !error, reason: error?.message });
}
