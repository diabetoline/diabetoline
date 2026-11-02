import { useCallback, useRef, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "../../src/store";
import { levelColor, useTheme } from "../../src/theme";
import { Button, Card, Hint, Label } from "../../src/ui/Primitives";

export default function ScanScreen() {
  const t = useTheme();
  const { t: s, s: state } = useStore();
  const router = useRouter();
  const [perm, requestPerm] = useCameraPermissions();
  const [code, setCode] = useState("");
  const [active, setActive] = useState(true);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  useFocusEffect(useCallback(() => { setActive(true); return () => setActive(false); }, []));

  const open = (c: string) => {
    const clean = c.replace(/\D/g, "");
    if (clean.length < 6) return;
    setActive(false);
    router.push({ pathname: "/product/[code]", params: { code: clean } });
  };
  const onScan = ({ data }: { data: string }) => {
    const now = Date.now();
    if (data === lastRef.current.code && now - lastRef.current.at < 2500) return; // debounce repeated frames
    lastRef.current = { code: data, at: now };
    open(data);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={st.wrap}>
        <Image source={require("../../assets/logo-wordmark.png")} style={{ width: 190, height: 190 * 153 / 1062 }} resizeMode="contain" accessibilityLabel="Diabetoline" />
        <Card>
          <View style={[st.cam, { backgroundColor: t.accentSoft }]}>
            {perm?.granted ? (
              active && <CameraView style={StyleSheet.absoluteFill} facing="back" autofocus="on"
                barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"] }}
                onBarcodeScanned={onScan} />
            ) : (
              <View style={{ padding: 16, gap: 10, alignItems: "center" }}>
                <Hint style={{ textAlign: "center" }}>{s.cam_denied}</Hint>
                <Button title={s.cam_allow} onPress={() => requestPerm()} small />
              </View>
            )}
            <View pointerEvents="none" style={[st.corner, st.c1, { borderColor: t.accent }]} /><View pointerEvents="none" style={[st.corner, st.c2, { borderColor: t.accent }]} />
            <View pointerEvents="none" style={[st.corner, st.c3, { borderColor: t.accent }]} /><View pointerEvents="none" style={[st.corner, st.c4, { borderColor: t.accent }]} />
          </View>
          <Hint style={{ textAlign: "center" }}>{s.scan_hint}. {s.scan_distance}</Hint>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput value={code} onChangeText={setCode} onSubmitEditing={() => open(code)} placeholder={s.scan_manual} placeholderTextColor={t.muted}
              keyboardType="number-pad" returnKeyType="search" accessibilityLabel={s.scan_manual}
              style={[st.input, { borderColor: t.line, backgroundColor: t.bg, color: t.ink }]} />
            <Button title={s.check} onPress={() => open(code)} kind="soft" small />
          </View>
        </Card>

        <Label>{s.history}</Label>
        <FlatList data={state.history} keyExtractor={(h) => h.code} style={{ flex: 1 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: t.line }} />}
          ListEmptyComponent={<Hint>{s.empty_history}</Hint>}
          renderItem={({ item }) => {
            const c = levelColor(t, item.level);
            return (
              <Pressable onPress={() => open(item.code)} style={[st.row, { backgroundColor: t.surface }]} accessibilityRole="button">
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.fg }} />
                <Text style={{ flex: 1, color: t.ink }} numberOfLines={1}>{item.name}</Text>
                <Text style={{ color: t.muted, fontSize: 12 }}>{new Date(item.t).toLocaleDateString()}</Text>
              </Pressable>
            );
          }} />
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  brand: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  cam: { height: 220, borderRadius: 12, overflow: "hidden", justifyContent: "center" },
  corner: { position: "absolute", width: 22, height: 22, borderWidth: 3 },
  c1: { top: 12, left: 12, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  c2: { top: 12, right: 12, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  c3: { bottom: 12, left: 12, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  c4: { bottom: 12, right: 12, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, paddingHorizontal: 12 },
});
