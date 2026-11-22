/**
 * Comanda dintr-o apăsare (22 nov 2026, Alex: „găsește cea mai bună metodă de a vinde produse prin aplicație”):
 * linkul deschide coșul de pe diabetoline.com gata completat (magazinul are limbi/monede multiple și transportul setat),
 * cu codul APP10 la prima comandă și cu id-ul anonim al telefonului ca atribut al comenzii (`attributes[app_device]`),
 * ca webhook-ul Shopify să lege comanda de telefon pentru reamintirea de recomandă. Pentru produsele fără variantă
 * cunoscută deschidem pagina produsului cu codul aplicat (/discount/APP10?redirect=…).
 */
import { Linking } from "react-native";
import { track } from "./analytics";
import { deviceId } from "./analytics";

export const SHOP = "https://www.diabetoline.com";
export const APP_CODE = "APP10";

/** Variantele Shopify ale produselor din catalog (handle → variantId), citite de pe diabetoline.com pe 22 nov 2026. */
export const VARIANTS: Record<string, number> = {
  "curalin-90-capsule": 44579711811850,
  "2-x-curalin-90-capsule": 44579712205066,
  "set-complet-diabetoline-crema-corp-200-ml-crema-picioare-75-ml-spray-135-ml": 53561284296970,
  "spray-picioare-vitalitate-și-protecție-mediskin-135-ml": 50188628361482,
  "copy-of-paste-penne-indice-glicemic-scazut-fiber-pasta-250-gr": 44679250575626,
  "copy-of-paste-fusilli-indice-glicemic-scazut-fiber-pasta-250-gr": 44679260242186,
  "copy-of-paste-fusilli-indice-glicemic-scazut-fiber-pasta-250-gr-2": 44889067913482,
  "faina-din-grau-italian-cu-indice-glicemic-mic-fiber-pasta-500-gr": 44680206745866,
  "paste-tagliatelle-indice-glicemic-scazut-fiber-pasta-200-gr": 44679266926858,
  "faina-proteica-30-proteine": 50851988013322,
  "copy-of-paste-tagliatelle-indice-glicemic-scazut-fiber-pasta-250-gr": 44679271710986,
  "copy-of-pasta-linguine-indice-glicemic-scazut-fiber-pasta-400-gr": 44679207354634,
  "pasta-farfalle-indice-glicemic-scazut-fiber-pasta-400-gr": 44679171965194,
  "copy-of-pasta-farfalle-indice-glicemic-scazut-fiber-pasta-400-gr": 44679196475658,
};

const handleOf = (url: string) => { const m = /\/products\/([^/?#]+)/.exec(url); return m ? decodeURIComponent(m[1]) : null; };

/** Linkul de comandă pentru un produs din catalog (după URL-ul lui), în contextul dat (glucose_high, ideas, shop, family…). */
export function orderUrl(productUrl: string, ctx: string, qty = 1): string {
  const h = handleOf(productUrl);
  const dev = deviceId() ?? "";
  const utm = `utm_source=app&utm_medium=app&utm_campaign=${encodeURIComponent(ctx)}`;
  const v = h ? VARIANTS[h] : undefined;
  if (v) return `${SHOP}/cart/${v}:${qty}?discount=${APP_CODE}&attributes[app_device]=${encodeURIComponent(dev)}&attributes[app_ctx]=${encodeURIComponent(ctx)}&${utm}`;
  const target = h ? `/products/${encodeURIComponent(h)}?${utm}` : `/?${utm}`;
  return `${SHOP}/discount/${APP_CODE}?redirect=${encodeURIComponent(target)}`;
}

/** Deschide comanda și numără apăsarea (evenimentul `shop_order_tap`: produs + context, fără date personale). */
export function order(productUrl: string, ctx: string, qty = 1): void {
  const h = handleOf(productUrl) ?? "shop";
  track("shop_order_tap", { product: h.slice(0, 40), ctx });
  void Linking.openURL(orderUrl(productUrl, ctx, qty));
}
