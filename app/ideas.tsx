import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { fetchIdeas, type Idea } from "../src/api/ideas";
import { slotForHour, useStore } from "../src/store";
import { useTheme } from "../src/theme";
import { Button, Card, Hint, Label, Title, useScale } from "../src/ui/Primitives";
import { Quip } from "../src/ui/Quip";
import { RecoCard } from "../src/ui/RecoCard";

/** „Ce mănânc azi?”: 3 idei pentru momentul zilei, din produsele scanate (verzi), fără cele roșii. */
export default function Ideas() {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { focus, lighter } = useLocalSearchParams<{ focus?: string; lighter?: string }>();
  const { t: s, s: state, addMeal, addToList } = useStore();
  const [listed, setListed] = useState<number | null>(null);
  const slot = slotForHour(new Date().getHours());
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<number | null>(0);
  const [ate, setAte] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setIdeas(null); setErr(""); setOpen(0); setAte(null); setLoading(true);
    const products = state.history.slice(0, 40).map((h) => ({ name: h.name, level: h.level }));
    const recentMeals = state.meals.slice(-8).map((m) => m.name).filter((x): x is string => !!x);
    const list = (state.list ?? []).filter((x) => !x.done).map((x) => x.name);
    const r = await fetchIdeas({ lang: state.lang, slot, products, recentMeals, focus: focus || undefined, lighter: lighter === "1", list });
    setLoading(false);
    if (r.ok) setIdeas(r.ideas); else setErr(r.error === "not_configured" ? s.ideas_off : s.ideas_err);
  };
  const noProducts = state.history.length === 0 && !(state.list ?? []).length && !focus;
  useEffect(() => { if (!noProducts) load(); }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: s.ideas_title }} />
      <Title>{focus && lighter === "1" ? s.ideas_lighter_title : s.ideas_title}</Title>
      <Hint>{focus && lighter === "1" ? s.ideas_lighter_sub(focus) : focus ? s.ideas_with(focus) : s.ideas_sub} · {s.ideas_slot[slot]}</Hint>
      {noProducts && !ideas && (
        <Card style={{ borderColor: t.accent, borderWidth: 2 }}>
          <Text style={{ color: t.ink, fontSize: 19 * k, fontWeight: "800" }}>{s.ideas_noscan_title}</Text>
          <Text style={{ color: t.ink, fontSize: 17 * k, lineHeight: 25 * k }}>{s.ideas_noscan_text}</Text>
          <Button title={s.tile_scan} size="xl" onPress={() => router.replace("/scan")} />
          <Pressable onPress={load} accessibilityRole="button"><Hint style={{ textAlign: "center", textDecorationLine: "underline" }}>{s.ideas_anyway}</Hint></Pressable>
        </Card>
      )}
      {(!noProducts || loading) && !ideas && !err && <View style={{ alignItems: "center", gap: 10, paddingVertical: 20 }}><ActivityIndicator color={t.accent} size="large" /><Hint>{s.ideas_loading}</Hint><Quip k="plate_wait" seed={slot} /></View>}
      {err ? <Card><Hint>{err}</Hint><Button title={s.ideas_more} kind="soft" onPress={load} /></Card> : null}
      {ideas?.map((i, n) => (
        <Card key={n} style={open === n ? { borderColor: t.accent, borderWidth: 2 } : undefined}>
          <Pressable onPress={() => setOpen(open === n ? null : n)} accessibilityRole="button">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ fontSize: 26 }}>{n === 0 ? "🥗" : n === 1 ? "🍲" : "🍳"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.ink, fontSize: 20 * k, fontWeight: "800" }}>{i.title}</Text>
                <Text style={{ color: t.muted, fontSize: 14 * k }}>{[i.carbs != null ? s.ideas_carbs(i.carbs) : null, i.minutes != null ? s.ideas_min(i.minutes) : null].filter(Boolean).join(" · ")}</Text>
              </View>
              <Text style={{ color: t.muted, fontSize: 22 }}>{open === n ? "˄" : "˅"}</Text>
            </View>
          </Pressable>
          {open === n && (
            <View style={{ gap: 12 }}>
              <Text style={{ color: t.ink, fontSize: 17 * k, lineHeight: 25 * k }}>{i.why}</Text>
              {i.uses.length > 0 && <Text style={{ color: t.ok, fontSize: 15 * k, fontWeight: "700" }}>✓ {s.ideas_uses} {i.uses.join(", ")}</Text>}
              <View><Label>{s.ideas_ingredients}</Label>{i.ingredients.map((x, j) => <Text key={j} style={{ color: t.ink, fontSize: 17 * k, lineHeight: 25 * k }}>• {x}</Text>)}</View>
              {!!i.missing?.length && (
                <View style={{ backgroundColor: t.accentSoft, borderRadius: 12, padding: 12, gap: 8 }}>
                  <Text style={{ color: t.ink, fontSize: 16 * k }}>🛒 {s.ideas_missing}: <Text style={{ fontWeight: "700" }}>{i.missing.join(", ")}</Text></Text>
                  <Button title={listed === n ? "✓ " + s.list_added : s.ideas_missing_add} kind={listed === n ? "ghost" : "soft"} size="sm" disabled={listed === n} onPress={() => { i.missing!.forEach((m) => addToList({ name: m, by: "me" })); setListed(n); }} />
                </View>
              )}
              <View><Label>{s.ideas_steps}</Label>{i.steps.map((x, j) => <Text key={j} style={{ color: t.ink, fontSize: 17 * k, lineHeight: 25 * k }}>{j + 1}. {x}</Text>)}</View>
              <Button title={ate === n ? "✓ " + s.ideas_ate : s.ideas_ate} kind="soft" disabled={ate === n} onPress={() => { addMeal({ name: i.title, slot, level: "green", carbs: i.carbs ?? undefined }); setAte(n); }} />
            </View>
          )}
        </Card>
      ))}
      {ideas && <RecoCard placement="ideas" />}
      {ideas && <Button title={"🔄 " + s.ideas_more} kind="ghost" onPress={load} />}
      {ideas && <Hint>{s.plate_note}</Hint>}
    </ScrollView>
  );
}
