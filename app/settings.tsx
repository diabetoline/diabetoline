import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import { useState } from "react";
import buildInfo from "../src/build.json";
import { useStore } from "../src/store";
import type { Lang } from "../src/i18n";
import { useTheme } from "../src/theme";
import { Button, Card, Hint, Label, Title, useScale } from "../src/ui/Primitives";

export default function Settings() {
  const t = useTheme(); const k = useScale();
  const [upd, setUpd] = useState("");
  const build = (process.env.EXPO_PUBLIC_BUILD ?? buildInfo.sha).slice(0, 7);
  const when = Updates.createdAt ? new Date(Updates.createdAt).toLocaleString() : "—";
  const checkUpdates = async () => {
    setUpd("…");
    try { const r = await Updates.checkForUpdateAsync(); if (r.isAvailable) { await Updates.fetchUpdateAsync(); await Updates.reloadAsync(); } else setUpd(s.upd_none); }
    catch (e) { try { await Updates.reloadAsync(); } catch { setUpd(String((e as Error)?.message ?? e)); } }
  };
  const { t: s, s: state, set } = useStore();
  const router = useRouter();
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
        <Seg value={state.lang} options={langs} onChange={(v) => set({ lang: v, langManual: true })} />
        <Label>{s.unit}</Label>
        <Seg value={state.unit} options={[{ v: "mg" as const, l: "mg/dL" }, { v: "mmol" as const, l: "mmol/L" }]} onChange={(v) => set({ unit: v })} />
        <Label>{s.your_name}</Label>
        <TextInput value={state.name} onChangeText={(v) => set({ name: v })} placeholder="—" placeholderTextColor={t.muted} accessibilityLabel={s.your_name}
          style={{ borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 14, fontSize: 18 * k, color: t.ink, backgroundColor: t.bg }} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: t.ink, fontSize: 18 * k }}>{s.humor}</Text>
          <Switch value={state.humor} onValueChange={(v) => set({ humor: v })} trackColor={{ true: t.ok }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: t.ink, fontSize: 18 * k }}>{s.big_text}</Text>
          <Switch value={state.bigText} onValueChange={(v) => set({ bigText: v })} trackColor={{ true: t.ok }} />
        </View>
      </Card>
      <Card>
        <Label>{s.rem_title}</Label>
        {([["glucose", s.rem_glu], ["move", s.rem_move], ["medFollow", s.rem_med]] as const).map(([key, label]) => (
          <View key={key} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Text style={{ flex: 1, color: t.ink, fontSize: 17 * k }}>{label}</Text>
            <Switch value={state.remind?.[key] ?? true} onValueChange={(v) => set({ remind: { ...(state.remind ?? {}), [key]: v } })} trackColor={{ true: t.ok }} />
          </View>
        ))}
        <Hint>{s.rem_hint}</Hint>
      </Card>
      <Card>
        <Label>{s.upd_version}</Label>
        <Text style={{ color: t.ink, fontSize: 16 * k }}>{build} · {when}</Text>
        <Button title={s.upd_check} kind="soft" onPress={checkUpdates} />
        {upd ? <Text style={{ color: t.muted, fontSize: 14 * k }}>{upd}</Text> : null}
      </Card>
      <Button title={s.first_again} kind="soft" onPress={() => router.push("/welcome")} />
      <Button title={s.reset} kind="danger" onPress={async () => { await AsyncStorage.clear(); set({ history: [], glucose: [], meals: [], meds: [], medLog: [], cache: {} }); }} />
    </ScrollView>
  );
}
