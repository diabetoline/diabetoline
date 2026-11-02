import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import { cancelMed, ensurePermission, parseTime, scheduleMed } from "../src/notifications";
import { useStore, type Med } from "../src/store";
import { useTheme } from "../src/theme";
import { Button, Card, Hint, Label, Title, useScale } from "../src/ui/Primitives";

export default function Meds() {
  const t = useTheme(); const k = useScale();
  const { t: s, s: state, set } = useStore();
  const [name, setName] = useState(""); const [times, setTimes] = useState("");
  const [msg, setMsg] = useState("");
  const parsedTimes = times.split(/[,\s;]+/).map(parseTime).filter((x): x is string => !!x);
  const valid = name.trim().length > 0 && parsedTimes.length > 0;

  const add = async () => {
    if (!valid) return;
    const med: Med = { id: String(Date.now()), name: name.trim(), times: [...new Set(parsedTimes)].sort() };
    const ok = await ensurePermission();
    let notifIds: string[] = [];
    if (ok) { try { notifIds = await scheduleMed(med, s); } catch {} } else setMsg(s.notif_denied);
    set({ meds: [...state.meds, { ...med, notifIds }] });
    setName(""); setTimes(""); if (ok) setMsg(s.med_saved);
  };
  const remove = async (med: Med) => { await cancelMed(med); set({ meds: state.meds.filter((m) => m.id !== med.id) }); };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: s.meds }} />
      <Title>{s.meds}</Title>
      <Hint>{s.meds_sub}</Hint>
      {state.meds.map((m) => (
        <Card key={m.id} style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontSize: 26 }}>💊</Text>
          <View style={{ flex: 1 }}><Text style={{ color: t.ink, fontSize: 19 * k, fontWeight: "700" }}>{m.name}</Text><Text style={{ color: t.muted, fontSize: 16 * k }}>{m.times.join(" · ")}</Text></View>
          <Pressable onPress={() => remove(m)} accessibilityRole="button" accessibilityLabel={s.delete}><Text style={{ color: t.bad, fontSize: 16 * k, fontWeight: "700" }}>{s.delete}</Text></Pressable>
        </Card>
      ))}
      <Card>
        <Label>{s.med_add}</Label>
        <TextInput value={name} onChangeText={setName} placeholder={s.med_name} placeholderTextColor={t.muted} accessibilityLabel={s.med_name}
          style={{ borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 14, fontSize: 18 * k, color: t.ink, backgroundColor: t.bg }} />
        <TextInput value={times} onChangeText={setTimes} placeholder={s.med_times} placeholderTextColor={t.muted} accessibilityLabel={s.med_times} keyboardType="numbers-and-punctuation"
          style={{ borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 14, fontSize: 18 * k, color: t.ink, backgroundColor: t.bg }} />
        {parsedTimes.length > 0 && <Hint>⏰ {parsedTimes.join(" · ")}</Hint>}
        <Button title={s.med_add} onPress={add} disabled={!valid} />
        {msg ? <Hint>{msg}</Hint> : null}
      </Card>
    </ScrollView>
  );
}
