/**
 * POST /api/shopify-order?token=STATS_TOKEN — webhook Shopify „orders/create” (22 nov 2026).
 * Leagă comanda de telefon prin atributul `app_device` pus de `src/shop.ts` în coș; ține doar produsele, suma și țara
 * (nimic personal). Dacă e setat SHOPIFY_WEBHOOK_SECRET, verifică și semnătura HMAC; altfel ajunge tokenul din URL.
 * Comenzile fără `app_device` (din site, nu din aplicație) se ignoră.
 */
import { createClient } from "@supabase/supabase-js";
import { authorized } from "./stats+api";
const URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";

async function hmacOk(raw: string, header: string | null): Promise<boolean> {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET; if (!secret) return true;
  if (!header) return false;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(raw));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return b64 === header;
}

export async function POST(request: Request): Promise<Response> {
  if (!authorized(request)) return Response.json({ ok: false }, { status: 401 });
  const raw = await request.text();
  if (!(await hmacOk(raw, request.headers.get("x-shopify-hmac-sha256")))) return Response.json({ ok: false, reason: "bad_hmac" }, { status: 401 });
  let o: { id?: number; note_attributes?: { name: string; value: string }[]; line_items?: { variant_id?: number; product_id?: number; title?: string; sku?: string; quantity?: number; price?: string }[]; total_price?: string; currency?: string; shipping_address?: { country_code?: string }; discount_codes?: { code: string }[] };
  try { o = JSON.parse(raw); } catch { return Response.json({ ok: false }, { status: 400 }); }
  const attr = (n: string) => (o.note_attributes ?? []).find((a) => a.name === n)?.value;
  const device = attr("app_device"); if (!device || !o.id) return Response.json({ ok: true, ignored: true });
  const key = process.env.SUPABASE_SERVICE_KEY; if (!key) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  const db = createClient(URL, key, { auth: { persistSession: false } });
  const items = (o.line_items ?? []).map((l) => ({ v: l.variant_id, sku: l.sku, title: String(l.title ?? "").slice(0, 60), q: l.quantity ?? 1 }));
  const row = { order_id: o.id, device: device.slice(0, 64), ctx: String(attr("app_ctx") ?? "").slice(0, 40) || null, items, total: Number(o.total_price ?? 0), currency: o.currency ?? null, country: o.shipping_address?.country_code ?? null, discount: o.discount_codes?.[0]?.code ?? null };
  const { error } = await db.from("orders_app").upsert(row);
  if (error) return Response.json({ ok: false, reason: error.message }, { status: 500 });
  await db.from("events").insert({ device: row.device, name: "purchase_product", props: { ctx: row.ctx ?? "", total: row.total, cur: row.currency ?? "", n: items.length }, country: row.country, platform: "server" }).then(() => {}, () => {});
  return Response.json({ ok: true });
}
