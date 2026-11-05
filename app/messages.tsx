import { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, type ScrollViewInstance } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { fetchMessages, markRead, sendMessage, type Msg } from "../src/family/messages";
import { useStore } from "../src/store";
import { useTheme } from "../src/theme";
import { Button, Hint, useScale } from "../src/ui/Primitives";

/** Mesaje scurte părinte ↔ copil: istoric mic, câmp liber și 3 răspunsuri gata scrise, mari. Nu e chat. */
export default function Messages() {
  const { link, name } = useLocalSearchParams<{ link: string; name?: string }>();
  const t = useTheme(); const k = useScale();
  const { t: s, s: state } = useStore();
  const me: "parent" | "child" = state.family.role === "child" ? "child" : "parent";
  const [rows, setRows] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const sv = useRef<ScrollViewInstance>(null);
  const other = name || "";

  const load = useCallback(async () => {
    if (!link) return;
    try {
      const m = await fetchMessages(link);
      setRows(m);
      await markRead(m.filter((x) => x.sender !== me && !x.read_at).map((x) => x.id));
      setTimeout(() => sv.current?.scrollToEnd({ animated: false }), 50);
    } catch {}
  }, [link]);
  useEffect(() => { load(); const h = setInterval(load, 20000); return () => clearInterval(h); }, [load]);

  const send = async (body: string) => {
    if (!link || !body.trim()) return;
    setText(""); setNote("");
    try { await sendMessage(link, me, body, state.name || s.msg_me); setNote(s.msg_sent); await load(); } catch { setNote(s.msg_err); }
  };
  const quick = me === "child" ? s.msg_quick_child : s.msg_quick_parent;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}>
      <Stack.Screen options={{ title: s.msg_title(other) }} />
      <ScrollView ref={sv} contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1, justifyContent: "flex-end" }} keyboardShouldPersistTaps="handled">
        {!rows.length && <Hint style={{ textAlign: "center" }}>{s.msg_empty}</Hint>}
        {rows.map((m) => {
          const mine = m.sender === me;
          return (
            <View key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "85%", backgroundColor: mine ? t.accent : t.surface, borderRadius: 18, padding: 14, borderWidth: mine ? 0 : 1, borderColor: t.line }}>
              <Text style={{ color: mine ? "#fff" : t.ink, fontSize: 18 * k, lineHeight: 25 * k }}>{m.body}</Text>
              <Text style={{ color: mine ? "rgba(255,255,255,0.8)" : t.muted, fontSize: 12 * k, marginTop: 4 }}>{new Date(m.created_at).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}</Text>
            </View>
          );
        })}
      </ScrollView>
      <View style={{ padding: 12, gap: 10, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.line }}>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {quick.map((q) => (
            <Pressable key={q} onPress={() => send(q)} accessibilityRole="button" style={{ backgroundColor: t.accentSoft, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 16 }}>
              <Text style={{ color: t.ink, fontSize: 17 * k, fontWeight: "700" }}>{q}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <TextInput value={text} onChangeText={setText} placeholder={s.msg_ph} placeholderTextColor={t.muted} maxLength={200} returnKeyType="send" onSubmitEditing={() => send(text)} accessibilityLabel={s.msg_ph}
            style={{ flex: 1, borderWidth: 2, borderColor: t.line, borderRadius: 14, padding: 12, fontSize: 18 * k, color: t.ink, backgroundColor: t.bg }} />
          <Button title={s.msg_send} onPress={() => send(text)} disabled={!text.trim()} />
        </View>
        {note ? <Hint>{note}</Hint> : null}
      </View>
    </KeyboardAvoidingView>
  );
}
