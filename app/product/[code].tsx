import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import { say } from "../../src/speech";
import { fetchProduct, NotFound } from "../../src/api/off";
import { analyze, giLevel, glLevel } from "../../src/engine/verdict";
import type { Product, Verdict } from "../../src/engine/types";
import { slotForHour, useStore } from "../../src/store";
import { speechLocale } from "../../src/i18n";
import { levelColor, useTheme } from "../../src/theme";
import { Button, Card, Hint, Label, useScale } from "../../src/ui/Primitives";
import { AfterMeal } from "../../src/ui/AfterMeal";
import { Quip } from "../../src/ui/Quip";
import { VerdictBadge } from "../../src/ui/VerdictBadge";
import { findPartner, partnerAsProduct, pastaAlternative, productUrl } from "../../src/partner";
import { Linking } from "react-native";

const n = (x: number) => x.toLocaleString(undefined, { maximumFractionDigits: 1 });

export default function ProductScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const t = useTheme(); const k = useScale();
  const router = useRouter();
  const { t: s, s: state, recordScan, addMeal } = useStore();
  const [p, setP] = useState<Product | null>(state.cache[code] ?? null);
  const [err, setErr] = useState<"notfound" | "network" | null>(null);
  const [v, setV] = useState<Verdict | null>(p ? analyze(p) : null);
  const [ate, setAte] = useState(false);

  useEffect(() => {
    let alive = true;
    if (p?.source === "user") { recordScan(p, analyze(p)); return; }
    const partner = findPartner(code);
    if (partner) { const prod = partnerAsProduct(partner, code); const verdict = analyze(prod); setP(prod); setV(verdict); recordScan(prod, verdict); return; }
    (async () => {
      try {
        const prod = await fetchProduct(code, state.lang);
        if (!alive) return;
        const verdict = analyze(prod);
        setP(prod); setV(verdict); setErr(null); recordScan(prod, verdict);
      } catch (e) {
        if (!alive) return;
        if (p) return;
        setErr(e instanceof NotFound ? "notfound" : "network");
      }
    })();
    return () => { alive = false; Speech.stop(); };
  }, [code]);

  if (err || (p && p.incomplete)) return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Stack.Screen options={{ title: code }} />
      <Card><Text style={{ color: t.ink, fontWeight: "800", fontSize: 20 * k }}>{err === "network" ? s.network : err === "notfound" ? s.not_found : s.incomplete}</Text>
        {p?.incomplete && <Text style={{ color: t.ink, fontSize: 17 * k }}>{p.name}</Text>}
        <Hint>{err === "network" ? "" : err === "notfound" ? s.not_found_help : s.incomplete_help}</Hint>
        {err !== "network" && <Button title={s.add_product} onPress={() => router.replace({ pathname: "/product/add", params: { code, name: p?.name ?? "", brand: p?.brand ?? "" } })} />}
        <Button title={s.scan_again} kind="soft" onPress={() => router.replace("/scan")} />
        <Button title={s.back} onPress={() => router.back()} kind="ghost" /></Card>
    </View>
  );
  if (!p || !v) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}><ActivityIndicator color={t.accent} size="large" /><Hint>{s.loading}</Hint><Quip k="loading" seed={code} /></View>;

  const c = levelColor(t, v.level);
  const label = v.level === "green" ? s.good : v.level === "yellow" ? s.mod : s.avoid;
  const glyph = v.level === "green" ? "✓" : v.level === "yellow" ? "!" : "✕";
  const claimText = p.claims.map((x) => s.claim[x] ?? x).join(", ");
  const summary = v.labelTrap ? s.trap(claimText) : s.summary[v.level];
  const reasons = v.reasons.map((r) => s.reason[r]?.(v) ?? r);
  const speak = () => { Speech.stop(); say(`${label}. ${p.name}. ${summary} ${reasons.slice(0, 2).join(" ")}`, state.lang); };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ title: p.brand ?? "" }} />
      <View style={[st.hero, { backgroundColor: c.bg }]}>
        <VerdictBadge level={v.level} />
        <Text style={{ color: c.fg, fontWeight: "800", fontSize: 34 * k, textAlign: "center" }}>{label}</Text>
        <Text style={{ color: t.ink, fontWeight: "600", fontSize: 19 * k, textAlign: "center" }}>{p.name}</Text>
        <Text style={{ color: t.ink, fontSize: 18 * k, textAlign: "center", lineHeight: 26 * k }}>{summary}</Text>
        <Quip k={v.level} seed={p.code} />
        <Pressable onPress={speak} style={[st.speak, { backgroundColor: t.surface, borderColor: c.fg }]} accessibilityRole="button" accessibilityLabel={s.speak}>
          <Text style={{ fontSize: 22 }}>🔊</Text><Text style={{ color: t.ink, fontWeight: "700", fontSize: 16 * k }}>{s.speak}</Text>
        </Pressable>
      </View>

      <View style={{ padding: 16, gap: 12 }}>
        <Button title={ate ? "✓ " + s.ate_this : s.ate_this} kind="soft" size="xl" disabled={ate} onPress={() => { addMeal({ code: p.code, name: p.name, level: v.level, slot: slotForHour(new Date().getHours()) }); setAte(true); }} />
        {ate && v.level !== "green" && <AfterMeal level={v.level} walkMinutes={v.walkMinutes} />}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><Button title={s.log_after} kind="ghost" onPress={() => router.push({ pathname: "/glucose/new", params: { after: p.name } })} /></View>
          <View style={{ flex: 1 }}><Button title={s.scan_again} kind="ghost" onPress={() => router.replace("/scan")} /></View>
        </View>

        {(() => { const alt = v.level !== "green" ? pastaAlternative(p.categories, p.name) : undefined; const mine = findPartner(p.code, p.name, p.brand);
          if (mine) return (
            <Card style={{ borderColor: t.accent, borderWidth: 2 }}>
              <Text style={{ color: t.ink, fontSize: 18 * k, fontWeight: "800" }}>🇮🇹 {s.partner_mine}</Text>
              <Text style={{ color: t.ink, fontSize: 16 * k, lineHeight: 23 * k }}>{s.partner_gi(mine.gi)}</Text>
              <Button title={`${s.partner_order} · ${mine.price.toFixed(2).replace(".", ",")} lei`} onPress={() => Linking.openURL(productUrl(mine))} />
            </Card>);
          if (alt) return (
            <Card style={{ borderColor: t.ok, borderWidth: 2 }}>
              <Text style={{ color: t.ink, fontSize: 18 * k, fontWeight: "800" }}>✅ {s.partner_alt_title}</Text>
              <Text style={{ color: t.ink, fontSize: 16 * k, lineHeight: 23 * k }}>{alt.name}. {s.partner_gi(alt.gi)} {s.partner_alt_text}</Text>
              <Button title={`${s.partner_order} · ${alt.price.toFixed(2).replace(".", ",")} lei`} onPress={() => Linking.openURL(productUrl(alt))} />
            </Card>);
          return null; })()}
        {v.level === "red"
          ? <Button title={"🥗 " + s.ideas_lighter} kind="soft" onPress={() => router.push({ pathname: "/ideas", params: { focus: p.name, lighter: "1" } })} />
          : <Button title={"🍲 " + s.ideas_product} kind="soft" onPress={() => router.push({ pathname: "/ideas", params: { focus: p.name } })} />}
        {(
          <Card>
            <View>{reasons.map((r, i) => <Text key={i} style={{ color: t.ink, fontSize: 17 * k, lineHeight: 25 * k }}>• {r}</Text>)}</View>

            {p.gi != null && (
              <View><Label>{s.impact}</Label>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Box title={s.gi} value={String(p.gi)} tag={s[giLevel(p.gi)]} color={lv(t, giLevel(p.gi))} />
                  <Box title={s.gl} value={String(v.gl)} tag={s[`${glLevel(v.gl!)}_f` as const]} color={lv(t, glLevel(v.gl!))} />
                </View>
                <Hint style={{ marginTop: 8 }}>{s.gi_note}</Hint>
              </View>
            )}
            {v.hiddenSugars.length > 0 && (
              <View><Label>{s.hidden}</Label>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {v.hiddenSugars.map((h) => <Text key={h} style={{ backgroundColor: t.warnBg, borderColor: t.warn, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, fontSize: 15 * k, fontWeight: "600", color: t.ink }}>{s.hid[h] ?? h}</Text>)}
                </View>
              </View>
            )}
            {v.walkMinutes > 0 && (
              <View style={{ backgroundColor: t.okBg, borderRadius: 12, padding: 12 }}>
                <Text style={{ color: t.ink, fontSize: 16 * k, lineHeight: 23 * k }}><Text style={{ fontWeight: "700" }}>{s.walk}: </Text>{s.walk_text(v.walkMinutes)}</Text>
              </View>
            )}
            <View><Label>{s.nut}</Label>
              <Hint style={{ marginBottom: 6 }}>{s.serving} {v.serving} {p.unit}{v.servingAssumed ? ` (${s.serving_assumed})` : ""}{p.source === "user" ? ` · ${s.added_by_you}` : ""}</Hint>
              <View style={{ borderWidth: 2, borderColor: t.ink, borderRadius: 8, padding: 8 }}>
                <Row t={t} k={k} a="" b={`100 ${p.unit}`} c={s.serving} head />
                <Row t={t} k={k} a={s.carbs} b={`${n(p.carbs100)} g`} c={`${n(v.carbs)} g`} />
                <Row t={t} k={k} a={`  ${s.sugars}`} b={`${n(p.sugars100)} g`} c={`${n(v.sugars)} g`} muted />
                <Row t={t} k={k} a={s.fiber} b={`${n(p.fiber100)} g`} c={`${n(v.fiber)} g`} last />
              </View>
            </View>
            {p.imageUrl && <Image source={{ uri: p.imageUrl }} style={{ width: 90, height: 90, borderRadius: 10, alignSelf: "center" }} />}
            <Hint>{p.code}</Hint>
          </Card>
        )}
        <Hint>{s.disclaimer}</Hint>
      </View>
    </ScrollView>
  );
}

