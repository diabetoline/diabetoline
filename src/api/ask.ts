
const API = process.env.EXPO_PUBLIC_API_URL || "https://curalife.expo.app";

export async function ask(input: { lang: string; question: string; context: string; name?: string }): Promise<{ ok: true; answer: string; emergency: boolean } | { ok: false; error: "not_configured" | "network" }> {
  try {
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 40_000);
    const res = await fetch(`${API}/api/ask`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input), signal: ctrl.signal }).finally(() => clearTimeout(timer));
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; reason?: string; answer?: string; emergency?: boolean };
    if (body.ok && body.answer) return { ok: true, answer: body.answer, emergency: !!body.emergency };
    if (body.reason === "not_configured" || res.status === 404 || res.status === 503) return { ok: false, error: "not_configured" };
    return { ok: false, error: "network" };
  } catch { return { ok: false, error: "network" }; }
}
