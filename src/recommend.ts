/**
 * Recomandări blânde pentru produsele Diabetoline, în contexte potrivite:
 * - glicemie mare sau masă grea → Curalin (fără promisiuni: „întreabă medicul”)
 * - nu știe ce să mănânce → paste FiberPasta
 * - din când în când, pe prima pagină → cremele (pielea uscată e frecventă în diabet)
 * Reguli: o singură sugestie pe ecran; același produs cel mult o dată la N zile; „Nu acum” îl oprește 14 zile.
 */
import catalog from "./catalog.json";
import { linkFor, partnersFor } from "./partners";

export type Placement = "glucose_high" | "meal_heavy" | "ideas" | "home";
export interface Reco {
  id: string; placement: Placement; name: string; price?: number; url: string; image: string | null; everyDays: number;
  /** produs propriu: text din i18n; partener: text pe limbă, marcat „Partener” */
  textKey?: "reco_curalin" | "reco_pasta" | "reco_cream"; text?: Record<string, string>; partner?: boolean;
}

type Item = { id: string; section: string; name: string; price: number; url: string; image: string | null; available: boolean };
const items = catalog as Item[];
const find = (pred: (i: Item) => boolean) => items.find((i) => pred(i) && i.available) ?? items.find(pred);

const CURALIN = find((i) => i.id === "curalin-90-capsule");
const PASTA = find((i) => i.section === "food" && /tubetti|tortiglioni|spaghetti/i.test(i.name));
const CREAM = find((i) => /picioare/i.test(i.name) && /crem/i.test(i.name));

const RULES: Reco[] = [
  CURALIN && { id: "curalin", placement: "glucose_high", name: CURALIN.name, price: CURALIN.price, url: CURALIN.url, image: CURALIN.image, textKey: "reco_curalin", everyDays: 4 },
  CURALIN && { id: "curalin", placement: "meal_heavy", name: CURALIN.name, price: CURALIN.price, url: CURALIN.url, image: CURALIN.image, textKey: "reco_curalin", everyDays: 4 },
  PASTA && { id: "pasta", placement: "ideas", name: PASTA.name, price: PASTA.price, url: PASTA.url, image: PASTA.image, textKey: "reco_pasta", everyDays: 3 },
  CREAM && { id: "cream", placement: "home", name: CREAM.name, price: CREAM.price, url: CREAM.url, image: CREAM.image, textKey: "reco_cream", everyDays: 10 },
].filter(Boolean) as Reco[];

export interface RecoState { shown: Record<string, number>; snoozed: Record<string, number> }
const DAY = 864e5;

/** Regulile pentru o țară: partenerii țării întâi (un loc = un partener), apoi produsele noastre cu linkul țării. */
export function rulesFor(region: string): Reco[] {
  const partners: Reco[] = partnersFor(region).map((p) => ({ id: p.id, placement: p.placement, name: p.name, url: p.url, image: p.image ?? null, everyDays: p.everyDays, text: p.text, partner: true }));
  const own = RULES.map((r) => {
    const o = linkFor(region, r.id);
    return o ? { ...r, url: o.url, price: o.price } : r;
  });
  return [...partners, ...own];
}

/** Recomandarea pentru un loc din aplicație, dacă regulile o permit acum. */
export function pickReco(placement: Placement, rs: RecoState | undefined, now = Date.now(), region = "RO"): Reco | null {
  const shown = rs?.shown ?? {}, snoozed = rs?.snoozed ?? {};
  for (const r of rulesFor(region)) {
    if (r.placement !== placement) continue;
    if ((snoozed[r.id] ?? 0) > now) continue;
    if (now - (shown[r.id] ?? 0) < r.everyDays * DAY) continue;
    return r;
  }
  return null;
}
export const markShown = (rs: RecoState | undefined, id: string, now = Date.now()): RecoState => ({ shown: { ...(rs?.shown ?? {}), [id]: now }, snoozed: rs?.snoozed ?? {} });
export const snooze = (rs: RecoState | undefined, id: string, days = 14, now = Date.now()): RecoState => ({ shown: rs?.shown ?? {}, snoozed: { ...(rs?.snoozed ?? {}), [id]: now + days * DAY } });
