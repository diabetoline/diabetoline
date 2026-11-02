import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { dayKey, useStore } from "../../src/store";
import { levelColor, useTheme } from "../../src/theme";
import { Button, Card, Hint, Label, useScale } from "../../src/ui/Primitives";

export default function Home() {
  const t = useTheme(); const k = useScale();
  const { t: s, s: state } = useStore();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const today = dayKey(Date.now());
  const todayMeals = state.meals.filter((m) => dayKey(m.t) === today);
  const todayGlu = state.glucose.filter((g) => dayKey(g.t) === today);
  const open = (c: string) => { const clean = c.replace(/\D/g, ""); if (clean.length >= 6) router.push({ pathname: "/product/[code]", params: { code: clean } }); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={st.wrap}>
        <Image source={require("../../assets/logo-wordmark.png")} style={{ width: 200, height: 200 * 153 / 1062, alignSelf: "flex-start" }} resizeMode="contain" accessibilityLabel="Diabetoline" />

        <Button title={s.scan_big} icon="▥" size="xl" onPress={() => router.push("/scan")} />
        <Button title={s.plate_big} icon="🍽️" size="xl" kind="soft" onPress={() => router.push("/plate")} />

        {!showCode ? (
          <Pressable onPress={() => setShowCode(true)} accessibilityRole="button"><Hint style={{ textAlign: "center", textDecorationLine: "underline" }}>{s.type_code}</Hint></Pressable>
        ) : (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput value={code} onChangeText={setCode} onSubmitEditing={() => open(code)} placeholder="5940000000000" placeholderTextColor={t.muted}
              keyboardType="number-pad" returnKeyType="search" autoFocus accessibilityLabel={s.type_code}
              style={[st.input, { borderColor: t.line, backgroundColor: t.surface, color: t.ink, fontSize: 18 * k }]} />
            <Button title={s.check} onPress={() => open(code)} kind="soft" size="sm" />
          </View>
        )}

        <Card>
          <Label>{s.today}</Label>
          {todayMeals.length === 0 && todayGlu.length === 0 ? <Hint>{s.nothing_today}</Hint> : (
            <View style={{ gap: 8 }}>
              {todayGlu.slice(-3).map((g) => <Row key={g.id} t={t} k={k} left="💧" text={`${state.unit === "mg" ? Math.round(g.v) : (g.v / 18).toFixed(1)} ${state.unit === "mg" ? "mg/dL" : "mmol/L"} · ${s.ctx[g.ctx]}`} time={g.t} />)}
              {todayMeals.slice(-3).map((m) => <Row key={m.id} t={t} k={k} left={m.photoUri ? "🍽️" : "▥"} text={m.name ?? s[`meal_${m.slot}` as `meal_${typeof m.slot}`]} time={m.t} level={m.level} />)}
            </View>
          )}
        </Card>

        {state.history.length > 0 && (
          <Card>
            <Label>{s.last_scans}</Label>
            {state.history.slice(0, 5).map((h) => {
              const c = levelColor(t, h.level);
              return (
                <Pressable key={h.code} onPress={() => open(h.code)} style={st.row} accessibilityRole="button">
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c.fg }} />
                  <Text style={{ flex: 1, color: t.ink, fontSize: 17 * k }} numberOfLines={1}>{h.name}</Text>
                </Pressable>
              );
            })}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
function Row({ t, k, left, text, time, level }: { t: ReturnType<typeof useTheme>; k: number; left: string; text: string; time: number; level?: "green" | "yellow" | "red" }) {
  return (
    <View style={st.row}>
      <Text style={{ fontSize: 18 }}>{left}</Text>
      <Text style={{ flex: 1, color: t.ink, fontSize: 17 * k }} numberOfLines={1}>{text}</Text>
      {level && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: levelColor(t, level).fg }} />}
      <Text style={{ color: t.muted, fontSize: 14 * k }}>{new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
    </View>
  );
}
const st = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 14 },
  input: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
});
