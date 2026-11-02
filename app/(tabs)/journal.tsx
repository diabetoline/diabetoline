import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { dayKey, useStore } from "../../src/store";
import { levelColor, useTheme } from "../../src/theme";
import { Button, Card, Hint, Label, Title, useScale } from "../../src/ui/Primitives";
import { DaysCalendar } from "../../src/ui/DaysCalendar";
import { Quip } from "../../src/ui/Quip";

import type { GluEntry, MealEntry, MedLog, Walk } from "../../src/store";
type Item = { t: number; kind: "glu"; data: GluEntry } | { t: number; kind: "meal"; data: MealEntry } | { t: number; kind: "med"; data: MedLog } | { t: number; kind: "walk"; data: Walk };

export default function Journal() {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state, set, markMed } = useStore();
  const [justTook, setJustTook] = useState<string | null>(null);
  const toU = (v: number) => (state.unit === "mg" ? String(Math.round(v)) : (v / 18).toFixed(1));
  const unitLbl = state.unit === "mg" ? "mg/dL" : "mmol/L";
  const cls = (v: number, ctx: string) => (v < 70 ? "low" : (ctx === "fasting" && v > 130) || v > 180 ? "high" : "ok");
  const col = { low: t.bad, ok: t.ok, high: t.warn } as const;

  const last7 = state.glucose.filter((g) => g.t > Date.now() - 7 * 864e5);
  const avg = last7.length ? last7.reduce((a, g) => a + g.v, 0) / last7.length : null;
  const inr = last7.length ? Math.round((100 * last7.filter((g) => cls(g.v, g.ctx) === "ok").length) / last7.length) : null;
  const lastG = state.glucose[state.glucose.length - 1];

  const items: Item[] = [
    ...state.glucose.map((g) => ({ t: g.t, kind: "glu" as const, data: g })),
    ...state.meals.map((m) => ({ t: m.t, kind: "meal" as const, data: m })),
    ...state.medLog.map((l) => ({ t: l.t, kind: "med" as const, data: l })),
    ...(state.walks ?? []).map((w) => ({ t: w.t, kind: "walk" as const, data: w })),
  ].sort((a, b) => b.t - a.t).slice(0, 100);
  const days = new Map<string, Item[]>();
  items.forEach((it) => { const d = dayKey(it.t); if (!days.has(d)) days.set(d, []); days.get(d)!.push(it); });
  const today = dayKey(Date.now());
  const dueMeds = state.meds.flatMap((m) => m.times.map((time) => ({ m, time, done: state.medLog.some((l) => l.medId === m.id && l.time === time && l.day === today) })));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}>
        <Title>{s.journal_title}</Title>
        <Button title={s.glu_add} icon="💧" size="xl" onPress={() => router.push("/glucose/new")} />

        {state.glucose.length > 0 && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Stat v={avg != null ? toU(avg) : "–"} l={s.avg7} />
            <Stat v={inr != null ? `${inr}%` : "–"} l={s.inrange} />
            <Stat v={lastG ? toU(lastG.v) : "–"} l={s.last} color={lastG ? col[cls(lastG.v, lastG.ctx)] : undefined} />
          </View>
        )}

        {(state.glucose.length > 0 || state.meals.length > 0) && <DaysCalendar />}

        {dueMeds.length > 0 && (
          <Card>
            <Label>{s.meds} · {s.today.toLowerCase()}</Label>
            {dueMeds.map(({ m, time, done }) => (
              <View key={m.id + time} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ flex: 1, color: t.ink, fontSize: 18 * k }}>{m.name} <Text style={{ color: t.muted }}>{time}</Text></Text>
                {done ? <Text style={{ color: t.ok, fontWeight: "700", fontSize: 16 * k }}>✓ {s.med_taken}</Text>
                  : <Button title={s.med_take} size="sm" onPress={() => { markMed(m.id, time); setJustTook(m.id + time); }} />}
              </View>
            ))}
            {justTook && <Quip k="med_taken" seed={justTook} style={{ textAlign: "left" }} />}
          </Card>
        )}

        {days.size === 0 && <View style={{ gap: 6 }}><Hint>{s.no_entries}</Hint><Quip k="empty" style={{ textAlign: "left" }} /></View>}
        {[...days.entries()].map(([d, list]) => (
          <Card key={d}>
            <Label>{d === today ? s.today : new Date(list[0].t).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</Label>
            {list.map((it) => {
              const time = new Date(it.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              if (it.kind === "glu") { const g = it.data; const c = cls(g.v, g.ctx); return (
                <View key={g.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}>
                  <Text style={{ fontSize: 26 * k, fontWeight: "800", color: col[c], width: 76, fontVariant: ["tabular-nums"] }}>{toU(g.v)}</Text>
                  <View style={{ flex: 1 }}><Text style={{ color: t.ink, fontSize: 16 * k }}>{s.ctx[g.ctx]}{g.note ? ` · ${g.note}` : ""}</Text><Text style={{ color: t.muted, fontSize: 14 * k }}>{c === "ok" ? s.g_ok : c === "low" ? s.g_low : s.g_high} · {unitLbl}</Text></View>
                  <Text style={{ color: t.muted, fontSize: 14 * k }}>{time}</Text>
                </View>); }
              if (it.kind === "meal") { const m = it.data; return (
                <Pressable key={m.id} disabled={!m.photoUri} onPress={() => router.push({ pathname: "/meal/[id]", params: { id: m.id } })} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}>
                  {m.photoUri ? <Image source={{ uri: m.photoUri }} style={{ width: 56, height: 56, borderRadius: 10 }} /> : <View style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 24 }}>▥</Text></View>}
                  <View style={{ flex: 1 }}><Text style={{ color: t.ink, fontSize: 16 * k }} numberOfLines={2}>{m.name ?? s.meal}</Text><Text style={{ color: t.muted, fontSize: 14 * k }}>{s[`meal_${m.slot}` as `meal_${MealEntry["slot"]}`]}</Text></View>
                  {m.level && <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: levelColor(t, m.level).fg }} />}
                  <Text style={{ color: t.muted, fontSize: 14 * k }}>{time}</Text>
                </Pressable>); }
              if (it.kind === "walk") { const w = it.data; return (
                <View key={w.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}>
                  <Text style={{ fontSize: 22 }}>🚶</Text>
                  <Text style={{ flex: 1, color: t.ink, fontSize: 16 * k }}>{s.walk_entry(w.min)}</Text>
                  <Text style={{ color: t.muted, fontSize: 14 * k }}>{time}</Text>
                </View>); }
              const l = it.data; const med = state.meds.find((m) => m.id === l.medId);
              return (
                <View key={l.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}>
                  <Text style={{ fontSize: 22 }}>💊</Text>
                  <Text style={{ flex: 1, color: t.ink, fontSize: 16 * k }}>{med?.name ?? s.meds} · {s.med_taken}</Text>
                  <Text style={{ color: t.muted, fontSize: 14 * k }}>{time}</Text>
                </View>);
            })}
          </Card>
        ))}
        {state.glucose.length > 0 && (
          <Pressable onPress={() => set({ glucose: state.glucose.slice(0, -1) })} accessibilityRole="button"><Hint style={{ textAlign: "center", textDecorationLine: "underline" }}>{s.delete}: {s.last}</Hint></Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
function Stat({ v, l, color }: { v: string; l: string; color?: string }) {
  const t = useTheme(); const k = useScale();
  return (
    <View style={{ flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 14, padding: 12 }}>
      <Text style={{ fontSize: 26 * k, fontWeight: "800", color: color ?? t.ink, fontVariant: ["tabular-nums"] }}>{v}</Text>
      <Text style={{ fontSize: 13 * k, color: t.muted }}>{l}</Text>
    </View>
  );
}
