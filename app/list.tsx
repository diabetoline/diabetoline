import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useStore, type ListItem } from "../src/store";
import { levelColor, useTheme } from "../src/theme";
import { Icon } from "../src/ui/Icon";
import { Button, Card, Hint, Label, Title, useScale } from "../src/ui/Primitives";

/**
 * Lista de cumpărături: produsele verzi/galbene puse de la scanare, lipsurile de la „Ce mănânc azi?” sau scrise de mână.
 * Bifezi la magazin; bifatele rămân jos până le ștergi. Copilul (contul de familie) poate pune și el produse pe listă.
 */
export default function ShoppingList() {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state, addToList, toggleList, removeFromList, set, syncNow } = useStore();
  useEffect(() => { syncNow(); }, []);
  const [text, setText] = useState("");
  const list = state.list ?? [];
  const todo = list.filter((x) => !x.done); const done = list.filter((x) => x.done);
  const add = () => { const n = text.trim(); if (!n) return; addToList({ name: n, by: "me" }); setText(""); };

  const Row = ({ it }: { it: ListItem }) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
      <Pressable onPress={() => toggleList(it.id)} accessibilityRole="checkbox" accessibilityState={{ checked: it.done }} accessibilityLabel={it.name} hitSlop={8}
        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, borderWidth: 2, borderColor: it.done ? t.ok : t.line, backgroundColor: it.done ? t.ok : t.bg, alignItems: "center", justifyContent: "center" }}>
          {it.done && <Text style={{ color: "#fff", fontWeight: "800", fontSize: 20 }}>✓</Text>}
        </View>
        {it.level && <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: levelColor(t, it.level).fg }} />}
        <View style={{ flex: 1 }}>
          <Text style={{ color: it.done ? t.muted : t.ink, fontSize: 19 * k, textDecorationLine: it.done ? "line-through" : "none" }} numberOfLines={2}>{it.name}</Text>
          {it.by && it.by !== "me" && <Text style={{ color: t.muted, fontSize: 14 * k }}>{s.list_from_child} {it.by === "child" ? (state.family.children[0]?.name ?? s.fam_i_child) : (state.family.parent?.name ?? s.fam_i_parent)}</Text>}
        </View>
      </Pressable>
      {it.code && <Pressable onPress={() => router.push({ pathname: "/product/[code]", params: { code: it.code! } })} hitSlop={8} accessibilityRole="button"><Text style={{ color: t.muted, fontSize: 24 }}>›</Text></Pressable>}
      <Pressable onPress={() => removeFromList(it.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel={s.delete} style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.5 : 1 })}><Icon name="trash" size={22} color={t.muted} /></Pressable>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Stack.Screen options={{ title: s.list_title }} />
      <Title>🛒 {s.list_title}</Title>
      <Hint>{s.list_sub}</Hint>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <TextInput value={text} onChangeText={setText} onSubmitEditing={add} returnKeyType="done" placeholder={s.list_placeholder} placeholderTextColor={t.muted} accessibilityLabel={s.list_placeholder}
          style={{ flex: 1, borderWidth: 1, borderColor: t.line, borderRadius: 14, padding: 14, fontSize: 18 * k, color: t.ink, backgroundColor: t.surface }} />
        <Button title="+" size="xl" disabled={!text.trim()} onPress={add} />
      </View>

      {list.length === 0 && <View style={{ gap: 10 }}><Hint>{s.list_empty}</Hint><Button title={s.tile_scan} kind="soft" onPress={() => router.push("/scan")} /></View>}

      {todo.length > 0 && (
        <Card>
          <Label>{s.list_to_buy} · {s.list_count(todo.length)}</Label>
          {todo.map((it) => <Row key={it.id} it={it} />)}
        </Card>
      )}
      {done.length > 0 && (
        <Card>
          <Label>{s.list_bought}</Label>
          {done.map((it) => <Row key={it.id} it={it} />)}
          <Button title={s.list_done_clear} kind="ghost" onPress={() => set((p) => ({ list: (p.list ?? []).filter((x) => !x.done), trash: [...(p.trash ?? []), ...done.map((x) => "l" + x.id)] }))} />
        </Card>
      )}
    </ScrollView>
  );
}
