import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { dayKeyLocal } from "../engine/days";
import { scheduleMoveQuestion } from "../notifications";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { Icon } from "./Icon";
import { Button, Card, Hint, useScale } from "./Primitives";
import { Quip } from "./Quip";

const WEEK = 7 * 864e5;

/** Greutatea: o dată pe săptămână, un card pe prima pagină. Dispare după ce notează sau amână (până a doua zi). */
export function WeightCheckin() {
  const t = useTheme(); const k = useScale();
  const { t: s, s: state, addWeight } = useStore();
  const [val, setVal] = useState("");
  const [later, setLater] = useState(false);
  const [saved, setSaved] = useState(false);
  const last = state.weights?.[state.weights.length - 1];
  const due = !last || Date.now() - last.t > WEEK;
  if (!due || later) return null;
  const kg = parseFloat(val.replace(",", "."));
  const valid = Number.isFinite(kg) && kg >= 30 && kg <= 300;
  if (saved) return (
    <Card style={{ borderColor: t.ok, borderWidth: 2 }}>
      <Text style={{ color: t.ok, fontSize: 18 * k, fontWeight: "700" }}>✓ {s.wt_saved}</Text>
    </Card>
  );
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={{ fontSize: 26 }}>⚖️</Text>
        <Text style={{ flex: 1, color: t.ink, fontSize: 20 * k, fontWeight: "800" }}>{s.wt_ask}</Text>
      </View>
      <Hint>{s.wt_hint}{last ? ` ${s.wt_last(last.kg, new Date(last.t).toLocaleDateString())}` : ""}</Hint>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <TextInput value={val} onChangeText={setVal} keyboardType="decimal-pad" placeholder={last ? String(last.kg) : "80"} placeholderTextColor={t.muted} accessibilityLabel={s.wt_ask}
          style={{ flex: 1, borderWidth: 2, borderColor: valid ? t.ok : t.line, borderRadius: 14, padding: 14, fontSize: 30 * k, fontWeight: "800", color: t.ink, textAlign: "center", backgroundColor: t.bg, fontVariant: ["tabular-nums"] }} />
        <Text style={{ color: t.muted, fontSize: 22 * k, fontWeight: "700" }}>{s.wt_kg}</Text>
      </View>
      <Button title={s.wt_save} size="xl" disabled={!valid} onPress={() => { addWeight(Math.round(kg * 10) / 10); setSaved(true); }} />
      <Button title={s.wt_later} kind="ghost" onPress={() => setLater(true)} />
    </Card>
  );
}

/** Seara: „Ai făcut mișcare azi?” Da (15 / 30 / 60 min) sau Nu încă. Apare după ora 17 dacă nu e notată nicio plimbare azi. */
export function MoveCheckin() {
  const t = useTheme(); const k = useScale();
  const { t: s, s: state, set, addWalk } = useStore();
  const today = dayKeyLocal(Date.now());
  const hour = new Date().getHours();
  const [done, setDone] = useState<"yes" | "no" | null>(null);
  const walkedToday = (state.walks ?? []).some((w) => dayKeyLocal(w.t) === today);
  // notificarea zilnică se programează o singură dată
  useEffect(() => { if (!state.moveNotifId) scheduleMoveQuestion(s).then((id) => { if (id) set({ moveNotifId: id }); }).catch(() => {}); }, []);
  if (hour < 17 || walkedToday || state.moveAskedDay === today) return null;
  if (done === "yes") return (
    <Card style={{ borderColor: t.ok, borderWidth: 2 }}>
      <Text style={{ color: t.ok, fontSize: 18 * k, fontWeight: "700" }}>✓ {s.mv_thanks}</Text>
      <Quip k="walk_done" style={{ textAlign: "left" }} />
    </Card>
  );
  if (done === "no") return <Card><Text style={{ color: t.ink, fontSize: 17 * k }}>{s.mv_no_thanks}</Text></Card>;
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Icon name="walk" size={28} color={t.accent} />
        <Text style={{ flex: 1, color: t.ink, fontSize: 20 * k, fontWeight: "800" }}>{s.mv_ask}</Text>
      </View>
      <Hint>{s.mv_hint}</Hint>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[15, 30, 60].map((m) => <View key={m} style={{ flex: 1 }}><Button title={s.mv_yes(m)} size="md" onPress={() => { addWalk(m); setDone("yes"); }} /></View>)}
      </View>
      <Button title={s.mv_no} kind="ghost" onPress={() => { set({ moveAskedDay: today }); setDone("no"); }} />
    </Card>
  );
}
