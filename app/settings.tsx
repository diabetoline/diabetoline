import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useStore } from "../src/store";
import type { Lang } from "../src/i18n";
import { useTheme } from "../src/theme";
import { Button, Card, Label, Title, useScale } from "../src/ui/Primitives";

export default function Settings() {
  const t = useTheme(); const k = useScale();
  const { t: s, s: state, set } = useStore();
  const langs: { v: Lang; l: string }[] = [{ v: "ro", l: "Română" }, { v: "en", l: "English" }, { v: "de", l: "Deutsch" }];
  const Seg = <T extends string>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) => (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {options.map((o) => (
        <Pressable key={o.v} onPress={() => onChange(o.v)} accessibilityRole="button"
          style={{ flex: 1, borderWidth: 2, borderColor: value === o.v ? t.accent : t.line, backgroundColor: value === o.v ? t.accentSoft : t.surface, borderRadius: 12, padding: 12, alignItems: "center" }}>
          <Text style={{ color: t.ink, fontWeight: value === o.v ? "800" : "500", fontSize: 16 * k }}>{o.l}</Text>
        </Pressable>
      ))}
    </View>
  );
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: s.settings }} />
      <Title>{s.settings}</Title>
      <Card>
        <Label>{s.lang}</Label>
        <Seg value={state.lang} options={langs} onChange={(v) => set({ lang: v })} />
        <Label>{s.unit}</Label>
        <Seg value={state.unit} options={[{ v: "mg" as const, l: "mg/dL" }, { v: "mmol" as const, l: "mmol/L" }]} onChange={(v) => set({ unit: v })} />
        <Label>{s.your_name}</Label>
        <TextInput value={state.name} onChangeText={(v) => set({ name: v })} placeholder="—" placeholderTextColor={t.muted} accessibilityLabel={s.your_name}
          style={{ borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 14, fontSize: 18 * k, color: t.ink, backgroundColor: t.bg }} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: t.ink, fontSize: 18 * k }}>{s.big_text}</Text>
          <Switch value={state.bigText} onValueChange={(v) => set({ bigText: v })} trackColor={{ true: t.ok }} />
        </View>
      </Card>
      <Button title={s.reset} kind="danger" onPress={async () => { await AsyncStorage.clear(); set({ history: [], glucose: [], meals: [], meds: [], medLog: [], cache: {} }); }} />
    </ScrollView>
  );
}
