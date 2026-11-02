import { useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { File, Paths } from "expo-file-system";
import { slotForHour, useStore, type MealEntry } from "../src/store";
import { useTheme } from "../src/theme";
import { Button, Hint } from "../src/ui/Primitives";
import type { Level } from "../src/engine/types";
import { analyzePlate } from "../src/api/plate";
import { mealVerdict } from "../src/engine/plate";
import { quip } from "../src/quips";

export default function PlateScreen() {
  const t = useTheme(); const router = useRouter();
  const ins = useSafeAreaInsets();
  const close = () => { if (router.canGoBack()) router.back(); else router.replace("/"); };
  const { t: s, s: state, addMeal } = useStore();
  const [perm, requestPerm] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [slot, setSlot] = useState<MealEntry["slot"]>(slotForHour(new Date().getHours()));
  const [busy, setBusy] = useState(false);
  const [how, setHow] = useState<Level | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [unrecognized, setUnrecognized] = useState(false);

  /** Copiază poza în folderul aplicației, ca să rămână în jurnal. */
  const keep = (src: string) => {
    try {
      const dir = Paths.join(Paths.document, "meals"); const d = new (require("expo-file-system").Directory)(dir); if (!d.exists) d.create();
      const dest = new File(dir, `meal-${Date.now()}.jpg`); new File(src).copy(dest); return dest.uri;
    } catch { return src; /* keep the cache uri if copy fails */ }
  };
  const take = async () => {
    if (!cam.current || busy) return;
    setBusy(true);
    let uri: string | undefined;
    try { uri = (await cam.current.takePictureAsync({ quality: 0.7, skipProcessing: true }))?.uri; } finally { setBusy(false); }
    if (!uri) return;
    setShot(uri); setAnalyzing(true); setUnrecognized(false);
    const r = await analyzePlate(uri, state.lang);
    setAnalyzing(false);
    if (r.ok) {
      const v = mealVerdict(r.data.foods);
      const id = addMeal({ photoUri: keep(uri), slot: slotForHour(new Date().getHours()), level: v.level, carbs: v.carbs, gl: v.gl,
        name: r.data.foods.map((f) => f.name).slice(0, 3).join(", "), analysis: r.data });
      router.replace({ pathname: "/meal/[id]", params: { id } });
      return;
    }
    // fără analiză (server oprit, fără internet, nimic recunoscut): omul spune cum a fost masa
    setUnrecognized(r.error === "unrecognized");
  };
  const save = () => {
    if (!shot) return;
    addMeal({ photoUri: keep(shot), slot, level: how ?? undefined });
    if (how === "yellow" || how === "red") router.replace({ pathname: "/care", params: { level: how } });
    else router.back();
  };
  const slots: MealEntry["slot"][] = ["breakfast", "lunch", "snack", "dinner"];

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Stack.Screen options={{ headerShown: false }} />
      {shot ? <Image source={{ uri: shot }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : perm?.granted ? (
        <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="back" />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 }}>
          <Hint style={{ textAlign: "center", color: "#fff" }}>{s.cam_denied}</Hint>
          <Button title={s.cam_allow} onPress={() => requestPerm()} />
        </View>
      )}
      <View style={[StyleSheet.absoluteFill, st.overlay, { paddingTop: ins.top, paddingBottom: ins.bottom }]} pointerEvents="box-none">
        <View style={{ flex: 1, justifyContent: "space-between" }} pointerEvents="box-none">
          <View style={st.top}>
            <Pressable onPress={close} hitSlop={20} style={({ pressed }) => [st.round, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={s.close}><Text style={st.roundTxt}>✕</Text></Pressable>
            <Text style={st.title}>{s.plate_title}</Text><View style={{ width: 52 }} />
          </View>
          <View style={st.bottom}>
            {analyzing ? (
              <View style={{ alignItems: "center", gap: 10, paddingVertical: 8 }}><ActivityIndicator color="#fff" size="large" /><Text style={st.how}>{s.plate_analyzing}</Text>{state.humor && <Text style={st.hint}>{quip(state.lang, "plate_wait", shot ?? "")}</Text>}</View>
            ) : shot ? (
              <>
                {unrecognized && <Text style={st.hint}>{s.plate_fail}</Text>}
                <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                  {slots.map((sl) => (
                    <Pressable key={sl} onPress={() => setSlot(sl)} style={[st.chip, slot === sl && { backgroundColor: t.accent, borderColor: t.accent }]} accessibilityRole="button">
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>{s[`meal_${sl}` as const]}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={st.how}>{s.plate_how}</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {([["green", "🟢", s.plate_light], ["yellow", "🟡", s.plate_mid], ["red", "🔴", s.plate_heavy]] as const).map(([lv, dot, lbl]) => (
                    <Pressable key={lv} onPress={() => setHow(lv)} accessibilityRole="button" accessibilityState={{ selected: how === lv }}
                      style={[st.howBtn, how === lv && { backgroundColor: "#fff" }]}>
                      <Text style={{ fontSize: 22 }}>{dot}</Text>
                      <Text style={{ color: how === lv ? "#000" : "#fff", fontWeight: "700", fontSize: 16 }}>{lbl}</Text>
                    </Pressable>
                  ))}
                </View>
                <Button title={s.use_photo} size="xl" onPress={save} disabled={!how} />
                <Button title={s.retake} kind="ghost" onPress={() => { setShot(null); setUnrecognized(false); }} />
              </>
            ) : (
              <>
                <Text style={st.hint}>{s.plate_hint}</Text>
                <Pressable onPress={take} disabled={busy || !perm?.granted} style={st.shutter} accessibilityRole="button" accessibilityLabel={s.take_photo}><View style={st.shutterIn} /></Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
const st = StyleSheet.create({
  overlay: { zIndex: 10, elevation: 10 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  round: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  roundTxt: { color: "#fff", fontSize: 22, fontWeight: "700" },
  bottom: { padding: 20, gap: 12, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "stretch" },
  hint: { color: "#fff", fontSize: 18, textAlign: "center" },
  shutter: { alignSelf: "center", width: 84, height: 84, borderRadius: 42, borderWidth: 5, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  shutterIn: { width: 66, height: 66, borderRadius: 33, backgroundColor: "#fff" },
  how: { color: "#fff", fontSize: 18, fontWeight: "800", textAlign: "center" },
  howBtn: { flex: 1, alignItems: "center", gap: 4, borderWidth: 2, borderColor: "#fff", borderRadius: 14, paddingVertical: 10 },
  chip: { borderWidth: 1, borderColor: "#fff", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
});
