import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Product, Verdict, Level } from "./engine/types";
import type { PlateAnalysis } from "./engine/plate";
import type { RecoState } from "./recommend";
import { deviceLang, strings, type Lang, type Strings } from "./i18n";
import { pushDeletes, pushEntries } from "./family/sync";
import { sendNewAlerts } from "./family/alerts";

export interface HistItem { code: string; name: string; level: Level; t: number }
export type GluCtx = "fasting" | "pre" | "post2h" | "evening" | "other";
export interface GluEntry { id: string; v: number; ctx: GluCtx; note: string; t: number }
export interface MealEntry { id: string; t: number; photoUri?: string; code?: string; name?: string; level?: Level; slot: "breakfast" | "lunch" | "dinner" | "snack"; analysis?: PlateAnalysis; carbs?: number; gl?: number }
export interface Med { id: string; name: string; times: string[]; notifIds?: string[] }
export interface Walk { id: string; t: number; min: number }
export interface Weight { id: string; t: number; kg: number }
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

export interface State {
  lang: Lang; langManual?: boolean; humor: boolean; welcomed?: boolean; unit: "mg" | "mmol"; name: string; bigText: boolean;
  history: HistItem[]; glucose: GluEntry[]; meals: MealEntry[]; meds: Med[]; medLog: MedLog[]; walks: Walk[]; weights: Weight[]; family: Family;
  /** ziua (YYYY-MM-DD) în care a răspuns „nu încă” la întrebarea de seară, ca să nu-l mai întrebăm azi */
  moveAskedDay?: string; moveNotifId?: string;
  reco?: RecoState;
  /** notări șterse local, de șters și de pe server la următoarea sincronizare (client_id) */
  trash?: string[];
  cache: Record<string, Product>;
}
const initial: State = { lang: deviceLang(), humor: true, unit: "mg", name: "", bigText: false, history: [], glucose: [], meals: [], meds: [], medLog: [], walks: [], weights: [], family: { role: null, consent: false, children: [] }, cache: {} };
const KEY = "dscan.state.v2";

interface Ctx {
  s: State; t: Strings;
  set: (patch: Partial<State> | ((s: State) => Partial<State>)) => void;
  recordScan: (p: Product, v: Verdict) => void;
  addUserProduct: (p: Product) => void;
  addGlucose: (e: Omit<GluEntry, "id" | "t"> & { t?: number }) => void;
  addMeal: (m: Omit<MealEntry, "id" | "t"> & { t?: number }) => string;
  markMed: (medId: string, time: string) => void;
  addWalk: (min: number) => void;
  addWeight: (kg: number) => void;
  /** Șterge o notare din jurnal (și de pe server, la următoarea sincronizare). */
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
  // părintele cu consimțământ: jurnalul pleacă pe server la câteva secunde după o modificare
  useEffect(() => {
    if (!ready || s.family.role !== "parent" || !s.family.consent) return;
    const h = setTimeout(() => {
      pushEntries(s).then(async () => {
        const gone = await pushDeletes(s.trash ?? []);
        if (gone.length) setS((p) => ({ ...p, trash: (p.trash ?? []).filter((id) => !gone.includes(id)) }));
        const since = s.family.lastAlert ?? Date.now() - 3600e3;   // la prima activare nu retrimitem istoricul
        const last = s.family.children.length ? await sendNewAlerts(s, since) : since;
        setS((p) => ({ ...p, family: { ...p.family, lastSync: Date.now(), lastAlert: last } }));
      }).catch(() => {});
    }, 4000);
    return () => clearTimeout(h);
  }, [ready, s.glucose, s.meals, s.medLog, s.walks, s.weights, s.history, s.trash, s.family.role, s.family.consent]);

  const api = useMemo<Ctx>(() => ({
    s, t: strings(s.lang),
    set: (patch) => setS((prev) => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) })),
    recordScan: (p, v) => setS((prev) => ({
      ...prev, cache: { ...prev.cache, [p.code]: p },
      history: [{ code: p.code, name: p.name, level: v.level, t: Date.now() }, ...prev.history.filter((h) => h.code !== p.code)].slice(0, 200),
    })),
    addUserProduct: (p) => setS((prev) => ({ ...prev, cache: { ...prev.cache, [p.code]: p } })),
    addGlucose: (e) => setS((prev) => ({ ...prev, glucose: [...prev.glucose, { ...e, id: String(Date.now()), t: e.t ?? Date.now() }] })),
    addMeal: (m) => { const id = String(Date.now()); setS((prev) => ({ ...prev, meals: [...prev.meals, { ...m, id, t: m.t ?? Date.now() }] })); return id; },
    addWeight: (kg) => setS((prev) => ({ ...prev, weights: [...(prev.weights ?? []), { id: String(Date.now()), t: Date.now(), kg }] })),
    addWalk: (min) => setS((prev) => ({ ...prev, walks: [...(prev.walks ?? []), { id: String(Date.now()), t: Date.now(), min }] })),
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
