import { useEffect } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import { giBand } from "../../src/engine/plate";
import { speechLocale } from "../../src/i18n";
import { useStore } from "../../src/store";
import { levelColor, useTheme } from "../../src/theme";
import { AfterMeal } from "../../src/ui/AfterMeal";
import { Button, Card, Hint, Label, useScale } from "../../src/ui/Primitives";

/** Rezultatul pozei de la masă: verdictul mesei, ce s-a văzut în farfurie, IG, recomandări și ce ajută acum. */
export default function MealResult() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state } = useStore();
  const m = state.meals.find((x) => x.id === id);
  useEffect(() => () => { Speech.stop(); }, []);

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
    Speech.speak([title, a?.summary, ...(a?.tips ?? [])].filter(Boolean).join(". "), { language: speechLocale[state.lang], rate: 0.95 });
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ title: s[`meal_${m.slot}` as `meal_${typeof m.slot}`] }} />
      {m.photoUri && <Image source={{ uri: m.photoUri }} style={{ width: "100%", height: 220 }} resizeMode="cover" />}

      <View style={[st.hero, { backgroundColor: c.bg }]}>
        <View style={[st.dot, { backgroundColor: c.fg }]}><Text style={{ color: t.surface, fontWeight: "800", fontSize: 40 }}>{glyph}</Text></View>
        <Text style={{ color: c.fg, fontWeight: "800", fontSize: 30 * k, textAlign: "center" }}>{title}</Text>
        {a?.summary ? <Text style={{ color: t.ink, fontSize: 18 * k, textAlign: "center", lineHeight: 26 * k }}>{a.summary}</Text> : null}
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
