/**
 * Produsele distribuite de Curalife Development SRL și vândute pe diabetoline.com.
 * Valorile nutriționale sunt din fișele tehnice ale producătorului (FiberPasta, Italia); textul despre IG e cel oficial.
 * Prețurile sunt orientative (noiembrie 2026); pagina de produs e sursa de adevăr.
 */
import type { Product } from "./engine/types";

export const SHOP = "https://diabetoline.com";
export const PASTA_COLLECTION = `${SHOP}/collections/alimente-indice-glicemic-scazut`;

export interface PartnerProduct {
  id: string; name: string; brand: string; price: number; handle: string;
  /** coduri de bare cunoscute (EAN-13) */
  eans: string[];
  /** valori la 100 g */
  carbs100: number; sugars100: number; fiber100: number; protein100: number;
  /** IG certificat de producător */
  gi: number; serving: number;
  kind: "pasta" | "flour" | "rice";
}

const pasta = { carbs100: 58, sugars100: 0.3, fiber100: 15, protein100: 15, gi: 23, serving: 80, kind: "pasta" as const, brand: "FiberPasta" };
const flour = { carbs100: 58, sugars100: 1.9, fiber100: 15, protein100: 12, gi: 29, serving: 50, kind: "flour" as const, brand: "FiberPasta" };

export const PARTNER: PartnerProduct[] = [
  { id: "fp-tubetti", name: "Paste Tubetti FiberPasta, 400 g", price: 33.6, handle: "copy-of-paste-fusilli-indice-glicemic-scazut-fiber-pasta-250-gr", eans: ["8008647000423"], ...pasta },
  { id: "fp-tortiglioni", name: "Paste Tortiglioni FiberPasta, 400 g", price: 45, handle: "paste-pentru-diabetici-tortiglioni-fiberpasta-400-gr", eans: ["8008647000126"], ...pasta },
  { id: "fp-spaghetti", name: "Paste Spaghetti FiberPasta, 500 g", price: 38.2, handle: "copy-of-paste-tagliatelle-indice-glicemic-scazut-fiber-pasta-250-gr", eans: ["8008647000447"], ...pasta },
  { id: "fp-linguine", name: "Paste Linguine FiberPasta, 400 g", price: 45, handle: "copy-of-pasta-farfalle-indice-glicemic-scazut-fiber-pasta-400-gr", eans: ["8008647000263"], ...pasta },
  { id: "fp-fusilli", name: "Paste Fusilli FiberPasta, 250 g", price: 23.8, handle: "copy-of-paste-penne-indice-glicemic-scazut-fiber-pasta-250-gr", eans: ["8008647000362"], ...pasta },
  { id: "fp-penne", name: "Paste Penne FiberPasta, 250 g", price: 23.8, handle: "copy-of-paste-penne-indice-glicemic-scazut-fiber-pasta-250-gr", eans: ["8008647000300"], ...pasta },
  { id: "fp-sedani", name: "Paste Sedani FiberPasta, 250 g", price: 23.8, handle: "copy-of-paste-fusilli-indice-glicemic-scazut-fiber-pasta-250-gr-2", eans: [], ...pasta },
  { id: "fp-tagliatelle", name: "Paste Tagliatelle FiberPasta, 250 g", price: 36.5, handle: "paste-tagliatelle-indice-glicemic-scazut-fiber-pasta-200-gr", eans: ["8008647000621"], ...pasta },
  { id: "fp-reginette", name: "Paste Reginette FiberPasta, 400 g", price: 45, handle: "paste-pentru-diabetici-tortiglioni-fiberpasta-400-gr", eans: ["8008647001000"], ...pasta },
  { id: "fp-stelline", name: "Paste Stelline FiberPasta, 500 g", price: 39, handle: "copy-of-pasta-linguine-indice-glicemic-scazut-fiber-pasta-400-gr", eans: ["8008647000348"], ...pasta },
  { id: "fp-lasagna", name: "Lasagna FiberPasta, 250 g", price: 36.5, handle: "alimente-indice-glicemic-scazut", eans: ["8008647000379"], ...pasta },
  { id: "fp-gramigna", name: "Paste Gramigna FiberPasta, 500 g", price: 39, handle: "copy-of-pasta-linguine-indice-glicemic-scazut-fiber-pasta-400-gr", eans: ["8008647000546"], ...pasta },
  { id: "fp-farfalle", name: "Paste Farfalle FiberPasta, 400 g", price: 45, handle: "pasta-farfalle-indice-glicemic-scazut-fiber-pasta-400-gr", eans: [], ...pasta },
  { id: "fp-faina", name: "Făina FiberPasta din grâu dur italian, 500 g", price: 33.6, handle: "faina-din-grau-italian-cu-indice-glicemic-mic-fiber-pasta-500-gr", eans: ["8008647000911", "8008647000690"], ...flour },
];

export const productUrl = (p: PartnerProduct) => `${SHOP}/products/${p.handle}`;

/** Produsul partener după codul de bare sau după numele/brandul din baza de date. */
export function findPartner(code: string, name?: string, brand?: string): PartnerProduct | undefined {
  const byEan = PARTNER.find((p) => p.eans.includes(code));
  if (byEan) return byEan;
  const hay = `${brand ?? ""} ${name ?? ""}`.toLowerCase().replace(/\s+/g, "");
  if (!hay.includes("fiberpasta")) return undefined;
  const n = (name ?? "").toLowerCase();
  return PARTNER.find((p) => n.includes(p.name.split(" ")[1].toLowerCase())) ?? PARTNER[0];
}

