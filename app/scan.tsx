import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGate } from "../src/access";
import { lookupProduct } from "../src/api/lookup";
import { track } from "../src/analytics";
import type { Level, Product, Verdict } from "../src/engine/types";
import { analyze } from "../src/engine/verdict";
import { useStore } from "../src/store";
import { levelColor, useTheme } from "../src/theme";
import { Button, Hint } from "../src/ui/Primitives";

/**
 * Modul cumpărături (15 nov 2026, „scenariul din supermarket”): camera rămâne deschisă, verdictul apare ca panou jos
 * (culoare + un cuvânt + „Pune pe listă”), următorul cod se scanează fără să ieși; bulele de sus sunt produsele vizitei;
 * când scanezi două produse la rând, panoul spune care e mai bun (comparația de pe raft); „N-are cod” → alimentele de bază;
 * „Gata” → rezumatul vizitei intră în jurnal (`state.trips`).
 */
type Hit = { code: string; name: string; level: Level; carbs: number; t: number };
const ORDER: Record<Level, number> = { green: 0, yellow: 1, red: 2 };

export default function ScanScreen() {
  const t = useTheme(); const router = useRouter();
  const ins = useSafeAreaInsets();
  const { t: s, s: state, countScan, recordScan, addToList, addTrip } = useStore();
  const gate = useGate(state);
  const [perm, requestPerm] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [typing, setTyping] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [cur, setCur] = useState<{ p: Product; v: Verdict } | null>(null);
  const [err, setErr] = useState<{ code: string; kind: "notfound" | "network" } | null>(null);
  const [hits, setHits] = useState<Hit[]>([]);
  const [summary, setSummary] = useState(false);
  const lastCode = useRef<string>(""); const lastAt = useRef(0);
  const onList = cur ? (state.list ?? []).find((x) => x.code === cur.p.code && !x.done) : undefined;
  const prev = hits.length >= 2 ? hits[hits.length - 2] : null;

  const go = async (c: string) => {
    if (busy) return;
    if (!gate("scan")) return;
    setBusy(c); setErr(null);
    const r = await lookupProduct(c, state.cache, state.lang);
    setBusy(null);
    if (!r.ok) { setCur(null); setErr({ code: c, kind: r.error }); if (r.error === "notfound") track("scan_notfound"); return; }
    countScan();
    const v = analyze(r.product); recordScan(r.product, v);
    setCur({ p: r.product, v });
    setHits((h) => [...h.filter((x) => x.code !== c), { code: c, name: r.product.name, level: v.level, carbs: v.carbs, t: Date.now() }]);
  };
  const submit = () => { const c = code.replace(/\D/g, ""); if (c.length >= 6) { setTyping(false); void go(c); } };
  const onScan = ({ data }: { data: string }) => {
    const clean = data.replace(/\D/g, "");
    if (clean.length < 6 || busy) return;
    // același cod nu se rescanează timp de 4 s (camera îl vede de multe ori pe secundă)
    if (clean === lastCode.current && Date.now() - lastAt.current < 4000) return;
    lastCode.current = clean; lastAt.current = Date.now();
    void go(clean);
  };
  const finish = () => {
    if (hits.length >= 2) { setSummary(true); return; }
    if (hits.length === 1) addTrip(hits);
    if (router.canGoBack()) router.back(); else router.replace("/");
  };
  useEffect(() => { track("shop_mode"); }, []);

  const c = cur ? levelColor(t, cur.v.level) : null;
  const word = cur ? (cur.v.level === "green" ? s.good : cur.v.level === "yellow" ? s.mod : s.avoid) : "";
  const compare = cur && prev && prev.code !== cur.p.code && prev.level !== cur.v.level
    ? (ORDER[cur.v.level] < ORDER[prev.level] ? s.shop_better(prev.name) : s.shop_worse(prev.name)) : null;

  if (summary) {
    const g = hits.filter((h) => h.level === "green").length, y = hits.filter((h) => h.level === "yellow").length, r = hits.filter((h) => h.level === "red").length;
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, padding: 24, paddingTop: ins.top + 24, gap: 16, justifyContent: "center" }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: t.ink, fontSize: 28, fontWeight: "800", textAlign: "center" }}>{s.shop_done_title}</Text>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 18 }}>
          {([["green", g], ["yellow", y], ["red", r]] as [Level, number][]).map(([lvl, n]) => (
            <View key={lvl} style={{ alignItems: "center", gap: 6 }}>
              <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: levelColor(t, lvl).fg, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#fff", fontSize: 24, fontWeight: "800" }}>{n}</Text></View>
              <Text style={{ color: t.muted, fontSize: 14 }}>{lvl === "green" ? s.good : lvl === "yellow" ? s.mod : s.avoid}</Text>
            </View>
          ))}
        </View>
        <Text style={{ color: t.ink, fontSize: 18, textAlign: "center", lineHeight: 26 }}>{r === 0 ? s.shop_done_clean : g >= r ? s.shop_done_ok : s.shop_done_heavy}</Text>
        <Button title={s.shop_done_btn} size="xl" onPress={() => { addTrip(hits); track("shop_trip", { n: hits.length, red: r }); if (router.canGoBack()) router.back(); else router.replace("/"); }} />
        <Button title={s.shop_more} kind="ghost" onPress={() => setSummary(false)} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Stack.Screen options={{ headerShown: false }} />
      {perm?.granted ? (
        <CameraView style={StyleSheet.absoluteFill} facing="back" autofocus="on" enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"] }} onBarcodeScanned={onScan} />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 }}>
          <Hint style={{ textAlign: "center", color: "#fff" }}>{s.cam_denied}</Hint>
          <Button title={s.cam_allow} onPress={() => requestPerm()} />
        </View>
      )}
      <View style={[StyleSheet.absoluteFill, st.overlay, { paddingTop: ins.top, paddingBottom: ins.bottom }]} pointerEvents="box-none">
        <View style={{ flex: 1, justifyContent: "space-between" }} pointerEvents="box-none">
          <View style={st.top}>
            <Pressable onPress={finish} hitSlop={20} style={({ pressed }) => [st.pill, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={s.close}><Text style={st.pillTxt}>{hits.length ? `✓ ${s.shop_finish}` : s.close}</Text></Pressable>
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center", flex: 1, justifyContent: "center", flexWrap: "wrap" }}>
              {hits.slice(-8).map((h) => <View key={h.code} style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: levelColor(t, h.level).fg, borderWidth: 2, borderColor: "#fff" }} />)}
            </View>
            <Pressable onPress={() => setTorch((v) => !v)} style={[st.round, torch && { backgroundColor: "#fff" }]} accessibilityRole="button" accessibilityLabel={s.torch}><Text style={[st.roundTxt, torch && { color: "#000" }]}>🔦</Text></Pressable>
          </View>
          <View style={st.frameWrap} pointerEvents="none">
            <View style={[st.frame, { borderColor: c ? c.fg : t.ok }]} />
            {busy && <View style={{ position: "absolute", alignItems: "center", gap: 8 }}><ActivityIndicator color="#fff" size="large" /><Text style={st.hint}>{s.loading}</Text></View>}
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[st.bottom, c ? { backgroundColor: c.bg } : null]}>
            {cur && c ? (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: c.fg, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#fff", fontSize: 28, fontWeight: "800" }}>{cur.v.level === "green" ? "✓" : cur.v.level === "yellow" ? "!" : "✕"}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.fg, fontSize: 24, fontWeight: "800" }}>{word}</Text>
                    <Text style={{ color: t.ink, fontSize: 16 }} numberOfLines={2}>{cur.p.name}{cur.p.brand ? ` · ${cur.p.brand}` : ""}</Text>
                  </View>
                </View>
                <Text style={{ color: t.ink, fontSize: 16, lineHeight: 22 }}>{s.summary[cur.v.level]} {s.shop_carbs(cur.v.carbs, cur.v.serving, cur.p.unit)}</Text>
                {compare && <Text style={{ color: t.ink, fontSize: 16, fontWeight: "700" }}>{compare}</Text>}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}><Button title={onList ? "✓ " + s.list_added : "🛒 " + (cur.v.level === "red" ? s.list_add_anyway : s.list_add)} kind={onList ? "ghost" : cur.v.level === "red" ? "ghost" : undefined} onPress={() => { if (!onList) { addToList({ name: cur.p.name, code: cur.p.code, level: cur.v.level, by: "me" }); track("list_added", { from: "shop", level: cur.v.level }); } }} /></View>
                  <View style={{ flex: 1 }}><Button title={s.shop_details} kind="soft" onPress={() => router.push({ pathname: "/product/[code]", params: { code: cur.p.code, from: "scan" } })} /></View>
                </View>
                <Text style={[st.hint2, { color: t.muted }]}>{s.shop_next}</Text>
              </View>
            ) : err ? (
              <View style={{ gap: 10 }}>
                <Text style={st.hint}>{err.kind === "notfound" ? s.not_found : s.network}</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {err.kind === "notfound" && <View style={{ flex: 1 }}><Button title={s.add_product} onPress={() => router.push({ pathname: "/product/add", params: { code: err.code, from: "scan" } })} /></View>}
                  <View style={{ flex: 1 }}><Button title={"🍎 " + s.basics_btn} kind="soft" onPress={() => router.push({ pathname: "/basics", params: { from: "scan" } })} /></View>
                </View>
                <Text style={st.hint2}>{s.shop_next}</Text>
              </View>
            ) : (
              <>
                <Text style={st.hint}>{s.scan_hint}</Text>
                <Text style={st.hint2}>{s.scan_distance}</Text>
                {typing ? (
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <TextInput value={code} onChangeText={setCode} onSubmitEditing={submit} placeholder="5940000000000" placeholderTextColor="#999"
                      keyboardType="number-pad" returnKeyType="search" autoFocus accessibilityLabel={s.type_code} style={st.input} />
                    <Button title={s.check} onPress={submit} size="sm" />
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                    {/* „N-are cod” vizibil ca buton (Alex, 15 nov 2026): pâine, fructe, legume, cântar */}
                    <View style={{ flex: 1 }}><Button title={"🍎 " + s.basics_btn} kind="soft" onPress={() => router.push({ pathname: "/basics", params: { from: "scan" } })} /></View>
                    <View style={{ flex: 1 }}><Button title={"⌨️ " + s.type_short} kind="soft" onPress={() => setTyping(true)} /></View>
                  </View>
                )}
              </>
            )}
          </KeyboardAvoidingView>
        </View>
      </View>
    </View>
  );
}
const st = StyleSheet.create({
  overlay: { zIndex: 10, elevation: 10 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, gap: 8 },
  round: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  roundTxt: { color: "#fff", fontSize: 22, fontWeight: "700" },
  pill: { minHeight: 52, minWidth: 52, paddingHorizontal: 16, borderRadius: 26, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  pillTxt: { color: "#fff", fontSize: 18, fontWeight: "700" },
  frameWrap: { alignItems: "center", justifyContent: "center" },
  frame: { width: "80%", aspectRatio: 1.6, borderWidth: 4, borderRadius: 18 },
  bottom: { padding: 20, gap: 6, backgroundColor: "rgba(0,0,0,0.55)", borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  hint: { color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center" },
  hint2: { color: "#ddd", fontSize: 15, textAlign: "center" },
  input: { flex: 1, backgroundColor: "#fff", color: "#000", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18 },
});
