import { useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { readLabel, type LabelError } from "../../src/api/label";
import { estimateGi } from "../../src/engine/gi";
import { findClaims } from "../../src/engine/hiddenSugar";
import type { Product } from "../../src/engine/types";
import { useStore } from "../../src/store";
import { useTheme } from "../../src/theme";
import { Button, Card, Hint, Label } from "../../src/ui/Primitives";

const num = (v: string) => { const x = parseFloat(v.replace(",", ".")); return Number.isFinite(x) ? x : 0; };
const str = (x: number | null | undefined) => (x == null ? "" : String(x).replace(".", ","));

/**
 * Produs negăsit → poză la tabelul nutrițional → serverul citește valorile → omul doar confirmă.
 * Fără introducere manuală: câmpurile apar abia după citire, ca să poată corecta o cifră.
 */
export default function AddProduct() {
  const { code, name: name0, brand: brand0 } = useLocalSearchParams<{ code: string; name?: string; brand?: string }>();
  const t = useTheme(); const router = useRouter(); const ins = useSafeAreaInsets();
  const { t: s, s: state, addUserProduct } = useStore();
  const [perm, requestPerm] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const [step, setStep] = useState<"camera" | "reading" | "confirm" | "error">("camera");
  const [err, setErr] = useState<LabelError | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [name, setName] = useState(name0 ?? ""); const [brand, setBrand] = useState(brand0 ?? "");
  const [carbs, setCarbs] = useState(""); const [sugars, setSugars] = useState(""); const [fiber, setFiber] = useState("");
  const [serving, setServing] = useState(""); const [unit, setUnit] = useState<"g" | "ml">("g");
  const [ingredients, setIngredients] = useState("");
  const close = () => { if (router.canGoBack()) router.back(); else router.replace("/"); };

  const take = async () => {
    if (!cam.current) return;
    const pic = await cam.current.takePictureAsync({ quality: 0.8 });
    if (!pic?.uri) return;
    setShot(pic.uri); setStep("reading");
    const r = await readLabel(pic.uri, state.lang);
    if (!r.ok) { setErr(r.error); setStep("error"); return; }
    const d = r.data;
    if (d.name && !name) setName(d.name);
    if (d.brand && !brand) setBrand(d.brand);
    setUnit(d.unit); setCarbs(str(d.carbs100)); setSugars(str(d.sugars100)); setFiber(str(d.fiber100));
    setServing(str(d.serving)); setIngredients(d.ingredients ?? "");
    setStep("confirm");
  };

  const save = () => {
    const c = num(carbs), su = num(sugars), f = num(fiber);
    const nm = name.trim() || code;
    const gi = estimateGi({ categories: [], carbs100: c, fiber100: f, sugars100: su, name: nm });
    const ing = ingredients.split(/[,;()]/).map((x) => x.trim()).filter(Boolean);
    const p: Product = { code, name: nm, brand: brand.trim() || undefined, carbs100: c, sugars100: su, fiber100: f,
      serving: num(serving) > 0 ? num(serving) : undefined, unit, ingredients: ing, categories: [], claims: findClaims(nm),
      gi: gi.gi, giSource: gi.source, source: "user" };
    addUserProduct(p);
    router.replace({ pathname: "/product/[code]", params: { code } });
  };

  if (step === "camera" || step === "reading") return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Stack.Screen options={{ headerShown: false }} />
      {step === "reading" && shot ? <Image source={{ uri: shot }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        : perm?.granted ? <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="back" autofocus="on" />
        : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 }}>
            <Hint style={{ textAlign: "center", color: "#fff" }}>{s.cam_denied}</Hint>
            <Button title={s.cam_allow} onPress={() => requestPerm()} />
          </View>
        )}
      <View style={[StyleSheet.absoluteFill, { zIndex: 10, elevation: 10, paddingTop: ins.top, paddingBottom: ins.bottom, justifyContent: "space-between" }]} pointerEvents="box-none">
        <View style={st.top}>
          <Pressable onPress={close} hitSlop={20} style={({ pressed }) => [st.round, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={s.close}><Text style={st.roundTxt}>✕</Text></Pressable>
        </View>
        <View style={st.bottom}>
          {step === "reading" ? (
            <View style={{ alignItems: "center", gap: 10 }}><ActivityIndicator color="#fff" size="large" /><Text style={st.hint}>{s.label_reading}</Text></View>
          ) : (
            <>
              <Text style={st.hint}>{s.label_title}</Text>
              <Text style={st.hint2}>{s.label_hint}</Text>
              <Pressable onPress={take} disabled={!perm?.granted} style={st.shutter} accessibilityRole="button" accessibilityLabel={s.take_photo}><View style={st.shutterIn} /></Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );

  if (step === "error") return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Stack.Screen options={{ title: "" }} />
      <Card>
        <Text style={{ color: t.ink, fontWeight: "800", fontSize: 20 }}>{err === "not_configured" ? s.label_off : err === "unrecognized" ? s.label_fail : s.network}</Text>
        {err !== "not_configured" && <Button title={s.retake} onPress={() => { setShot(null); setStep("camera"); }} />}
        <Button title={s.back} kind="ghost" onPress={close} />
      </Card>
    </View>
  );

  const field = (label: string, value: string, set: (v: string) => void, numeric = true) => (
    <View style={{ gap: 4 }}><Label>{label}</Label>
      <TextInput value={value} onChangeText={set} placeholderTextColor={t.muted} keyboardType={numeric ? "decimal-pad" : "default"} accessibilityLabel={label}
        style={{ borderWidth: 1, borderColor: t.line, borderRadius: 10, padding: 12, fontSize: 18, color: t.ink, backgroundColor: t.bg }} /></View>
  );
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: s.add_title, headerShown: true }} />
      <Card>
        <Text style={{ color: t.ink, fontWeight: "800", fontSize: 20 }}>{s.label_check}</Text>
        <Hint>{s.label_check_hint}</Hint>
        {shot && <Image source={{ uri: shot }} style={{ width: "100%", height: 160, borderRadius: 12 }} resizeMode="cover" />}
        {field(s.f_name, name, setName, false)}
        {field(`${s.f_carbs} ${unit}`, carbs, setCarbs)}
        {field(s.f_sugars, sugars, setSugars)}
        {field(s.f_fiber, fiber, setFiber)}
        {field(s.f_serving, serving, setServing)}
        <Button title={s.save} size="xl" onPress={save} disabled={!carbs.trim() && !sugars.trim()} />
        <Button title={s.retake} kind="ghost" onPress={() => { setShot(null); setStep("camera"); }} />
      </Card>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: "row", padding: 16 },
  round: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  roundTxt: { color: "#fff", fontSize: 22, fontWeight: "700" },
  bottom: { padding: 20, gap: 10, backgroundColor: "rgba(0,0,0,0.6)" },
  hint: { color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center" },
  hint2: { color: "#ddd", fontSize: 16, textAlign: "center" },
  shutter: { alignSelf: "center", width: 84, height: 84, borderRadius: 42, borderWidth: 5, borderColor: "#fff", alignItems: "center", justifyContent: "center", marginTop: 6 },
  shutterIn: { width: 66, height: 66, borderRadius: 33, backgroundColor: "#fff" },
});
