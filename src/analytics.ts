/**
 * Evenimente anonime de utilizare (15 nov 2026): ce apasă omul, nu ce conține.
 * - id aleator pe telefon (nu e legat de contul de familie, nume sau glicemii); se șterge la „Șterge datele”
 * - coada se ține în AsyncStorage și pleacă în loturi la /api/track (la pornire, la revenirea în aplicație, la 20 s)
 * - sursa instalării: `?src=…` din linkul cu care s-a deschis prima dată aplicația (cod partener/cutie/reclamă)
 * - `app_open` poartă `day` = a câta zi de la instalare (0 = azi), pentru retenție
 * Proprietățile sunt doar etichete scurte (nivel verde/galben/roșu, plan an/lună, rol) — niciodată valori medicale.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import * as Linking from "expo-linking";
import { getLocales } from "expo-localization";
import buildInfo from "./build.json";

const API = process.env.EXPO_PUBLIC_API_URL || "https://curalife.expo.app";
const KEY = "diabetoline.analytics";
type Ev = { name: string; props?: Record<string, string | number | boolean>; t: number };
type Meta = { device: string; installed: number; source?: string };

let meta: Meta | null = null;
let queue: Ev[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let loading: Promise<void> | null = null;

const rnd = () => Math.random().toString(36).slice(2, 10);
const newId = () => `${Date.now().toString(36)}${rnd()}${rnd()}${rnd()}`.slice(0, 32);

async function load(): Promise<void> {
  if (meta) return;
  if (loading) return loading;
  loading = (async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) { const s = JSON.parse(raw) as { meta: Meta; queue: Ev[] }; meta = s.meta; queue = [...(s.queue ?? []), ...queue]; }
    } catch {}
    if (!meta) {
      let source: string | undefined;
      try { const u = await Linking.getInitialURL(); const m = u && /[?&]src=([A-Za-z0-9_-]{1,40})/.exec(u); if (m) source = m[1]; } catch {}
      meta = { device: newId(), installed: Date.now(), source };
      queue.push({ name: "app_install", t: Date.now() });
    }
    await persist();
  })();
  return loading;
}
async function persist() { try { await AsyncStorage.setItem(KEY, JSON.stringify({ meta, queue: queue.slice(-200) })); } catch {} }

/** Înregistrează un eveniment; pleacă la server când se poate. Nu aruncă niciodată. */
export function track(name: string, props?: Record<string, string | number | boolean>): void {
  queue.push({ name, props, t: Date.now() });
  void load().then(() => { void persist(); schedule(); });
}

function schedule() { if (timer) return; timer = setTimeout(() => { timer = null; void flush(); }, 20_000); }

/** Trimite coada (maximum 50 pe apel); la eșec rămâne pentru data viitoare. */
export async function flush(): Promise<void> {
  await load();
  if (!meta || !queue.length) return;
  const batch = queue.slice(0, 50);
  try {
    const r = await fetch(`${API}/api/track`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      device: meta.device, country: getLocales()[0]?.regionCode ?? null, lang: getLocales()[0]?.languageCode ?? null, platform: Platform.OS,
      build: (process.env.EXPO_PUBLIC_BUILD ?? buildInfo.sha).slice(0, 7), source: meta.source ?? null, events: batch,
    }) });
    if (r.ok) { queue = queue.slice(batch.length); await persist(); if (queue.length) schedule(); }
  } catch {}
}

/** La pornire și la fiecare revenire în aplicație: `app_open` cu ziua de la instalare, apoi trimite coada. */
export function startAnalytics(): () => void {
  const open = () => { void load().then(() => { const day = meta ? Math.floor((Date.now() - meta.installed) / 864e5) : 0; track("app_open", { day }); void flush(); }); };
  open();
  const sub = AppState.addEventListener("change", (st) => { if (st === "active") open(); });
  return () => sub.remove();
}

/** „Șterge toate datele”: id nou, ca omul să nu mai poată fi legat de ce a fost înainte. */
export async function resetAnalytics(): Promise<void> {
  track("data_wiped"); await flush();
  meta = null; queue = []; loading = null;
  try { await AsyncStorage.removeItem(KEY); } catch {}
}
