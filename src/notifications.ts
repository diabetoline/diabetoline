import * as Notifications from "expo-notifications";
import type { Med } from "./store";
import type { Strings } from "./i18n";

import { useEffect } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";

/**
 * Toate notificările locale și push ale aplicației trec pe aici. Fișierul e importat din `app/_layout.tsx`,
 * ca handler-ul (arată notificarea și când aplicația e deschisă) și canalul Android să existe de la pornire,
 * nu abia când omul deschide ecranul de medicamente (11 nov 2026).
 *
 * Tipuri (`data.kind`): `glucose` / `move` / `med` (reamintirile blânde din `reminders.ts`, replanificate mereu),
 * `glucose_check` (la 2 ore după masă, una singură), medicamentele fixe (fără kind, zilnic la oră),
 * `alert` / `message` / `nudge` (push de pe server, la copil sau părinte).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});
if (Platform.OS === "android") Notifications.setNotificationChannelAsync("reminders", { name: "Reminders", importance: Notifications.AndroidImportance.DEFAULT, sound: "default" }).catch(() => {});

/** Unde duce apăsarea pe o notificare. */
export function routeFor(data: Record<string, unknown> | null | undefined): string | null {
  const kind = String(data?.kind ?? "");
  if (kind === "glucose" || kind === "glucose_check") return "/glucose/new";
  if (kind === "med" || (!kind && data?.medId)) return "/meds";
  if (kind === "message") return data?.linkId ? `/messages?link=${data.linkId}` : "/family";
  if (["alert", "high", "low", "heavy", "quiet", "noglu"].includes(kind)) return "/family/parent";
  return null; // mișcarea: prima pagină, unde e cardul „Ai făcut mișcare azi?”
}
let handled: string | null = null;
/** În `_layout`: apăsarea pe o notificare (aplicația deschisă, în fundal sau închisă) duce la ecranul potrivit. */
export function useNotificationTaps() {
  useEffect(() => {
    const go = (r: Notifications.NotificationResponse | null) => {
      if (!r || r.notification.request.identifier === handled) return;
      handled = r.notification.request.identifier;
      const to = routeFor(r.notification.request.content.data as Record<string, unknown>);
      if (to) setTimeout(() => { try { router.push(to as never); } catch {} }, 400);
    };
    Notifications.getLastNotificationResponseAsync().then(go).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(go);
    return () => sub.remove();
  }, []);
}

export async function ensurePermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/** (Re)schedule one daily reminder per time for a medication. Returns the notification ids. */
export async function scheduleMed(med: Med, t: Strings): Promise<string[]> {
  await cancelMed(med);
  const ids: string[] = [];
  for (const time of med.times) {
    const [h, m] = time.split(":").map((x) => parseInt(x, 10));
    if (!Number.isFinite(h) || !Number.isFinite(m)) continue;
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: `${t.notif_title} ${med.name}`, body: t.notif_body(med.name), data: { medId: med.id, time }, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: m, channelId: "reminders" },
    });
    ids.push(id);
  }
  return ids;
}
export async function cancelMed(med: Med) {
  for (const id of med.notifIds ?? []) { try { await Notifications.cancelScheduledNotificationAsync(id); } catch {} }
}
/** Normalize "8", "8:0", "20.30" → "08:00", "20:30"; returns null when unparseable */
export function parseTime(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})(?:[:.h](\d{1,2}))?$/);
  if (!m) return null;
  const h = parseInt(m[1], 10), mi = m[2] ? parseInt(m[2], 10) : 0;
  if (h > 23 || mi > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

/** O singură reamintire, peste `minutes`, să măsoare glicemia după o masă. Întoarce ora, ex. "15:40". */
export async function scheduleGlucoseCheck(t: Strings, minutes = 120): Promise<string | null> {
  if (!(await ensurePermission())) return null;
  const at = new Date(Date.now() + minutes * 60_000);
  // una singură: a doua apăsare o înlocuiește pe prima
  try { for (const n of await Notifications.getAllScheduledNotificationsAsync()) if ((n.content.data as { kind?: string } | null)?.kind === "glucose_check") await Notifications.cancelScheduledNotificationAsync(n.identifier); } catch {}
  await Notifications.scheduleNotificationAsync({
    content: { title: t.notif_glu_title, body: t.notif_glu_body, data: { kind: "glucose_check" }, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: "reminders" },
  });
  return at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