const lv = (t: ReturnType<typeof useTheme>, l: "low" | "mid" | "high") => (l === "low" ? t.ok : l === "mid" ? t.warn : t.bad);
function Box({ title, value, tag, color }: { title: string; value: string; tag: string; color: string }) {
  const t = useTheme(); const k = useScale();
  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 10 }}>
      <Text style={{ fontSize: 14 * k, color: t.muted }}>{title}</Text>
      <Text style={{ fontSize: 30 * k, fontWeight: "800", color: t.ink, fontVariant: ["tabular-nums"] }}>{value}</Text>
      <Text style={{ fontSize: 15 * k, fontWeight: "700", color }}>{tag}</Text>
    </View>
  );
}
function Row({ t, k, a, b, c, head, muted, last }: { t: ReturnType<typeof useTheme>; k: number; a: string; b: string; c: string; head?: boolean; muted?: boolean; last?: boolean }) {
  const col = muted ? t.muted : t.ink;
  return (
    <View style={{ flexDirection: "row", paddingVertical: 6, borderBottomWidth: last ? 0 : 1, borderBottomColor: t.line }}>
      <Text style={{ flex: 1, color: col, fontSize: 16 * k, fontWeight: head ? "700" : "400" }}>{a}</Text>
      <Text style={{ width: 76, textAlign: "right", color: col, fontSize: 16 * k, fontWeight: head ? "700" : "400", fontVariant: ["tabular-nums"] }}>{b}</Text>
      <Text style={{ width: 76, textAlign: "right", color: t.ink, fontSize: 16 * k, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{c}</Text>
    </View>
  );
}
const st = StyleSheet.create({
  hero: { alignItems: "center", gap: 10, padding: 24, paddingTop: 28 },
  dot: { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  speak: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 2, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10, marginTop: 4 },
});
