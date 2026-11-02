import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../src/store";
import { useTheme } from "../src/theme";
import { Button, Hint } from "../src/ui/Primitives";

export default function ScanScreen() {
  const t = useTheme(); const router = useRouter();
  const ins = useSafeAreaInsets();
  const close = () => { if (router.canGoBack()) router.back(); else router.replace("/"); };
  const { t: s } = useStore();
  const [perm, requestPerm] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const done = useRef(false);

  const onScan = ({ data }: { data: string }) => {
    if (done.current) return;
    const clean = data.replace(/\D/g, "");
    if (clean.length < 6) return;
    done.current = true;
    router.replace({ pathname: "/product/[code]", params: { code: clean } });
  };

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
            <Pressable onPress={close} hitSlop={20} style={({ pressed }) => [st.round, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={s.close}><Text style={st.roundTxt}>✕</Text></Pressable>
            <Pressable onPress={() => setTorch((v) => !v)} style={[st.round, torch && { backgroundColor: "#fff" }]} accessibilityRole="button" accessibilityLabel={s.torch}><Text style={[st.roundTxt, torch && { color: "#000" }]}>🔦</Text></Pressable>
          </View>
          <View style={st.frameWrap} pointerEvents="none">
            <View style={[st.frame, { borderColor: t.ok }]} />
          </View>
          <View style={st.bottom}>
            <Text style={st.hint}>{s.scan_hint}</Text>
            <Text style={st.hint2}>{s.scan_distance}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
const st = StyleSheet.create({
  overlay: { zIndex: 10, elevation: 10 },
  top: { flexDirection: "row", justifyContent: "space-between", padding: 16 },
  round: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  roundTxt: { color: "#fff", fontSize: 22, fontWeight: "700" },
  frameWrap: { alignItems: "center" },
  frame: { width: "80%", aspectRatio: 1.6, borderWidth: 4, borderRadius: 18 },
  bottom: { padding: 24, gap: 6, backgroundColor: "rgba(0,0,0,0.55)" },
  hint: { color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center" },
  hint2: { color: "#ddd", fontSize: 16, textAlign: "center" },
});
