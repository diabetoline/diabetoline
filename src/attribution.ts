/**
 * Atribuirea instalărilor (22 nov 2026, build 1.1.2) — de unde a venit omul, ca să știm ce reclamă aduce instalări.
 * - Play Install Referrer: la prima deschidere citim `utm_source`/`utm_campaign` din linkul Play cu care s-a instalat
 *   (`/api/get?src=` pune `referrer=utm_source=…`) → `app_install` capătă sursa și trimitem `install_referrer`.
 * - SDK-ul Meta (react-native-fbsdk-next): doar pornit; evenimentele standard (instalare, deschidere) pleacă singure
 *   și Meta le folosește pentru campaniile „App installs”. Nu trimitem nimic despre om, doar că aplicația s-a deschis.
 * Ambele module sunt native: în build-urile vechi `require` dă eroare și sărim peste, fără să crape nimic.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { setInstallSource, track } from "./analytics";

const KEY = "diabetoline.attribution.done";

export async function initAttribution(): Promise<void> {
  // SDK-ul Meta: la fiecare pornire (activarea aplicației e evenimentul pe care optimizează Meta)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fb = require("react-native-fbsdk-next") as { Settings?: { initializeSDK: () => void; setAdvertiserTrackingEnabled?: (b: boolean) => Promise<boolean> } };
    fb.Settings?.initializeSDK();
    if (Platform.OS === "ios") void fb.Settings?.setAdvertiserTrackingEnabled?.(false);
  } catch {}
  // Install Referrer: o singură dată, la prima deschidere după instalare
  if (Platform.OS !== "android") return;
  try { if (await AsyncStorage.getItem(KEY)) return; } catch {}
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PlayInstallReferrer } = require("react-native-play-install-referrer") as {
      PlayInstallReferrer: { getInstallReferrerInfo: (cb: (info: { installReferrer?: string } | null, err: unknown) => void) => void };
    };
    PlayInstallReferrer.getInstallReferrerInfo((info, err) => {
      void AsyncStorage.setItem(KEY, "1").catch(() => {});
      if (err || !info?.installReferrer) return;
      const ref = String(info.installReferrer);
      const get = (k: string) => { const m = new RegExp(`(?:^|&)${k}=([^&]*)`).exec(ref); return m ? decodeURIComponent(m[1]).slice(0, 40) : ""; };
      const source = get("utm_source"); const campaign = get("utm_campaign"); const medium = get("utm_medium");
      if (source && !/^(google-play|\(not set\)|utm_source)$/i.test(source)) void setInstallSource(source);
      track("install_referrer", { source: source || "organic", campaign, medium });
    });
  } catch { void AsyncStorage.setItem(KEY, "1").catch(() => {}); }
}
