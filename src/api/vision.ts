import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

/**
 * Adresa serverului. În producție: EXPO_PUBLIC_API_URL (domeniul EAS Hosting).
 * În dezvoltare, o cale relativă merge prin serverul Expo pornit local.
 */
const API = process.env.EXPO_PUBLIC_API_URL || "https://curalife.expo.app";

export type VisionError = "not_configured" | "unrecognized" | "network";
/** ultimul detaliu tehnic, pentru mesajul de pe ecran */
export let lastDetail = "";

/** Micșorează poza și o trimite la o rută de server; întoarce corpul JSON sau eroarea. */
export async function postImage<T>(path: string, photoUri: string, lang: string, unrecognized: string[]): Promise<{ ok: true; data: T } | { ok: false; error: VisionError }> {
  lastDetail = "";
  let b64: string | undefined;
  try {
    const small = await manipulateAsync(photoUri, [{ resize: { width: 1400 } }], { compress: 0.7, format: SaveFormat.JPEG, base64: true });
    b64 = small.base64;
  } catch (e) { lastDetail = "image: " + String((e as Error)?.message ?? e); return { ok: false, error: "network" }; }
  if (!b64) { lastDetail = "image: no base64"; return { ok: false, error: "network" }; }
  try {
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 45_000);
    const res = await fetch(`${API}${path}`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ image: b64, lang }), signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; reason?: string } & T;
    if (body.ok) return { ok: true, data: body };
    if (body.reason === "not_configured" || res.status === 404 || res.status === 503) return { ok: false, error: "not_configured" };
    if (body.reason && unrecognized.includes(body.reason)) return { ok: false, error: "unrecognized" };
    lastDetail = `HTTP ${res.status} ${body.reason ?? ""}`;
    return { ok: false, error: "network" };
  } catch (e) {
    lastDetail = "fetch: " + String((e as Error)?.message ?? e);
    return { ok: false, error: "network" };
  }
}
