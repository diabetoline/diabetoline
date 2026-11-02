import { useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { File, Paths } from "expo-file-system";
import { slotForHour, useStore, type MealEntry } from "../src/store";
import { useTheme } from "../src/theme";
import { Button, Hint } from "../src/ui/Primitives";

export default function PlateScreen() {
  const t = useTheme(); const router = useRouter();
  const { t: s, addMeal } = useStore();
  const [perm, requestPerm] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [slot, setSlot] = useState<MealEntry["slot"]>(slotForHour(new Date().getHours()));
  const [busy, setBusy] = useState(false);

  const take = async () => {
    if (!cam.current || busy) return;
    setBusy(true);
    try { const pic = await cam.current.takePictureAsync({ quality: 0.6, skipProcessing: true }); if (pic?.uri) setShot(pic.uri); }
    finally { setBusy(false); }
  };
  const save = () => {
    if (!shot) return;
    let uri = shot;
    try {
      const dir = Paths.join(Paths.document, "meals"); const d = new (require("expo-file-system").Directory)(dir); if (!d.exists) d.create();
      const dest = new File(dir, `meal-${Date.now()}.jpg`); new File(shot).copy(dest); uri = dest.uri;
    } catch { /* keep the cache uri if copy fails */ }
    addMeal({ photoUri: uri, slot });
    router.back();
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
      <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={{ flex: 1, justifyContent: "space-between" }} pointerEvents="box-none">
          <View style={st.top}>
            <Pressable onPress={() => router.back()} style={st.round} accessibilityRole="button" accessibilityLabel={s.close}><Text style={st.roundTxt}>✕</Text></Pressable>
            <Text style={st.title}>{s.plate_title}</Text><View style={{ width: 52 }} />
          </View>
          <View style={st.bottom}>
            {shot ? (
              <>
                <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                  {slots.map((sl) => (
                    <Pressable key={sl} onPress={() => setSlot(sl)} style={[st.chip, slot === sl && { backgroundColor: t.accent, borderColor: t.accent }]} accessibilityRole="button">
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>{s[`meal_${sl}` as const]}</Text>
                    </Pressable>
                  ))}
                </View>
                <Button title={s.use_photo} size="xl" onPress={save} />
                <Button title={s.retake} kind="ghost" onPress={() => setShot(null)} />
              </>
            ) : (
              <>
                <Text style={st.hint}>{s.plate_hint}</Text>
                <Pressable onPress={take} disabled={busy || !perm?.granted} style={st.shutter} accessibilityRole="button" accessibilityLabel={s.take_photo}><View style={st.shutterIn} /></Pressable>
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
const st = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  round: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  roundTxt: { color: "#fff", fontSize: 22, fontWeight: "700" },
  bottom: { padding: 20, gap: 12, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "stretch" },
  hint: { color: "#fff", fontSize: 18, textAlign: "center" },
  shutter: { alignSelf: "center", width: 84, height: 84, borderRadius: 42, borderWidth: 5, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  shutterIn: { width: 66, height: 66, borderRadius: 33, backgroundColor: "#fff" },
  chip: { borderWidth: 1, borderColor: "#fff", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
});
