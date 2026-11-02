import { useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, View, type ScrollViewInstance } from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "../src/store";
import { useTheme } from "../src/theme";
import { Icon, type IconName } from "../src/ui/Icon";
import { Button, useScale } from "../src/ui/Primitives";

/**
 * Întâmpinarea de la prima deschidere: 4 ecrane, câte o idee, text mare, o imagine.
 * Nu e tutorial: nu explică butoane, spune doar la ce folosește aplicația și cum ajută.
 */
export default function Welcome() {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, set } = useStore();
  const [i, setI] = useState(0);
  const sv = useRef<ScrollViewInstance>(null);
  const W = Dimensions.get("window").width;
  const done = () => { set({ welcomed: true }); router.replace("/"); };
  const go = (n: number) => { setI(n); sv.current?.scrollTo({ x: n * W, animated: true }); };

  const pages: { title: string; text: string; art: React.ReactNode }[] = [
    { title: s.w1_title, text: s.w1_text, art: <Big t={t} icon="care" color={t.accent} /> },
    { title: s.w2_title, text: s.w2_text, art: (
      <View style={{ alignItems: "center", gap: 18 }}>
        <Big t={t} icon="barcode" color={t.accent} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          {([[t.ok, s.w2_g, "✓"], [t.warn, s.w2_y, "!"], [t.bad, s.w2_r, "✕"]] as const).map(([c, l, g]) => (
            <View key={l} style={{ alignItems: "center", gap: 6, width: 96 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#fff", fontSize: 28, fontWeight: "800" }}>{g}</Text></View>
              <Text style={{ color: t.ink, fontWeight: "700", fontSize: 15 * k, textAlign: "center" }}>{l}</Text>
            </View>
          ))}
        </View>
      </View>) },
    { title: s.w3_title, text: s.w3_text, art: <Big t={t} icon="plate" color={t.accent} /> },
    { title: s.w4_title, text: s.w4_text, art: (
      <View style={{ flexDirection: "row", gap: 14 }}>
        {(["drop", "pill", "family", "report"] as IconName[]).map((n, j) => (
          <View key={n} style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: [t.badBg, t.warnBg, t.accentSoft, t.okBg][j], alignItems: "center", justifyContent: "center" }}>
            <Icon name={n} size={34} color={[t.bad, t.warn, t.accent, t.ok][j]} strokeWidth={2.2} />
          </View>
        ))}
      </View>) },
  ];
  const last = i === pages.length - 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 16, paddingTop: 8 }}>
        {!last && <Pressable onPress={done} hitSlop={12} accessibilityRole="button"><Text style={{ color: t.muted, fontSize: 16 * k, fontWeight: "600" }}>{s.w_skip}</Text></Pressable>}
      </View>
      <ScrollView ref={sv} horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEnabled={false} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        {pages.map((p, j) => (
          <View key={j} style={{ width: W, height: "100%", paddingHorizontal: 28, paddingBottom: 40, alignItems: "center", justifyContent: "center", gap: 26 }}>
            {p.art}
            <Text style={{ color: t.ink, fontSize: 32 * k, fontWeight: "800", textAlign: "center", letterSpacing: -0.5 }}>{p.title}</Text>
            <Text style={{ color: t.ink, fontSize: 20 * k, lineHeight: 30 * k, textAlign: "center" }}>{p.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={{ padding: 20, gap: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
          {pages.map((_, j) => <View key={j} style={{ width: j === i ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: j === i ? t.accent : t.line }} />)}
        </View>
        <Button title={last ? s.w_start : s.w_next} size="xl" onPress={() => (last ? done() : go(i + 1))} />
      </View>
    </SafeAreaView>
  );
}
function Big({ t, icon, color }: { t: ReturnType<typeof useTheme>; icon: IconName; color: string }) {
  return (
    <View style={{ width: 140, height: 140, borderRadius: 44, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={76} color={color} strokeWidth={1.8} />
    </View>
  );
}
