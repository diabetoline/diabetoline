import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

/**
 * Adresa serverului. În producție: EXPO_PUBLIC_API_URL (domeniul EAS Hosting).
 * În dezvoltare, o cale relativă merge prin serverul Expo pornit local.
 */
const API = process.env.EXPO_PUBLIC_API_URL ?? "";

export type VisionError = "not_configured" | "unrecognized" | "network";

/** Micșorează poza și o trimite la o rută de server; întoarce corpul JSON sau eroarea. */
export async function postImage<T>(path: string, photoUri: string, lang: string, unrecognized: string[]): Promise<{ ok: true; data: T } | { ok: false; error: VisionError }> {
  const small = await manipulateAsync(photoUri, [{ resize: { width: 1400 } }], { compress: 0.7, format: SaveFormat.JPEG, base64: true });
  if (!small.base64) return { ok: false, error: "network" };
  try {
    const res = await fetch(`${API}${path}`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ image: small.base64, lang }),
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; reason?: string } & T;
    if (body.ok) return { ok: true, data: body };
    if (body.reason === "not_configured" || res.status === 404 || res.status === 503) return { ok: false, error: "not_configured" };
    if (body.reason && unrecognized.includes(body.reason)) return { ok: false, error: "unrecognized" };
    return { ok: false, error: "network" };
  } catch {
    return { ok: false, error: API ? "network" : "not_configured" };
  }
}
