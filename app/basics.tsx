import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { BASIC_GROUPS, BASICS, basicProduct, type Basic } from "../src/basics";
import { analyze } from "../src/engine/verdict";
import { useStore } from "../src/store";
import { track } from "../src/analytics";
import { levelColor, useTheme } from "../src/theme";
import { Hint, Label, useScale } from "../src/ui/Primitives";

/** „N-are cod”: alimentele de bază (pâine de la panificație, fructe, legume, cântar) cu verdict gata, fără internet. */
export default function Basics() {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state, addUserProduct } = useStore();
  const [q, setQ] = useState("");
  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return BASICS.filter((b) => !needle || Object.values(b.name).some((n) => n.toLowerCase().includes(needle)));
  }, [q]);
  const groups = (Object.keys(BASIC_GROUPS) as Basic["group"][]).map((g) => ({ g, list: items.filter((b) => b.group === g) })).filter((x) => x.list.length);
  const pick = (b: Basic) => {
    const p = basicProduct(b, state.lang);
    addUserProduct(p); track("basics_pick", { id: b.id });
    router.replace({ pathname: "/product/[code]", params: { code: p.code } });
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: s.basics_title }} />
      <Hint>{s.basics_hint}</Hint>
      <TextInput value={q} onChangeText={setQ} placeholder={s.basics_search} placeholderTextColor={t.muted} accessibilityLabel={s.basics_search}
        style={{ borderWidth: 2, borderColor: t.line, borderRadius: 14, padding: 14, fontSize: 18 * k, color: t.ink, backgroundColor: t.surface }} />
      {groups.map(({ g, list }) => (
        <View key={g} style={{ gap: 8 }}>
          <Label>{BASIC_GROUPS[g][state.lang]}</Label>
          {list.map((b) => {
            const lvl = analyze(basicProduct(b, state.lang)).level; const c = levelColor(t, lvl);
            return (
              <Pressable key={b.id} onPress={() => pick(b)} accessibilityRole="button" style={({ pressed }) => ({ backgroundColor: t.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.line, flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.7 : 1 })}>
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c.fg }} />
                <Text style={{ color: t.ink, fontSize: 18 * k, fontWeight: "600", flex: 1 }}>{b.name[state.lang]}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
      {!groups.length && <Hint>{s.basics_none}</Hint>}
    </ScrollView>
  );
}
