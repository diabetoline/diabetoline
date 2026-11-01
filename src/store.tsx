import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Product, Verdict, Level } from "./engine/types";
import { deviceLang, strings, type Lang, type Strings } from "./i18n";

export interface HistItem { code: string; name: string; level: Level; t: number }
export interface CartItem { id: string; code?: string; name: string; level?: Level; done: boolean }
export interface GluEntry { id: string; v: number; ctx: "fasting" | "pre" | "post2h" | "evening" | "other"; note: string; t: number }

interface State {
  lang: Lang; unit: "mg" | "mmol"; name: string;
  history: HistItem[]; cart: CartItem[]; glucose: GluEntry[];
  cache: Record<string, Product>;
}
const initial: State = { lang: deviceLang(), unit: "mg", name: "", history: [], cart: [], glucose: [], cache: {} };
const KEY = "dscan.state.v1";

interface Ctx {
  s: State; t: Strings;
  set: (patch: Partial<State> | ((s: State) => Partial<State>)) => void;
  recordScan: (p: Product, v: Verdict) => void;
  addToCart: (item: Omit<CartItem, "id" | "done">) => void;
}
const C = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<State>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => { if (raw) setS({ ...initial, ...JSON.parse(raw) }); }).catch(() => {}).finally(() => setReady(true));
  }, []);
  useEffect(() => { if (ready) AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {}); }, [s, ready]);

  const api = useMemo<Ctx>(() => ({
    s, t: strings(s.lang),
    set: (patch) => setS((prev) => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) })),
    recordScan: (p, v) => setS((prev) => ({
      ...prev,
      cache: { ...prev.cache, [p.code]: p },
      history: [{ code: p.code, name: p.name, level: v.level, t: Date.now() }, ...prev.history.filter((h) => h.code !== p.code)].slice(0, 200),
    })),
    addToCart: (item) => setS((prev) => ({ ...prev, cart: [{ ...item, id: String(Date.now()), done: false }, ...prev.cart] })),
  }), [s]);
  if (!ready) return null;
  return <C.Provider value={api}>{children}</C.Provider>;
}
export function useStore() { const c = useContext(C); if (!c) throw new Error("StoreProvider missing"); return c; }
