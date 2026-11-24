/**
 * HbA1c estimată din media glicemiilor (24 nov 2026, cerută în comunitate de Adi; Alex: „ideea e foarte bună”).
 * Formula ADAG (Nathan et al. 2008): HbA1c (%) = (eAG mg/dL + 46,7) / 28,7. E o estimare orientativă din ce notează omul,
 * nu înlocuiește analiza — de aceea cerem minimum 14 zile și 10 măsurători, și nu o interpretăm (fără „bun/rău”, fără ținte).
 */
export const A1C_MIN_DAYS = 14, A1C_MIN_READINGS = 10;
export type A1cEstimate = { avg: number; a1c: number; n: number; days: number };
export function estimateA1c(glucose: { t: number; v: number }[], now = Date.now(), windowDays = 90): A1cEstimate | null {
  const from = now - windowDays * 864e5;
  const xs = glucose.filter((g) => g.t >= from && g.v > 20 && g.v < 600);
  if (xs.length < A1C_MIN_READINGS) return null;
  const days = new Set(xs.map((g) => Math.floor(g.t / 864e5))).size;
  const first = Math.min(...xs.map((g) => g.t));
  if (days < A1C_MIN_DAYS || now - first < (A1C_MIN_DAYS - 1) * 864e5) return null;
  const avg = xs.reduce((a, g) => a + g.v, 0) / xs.length;
  return { avg, a1c: (avg + 46.7) / 28.7, n: xs.length, days };
}
