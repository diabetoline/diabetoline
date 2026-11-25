import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { dayKeyLocal } from "./engine/days";
import type { Strings } from "./i18n";
import type { State } from "./store";
import { daySummary } from "./summary";
import { PAYMENTS_LIVE } from "./access";
import { TRIAL_DAYS } from "./money";

/**
 * Reamintiri blânde pentru părinte, toate locale (merg fără internet). Regula: să nu enerveze.
 * - întrebarea zilei (20 nov 2026): cel mult una pe zi, prima lipsă — glicemia 10:00 · masa 13:30 · mișcarea 19:00; în fiecare zi, fără rărire
 * - medicamentele: o singură reamintire la 1 oră după ora prizei, dacă n-a apăsat „Am luat”
 * - rezumatul zilei la 21:00, doar dacă a notat ceva
 * Totul se replanifică la fiecare deschidere a aplicației și la fiecare notare; nimic nu se repetă pe spate.
 */
export interface Plan { ids: string[]; gluIgnored: number; lastGluAt?: number; medFollow: Record<string, string> }
export interface RemindPrefs { glucose: boolean; move: boolean; medFollow: boolean; summary: boolean }
export const REMIND_DEFAULT: RemindPrefs = { glucose: true, move: true, medFollow: true, summary: true };

const at = (day: Date, h: number, m = 0) => { const d = new Date(day); d.setHours(h, m, 0, 0); return d; };
const tomorrow = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() + 1); return x; };

/** Planificările se fac pe rând: două în paralel s-ar anula una pe alta doar parțial. */
let queue: Promise<unknown> = Promise.resolve();
export function planReminders(s: State, t: Strings): Promise<Plan> {
  const next = queue.then(() => planNow(s, t));
  queue = next.catch(() => {});
  return next;
}

