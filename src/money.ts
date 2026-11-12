import { getLocales } from "expo-localization";
import rates from "./rates.json";

/** Moneda după țara telefonului. România → lei; zona euro → €; restul → moneda locală dacă avem curs, altfel €. */
const EURO = new Set(["DE", "AT", "FR", "IT", "ES", "NL", "BE", "PT", "IE", "FI", "GR", "SK", "SI", "LT", "LV", "EE", "LU", "MT", "CY", "HR"]);
const BY_REGION: Record<string, string> = { RO: "RON", US: "USD", GB: "GBP", CH: "CHF", PL: "PLN", HU: "HUF", CZ: "CZK", SE: "SEK", DK: "DKK", NO: "NOK", BG: "BGN", MD: "MDL" };

export function deviceRegion(): string { return getLocales().map((l) => l.regionCode).find(Boolean) ?? "RO"; }
export function currencyFor(region: string): string { return BY_REGION[region] ?? (EURO.has(region) ? "EUR" : "EUR"); }

/** Prețul în lei afișat în moneda utilizatorului (cu „≈” când e convertit). */
export function money(lei: number, region = deviceRegion(), locale?: string): string {
  const cur = currencyFor(region);
  const loc = locale ?? getLocales()[0]?.languageTag ?? "ro-RO";
  const fmt = (v: number, c: string) => { try { return new Intl.NumberFormat(loc, { style: "currency", currency: c, maximumFractionDigits: c === "HUF" ? 0 : 2 }).format(v); } catch { return `${v.toFixed(2)} ${c}`; } };
  if (cur === "RON") return fmt(lei, "RON").replace("RON", "lei");
  const rate = (rates.rates as Record<string, number>)[cur];
  if (!rate) return fmt(lei, "RON").replace("RON", "lei");
  const v = lei * rate;
  const rounded = cur === "HUF" ? Math.round(v / 10) * 10 : Math.round(v * 20) / 20; // la 5 bani / 10 forinți
  return `≈ ${fmt(rounded, cur)}`;
}
export const ratesDate = rates.date;

/** Prețurile abonamentului (decise 5 nov 2026): un plan, familia inclusă. Afișate în moneda țării telefonului. */
export const PLAN = { RON: { year: 250, month: 29.99 }, EUR: { year: 59.99, month: 6.99 }, GBP: { year: 44.99, month: 5.49 }, USD: { year: 49.99, month: 5.99 } } as const;
export function planPrice(kind: "year" | "month", region = deviceRegion()): string {
  const cur = currencyFor(region);
  const p = (PLAN as Record<string, { year: number; month: number }>)[cur] ?? PLAN.EUR;
  const c = cur in PLAN ? cur : "EUR";
  const txt = new Intl.NumberFormat(getLocales()[0]?.languageTag ?? "ro-RO", { style: "currency", currency: c, minimumFractionDigits: Number.isInteger(p[kind]) ? 0 : 2 }).format(p[kind]);
  return c === "RON" ? txt.replace("RON", "lei") : txt;
}
export const TRIAL_DAYS = 5;
export function trialDaysLeft(trialStart?: number): number { return trialStart == null ? 0 : Math.max(0, TRIAL_DAYS - Math.floor((Date.now() - trialStart) / 864e5)); }
