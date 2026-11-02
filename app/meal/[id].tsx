import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import { say } from "../../src/speech";
import { giBand } from "../../src/engine/plate";
import { speechLocale } from "../../src/i18n";
import { useStore } from "../../src/store";
import { levelColor, useTheme } from "../../src/theme";
import { AfterMeal } from "../../src/ui/AfterMeal";
import { Button, Card, Hint, Label, useScale } from "../../src/ui/Primitives";
import { Quip } from "../../src/ui/Quip";
import { VerdictBadge } from "../../src/ui/VerdictBadge";

/** Rezultatul pozei de la masă: verdictul mesei, ce s-a văzut în farfurie, IG, recomandări și ce ajută acum. */
export default function MealResult() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state } = useStore();
  const m = state.meals.find((x) => x.id === id);
  useEffect(() => () => { Speech.stop(); }, []);
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 600, delay: 400, useNativeDriver: true }).start(); }, []);

  if (!m) return <View style={{ flex: 1, padding: 16 }}><Hint>{s.no_entries}</Hint></View>;
  const level = m.level ?? "green";
  const c = levelColor(t, level);
  const title = level === "green" ? s.meal_green : level === "yellow" ? s.meal_yellow : s.meal_red;
  const glyph = level === "green" ? "✓" : level === "yellow" ? "!" : "✕";
  const a = m.analysis;
  const band = { low: t.ok, mid: t.warn, high: t.bad } as const;
  const bandWord = { low: s.low, mid: s.mid, high: s.high } as const;
  const speak = () => {
    Speech.stop();
    say([title, a?.summary, ...(a?.tips ?? [])].filter(Boolean).join(". "), state.lang);
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ title: s[`meal_${m.slot}` as `meal_${typeof m.slot}`] }} />
      {m.photoUri && (
        <View style={{ width: "100%", height: 260 }}>
          <Image source={{ uri: m.photoUri }} style={{ width: "100%", height: 260 }} resizeMode="cover" />
          {a?.foods.filter((f) => f.x != null && f.y != null).map((f, i) => (
            <Animated.View key={i} style={{ position: "absolute", left: `${Math.min(80, Math.max(2, f.x!))}%`, top: `${Math.min(88, Math.max(4, f.y!))}%`, opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#fff", borderWidth: 2, borderColor: f.gi != null && f.carbs > 0 ? band[giBand(f.gi)] : t.accent, marginLeft: 10, marginBottom: -2 }} />
              <View style={{ backgroundColor: "rgba(20,32,43,0.82)", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, maxWidth: 170 }}>
                <Text style={{ color: "#fff", fontSize: 13 * k, fontWeight: "700" }} numberOfLines={1}>{f.name}</Text>
                <Text style={{ color: "#D6DEE5", fontSize: 12 * k }}>~{f.grams} g · {f.carbs > 0 ? `${f.carbs} g ${s.carbs.toLowerCase().slice(0, 5)}.` : s.no_carbs}{f.gi != null && f.carbs > 0 ? ` · ${s.gi_short} ${f.gi}` : ""}</Text>
              </View>
            </Animated.View>
          ))}
        </View>
      )}

      <View style={[st.hero, { backgroundColor: c.bg }]}>
        <VerdictBadge level={level} size={84} />
        <Text style={{ color: c.fg, fontWeight: "800", fontSize: 30 * k, textAlign: "center" }}>{title}</Text>
        {a?.summary ? <Text style={{ color: t.ink, fontSize: 18 * k, textAlign: "center", lineHeight: 26 * k }}>{a.summary}</Text> : null}
        <Quip k={level} seed={m.id} />
        {a && (
          <Pressable onPress={speak} style={[st.speak, { backgroundColor: t.surface, borderColor: c.fg }]} accessibilityRole="button" accessibilityLabel={s.speak}>
            <Text style={{ fontSize: 22 }}>🔊</Text><Text style={{ color: t.ink, fontWeight: "700", fontSize: 16 * k }}>{s.speak}</Text>
          </Pressable>
        )}
      </View>

      <View style={{ padding: 16, gap: 14 }}>
        {a && a.tips.length > 0 && (
          <Card>
            <Label>{s.plate_tips}</Label>
            {a.tips.map((tip, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 10 }}>
                <Text style={{ fontSize: 20 }}>💡</Text>
                <Text style={{ flex: 1, color: t.ink, fontSize: 18 * k, lineHeight: 25 * k }}>{tip}</Text>
              </View>
            ))}
          </Card>
        )}

        {level !== "green" && <AfterMeal level={level} />}

        {a && (
          <Card>
            <Label>{s.plate_foods}</Label>
            {a.foods.map((f, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6, borderBottomWidth: i < a.foods.length - 1 ? 1 : 0, borderBottomColor: t.line }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.ink, fontSize: 17 * k, fontWeight: "600" }}>{f.name}</Text>
                  <Text style={{ color: t.muted, fontSize: 14 * k }}>~{f.grams} g · {f.carbs > 0 ? `${f.carbs} g ${s.carbs.toLowerCase()}` : s.no_carbs}</Text>
                </View>
                {f.gi != null && f.carbs > 0 && (
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: band[giBand(f.gi)], fontSize: 18 * k, fontWeight: "800" }}>{s.gi_short} {f.gi}</Text>
                    <Text style={{ color: band[giBand(f.gi)], fontSize: 13 * k, fontWeight: "700" }}>{bandWord[giBand(f.gi)]}</Text>
                  </View>
                )}
              </View>
            ))}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <Stat label={s.plate_total} value={`${m.carbs ?? 0} g`} />
              <Stat label={s.plate_gl} value={String(m.gl ?? 0)} color={c.fg} />
            </View>
          </Card>
        )}

        <Button title={s.care_done} size="xl" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
        {a && <Hint>{s.plate_note}</Hint>}
      </View>
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  const t = useTheme(); const k = useScale();
  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 10 }}>
      <Text style={{ fontSize: 26 * k, fontWeight: "800", color: color ?? t.ink, fontVariant: ["tabular-nums"] }}>{value}</Text>
      <Text style={{ fontSize: 13 * k, color: t.muted }}>{label}</Text>
    </View>
  );
}
const st = StyleSheet.create({
  hero: { alignItems: "center", gap: 10, padding: 22 },
  dot: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  speak: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 2, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10, marginTop: 4 },
});
