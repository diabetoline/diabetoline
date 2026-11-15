/**
 * Căutarea unui cod de bare, în ordinea vitezei (15 nov 2026): produsele deja scanate (cache) → produsele Diabetoline
 * (partener) → pachetul offline al țării → Open Food Facts (online) → baza comună a produselor citite din poză.
 * Întoarce produsul sau motivul: `notfound` (nicăieri) / `network` (fără internet și nu e în pachet).
 */
import type { Product } from "../engine/types";
import { findPartner, partnerAsProduct } from "../partner";
import { fetchProduct, NotFound } from "./off";
import { packLookup } from "./pack";

const API = process.env.EXPO_PUBLIC_API_URL || "https://curalife.expo.app";
export type Lookup = { ok: true; product: Product; from: "cache" | "partner" | "pack" | "off" | "shared" } | { ok: false; error: "notfound" | "network" };

export async function lookupProduct(code: string, cache: Record<string, Product>, lang: string): Promise<Lookup> {
  const c = cache[code];
  if (c) return { ok: true, product: c, from: "cache" };
  const partner = findPartner(code);
  if (partner) return { ok: true, product: partnerAsProduct(partner, code), from: "partner" };
  const packed = await packLookup(code, lang);
  if (packed) return { ok: true, product: packed, from: "pack" };
  let network = false;
  try {
    return { ok: true, product: await fetchProduct(code, lang), from: "off" };
  } catch (e) {
    if (!(e instanceof NotFound)) network = true;
  }
  // baza comună: produse pozate și confirmate de alți oameni
  try {
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(`${API}/api/product?code=${encodeURIComponent(code)}`, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
    if (r.ok) { const b = (await r.json()) as { ok?: boolean; product?: Product }; if (b.ok && b.product) return { ok: true, product: { ...b.product, source: "user" }, from: "shared" }; }
    if (r.status === 404) network = false;
  } catch { /* OFF a spus deja ce știe; eroarea bazei comune nu schimbă verdictul */ }
  return { ok: false, error: network ? "network" : "notfound" };
}

/** Trimite în baza comună un produs citit din poză și confirmat de om (tăcut la eșec). */
export function shareProduct(p: Product, lang: string): void {
  fetch(`${API}/api/product`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product: p, lang }) }).catch(() => {});
}
