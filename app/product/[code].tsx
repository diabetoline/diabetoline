import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { fetchProduct, NotFound } from "../../src/api/off";
import { analyze, giLevel, glLevel } from "../../src/engine/verdict";
import type { Product, Verdict } from "../../src/engine/types";
import { useStore } from "../../src/store";
import { levelColor, useTheme } from "../../src/theme";
import { Button, Card, Hint, Label } from "../../src/ui/Primitives";

const n = (x: number) => x.toLocaleString(undefined, { maximumFractionDigits: 1 });

export default function ProductScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const t = useTheme();
  const router = useRouter();
  const { t: s, s: state, recordScan, addToCart } = useStore();
  const [p, setP] = useState<Product | null>(state.cache[code] ?? null);
  const [err, setErr] = useState<"notfound" | "network" | null>(null);
  const [v, setV] = useState<Verdict | null>(p ? analyze(p) : null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const prod = await fetchProduct(code, state.lang);
        if (!alive) return;
        const verdict = analyze(prod);
        setP(prod); setV(verdict); setErr(null); recordScan(prod, verdict);
      } catch (e) {
        if (!alive) return;
        if (p) return; // keep cached copy when offline
        setErr(e instanceof NotFound ? "notfound" : "network");
      }
    })();
    return () => { alive = false; };
  }, [code]);

  if (err) return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Stack.Screen options={{ title: code }} />
      <Card><Text style={{ color: t.ink, fontWeight: "700", fontSize: 17 }}>{err === "notfound" ? s.not_found : s.network}</Text>
        {err === "notfound" && <Hint>{s.not_found_help}</Hint>}
        <Button title={s.tab_scan} onPress={() => router.back()} kind="soft" /></Card>
    </View>
  );
  if (!p || !v) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}><ActivityIndicator color={t.accent} /><Hint>{s.loading}</Hint></View>;

  const c = levelColor(t, v.level);
  const label = v.level === "green" ? s.good : v.level === "yellow" ? s.mod : s.avoid;
  const glyph = v.level === "green" ? "✓" : v.level === "yellow" ? "!" : "✕";
  const inCart = state.cart.some((x) => x.code === p.code && !x.done);
  const claimText = p.claims.map((k) => s.claim[k] ?? k).join(", ");

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: p.brand ?? "" }} />
      <View style={{ borderRadius: 18, overflow: "hidden", backgroundColor: t.surface, borderColor: t.line, borderWidth: 1 }}>
        <View style={[st.verdict, { backgroundColor: c.bg }]}>
          <View style={[st.dot, { backgroundColor: c.fg }]}><Text style={{ color: t.surface, fontWeight: "800", fontSize: 26 }}>{glyph}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.fg, fontWeight: "800", fontSize: 22 }}>{label}</Text>
            <Text style={{ color: t.ink, fontWeight: "600" }}>{p.name}</Text>
            <Text style={{ color: t.muted, fontSize: 12 }}>{p.code} · {s.serving} {v.serving} {p.unit}{v.servingAssumed ? ` (${s.serving_assumed})` : ""}</Text>
          </View>
          {p.imageUrl && <Image source={{ uri: p.imageUrl }} style={{ width: 56, height: 56, borderRadius: 8 }} />}
        </View>
        <View style={{ padding: 16, gap: 16 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Button title={inCart ? s.in_cart : s.to_cart} disabled={inCart} kind="soft" small onPress={() => addToCart({ code: p.code, name: p.name, level: v.level })} /></View>
            <View style={{ flex: 1 }}><Button title={s.log_after} kind="ghost" small onPress={() => router.push({ pathname: "/(tabs)/glucose", params: { after: p.name } })} /></View>
          </View>
          {v.labelTrap && <View style={{ backgroundColor: t.badBg, borderRadius: 10, padding: 10 }}><Text style={{ color: t.ink, fontSize: 14 }}>{s.trap(claimText)}</Text></View>}

          <View><Label>{s.why}</Label>{v.reasons.map((r) => <Text key={r} style={{ color: t.ink, fontSize: 14, lineHeight: 20 }}>• {s.reason[r]?.(v) ?? r}</Text>)}</View>

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
                {v.hiddenSugars.map((h) => <Text key={h} style={{ backgroundColor: t.warnBg, borderColor: t.warn, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, fontSize: 13, fontWeight: "600", color: t.ink }}>{s.hid[h] ?? h}</Text>)}
              </View>
            </View>
          )}

          {v.walkMinutes > 0 && (
            <View style={{ backgroundColor: t.okBg, borderRadius: 10, padding: 10 }}>
              <Text style={{ color: t.ink, fontSize: 14 }}><Text style={{ fontWeight: "700" }}>{s.walk}: </Text>{s.walk_text(v.walkMinutes)}</Text>
            </View>
          )}

          <View><Label>{s.nut}</Label>
            <View style={{ borderWidth: 2, borderColor: t.ink, borderRadius: 6, padding: 8 }}>
              <Row t={t} a="" b={`${s.per100} ${p.unit}`} c={s.serving} head />
              <Row t={t} a={s.carbs} b={`${n(p.carbs100)} g`} c={`${n(v.carbs)} g`} />
              <Row t={t} a={`  ${s.sugars}`} b={`${n(p.sugars100)} g`} c={`${n(v.sugars)} g`} muted />
              <Row t={t} a={s.fiber} b={`${n(p.fiber100)} g`} c={`${n(v.fiber)} g`} last />
            </View>
          </View>
          <Hint>{s.disclaimer}</Hint>
        </View>
      </View>
    </ScrollView>
  );
}

const lv = (t: ReturnType<typeof useTheme>, l: "low" | "mid" | "high") => (l === "low" ? t.ok : l === "mid" ? t.warn : t.bad);
function Box({ title, value, tag, color }: { title: string; value: string; tag: string; color: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 10 }}>
      <Text style={{ fontSize: 12, color: t.muted }}>{title}</Text>
      <Text style={{ fontSize: 26, fontWeight: "800", color: t.ink, fontVariant: ["tabular-nums"] }}>{value}</Text>
      <Text style={{ fontSize: 13, fontWeight: "700", color }}>{tag}</Text>
    </View>
  );
}
function Row({ t, a, b, c, head, muted, last }: { t: ReturnType<typeof useTheme>; a: string; b: string; c: string; head?: boolean; muted?: boolean; last?: boolean }) {
  const col = muted ? t.muted : t.ink;
  return (
    <View style={{ flexDirection: "row", paddingVertical: 5, borderBottomWidth: last ? 0 : 1, borderBottomColor: t.line }}>
      <Text style={{ flex: 1, color: col, fontSize: 14, fontWeight: head ? "700" : "400" }}>{a}</Text>
      <Text style={{ width: 70, textAlign: "right", color: col, fontSize: 14, fontWeight: head ? "700" : "400", fontVariant: ["tabular-nums"] }}>{b}</Text>
      <Text style={{ width: 70, textAlign: "right", color: t.ink, fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{c}</Text>
    </View>
  );
}
const st = StyleSheet.create({
  verdict: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  dot: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
});
