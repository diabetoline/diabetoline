import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Product } from "../engine/types";
import { fetchGreenAlternatives, greenFromCache } from "../api/alternatives";
import { deviceRegion } from "../money";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { Card, Hint, useScale } from "./Primitives";

const COUNTRY: Record<string, string> = { RO: "en:romania", DE: "en:germany", AT: "en:austria", CH: "en:switzerland", GB: "en:united-kingdom", IE: "en:ireland", FR: "en:france", IT: "en:italy", ES: "en:spain", NL: "en:netherlands", BE: "en:belgium", PL: "en:poland", HU: "en:hungary", MD: "en:moldova", US: "en:united-states" };

/** Produse verzi din aceeași categorie, pentru un produs roșu sau galben. Întâi din ce a scanat omul, apoi din Open Food Facts. */
export function GreenAlternatives({ product }: { product: Product }) {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state } = useStore();
  const [alts, setAlts] = useState<Product[]>(() => greenFromCache(product, state.cache));

  useEffect(() => {
    let alive = true;
    if (alts.length >= 2) return;
    (async () => {
      const more = await fetchGreenAlternatives(product, state.lang, COUNTRY[deviceRegion()]);
      if (!alive) return;
      setAlts((cur) => [...cur, ...more.filter((m) => !cur.some((c) => c.code === m.code))].slice(0, 3));
    })();
    return () => { alive = false; };
  }, [product.code]);

  if (!alts.length) return null;
  return (
    <Card style={{ borderColor: t.ok, borderWidth: 2, gap: 8 }}>
      <Text style={{ color: t.ink, fontSize: 18 * k, fontWeight: "800" }}>✅ {s.alt_green_title}</Text>
      {alts.map((a) => (
        <Pressable key={a.code} onPress={() => router.push(`/product/${a.code}`)} accessibilityRole="button"
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, backgroundColor: pressed ? t.accentSoft : t.bg })}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: t.ok }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.ink, fontSize: 17 * k, fontWeight: "700" }} numberOfLines={2}>{a.name}</Text>
            {a.brand ? <Text style={{ color: t.muted, fontSize: 14 * k }} numberOfLines={1}>{a.brand}</Text> : null}
          </View>
          <Text style={{ color: t.muted, fontSize: 22 }}>›</Text>
        </Pressable>
      ))}
      <Hint>{s.alt_green_hint}</Hint>
    </Card>
  );
}
