import { useRouter } from "expo-router";
import { TRIAL_DAYS, trialDaysLeft } from "./money";
import { dayKeyLocal } from "./engine/days";
import type { State } from "./store";

/**
 * Cine are acces la ce. Trei situații: în probă (5 zile cu tot), abonat (RevenueCat → `state.entitled`), gratuit.
 * Gratuit: 5 scanări pe zi, glicemia, medicamentele, reamintirile, calendarul. Restul cere abonament.
 * ENFORCE rămâne false până pornim plățile: logica și ecranele sunt gata, dar nimeni nu e blocat încă.
 */
export const ENFORCE = false;
export const FREE_SCANS_PER_DAY = 5;
export type Tier = "trial" | "paid" | "free";
export type Feature = "scan" | "plate" | "ideas" | "ask" | "alternatives" | "family" | "report";

export function tier(s: State): Tier {
  if (s.entitled) return "paid";
  if (trialDaysLeft(s.trialStart) > 0) return "trial";
  return "free";
}
export function scansToday(s: State): number {
  return s.scans?.day === dayKeyLocal(Date.now()) ? s.scans.n : 0;
}
/** true dacă funcția e permisă acum (fără să blocheze nimic cât ENFORCE e false) */
export function allowed(s: State, f: Feature): boolean {
  if (!ENFORCE) return true;
  const t = tier(s);
  if (t !== "free") return true;
  if (f === "scan") return scansToday(s) < FREE_SCANS_PER_DAY;
  return false;
}
export { TRIAL_DAYS };

/** În ecrane: `const gate = useGate(); if (!gate("plate")) return;` — deschide ecranul de abonare și întoarce false. */
export function useGate(s: State) {
  const router = useRouter();
  return (f: Feature): boolean => {
    if (allowed(s, f)) return true;
    router.push({ pathname: "/paywall", params: { from: f } });
    return false;
  };
}
