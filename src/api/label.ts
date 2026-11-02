import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

/** Valorile citite de pe etichetă, la 100 g / 100 ml. */
export interface LabelRead {
  name: string | null; brand: string | null; unit: "g" | "ml";
  carbs100: number | null; sugars100: number | null; fiber100: number | null; protein100: number | null;
  serving: number | null; ingredients: string | null;
}
export type LabelError = "not_configured" | "no_table" | "network";

/**
 * Adresa serverului. În producție: EXPO_PUBLIC_API_URL (domeniul EAS Hosting, ex. https://diabetoline.expo.app).
 * În dezvoltare, o cale relativă merge prin serverul Expo pornit local.
 */
const API = process.env.EXPO_PUBLIC_API_URL ?? "";

export async function readLabel(photoUri: string): Promise<{ ok: true; data: LabelRead } | { ok: false; error: LabelError }> {
  // micșorăm poza: tabelul rămâne lizibil, iar trimiterea e rapidă și ieftină
  const small = await manipulateAsync(photoUri, [{ resize: { width: 1400 } }], { compress: 0.7, format: SaveFormat.JPEG, base64: true });
  if (!small.base64) return { ok: false, error: "network" };
  try {
    const res = await fetch(`${API}/api/label`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ image: small.base64 }),
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; reason?: string } & Partial<LabelRead>;
    if (body.ok) return { ok: true, data: body as LabelRead };
    if (body.reason === "not_configured" || res.status === 404 || res.status === 503) return { ok: false, error: "not_configured" };
    if (body.reason === "no_table" || body.reason === "unreadable") return { ok: false, error: "no_table" };
    return { ok: false, error: "network" };
  } catch {
    return { ok: false, error: API ? "network" : "not_configured" };
  }
}
