import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { dayProgress } from "../engine/dayplan";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { Icon, type IconName } from "./Icon";
import { Button, Card, Label, useScale } from "./Primitives";

/**
 * „Azi” — lista clară a zilei (Alex, 15 nov 2026: „un to do zilnic mult mai clar, cu glicemia și mișcarea”):
 * glicemia · o masă notată · mișcarea · medicamentele. Fiecare rând e o bifă mare; apăsarea duce exact acolo unde se notează.
 * Mișcarea se bifează direct de aici (15/30/60 min). Fără cifre-țintă, fără sfaturi medicale.
 */
export function DayPlan() {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state, addWalk } = useStore();
  const [moveOpen, setMoveOpen] = useState(false);
  // strâns implicit (Alex, 15 nov 2026: „e prea mare”): un rând cu bifele; apăsarea îl desface
  const [open, setOpen] = useState(false);
  const p = dayProgress(state);
  const { glu, meals, medsDue, medsTaken, medsTotal, gluOut } = p; const walk = p.walkMin;
  const hm = (ms: number) => new Date(ms).toTimeString().slice(0, 5);
  const unit = state.unit === "mg" ? "mg/dL" : "mmol/L";
  const last = glu[glu.length - 1];

  type Row = { key: string; icon: IconName; tint: string; title: string; short: string; sub: string; ok: boolean; onPress: () => void };
  const rows: Row[] = [
    { key: "glu", icon: "drop", tint: t.brandRed, title: s.plan_glu, short: s.plan_glu, ok: glu.length > 0,
      sub: last ? s.plan_glu_done(`${last.v} ${unit}`, hm(last.t), glu.length) : s.plan_glu_todo, onPress: () => router.push("/glucose/new") },
    { key: "meal", icon: "plate", tint: t.accent, title: s.plan_meal, short: s.plan_meal_short, ok: meals.length > 0,
      sub: meals.length ? s.plan_meal_done(meals.length) : s.plan_meal_todo, onPress: () => router.push("/plate") },
    { key: "move", icon: "walk", tint: t.accent, title: s.plan_move, short: s.plan_move, ok: walk > 0,
      sub: walk ? s.plan_move_done(walk) : s.plan_move_todo, onPress: () => setMoveOpen((v) => !v) },
    ...(state.meds.length ? [{ key: "meds", icon: "pill" as IconName, tint: t.warn, title: s.plan_meds, short: s.plan_meds, ok: medsDue.length > 0 && medsTaken === medsDue.length,
      sub: medsDue.length ? s.plan_meds_done(medsTaken, medsDue.length) : s.plan_meds_later(medsTotal), onPress: () => router.push("/meds") }] : []),
  ];
  const done = rows.filter((r) => r.ok).length;
  if (!open) return (
    <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`${s.plan_title}: ${s.day_progress(done, rows.length)}`}
      style={({ pressed }) => ({ backgroundColor: t.surface, borderColor: t.line, borderWidth: 1, borderRadius: 18, paddingLeft: 14, paddingRight: 8, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 8, opacity: pressed ? 0.8 : 1 })}>
      <Text style={{ color: t.ink, fontSize: 15 * k, fontWeight: "800" }}>{s.plan_title}</Text>
      {/* un singur rând oricâte limbi/mărimi de text: bifele derulează orizontal dacă nu încap */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 6, alignItems: "center" }}>
        {rows.map((r) => (
          <Pressable key={r.key} onPress={() => setOpen(true)} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: r.ok ? t.accentSoft : t.badBg, borderWidth: 1, borderColor: r.ok ? t.ok : t.bad }}>
            <Text style={{ color: r.ok ? t.ok : t.bad, fontSize: 12.5 * k, fontWeight: "800" }} numberOfLines={1}>{r.ok ? "✓" : "✗"} {r.short}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={{ color: t.muted, fontSize: 20 }}>⌄</Text>
    </Pressable>
  );
  return (
    <Card style={{ gap: 4, paddingVertical: 12 }}>
      <Pressable onPress={() => setOpen(false)} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Label>📋 {s.plan_title}</Label>
        <Text style={{ color: done === rows.length ? t.ok : t.muted, fontSize: 14 * k, fontWeight: "800", marginBottom: 6 }}>{done === rows.length ? `✓ ${s.plan_all_done}` : s.day_progress(done, rows.length)}  ⌃</Text>
      </Pressable>
      {rows.map((r, i) => (
        <View key={r.key}>
          <Pressable onPress={r.onPress} accessibilityRole="button" accessibilityState={{ checked: r.ok }} accessibilityLabel={`${r.title}: ${r.sub}`}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, opacity: pressed ? 0.7 : 1, borderTopWidth: i ? 1 : 0, borderTopColor: t.line })}>
            <View style={{ width: 34, height: 34, borderRadius: 10, borderWidth: 2, borderColor: r.ok ? t.ok : t.line, backgroundColor: r.ok ? t.ok : t.bg, alignItems: "center", justifyContent: "center" }}>
              {r.ok ? <Text style={{ color: "#fff", fontWeight: "800", fontSize: 20 }}>✓</Text> : <Icon name={r.icon} size={18} color={r.tint} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.ink, fontSize: 18 * k, fontWeight: "800", textDecorationLine: r.ok ? "line-through" : "none", opacity: r.ok ? 0.7 : 1 }}>{r.title}</Text>
              <Text style={{ color: r.ok ? (r.key === "glu" && gluOut ? t.warn : t.ok) : t.muted, fontSize: 15 * k }} numberOfLines={2}>{r.sub}</Text>
            </View>
            {!r.ok && <Text style={{ color: t.muted, fontSize: 26 }}>›</Text>}
          </Pressable>
          {r.key === "move" && moveOpen && !r.ok && (
            <View style={{ flexDirection: "row", gap: 8, paddingBottom: 10 }}>
              {[15, 30, 60].map((m) => <View key={m} style={{ flex: 1 }}><Button title={s.mv_yes(m)} size="sm" onPress={() => { addWalk(m); setMoveOpen(false); }} /></View>)}
            </View>
          )}
        </View>
      ))}
    </Card>
  );
}
