/**
 * Ofertele comerciale prin push (22 nov 2026): tokenul telefonului se înregistrează anonim la pornire (dacă notificările
 * sunt permise) și la schimbarea opțiunii „Oferte de la Diabetoline” din Setări. Serverul trimite cel mult 2 pe săptămână.
 */
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { deviceId, track } from "./analytics";
import { deviceRegion } from "./money";

const API = process.env.EXPO_PUBLIC_API_URL || "https://curalife.expo.app";
const KEY = "diabetoline.push.registered";

/** Trimite tokenul la server; o dată la 7 zile sau când se schimbă opțiunea. Nu aruncă niciodată. */
export async function registerPush(lang: string, offers: boolean, force = false): Promise<void> {
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    const last = await AsyncStorage.getItem(KEY);
    const prev = last ? (JSON.parse(last) as { t: number; offers: boolean; lang: string }) : null;
    if (!force && prev && prev.offers === offers && prev.lang === lang && Date.now() - prev.t < 7 * 864e5) return;
    const device = deviceId(); if (!device) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const r = await fetch(`${API}/api/push-register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ device, token, lang, country: deviceRegion(), platform: Platform.OS, offers }) });
    if (r.ok) { await AsyncStorage.setItem(KEY, JSON.stringify({ t: Date.now(), offers, lang })); if (!prev) track("push_registered", { offers }); }
  } catch {}
}
