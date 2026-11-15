/**
 * Pachetul offline (15 nov 2026): cele mai scanate ~5.000 de produse din țara telefonului, descărcate o dată la 14 zile
 * de la server (public/pack/<ȚARĂ>.json, generat de workflow-ul `pack.yml`) și ținute pe telefon (expo-file-system).
 * În magazin fără semnal, scanarea găsește produsul aici instant; restul merg la Open Food Facts când e internet.
 */
import { File, Paths } from "expo-file-system";
import { getLocales } from "expo-localization";
import type { Product } from "../engine/types";
import { normalize } from "./off";

const API = process.env.EXPO_PUBLIC_API_URL || "https://curalife.expo.app";
const COUNTRIES = new Set(["RO", "DE", "GB", "US", "AT", "HU"]);
const MAX_AGE = 14 * 864e5;

type Raw = Record<string, unknown> & { code: string };
let index: Map<string, Raw> | null = null;
let loadedFor = "";

export function packCountry(): string {
  const cc = getLocales()[0]?.regionCode ?? "RO";
  return COUNTRIES.has(cc) ? cc : "RO";
}
const fileFor = (cc: string) => new File(Paths.document, `pack-${cc}.json`);

/** Descarcă pachetul dacă lipsește sau e mai vechi de 14 zile; tăcut la eșec. */
export async function refreshPack(): Promise<void> {
  const cc = packCountry();
  try {
    const f = fileFor(cc);
    const fresh = f.exists && f.modificationTime != null && Date.now() - f.modificationTime * 1000 < MAX_AGE && (f.size ?? 0) > 1000;
    if (fresh) return;
    const r = await fetch(`${API}/pack/${cc}.json`);
    if (!r.ok) return;
    const text = await r.text();
    if (!text.startsWith("{")) return;
    f.write(text);
    index = null; loadedFor = "";
  } catch {}
}

async function load(): Promise<Map<string, Raw>> {
  const cc = packCountry();
  if (index && loadedFor === cc) return index;
  const m = new Map<string, Raw>();
  try {
    const f = fileFor(cc);
    if (f.exists) {
      const data = JSON.parse(f.textSync()) as { products?: Raw[] };
      for (const p of data.products ?? []) if (p.code) m.set(String(p.code), p);
    }
  } catch {}
  index = m; loadedFor = cc;
  return m;
}

/** Produsul din pachet, normalizat ca unul din Open Food Facts; null dacă nu e în pachet. */
export async function packLookup(code: string, lang: string): Promise<Product | null> {
  const m = await load();
  const raw = m.get(code);
  return raw ? normalize(raw, lang) : null;
}

export async function packSize(): Promise<number> { return (await load()).size; }
