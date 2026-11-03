import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase, ensureUser } from "./client";
import type { State } from "../store";
import { gluClass } from "../engine/days";
import type { Lang } from "../i18n";

const API = process.env.EXPO_PUBLIC_API_URL || "https://curalife.expo.app";

/** Copilul: înregistrează token-ul de push pe legătura lui, ca să primească alerte. */
export async function registerChildPush(linkId: string, lang: Lang): Promise<boolean> {
  try {
    const perm = await Notifications.getPermissionsAsync();
    const granted = perm.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return false;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await ensureUser();
    const { error } = await supabase().from("links").update({ child_push_token: token, child_lang: lang }).eq("id", linkId);
    return !error;
  } catch { return false; }
}

const TEXT = {
  high: { ro: (n: string, v: string) => `${n} a avut glicemia ${v}, peste interval.`, en: (n: string, v: string) => `${n} had a glucose reading of ${v}, above range.`, de: (n: string, v: string) => `${n} hatte einen Blutzuckerwert von ${v}, über dem Bereich.` },
  low: { ro: (n: string, v: string) => `${n} a avut glicemia ${v}, sub interval. Poate merită un telefon.`, en: (n: string, v: string) => `${n} had a glucose reading of ${v}, below range. Maybe worth a call.`, de: (n: string, v: string) => `${n} hatte einen Blutzuckerwert von ${v}, unter dem Bereich. Vielleicht einen Anruf wert.` },
  heavy: { ro: (n: string, m: string) => `${n} a avut o masă grea: ${m}.`, en: (n: string, m: string) => `${n} had a heavy meal: ${m}.`, de: (n: string, m: string) => `${n} hatte eine schwere Mahlzeit: ${m}.` },
};
const TITLE = { ro: "Diabetoline · familie", en: "Diabetoline · family", de: "Diabetoline · Familie" };

/** Părintele: după sincronizare, trimite alertele noi (glicemie în afara intervalului, masă grea) către copii. Întoarce ultimul moment alertat. */
export async function sendNewAlerts(s: State, since: number): Promise<number> {
  const name = s.name || (s.lang === "ro" ? "Părintele" : s.lang === "de" ? "Dein Elternteil" : "Your parent");
  const fmt = (v: number) => (s.unit === "mg" ? `${Math.round(v)} mg/dL` : `${(v / 18).toFixed(1)} mmol/L`);
  const events: { t: number; kind: "high" | "low" | "heavy"; arg: string }[] = [];
  for (const g of s.glucose) if (g.t > since) { const c = gluClass(g.v, g.ctx); if (c !== "ok") events.push({ t: g.t, kind: c, arg: fmt(g.v) }); }
  for (const m of s.meals) if (m.t > since && m.level === "red") events.push({ t: m.t, kind: "heavy", arg: m.name ?? "" });
  if (!events.length) return since;
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token; if (!token) return since;
  let last = since;
  for (const e of events.sort((a, b) => a.t - b.t).slice(-3)) {
    const text = { ro: TEXT[e.kind].ro(name, e.arg), en: TEXT[e.kind].en(name, e.arg), de: TEXT[e.kind].de(name, e.arg) };
    try { await fetch(`${API}/api/alert`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, kind: e.kind, text, title: TITLE }) }); } catch {}
    last = Math.max(last, e.t);
  }
  return Math.max(last, ...events.map((e) => e.t));
}
