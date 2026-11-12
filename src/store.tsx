import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Product, Verdict, Level } from "./engine/types";
import type { PlateAnalysis } from "./engine/plate";
import type { RecoState } from "./recommend";
import { deviceLang, strings, type Lang, type Strings } from "./i18n";
import { pushDeletes, pushEntries, syncList } from "./family/sync";
import { registerParentPush } from "./family/messages";
import { initBilling } from "./billing";
import { planReminders, type Plan, type RemindPrefs } from "./reminders";
import { dayKeyLocal } from "./engine/days";
import { AppState } from "react-native";
import { sendNewAlerts } from "./family/alerts";

export interface HistItem { code: string; name: string; level: Level; t: number }
export type GluCtx = "fasting" | "pre" | "post2h" | "evening" | "other";
export interface GluEntry { id: string; v: number; ctx: GluCtx; note: string; t: number }
export interface MealEntry { id: string; t: number; photoUri?: string; code?: string; name?: string; level?: Level; slot: "breakfast" | "lunch" | "dinner" | "snack"; analysis?: PlateAnalysis; carbs?: number; gl?: number }
export interface Med { id: string; name: string; times: string[]; notifIds?: string[] }
export interface Walk { id: string; t: number; min: number }
export interface Weight { id: string; t: number; kg: number }
/** Un rând de pe lista de cumpărături. `code`/`level` vin de la produsele scanate; `by` spune cine l-a pus (părintele sau copilul, prin contul de familie). */
export interface ListItem { id: string; name: string; code?: string; level?: Level; done: boolean; t: number; by?: "me" | "child" | "parent" }
/** Contul de familie: rolul pe acest telefon și legăturile. */
export interface Family {
  role: "parent" | "child" | null;
  /** părinte: a acceptat trimiterea jurnalului pe server */
  consent: boolean;
  /** copil: părintele urmărit */
  parent?: { linkId: string; parentId: string; name: string };
  /** părinte: copiii legați */
  children: { linkId: string; name: string }[];
  lastSync?: number;
  /** părinte: ultimul moment pentru care s-au trimis alerte copiilor */
  lastAlert?: number;
}
export interface MedLog { id: string; medId: string; time: string; day: string; t: number }

/** Răspunsurile de la prima deschidere (chestionarul scurt). Fără diagnostic: „condition” e ce a spus omul, folosit doar pentru ton și raport. */
export interface Profile { forWhom: "me" | "parent" | "child"; condition: "t2" | "t1" | "pre" | "unsure"; age?: number; heightCm?: number; concerns: string[]; meter?: boolean }

export interface State {
  profile?: Profile;
  /** începutul celor 5 zile de probă cu tot (ținute în aplicație, fără card) */
  trialStart?: number;
  /** abonament activ (setat de RevenueCat; până atunci nefolosit) */
  entitled?: boolean;
  /** scanările de azi, pentru limita de 5 pe zi la gratuit */
  scans?: { day: string; n: number };
  /** cererea de recenzie: de câte ori am întrebat și de când putem întreba din nou */
  review?: { asked: number; next: number; done?: boolean };
  lang: Lang; langManual?: boolean; humor: boolean; welcomed?: boolean; unit: "mg" | "mmol"; name: string; bigText: boolean;
  history: HistItem[]; glucose: GluEntry[]; meals: MealEntry[]; meds: Med[]; medLog: MedLog[]; walks: Walk[]; weights: Weight[]; list: ListItem[]; family: Family;
  /** ziua (YYYY-MM-DD) în care a răspuns „nu încă” la întrebarea de seară, ca să nu-l mai întrebăm azi */
  moveAskedDay?: string; moveNotifId?: string;
  reco?: RecoState;
  /** reamintiri blânde: care sunt pornite și ce am programat (src/reminders.ts) */
  remind?: Partial<RemindPrefs>; plan?: Plan;
  /** notări șterse local, de șters și de pe server la următoarea sincronizare (client_id) */
  trash?: string[];
  cache: Record<string, Product>;
}
const initial: State = { lang: deviceLang(), humor: true, unit: "mg", name: "", bigText: false, history: [], glucose: [], meals: [], meds: [], medLog: [], walks: [], weights: [], list: [], family: { role: null, consent: false, children: [] }, cache: {} };
const KEY = "dscan.state.v2";

