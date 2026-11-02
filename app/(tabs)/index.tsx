import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { dayKey, useStore } from "../../src/store";
import { levelColor, useTheme, type Theme } from "../../src/theme";
import { Button, Card, Hint, Label, useScale } from "../../src/ui/Primitives";
import { Quip } from "../../src/ui/Quip";

/**
 * Prima pagină: aplicația explicată prin situațiile din zi.
 * Fiecare card = un loc/moment („Unde ești acum?”) + ce face aplicația acolo, într-o propoziție.
 */
export default function Home() {
  const t = useTheme(); const k = useScale();
  const { t: s, s: state, markMed } = useStore();
  const router = useRouter();
  const today = dayKey(Date.now());
  const todayMeals = state.meals.filter((m) => dayKey(m.t) === today);
  const todayGlu = state.glucose.filter((g) => dayKey(g.t) === today);
  const [justTook, setJustTook] = useState<string | null>(null);
  const nowHM = new Date().toTimeString().slice(0, 5);
  const dueMeds = state.meds.flatMap((m) => m.times.map((time) => ({ m, time, done: state.medLog.some((l) => l.medId === m.id && l.time === time && l.day === today) })))
    .filter((x) => !x.done).sort((a, b) => a.time.localeCompare(b.time));
  const dueNow = dueMeds.filter((x) => x.time <= nowHM);
  const next = dueMeds.find((x) => x.time > nowHM);
  const open = (c: string) => router.push({ pathname: "/product/[code]", params: { code: c } });

  const situations: { icon: string; title: string; sub: string; to: Href; tint: string; main?: boolean }[] = [
    { icon: "🛒", title: s.sit_shop, sub: s.sit_shop_sub, to: "/scan", tint: t.accent, main: true },
    { icon: "🍽️", title: s.sit_meal, sub: s.sit_meal_sub, to: "/plate", tint: t.ok },
    { icon: "🩸", title: s.sit_glu, sub: s.sit_glu_sub, to: "/glucose/new", tint: t.bad },
    { icon: "💊", title: s.sit_meds, sub: s.sit_meds_sub, to: "/meds", tint: t.warn },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={st.wrap}>
        <Image source={require("../../assets/logo-wordmark.png")} style={{ width: 170, height: 170 * 153 / 1062 }} resizeMode="contain" accessibilityLabel="Diabetoline" />

        <Text style={{ color: t.ink, fontSize: 24 * k, fontWeight: "800", letterSpacing: -0.3, marginTop: 4 }}>{s.home_ask}</Text>

        {situations.map((x) => (
          <Situation key={x.title} t={t} k={k} {...x} onPress={() => router.push(x.to)} />
        ))}

        {(dueNow.length > 0 || next) && (
          <Card style={dueNow.length > 0 ? { borderColor: t.warn, borderWidth: 2 } : undefined}>
            <Label>{s.meds} · {s.today.toLowerCase()}</Label>
            {dueNow.map(({ m, time }) => (
              <View key={m.id + time} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ fontSize: 24 }}>💊</Text>
                <Text style={{ flex: 1, color: t.ink, fontSize: 18 * k, fontWeight: "700" }}>{m.name} <Text style={{ color: t.muted, fontWeight: "400" }}>{time}</Text></Text>
                <Button title={s.med_take} size="sm" onPress={() => { markMed(m.id, time); setJustTook(m.id + time); }} />
              </View>
            ))}
            {dueNow.length === 0 && next && <Hint>{s.med_next(next.m.name, next.time)}</Hint>}
            {justTook && <Quip k="med_taken" seed={justTook} style={{ textAlign: "left" }} />}
          </Card>
        )}

        <Card>
          <Label>{s.your_day}</Label>
          {todayMeals.length === 0 && todayGlu.length === 0 ? <View style={{ gap: 6 }}><Hint>{s.nothing_today}</Hint><Quip k="empty" seed={today} style={{ textAlign: "left" }} /></View> : (
            <View style={{ gap: 8 }}>
              {todayGlu.slice(-3).map((g) => <Row key={g.id} t={t} k={k} left="🩸" text={`${state.unit === "mg" ? Math.round(g.v) : (g.v / 18).toFixed(1)} ${state.unit === "mg" ? "mg/dL" : "mmol/L"} · ${s.ctx[g.ctx]}`} time={g.t} />)}
              {todayMeals.slice(-3).map((m) => <Row key={m.id} t={t} k={k} left={m.photoUri ? "🍽️" : "🛒"} text={m.name ?? s[`meal_${m.slot}` as `meal_${typeof m.slot}`]} time={m.t} level={m.level} />)}
            </View>
          )}
        </Card>

        {state.history.length > 0 && (
          <Card>
            <Label>{s.last_scans}</Label>
            {state.history.slice(0, 5).map((h) => (
              <Pressable key={h.code} onPress={() => open(h.code)} style={st.row} accessibilityRole="button">
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: levelColor(t, h.level).fg }} />
                <Text style={{ flex: 1, color: t.ink, fontSize: 17 * k }} numberOfLines={1}>{h.name}</Text>
              </Pressable>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Situation({ t, k, icon, title, sub, tint, main, onPress }: { t: Theme; k: number; icon: string; title: string; sub: string; tint: string; main?: boolean; onPress: () => void }) {
  const fg = main ? t.accentInk : t.ink;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`}
      style={({ pressed }) => [st.sit, { backgroundColor: main ? t.accent : t.surface, borderColor: main ? t.accent : t.line, opacity: pressed ? 0.85 : 1 }]}>
      <View style={[st.icon, { backgroundColor: main ? "rgba(255,255,255,0.18)" : tint + "22" }]}>
        <Text style={{ fontSize: 32 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: fg, fontSize: 22 * k, fontWeight: "800" }}>{title}</Text>
        <Text style={{ color: fg, opacity: main ? 0.92 : 0.75, fontSize: 16 * k, lineHeight: 22 * k }}>{sub}</Text>
      </View>
      <Text style={{ color: fg, fontSize: 28, opacity: 0.6 }}>›</Text>
    </Pressable>
  );
}

function Row({ t, k, left, text, time, level }: { t: Theme; k: number; left: string; text: string; time: number; level?: "green" | "yellow" | "red" }) {
  return (
    <View style={st.row}>
      <Text style={{ fontSize: 18 }}>{left}</Text>
      <Text style={{ flex: 1, color: t.ink, fontSize: 17 * k }} numberOfLines={1}>{text}</Text>
      {level && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: levelColor(t, level).fg }} />}
      <Text style={{ color: t.muted, fontSize: 14 * k }}>{new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 12 },
  sit: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 20, padding: 16, minHeight: 96 },
  icon: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
});
