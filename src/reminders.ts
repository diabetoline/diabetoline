import * as Notifications from "expo-notifications";
import { dayKeyLocal } from "./engine/days";
import type { Strings } from "./i18n";
import type { State } from "./store";

/**
 * Reamintiri blânde pentru părinte, toate locale (merg fără internet). Regula: să nu enerveze.
 * - glicemia: una la 10:00 dacă azi n-a notat nimic; a doua, la 20:00, doar dacă nici ieri n-a notat
 * - mișcarea: întrebarea de la 19:00 doar dacă azi n-a bifat nicio plimbare și n-a răspuns deja „nu încă”
 * - medicamentele: o singură reamintire la 1 oră după ora prizei, dacă n-a apăsat „Am luat”
 * - dacă omul ignoră reamintirea de glicemie de 3 ori la rând, o rărim: o dată la 3 zile
 * Totul se replanifică la fiecare deschidere a aplicației și la fiecare notare; nimic nu se repetă pe spate.
 */
export interface Plan { ids: string[]; gluIgnored: number; lastGluAt?: number; medFollow: Record<string, string> }
export interface RemindPrefs { glucose: boolean; move: boolean; medFollow: boolean }
export const REMIND_DEFAULT: RemindPrefs = { glucose: true, move: true, medFollow: true };

const at = (day: Date, h: number, m = 0) => { const d = new Date(day); d.setHours(h, m, 0, 0); return d; };
const tomorrow = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() + 1); return x; };

export async function planReminders(s: State, t: Strings): Promise<Plan> {
  const prefs = { ...REMIND_DEFAULT, ...(s.remind ?? {}) };
  const prev: Plan = s.plan ?? { ids: [], gluIgnored: 0, medFollow: {} };
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return prev;
  // curățăm tot ce am programat noi înainte (nu și reamintirile fixe de medicamente)
  for (const id of [...prev.ids, ...Object.values(prev.medFollow)]) { try { await Notifications.cancelScheduledNotificationAsync(id); } catch {} }
  const ids: string[] = []; const medFollow: Record<string, string> = {};
  const now = new Date(); const today = dayKeyLocal(now.getTime());
  const yesterday = dayKeyLocal(now.getTime() - 864e5);
  const gluToday = s.glucose.some((g) => dayKeyLocal(g.t) === today);
  const gluYesterday = s.glucose.some((g) => dayKeyLocal(g.t) === yesterday);
  const schedule = async (date: Date, title: string, body: string, kind: string) => {
    if (date.getTime() <= Date.now()) return;
    ids.push(await Notifications.scheduleNotificationAsync({ content: { title, body, data: { kind } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date } }));
  };

  // a ignorat reamintirea de ieri? (a fost programată, a trecut, și n-a notat nimic după)
  let gluIgnored = prev.gluIgnored;
  if (prev.lastGluAt && prev.lastGluAt < Date.now()) gluIgnored = s.glucose.some((g) => g.t > prev.lastGluAt!) ? 0 : gluIgnored + 1;
  let lastGluAt: number | undefined;
  if (prefs.glucose) {
    const every = gluIgnored >= 3 ? 3 : 1;                       // rărim când e ignorată
    const dayOk = (d: Date) => every === 1 || Math.floor(d.getTime() / 864e5) % every === 0;
    const first = gluToday ? tomorrow(now) : now;
    let d = at(first, 10); if (d.getTime() <= Date.now()) d = at(tomorrow(now), 10);
    while (!dayOk(d)) d = at(tomorrow(d), 10);
    await schedule(d, t.rem_glu_title, t.rem_glu_body, "glucose"); lastGluAt = d.getTime();
    if (!gluToday && !gluYesterday && every === 1) await schedule(at(now, 20), t.rem_glu_title, t.rem_glu_body2, "glucose");
  }
  if (prefs.move) {
    const walked = (s.walks ?? []).some((w) => dayKeyLocal(w.t) === today) || s.moveAskedDay === today;
    const d = walked ? at(tomorrow(now), 19) : at(now, 19);
    await schedule(d.getTime() <= Date.now() ? at(tomorrow(now), 19) : d, t.notif_mv_title, t.notif_mv_body, "move");
  }
  if (prefs.medFollow) {
    const nowHM = now.toTimeString().slice(0, 5);
    for (const m of s.meds) for (const time of m.times) {
      const done = s.medLog.some((l) => l.medId === m.id && l.time === time && l.day === today);
      if (done) continue;
      const [h, mi] = time.split(":").map(Number);
      const follow = at(now, h, mi + 60);
      if (follow.getTime() <= Date.now() || time > nowHM && follow.getTime() - Date.now() > 25 * 3600e3) continue;
      const id = await Notifications.scheduleNotificationAsync({ content: { title: t.rem_med_title, body: t.rem_med_body(m.name), data: { kind: "med", medId: m.id, time } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: follow } });
      medFollow[`${m.id}|${time}`] = id;
    }
  }
  return { ids, gluIgnored, lastGluAt, medFollow };
}
