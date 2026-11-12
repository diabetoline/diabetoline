/**
 * Abonamentul, prin RevenueCat (App Store + Google Play, un singur cod).
 *
 * - Cheile publice RevenueCat vin din variabilele EAS `EXPO_PUBLIC_RC_IOS_KEY` / `EXPO_PUBLIC_RC_ANDROID_KEY`
 *   (sunt chei publice, pot sta în aplicație). Fără ele, sau fără modulul nativ (build-uri de dinainte de 1.1),
 *   plata e „indisponibilă”: paywall-ul arată doar proba gratuită și nimeni nu e blocat.
 * - Produsele: `diabetoline_yearly` și `diabetoline_monthly` (același ID în ambele magazine), în offering-ul
 *   „default”, cu entitlement-ul `pro`. Prețurile le afișăm exact cum le dă magazinul (moneda și formatul țării).
 * - `state.entitled` e oglinda entitlement-ului `pro`; se actualizează la pornire, după cumpărare/restaurare
 *   și când RevenueCat anunță o schimbare (reînnoire, anulare, expirare).
 */
import { NativeModules, Platform, TurboModuleRegistry } from "react-native";

export interface Plan { id: "year" | "month"; price: string; pkg: unknown }
type Purchases = typeof import("react-native-purchases").default;

let mod: Purchases | null | undefined;
function purchases(): Purchases | null {
  if (mod !== undefined) return mod;
  const key = Platform.OS === "ios" ? process.env.EXPO_PUBLIC_RC_IOS_KEY : process.env.EXPO_PUBLIC_RC_ANDROID_KEY;
  // react-native-purchases e modul React Native clasic (nu Expo): îl căutăm în NativeModules, nu în expo.modules.
  // Fără el (build-urile dinainte de 1.1), `require` ar fi fatal în Metro, așa că verificăm înainte.
  let present = false;
  try { present = !!NativeModules.RNPurchases || !!TurboModuleRegistry.get("RNPurchases"); } catch { present = !!NativeModules.RNPurchases; }
  if (!key || !present) return (mod = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const P = require("react-native-purchases").default as Purchases;
    P.configure({ apiKey: key });
    return (mod = P);
  } catch { return (mod = null); }
}

/** true când build-ul are modulul nativ și cheia: paywall-ul poate vinde. */
export function billingAvailable(): boolean { return purchases() !== null; }

function isPro(info: { entitlements: { active: Record<string, unknown> } }): boolean { return !!info.entitlements.active.pro; }

/** La pornire: citește starea abonamentului și ascultă schimbările. */
export function initBilling(onEntitled: (v: boolean) => void): void {
  const P = purchases(); if (!P) return;
  P.getCustomerInfo().then((i) => onEntitled(isPro(i))).catch(() => {});
  P.addCustomerInfoUpdateListener((i) => onEntitled(isPro(i)));
}

/** Planurile cu prețul localizat al magazinului; [] dacă plata nu e disponibilă sau magazinul nu răspunde. */
export async function fetchPlans(): Promise<Plan[]> {
  const P = purchases(); if (!P) return [];
  try {
    const o = (await P.getOfferings()).current;
    if (!o) return [];
    const out: Plan[] = [];
    if (o.annual) out.push({ id: "year", price: o.annual.product.priceString, pkg: o.annual });
    if (o.monthly) out.push({ id: "month", price: o.monthly.product.priceString, pkg: o.monthly });
    return out;
  } catch { return []; }
}

/** Cumpără; întoarce true dacă omul e abonat după. `cancelled` = a închis fereastra magazinului. */
export async function purchase(plan: Plan): Promise<{ ok: boolean; cancelled?: boolean }> {
  const P = purchases(); if (!P) return { ok: false };
  try {
    const { customerInfo } = await P.purchasePackage(plan.pkg as Parameters<Purchases["purchasePackage"]>[0]);
    return { ok: isPro(customerInfo) };
  } catch (e) {
    return { ok: false, cancelled: !!(e as { userCancelled?: boolean })?.userCancelled };
  }
}

/** „Restaurează achiziția” (telefon nou, reinstalare). */
export async function restore(): Promise<boolean> {
  const P = purchases(); if (!P) return false;
  try { return isPro(await P.restorePurchases()); } catch { return false; }
}

/** Pagina magazinului unde omul își gestionează/anulează abonamentul. */
export function manageUrl(): string {
  return Platform.OS === "ios" ? "https://apps.apple.com/account/subscriptions" : "https://play.google.com/store/account/subscriptions?package=com.curalife.diabetoline";
}
