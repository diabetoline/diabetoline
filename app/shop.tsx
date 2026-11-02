import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { PARTNER, PASTA_COLLECTION, SKIN, SKIN_COLLECTION, productUrl } from "../src/partner";
import { useStore } from "../src/store";
import { useTheme } from "../src/theme";
import { Button, Card, Hint, Label, Title, useScale } from "../src/ui/Primitives";

/** Îngrijire: produsele Diabetoline (cosmetice) și FiberPasta (alimente cu IG scăzut), cu link spre magazin. */
export default function Shop() {
  const t = useTheme(); const k = useScale();
  const { t: s, s: state } = useStore();
  const lei = (x: number) => `${x.toFixed(2).replace(".", ",")} lei`;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: s.care }} />
      <Title>{s.care}</Title>

      <Card>
        <Label>{s.skin_title}</Label>
        <Hint>{s.skin_sub}</Hint>
        {SKIN.map((p) => (
          <Pressable key={p.id} onPress={() => Linking.openURL(p.url)} accessibilityRole="button" style={{ borderTopWidth: 1, borderTopColor: t.line, paddingTop: 12, gap: 4 }}>
            <Text style={{ color: t.ink, fontSize: 18 * k, fontWeight: "700" }}>{p.name}</Text>
            <Text style={{ color: t.muted, fontSize: 15 * k, lineHeight: 21 * k }}>{p.desc[state.lang]}</Text>
          </Pressable>
        ))}
        <Button title={s.shop_open} kind="soft" onPress={() => Linking.openURL(SKIN_COLLECTION)} />
      </Card>

      <Card>
        <Label>{s.shop_title}</Label>
        <Hint>{s.shop_sub}</Hint>
        {PARTNER.map((p) => (
          <Pressable key={p.id} onPress={() => Linking.openURL(productUrl(p))} accessibilityRole="button" style={{ borderTopWidth: 1, borderTopColor: t.line, paddingTop: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.ink, fontSize: 17 * k, fontWeight: "700" }}>{p.name}</Text>
              <Text style={{ color: t.muted, fontSize: 14 * k }}>{s.gi_short} {p.gi} · {p.carbs100} g {s.carbs.toLowerCase()} · {p.fiber100} g {s.fiber.toLowerCase()} {s.shop_each}</Text>
            </View>
            <Text style={{ color: t.accent, fontSize: 17 * k, fontWeight: "800" }}>{lei(p.price)}</Text>
          </Pressable>
        ))}
        <Button title={s.shop_open} kind="soft" onPress={() => Linking.openURL(PASTA_COLLECTION)} />
      </Card>
      <Hint>{s.shop_note}</Hint>
    </ScrollView>
  );
}