interface Ctx {
  s: State; t: Strings;
  set: (patch: Partial<State> | ((s: State) => Partial<State>)) => void;
  /** cere o sincronizare cu serverul acum (ex. la deschiderea listei) */
  syncNow: () => void;
  /** o scanare în plus azi (limita de la gratuit) */
  countScan: () => void;
  recordScan: (p: Product, v: Verdict) => void;
  addUserProduct: (p: Product) => void;
  addGlucose: (e: Omit<GluEntry, "id" | "t"> & { t?: number }) => void;
  addMeal: (m: Omit<MealEntry, "id" | "t"> & { t?: number }) => string;
  markMed: (medId: string, time: string) => void;
  addWalk: (min: number) => void;
  addWeight: (kg: number) => void;
  /** Șterge o notare din jurnal (și de pe server, la următoarea sincronizare). */
  /** Lista de cumpărături: pune, bifează, scoate. */
  addToList: (it: Omit<ListItem, "id" | "t" | "done"> & { id?: string }) => void;
  toggleList: (id: string) => void;
  removeFromList: (id: string) => void;
  removeEntry: (kind: "glucose" | "meal" | "walk" | "weight" | "med", id: string) => void;
}
const C = createContext<Ctx | null>(null);
export const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);
export const slotForHour = (h: number): MealEntry["slot"] => (h < 10 ? "breakfast" : h < 15 ? "lunch" : h < 18 ? "snack" : "dinner");
export const ctxForHour = (h: number): GluCtx => (h < 9 ? "fasting" : h >= 20 ? "evening" : "post2h");

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<State>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => { if (raw) { const saved = JSON.parse(raw); setS({ ...initial, ...saved, lang: saved.langManual ? saved.lang : deviceLang() }); } }).catch(() => {}).finally(() => setReady(true));
  }, []);
  useEffect(() => { if (ready) AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {}); }, [s, ready]);
  // reamintirile se replanifică la deschidere și după fiecare notare (cu o mică întârziere, ca să nu le facem de 10 ori)
  const latest = useRef(s); latest.current = s; // planificarea folosește mereu starea curentă, nu una veche
  const planKey = JSON.stringify([s.glucose.length, s.walks?.length, s.medLog.length, s.meds, s.moveAskedDay, s.remind]);
  useEffect(() => {
    if (!ready || !s.welcomed) return;
    let alive = true;
    const run = () => planReminders(latest.current, strings(latest.current.lang)).then((plan) => { if (alive) setS((p) => ({ ...p, plan })); }).catch(() => {});
    const h = setTimeout(run, 2500);
    const sub = AppState.addEventListener("change", (st) => { if (st === "active") run(); });
    return () => { alive = false; clearTimeout(h); sub.remove(); };
  }, [ready, s.welcomed, planKey, s.lang]);
  // părintele cu consimțământ: jurnalul pleacă pe server la câteva secunde după o modificare,
  // și la fiecare revenire în aplicație (ca să ia ce a pus copilul pe listă între timp)
  const [syncTick, setSyncTick] = useState(0);
  const pushRegistered = useRef(false);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => { if (st === "active") setSyncTick((n) => n + 1); });
    return () => sub.remove();
  }, []);
  // abonamentul (RevenueCat): `entitled` e oglinda entitlement-ului „pro”
  useEffect(() => { if (ready) initBilling((v) => setS((p) => (p.entitled === v ? p : { ...p, entitled: v }))); }, [ready]);
  useEffect(() => {
    if (!ready || s.family.role !== "parent" || !s.family.consent) return;
    const h = setTimeout(() => {
      pushEntries(s).then(async () => {
        const gone = await pushDeletes((s.trash ?? []).filter((id) => !id.startsWith("l")));
        const list = await syncList(s.list ?? [], s.trash ?? []);
        // scriem doar dacă s-a schimbat ceva, altfel efectul s-ar relua la nesfârșit
        setS((p) => (JSON.stringify(list) === JSON.stringify(p.list ?? []) && !(p.trash ?? []).length ? p : { ...p, list, trash: [] }));
        const since = s.family.lastAlert ?? Date.now() - 3600e3;   // la prima activare nu retrimitem istoricul
        const last = s.family.children.length ? await sendNewAlerts(s, since) : since;
        // părintele primește mesajele copiilor prin push: token-ul se pune pe legături (o dată pe deschidere e destul)
        if (s.family.children.length && !pushRegistered.current) { pushRegistered.current = true; registerParentPush(s.family.children.map((c) => c.linkId), s.lang); }
        setS((p) => ({ ...p, family: { ...p.family, lastSync: Date.now(), lastAlert: last } }));
      }).catch(() => {});
    }, 4000);
    return () => clearTimeout(h);
  }, [ready, syncTick, s.glucose, s.meals, s.medLog, s.walks, s.weights, s.history, s.trash, s.list, s.family.role, s.family.consent]);

  const api = useMemo<Ctx>(() => ({
    s, t: strings(s.lang),
    set: (patch) => setS((prev) => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) })),
    syncNow: () => setSyncTick((n) => n + 1),
    countScan: () => setS((prev) => { const day = dayKeyLocal(Date.now()); return { ...prev, scans: { day, n: (prev.scans?.day === day ? prev.scans.n : 0) + 1 } }; }),
    recordScan: (p, v) => setS((prev) => ({
      ...prev, cache: { ...prev.cache, [p.code]: p },
      history: [{ code: p.code, name: p.name, level: v.level, t: Date.now() }, ...prev.history.filter((h) => h.code !== p.code)].slice(0, 200),
    })),
    addUserProduct: (p) => setS((prev) => ({ ...prev, cache: { ...prev.cache, [p.code]: p } })),
    addGlucose: (e) => setS((prev) => ({ ...prev, glucose: [...prev.glucose, { ...e, id: String(Date.now()), t: e.t ?? Date.now() }] })),
    addMeal: (m) => { const id = String(Date.now()); setS((prev) => ({ ...prev, meals: [...prev.meals, { ...m, id, t: m.t ?? Date.now() }] })); return id; },
    addWeight: (kg) => setS((prev) => ({ ...prev, weights: [...(prev.weights ?? []), { id: String(Date.now()), t: Date.now(), kg }] })),
    addWalk: (min) => setS((prev) => ({ ...prev, walks: [...(prev.walks ?? []), { id: String(Date.now()), t: Date.now(), min }] })),
    addToList: (it) => setS((prev) => {
      const list = prev.list ?? [];
      // același produs scanat nu intră de două ori; dacă era bifat, îl readucem pe listă
      const dup = it.code ? list.find((x) => x.code === it.code) : list.find((x) => x.name.trim().toLowerCase() === it.name.trim().toLowerCase());
      if (dup) return { ...prev, list: list.map((x) => (x.id === dup.id ? { ...x, done: false, t: Date.now() } : x)) };
      return { ...prev, list: [{ ...it, id: it.id ?? `${Date.now()}${Math.floor(Math.random() * 1e4)}`, done: false, t: Date.now() }, ...list] };
    }),
    toggleList: (id) => setS((prev) => ({ ...prev, list: (prev.list ?? []).map((x) => (x.id === id ? { ...x, done: !x.done, t: Date.now() } : x)) })),
    removeFromList: (id) => setS((prev) => ({ ...prev, list: (prev.list ?? []).filter((x) => x.id !== id), trash: [...(prev.trash ?? []), "l" + id] })),
    removeEntry: (kind, id) => setS((prev) => {
      const prefix = { glucose: "g", meal: "m", walk: "w", weight: "k", med: "d" }[kind];
      const trash = [...(prev.trash ?? []), prefix + id];
      if (kind === "glucose") return { ...prev, trash, glucose: prev.glucose.filter((x) => x.id !== id) };
      if (kind === "meal") return { ...prev, trash, meals: prev.meals.filter((x) => x.id !== id) };
      if (kind === "walk") return { ...prev, trash, walks: (prev.walks ?? []).filter((x) => x.id !== id) };
      if (kind === "weight") return { ...prev, trash, weights: (prev.weights ?? []).filter((x) => x.id !== id) };
      return { ...prev, trash, medLog: prev.medLog.filter((x) => x.id !== id) };
    }),
    markMed: (medId, time) => setS((prev) => {
      const day = dayKey(Date.now());
      if (prev.medLog.some((l) => l.medId === medId && l.time === time && l.day === day)) return prev;
      return { ...prev, medLog: [...prev.medLog, { id: String(Date.now()), medId, time, day, t: Date.now() }] };
    }),
  }), [s]);
  if (!ready) return null;
  return <C.Provider value={api}>{children}</C.Provider>;
}
export function useStore() { const c = useContext(C); if (!c) throw new Error("StoreProvider missing"); return c; }
