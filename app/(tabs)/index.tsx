import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { dayKey, useStore } from "../../src/store";
import { levelColor, useTheme, type Theme } from "../../src/theme";
import { Icon, type IconName } from "../../src/ui/Icon";
import { Button, Card, Hint, Label, useScale } from "../../src/ui/Primitives";
import { Quip } from "../../src/ui/Quip";
import { MoveCheckin, WeightCheckin } from "../../src/ui/Checkins";

/**
 * Prima pagină: patru butoane mari, un cuvânt fiecare, fără explicații.
 * Scanează și Poză la masă sunt cele mari (se folosesc de mai multe ori pe zi); Glicemia și Medicamente dedesubt.
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
  const dueNow = state.meds.flatMap((m) => m.times.map((time) => ({ m, time, done: state.medLog.some((l) => l.medId === m.id && l.time === time && l.day === today) })))
    .filter((x) => !x.done && x.time <= nowHM).sort((a, b) => a.time.localeCompare(b.time));
  const open = (c: string) => router.push({ pathname: "/product/[code]", params: { code: c } });
  const hasDay = todayMeals.length > 0 || todayGlu.length > 0;
  const fresh = state.history.length === 0 && state.meals.length === 0 && state.glucose.length === 0;
  useEffect(() => { if (!state.welcomed) router.replace("/welcome"); }, [state.welcomed]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={st.wrap}>
        <Image source={require("../../assets/logo-wordmark.png")} style={{ width: 150, height: 150 * 153 / 1062, marginBottom: 4 }} resizeMode="contain" accessibilityLabel="Diabetoline" />

        <View style={{ flexDirection: "row", gap: 12 }}>
          <Tile t={t} k={k} icon="barcode" title={s.tile_scan} to="/scan" bg={t.accent} fg={t.accentInk} big />
          <Tile t={t} k={k} icon="plate" title={s.tile_plate} to="/plate" bg={t.accent} fg={t.accentInk} big />
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Tile t={t} k={k} icon="drop" title={s.tile_glu} to="/glucose/new" bg={t.surface} fg={t.ink} tint={t.brandRed} />
          <Tile t={t} k={k} icon="pill" title={s.tile_meds} to="/meds" bg={t.surface} fg={t.ink} tint={t.warn} badge={dueNow.length || undefined} />
        </View>

        {dueNow.length > 0 && (
          <Card style={{ borderColor: t.warn, borderWidth: 2 }}>
            <Label>{s.med_due_now}</Label>
            {dueNow.map(({ m, time }) => (
              <View key={m.id + time} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Icon name="pill" size={26} color={t.warn} />
                <Text style={{ flex: 1, color: t.ink, fontSize: 18 * k, fontWeight: "700" }}>{m.name} <Text style={{ color: t.muted, fontWeight: "400" }}>{time}</Text></Text>
                <Button title={s.med_take} size="sm" onPress={() => { markMed(m.id, time); setJustTook(m.id + time); }} />
              </View>
            ))}
            {justTook && <Quip k="med_taken" seed={justTook} style={{ textAlign: "left" }} />}
          </Card>
        )}

        {!fresh && <MoveCheckin />}
        {!fresh && <WeightCheckin />}

        {hasDay && (
          <Card>
            <Label>{s.your_day}</Label>
            <View style={{ gap: 8 }}>
              {todayGlu.slice(-3).map((g) => <Row key={g.id} t={t} k={k} icon="drop" tint={t.brandRed} text={`${state.unit === "mg" ? Math.round(g.v) : (g.v / 18).toFixed(1)} ${state.unit === "mg" ? "mg/dL" : "mmol/L"} · ${s.ctx[g.ctx]}`} time={g.t} />)}
              {todayMeals.slice(-3).map((m) => <Row key={m.id} t={t} k={k} icon={m.photoUri ? "plate" : "barcode"} tint={t.accent} text={m.name ?? s[`meal_${m.slot}` as `meal_${typeof m.slot}`]} time={m.t} level={m.level} />)}
            </View>
          </Card>
        )}

        {state.history.length > 0 && (
          <Card>
            <Label>{s.last_scans}</Label>
            {state.history.slice(0, 4).map((h) => (
              <Pressable key={h.code} onPress={() => open(h.code)} style={st.row} accessibilityRole="button">
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: levelColor(t, h.level).fg }} />
                <Text style={{ flex: 1, color: t.ink, fontSize: 17 * k }} numberOfLines={1}>{h.name}</Text>
                <Text style={{ color: t.muted, fontSize: 20 }}>›</Text>
              </Pressable>
            ))}
          </Card>
        )}

        {fresh && (
          <Card style={{ borderColor: t.accent, borderWidth: 2, gap: 10 }}>
            <Text style={{ color: t.ink, fontSize: 20 * k, fontWeight: "800" }}>👉 {s.first_title}</Text>
            <Text style={{ color: t.ink, fontSize: 17 * k, lineHeight: 25 * k }}>{s.first_text}</Text>
            <Button title={s.first_btn} size="xl" onPress={() => router.push("/scan")} />
            <Pressable onPress={() => router.push("/welcome")} accessibilityRole="button"><Hint style={{ textAlign: "center", textDecorationLine: "underline" }}>{s.first_again}</Hint></Pressable>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({ t, k, icon, title, to, bg, fg, tint, big, badge }: { t: Theme; k: number; icon: IconName; title: string; to: Href; bg: string; fg: string; tint?: string; big?: boolean; badge?: number }) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push(to)} accessibilityRole="button" accessibilityLabel={title}
      style={({ pressed }) => [st.tile, { backgroundColor: bg, borderColor: big ? bg : t.line, minHeight: big ? 176 : 140, opacity: pressed ? 0.85 : 1 }]}>
      <View style={[st.iconWrap, { backgroundColor: big ? "rgba(255,255,255,0.18)" : (tint ?? t.accent) + "1F" }]}>
        <Icon name={icon} size={big ? 34 : 30} color={big ? fg : tint ?? t.accent} strokeWidth={2.2} />
      </View>
      <Text style={{ color: fg, fontSize: (big ? 20 : 19) * k, lineHeight: (big ? 26 : 24) * k, fontWeight: "800", letterSpacing: -0.2 }}>{title}</Text>
      {badge ? <View style={[st.badge, { backgroundColor: t.warn }]}><Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>{badge}</Text></View> : null}
    </Pressable>
  );
}

function Row({ t, k, icon, tint, text, time, level }: { t: Theme; k: number; icon: IconName; tint: string; text: string; time: number; level?: "green" | "yellow" | "red" }) {
  return (
    <View style={st.row}>
      <Icon name={icon} size={22} color={tint} />
      <Text style={{ flex: 1, color: t.ink, fontSize: 17 * k }} numberOfLines={1}>{text}</Text>
      {level && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: levelColor(t, level).fg }} />}
      <Text style={{ color: t.muted, fontSize: 14 * k }}>{new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 12 },
  tile: { flex: 1, borderWidth: 1, borderRadius: 22, padding: 16, justifyContent: "space-between", gap: 14 },
  iconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: 12, right: 12, minWidth: 26, height: 26, borderRadius: 13, paddingHorizontal: 7, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
});
