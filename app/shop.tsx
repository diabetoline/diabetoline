import { Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import catalog from "../src/catalog.json";
import { PARTNER, SHOP } from "../src/partner";
import { useStore } from "../src/store";
import { useTheme } from "../src/theme";
import { Button, Card, Hint, Label, Title, useScale } from "../src/ui/Primitives";

type Item = { id: string; section: "skin" | "food" | "supp"; name: string; desc: string | null; price: number; url: string; image: string | null; available: boolean };
const ITEMS = catalog as Item[];

/** Îngrijire: produsele de pe diabetoline.com relevante pentru un diabetic, cu poze și prețuri reale (catalog generat din magazin). */
export default function Shop() {
  const t = useTheme(); const k = useScale();
  const { t: s } = useStore();
  const lei = (x: number) => `${x.toFixed(2).replace(".", ",")} lei`;
  const sections: { key: Item["section"]; title: string; sub: string }[] = [
    { key: "skin", title: s.skin_title, sub: s.skin_sub },
    { key: "food", title: s.shop_title, sub: s.shop_sub },
    { key: "supp", title: s.supp_title, sub: s.supp_sub },
  ];
  const giFor = (name: string) => PARTNER.find((p) => name.toLowerCase().includes(p.name.split(" ")[1].toLowerCase()))?.gi;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: s.care }} />
      <Title>{s.care}</Title>
      {sections.map((sec) => (
        <Card key={sec.key}>
          <Label>{sec.title}</Label>
          <Hint>{sec.sub}</Hint>
          {ITEMS.filter((i) => i.section === sec.key).map((p) => {
            const gi = sec.key === "food" ? giFor(p.name) : undefined;
            return (
              <Pressable key={p.id} onPress={() => Linking.openURL(p.url)} accessibilityRole="button" style={({ pressed }) => ({ borderTopWidth: 1, borderTopColor: t.line, paddingTop: 12, flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.8 : 1 })}>
                {p.image ? <Image source={{ uri: p.image }} style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: t.bg }} resizeMode="cover" /> : <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: t.accentSoft }} />}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: t.ink, fontSize: 16 * k, fontWeight: "700" }} numberOfLines={2}>{p.name}</Text>
                  {p.desc ? <Text style={{ color: t.muted, fontSize: 14 * k }}>{p.desc}</Text> : null}
                  {gi ? <Text style={{ color: t.ok, fontSize: 14 * k, fontWeight: "700" }}>{s.gi_short} {gi} · 15 g {s.fiber.toLowerCase()} {s.shop_each}</Text> : null}
                  {!p.available && <Text style={{ color: t.muted, fontSize: 13 * k }}>{s.shop_soldout}</Text>}
                </View>
                <Text style={{ color: t.accent, fontSize: 16 * k, fontWeight: "800" }}>{lei(p.price)}</Text>
              </Pressable>
            );
          })}
        </Card>
      ))}
      <Button title={s.shop_open} kind="soft" onPress={() => Linking.openURL(SHOP)} />
      <Hint>{s.shop_note}</Hint>
    </ScrollView>
  );
}
