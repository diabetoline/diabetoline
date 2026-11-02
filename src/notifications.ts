import * as Notifications from "expo-notifications";
import type { Med } from "./store";
import type { Strings } from "./i18n";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

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
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: m },
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
  await Notifications.scheduleNotificationAsync({
    content: { title: t.notif_glu_title, body: t.notif_glu_body, data: { kind: "glucose" }, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
  });
  return at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Întrebarea de seară „Ai făcut mișcare azi?”, zilnic la 19:00. Întoarce id-ul notificării. */
export async function scheduleMoveQuestion(t: Strings, hour = 19): Promise<string | null> {
  if (!(await ensurePermission())) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title: t.notif_mv_title, body: t.notif_mv_body, data: { kind: "move" } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0 },
  });
}