/** Produs complet, ca din baza de date, pentru codurile de bare cunoscute. */
export function partnerAsProduct(p: PartnerProduct, code: string): Product {
  return { code, name: p.name, brand: p.brand, carbs100: p.carbs100, sugars100: p.sugars100, fiber100: p.fiber100, protein100: p.protein100,
    serving: p.serving, unit: "g", ingredients: [], categories: [p.kind === "flour" ? "en:flours" : p.kind === "rice" ? "en:rices" : "en:pastas"], claims: [], gi: p.gi, giSource: "measured", source: "user" };
}

/** Categoriile pentru care FiberPasta e alternativa potrivită (paste, făină, pâine, pizza). */
export function pastaAlternative(categories: string[], name: string): PartnerProduct | undefined {
  const hay = (categories.join(" ") + " " + name).toLowerCase();
  if (/pasta|paste|spaghet|penne|fusilli|tagliat|noodle|macaroa|lasagn|taitei|tăiței/.test(hay)) return PARTNER.find((p) => p.id === "fp-tubetti");
  if (/flour|faina|făină|farin|bread|paine|pâine|pizza|dough|aluat/.test(hay)) return PARTNER.find((p) => p.id === "fp-faina");
  return undefined;
}

export const SKIN_COLLECTION = `${SHOP}/collections/ingrijire-pentru-pielea`;
/** Cosmeticele Diabetoline (descrieri prudente: îngrijirea pielii uscate, fără promisiuni medicale). */
export const SKIN: { id: string; name: string; desc: Record<"ro" | "en" | "de", string>; url: string }[] = [
  { id: "fusscreme", name: "Diabetoline Cremă de picioare, 75 ml", url: SKIN_COLLECTION,
    desc: { ro: "Cu 5% uree și alantoină, pentru pielea foarte uscată și aspră de pe tălpi și călcâie. Se absoarbe repede.", en: "With 5% urea and allantoin, for very dry, rough skin on soles and heels. Absorbs quickly.", de: "Mit 5 % Urea und Allantoin, für sehr trockene, raue Haut an Sohlen und Fersen. Zieht schnell ein." } },
  { id: "balsam", name: "Diabetoline Balsam de corp, 200 ml", url: SKIN_COLLECTION,
    desc: { ro: "Cu 10% uree, pentru pielea uscată de pe corp. Hidratare de durată, fără parabeni.", en: "With 10% urea, for dry skin on the body. Long-lasting hydration, paraben-free.", de: "Mit 10 % Urea, für trockene Haut am Körper. Langanhaltende Feuchtigkeit, ohne Parabene." } },
  { id: "spray", name: "Diabetoline Spray de picioare, 135 ml", url: SKIN_COLLECTION,
    desc: { ro: "Cu ulei de arbore de ceai, pentru picioare proaspete și îngrijite, zi de zi.", en: "With tea tree oil, for fresh, cared-for feet every day.", de: "Mit Teebaumöl, für frische, gepflegte Füße jeden Tag." } },
];

/**
 * Produse Diabetoline care NU sunt alimente cu verdict (cosmetice, suplimente) sau alimente fără valori nutriționale confirmate.
 * La scanare primesc un ecran de produs, nu verdict. Codurile: de pe ambalaje (3 nov 2026) și din lista de export FiberPasta.
 */
export interface OtherProduct { id: string; name: string; eans: string[]; catalogId: string; kind: "skin" | "supp" | "food" }
export const OTHER: OtherProduct[] = [
  { id: "crema-picioare", name: "Diabetoline Cremă Emolientă pentru Picioare 5% uree, 75 ml", eans: ["0653748112773", "653748112773"], catalogId: "crema-de-picioare-formula-pentru-diabetici-testat-clinic-urea-5-mediskin", kind: "skin" },
  { id: "crema-corp", name: "Diabetoline Cremă de Corp 10% uree, 200 ml", eans: ["0653748112780", "653748112780"], catalogId: "crema-picioare-diabetice-diabetoline-formula-pentru-pielea-diabeticilor-10-uree-testat-clinic-200-ml", kind: "skin" },
  { id: "spray", name: "Diabetoline Spray Intensiv pentru Picioare, 135 ml", eans: ["0653748112797", "653748112797"], catalogId: "spray-picioare-vitalitate-și-protecție-mediskin-135-ml", kind: "skin" },
  { id: "curalin-90", name: "Curalin, 90 capsule", eans: ["6427616140885"], catalogId: "curalin-90-capsule", kind: "supp" },
  { id: "curalin-180", name: "Curalin, 180 capsule", eans: ["6427416340614"], catalogId: "2-x-curalin-90-capsule", kind: "supp" },
  { id: "orez", name: "Orez negru FiberPasta, 300 g", eans: ["8008647000188"], catalogId: "orez-pentru-diabetici-fiberpasta-300-gr", kind: "food" },
  { id: "pastapro-faina", name: "Făina proteică PastaPro 30% proteine, 500 g", eans: ["8008647000850"], catalogId: "faina-proteica-30-proteine", kind: "food" },
  { id: "pastapro-penne", name: "PastaPro Penne 30% proteine, 250 g", eans: ["8008647000508"], catalogId: "faina-proteica-30-proteine", kind: "food" },
  { id: "pastapro-fusilli", name: "PastaPro Fusilli 30% proteine, 250 g", eans: ["8008647000515"], catalogId: "faina-proteica-30-proteine", kind: "food" },
];
export const findOther = (code: string) => OTHER.find((p) => p.eans.includes(code) || p.eans.includes(code.replace(/^0+/, "")));
