/**
 * Ce arătăm pe țară (țara telefonului, `deviceRegion()`), nu pe limbă.
 *
 * 1. LINKS — produsele noastre (Curalin, FiberPasta, creme) duc spre magazinul potrivit țării:
 *    RO → diabetoline.com (din catalog), SUA → site-ul Curalife din SUA, DE → Amazon DE etc.
 *    Fără intrare pentru o țară → rămâne linkul din catalog. Prețul în altă monedă se dă doar dacă e cunoscut
 *    (în lei, convertit de `money()`); fără preț, cardul arată doar numele.
 * 2. PARTNERS — cardurile partenerilor din Programul de parteneri, pe țară și pe loc în aplicație.
 *    Un singur partener per loc și per țară; mereu marcat „Partener”; textul e prudent, fără promisiuni medicale,
 *    aprobat de partener. Verdictul produselor nu e atins de asta.
 *
 * Regiunile sunt coduri ISO (RO, US, GB, DE, AT, IT…). "EU" se aplică țărilor UE fără intrare proprie.
 */
import type { Placement } from "./recommend";
import type { Lang } from "./i18n";

export interface LinkOverride { url: string; price?: number /* în lei, pentru money() */ }
export interface Partner {
  id: string; placement: Placement; name: string; url: string; image?: string | null;
  text: Record<Lang, string>; everyDays: number; code?: string;
}

const EU = new Set(["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "SK", "SI", "ES", "SE"]);

/** Linkuri pe țară pentru produsele noastre. Cheile: id-urile din `recommend.ts` (curalin, pasta, cream). */
export const LINKS: Record<string, Partial<Record<"curalin" | "pasta" | "cream", LinkOverride>>> = {
  // De completat de Alex cu linkurile reale: Curalife SUA/UK, Amazon DE pentru creme și Curalin, fiberpasta.it pentru IT.
  // US: { curalin: { url: "https://curalife.com/products/curalin" } },
  // GB: { curalin: { url: "https://curalife.co.uk/products/curalin" } },
  // DE: { curalin: { url: "https://www.amazon.de/dp/XXXXXXXXXX" }, cream: { url: "https://www.amazon.de/dp/XXXXXXXXXX" } },
  // IT: { pasta: { url: "https://www.fiberpasta.it" } },
};

/** Partenerii pe țară. Un singur partener per `placement` și țară. */
export const PARTNERS: Record<string, Partner[]> = {
  // Exemplu (nu e activ): un producător de pâine cu IG mic în DE, la „Ce mănânc azi?”
  // DE: [{ id: "p-brot", placement: "ideas", name: "…", url: "https://…", everyDays: 3, code: "BROT30",
  //        text: { ro: "…", en: "…", de: "…" } }],
};

function regionKey(region: string, table: Record<string, unknown>): string | null {
  if (table[region]) return region;
  if (EU.has(region) && table.EU) return "EU";
  return table["*"] ? "*" : null;
}

export function linkFor(region: string, id: string): LinkOverride | null {
  const k = regionKey(region, LINKS);
  return (k && LINKS[k][id as "curalin"]) || null;
}

export function partnersFor(region: string): Partner[] {
  const k = regionKey(region, PARTNERS);
  return k ? PARTNERS[k] : [];
}