async function planNow(s: State, t: Strings): Promise<Plan> {
  const prefs = { ...REMIND_DEFAULT, ...(s.remind ?? {}) };
  const prev: Plan = s.plan ?? { ids: [], gluIgnored: 0, medFollow: {} };
  // Android 13+: permisiunea se cere explicit (o singură dată, sistemul nu mai întreabă dacă a fost refuzată); plus canalul de notificări
  // 23 nov 2026 (retenție d1 13 %): nu mai cerem permisiunea orbește la pornire — o cere cardul de pe prima pagină, cu motiv,
  // după primul verdict (`NotifCard`), sau ecranele care chiar au nevoie (medicamente, Setări). Aici doar planificăm dacă e dată.
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return prev;
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("reminders", { name: t.rem_title, importance: Notifications.AndroidImportance.DEFAULT, sound: "default" }).catch(() => {});
  // curățăm TOT ce am programat noi înainte, după tip (nu doar id-urile din plan: două planificări în paralel lăsau
  // notificări orfane — 4–5 „Ai făcut mișcare?” la 19:00 pe iOS, 11 nov 2026). Reamintirile fixe de medicamente
  // (fără `kind`) și cele ale copilului rămân.
  const ours = new Set(["glucose", "meal", "move", "med", "summary", "trial", "offer3"]);
  try {
    for (const n of await Notifications.getAllScheduledNotificationsAsync()) {
      if (ours.has(String((n.content.data as { kind?: string } | null)?.kind))) { try { await Notifications.cancelScheduledNotificationAsync(n.identifier); } catch {} }
    }
  } catch {
    for (const id of [...prev.ids, ...Object.values(prev.medFollow)]) { try { await Notifications.cancelScheduledNotificationAsync(id); } catch {} }
  }
  const ids: string[] = []; const medFollow: Record<string, string> = {};
  const now = new Date(); const today = dayKeyLocal(now.getTime());
  const gluToday = s.glucose.some((g) => dayKeyLocal(g.t) === today) || s.gluSkippedDay === today;
    const schedule = async (date: Date, title: string, body: string, kind: string) => {
    if (date.getTime() <= Date.now()) return;
    ids.push(await Notifications.scheduleNotificationAsync({ content: { title, body, data: { kind } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: "reminders" } }));
  };

  // Întrebarea zilei (Alex, 20 nov 2026: „o singură întrebare, în fiecare zi, neinvaziv, nu multe push-uri”):
  // cel mult UNA pe zi, prima lipsă din zi — glicemia la 10:00 (dacă n-a notat-o), altfel masa la 13:30 (nicio masă/scanare azi),
  // altfel mișcarea la 19:00 (dacă n-a bifat). Fără rărire (înainte glicemia se rărea la 3 zile și omul nu mai primea nimic).
  // Dacă azi a fost deja trimisă una (programată și ora a trecut), nu mai vine alta azi; mâine o luăm de la capăt.
  let lastGluAt: number | undefined; const gluIgnored = 0;
  if (prefs.glucose) {
    const sentToday = !!prev.lastGluAt && dayKeyLocal(prev.lastGluAt) === today && prev.lastGluAt < Date.now();
    const mealToday = s.meals.some((m) => dayKeyLocal(m.t) === today) || s.history.some((h) => dayKeyLocal(h.t) === today);
    const walked = (s.walks ?? []).some((w) => dayKeyLocal(w.t) === today) || s.moveAskedDay === today;
    const slots: [number, number, boolean, string, string, string][] = [
      [10, 0, gluToday, t.rem_glu_title, t.rem_glu_body, "glucose"],
      [13, 30, mealToday, t.notif_meal_title, t.notif_meal_body, "meal"],
      [19, 0, walked, t.notif_mv_title, t.notif_mv_body, "move"],
    ];
    let planned = false;
    if (!sentToday) for (const [h, m, done, title, body, kind] of slots) {
      if (done) continue; const d = at(now, h, m); if (d.getTime() <= Date.now()) continue;
      await schedule(d, title, body, kind); lastGluAt = d.getTime(); planned = true; break;
    }
    // pentru mâine: glicemia la 10:00 (mâine nimic nu e notat încă); se replanifică oricum la prima deschidere
    if (!planned) { const d = at(tomorrow(now), 10); await schedule(d, t.rem_glu_title, t.rem_glu_body, "glucose"); lastGluAt = d.getTime(); }
  }
  if (prefs.medFollow) {
    const nowHM = now.toTimeString().slice(0, 5);
    for (const m of s.meds) for (const time of m.times) {
      const done = s.medLog.some((l) => l.medId === m.id && l.time === time && l.day === today);
      if (done) continue;
      const [h, mi] = time.split(":").map(Number);
      const follow = at(now, h, mi + 60);
      if (follow.getTime() <= Date.now() || time > nowHM && follow.getTime() - Date.now() > 25 * 3600e3) continue;
      const id = await Notifications.scheduleNotificationAsync({ content: { title: t.rem_med_title, body: t.rem_med_body(m.name), data: { kind: "med", medId: m.id, time } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: follow, channelId: "reminders" } });
      medFollow[`${m.id}|${time}`] = id;
    }
  }
  // rezumatul zilei (Alex, 15 nov 2026): la 21:00, scurt și pozitiv, cu ce e notat până la ultima deschidere; nimic dacă n-a notat nimic
  if (prefs.summary) {
    const sum = daySummary(s, t);
    if (sum) await schedule(at(now, 21), sum.title, sum.body, "summary");
  }
  // sfârșitul probei (17 nov 2026): o singură reamintire, în ziua 4 la 18:00, doar în build-urile cu plăți și doar dacă nu e abonat
  if (PAYMENTS_LIVE && s.trialStart && !s.entitled) {
    const d = at(new Date(s.trialStart + (TRIAL_DAYS - 1) * 864e5), 18);
    if (d.getTime() > Date.now()) await schedule(d, t.notif_trial_title, t.notif_trial_body, "trial");
    // și una singură în prima zi de după probă, la 10:00 (24 nov 2026) — apoi nimic, rămâne cardul de pe prima pagină
    const d2 = at(new Date(s.trialStart + TRIAL_DAYS * 864e5), 10);
    if (d2.getTime() > Date.now()) await schedule(d2, t.notif_trial2_title, t.notif_trial2_body, "trial");
    // oferta de ziua 3 (25 nov 2026, Alex: „să insistăm… cu un discount de moment”): o singură notificare în ziua 3 la 18:00 → paywall cu prețul introductiv
    const d3 = at(new Date(s.trialStart + 2 * 864e5), 18);
    if (d3.getTime() > Date.now()) await schedule(d3, t.notif_offer3_title, t.notif_offer3_body, "offer3");
  }
  return { ids, gluIgnored, lastGluAt, medFollow };
}
