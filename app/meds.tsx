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
  // insulina: unitățile pe priză sunt cele stabilite de medic; aplicația doar le notează și reamintește (fără sugestii de doză)
  const [kind, setKind] = useState<"pill" | "insulin">("pill"); const [units, setUnits] = useState("");
  const unitsN = parseFloat(units.replace(",", "."));
  const [msg, setMsg] = useState("");
  const parsedTimes = times.split(/[,\s;]+/).map(parseTime).filter((x): x is string => !!x);
  const valid = parsedTimes.length > 0 && (kind === "pill" ? name.trim().length > 0 : Number.isFinite(unitsN) && unitsN > 0);

  const add = async () => {
    if (!valid) return;
    const label = kind === "insulin" ? `${s.med_insulin}${name.trim() ? " " + name.trim() : ""} · ${unitsN} U` : name.trim();
    const med: Med = { id: String(Date.now()), name: label, times: [...new Set(parsedTimes)].sort(), kind, ...(kind === "insulin" ? { units: unitsN } : {}) };
    const ok = await ensurePermission();
    let notifIds: string[] = [];
    if (ok) { try { notifIds = await scheduleMed(med, s); } catch {} } else setMsg(s.notif_denied);
    set({ meds: [...state.meds, { ...med, notifIds }] });
    setName(""); setTimes(""); setUnits(""); if (ok) setMsg(s.med_saved);
  };
  const remove = async (med: Med) => { await cancelMed(med); set({ meds: state.meds.filter((m) => m.id !== med.id) }); };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Stack.Screen options={{ title: s.meds }} />
      <Title>{s.meds}</Title>
      <Hint>{s.meds_sub}</Hint>
      {state.meds.map((m) => (
        <Card key={m.id} style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontSize: 26 }}>{m.kind === "insulin" ? "💉" : "💊"}</Text>
          <View style={{ flex: 1 }}><Text style={{ color: t.ink, fontSize: 19 * k, fontWeight: "700" }}>{m.name}</Text><Text style={{ color: t.muted, fontSize: 16 * k }}>{m.times.join(" · ")}</Text></View>
          <Pressable onPress={() => remove(m)} accessibilityRole="button" accessibilityLabel={s.delete}><Text style={{ color: t.bad, fontSize: 16 * k, fontWeight: "700" }}>{s.delete}</Text></Pressable>
        </Card>
      ))}
      <Card>
        <Label>{s.med_add}</Label>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["pill", "insulin"] as const).map((kd) => (
            <Pressable key={kd} onPress={() => setKind(kd)} accessibilityRole="button" accessibilityState={{ selected: kind === kd }}
              style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 2, borderColor: kind === kd ? t.accent : t.line, backgroundColor: kind === kd ? t.accentSoft : t.bg, alignItems: "center" }}>
              <Text style={{ color: t.ink, fontSize: 17 * k, fontWeight: "700" }}>{kd === "pill" ? "💊 " + s.med_pill : "💉 " + s.med_insulin}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput value={name} onChangeText={setName} placeholder={kind === "insulin" ? s.med_insulin_name : s.med_name} placeholderTextColor={t.muted} accessibilityLabel={s.med_name}
          style={{ borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 14, fontSize: 18 * k, color: t.ink, backgroundColor: t.bg }} />
        {kind === "insulin" && (
          <>
            <TextInput value={units} onChangeText={setUnits} placeholder={s.med_units} placeholderTextColor={t.muted} accessibilityLabel={s.med_units} keyboardType="decimal-pad"
              style={{ borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 14, fontSize: 18 * k, color: t.ink, backgroundColor: t.bg }} />
            <Hint>{s.med_units_hint}</Hint>
          </>
        )}
        <TextInput value={times} onChangeText={setTimes} placeholder={s.med_times} placeholderTextColor={t.muted} accessibilityLabel={s.med_times} keyboardType="numbers-and-punctuation"
          style={{ borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 14, fontSize: 18 * k, color: t.ink, backgroundColor: t.bg }} />
        {parsedTimes.length > 0 && <Hint>⏰ {parsedTimes.join(" · ")}</Hint>}
        <Button title={s.med_add} onPress={add} disabled={!valid} />
        {msg ? <Hint>{msg}</Hint> : null}
      </Card>
    </ScrollView>
  );
}
