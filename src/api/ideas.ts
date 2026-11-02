const API = process.env.EXPO_PUBLIC_API_URL || "https://curalife.expo.app";

export interface Idea { title: string; why: string; carbs: number | null; minutes: number | null; ingredients: string[]; steps: string[]; uses: string[] }

/** Cere 3 idei de mese pentru momentul zilei, pe baza produselor scanate și a meselor recente. */
export async function fetchIdeas(input: { lang: string; slot: string; products: { name: string; level: string }[]; recentMeals: string[]; focus?: string }): Promise<{ ok: true; ideas: Idea[] } | { ok: false; error: "not_configured" | "network" }> {
  try {
    const res = await fetch(`${API}/api/ideas`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; reason?: string; ideas?: Idea[] };
    if (body.ok && body.ideas) return { ok: true, ideas: body.ideas };
    if (body.reason === "not_configured" || res.status === 404 || res.status === 503) return { ok: false, error: "not_configured" };
    return { ok: false, error: "network" };
  } catch { return { ok: false, error: API ? "network" : "not_configured" }; }
}
