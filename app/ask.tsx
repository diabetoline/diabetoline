import { useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, type ScrollViewInstance } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import { say } from "../src/speech";
import { ask } from "../src/api/ask";
import { journalContext } from "../src/ui/journalContext";
import { speechLocale } from "../src/i18n";
import { useStore } from "../src/store";
import { useTheme } from "../src/theme";
import { Icon } from "../src/ui/Icon";
import { Button, Card, Hint, Title, useScale } from "../src/ui/Primitives";

type Msg = { role: "me" | "app"; text: string; emergency?: boolean };

/** Asistentul: întrebări gata scrise sau tastate; răspunsuri scurte din jurnal, citite cu voce tare. */
export default function Ask() {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state } = useStore();
  const [q, setQ] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const sv = useRef<ScrollViewInstance>(null);

  const send = async (question: string) => {
    const text = question.trim(); if (!text || busy) return;
    setQ(""); setBusy(true); Speech.stop();
    setMsgs((m) => [...m, { role: "me", text }]);
    const r = await ask({ lang: state.lang, question: text, context: journalContext(state, s), name: state.name || undefined });
    const answer = r.ok ? r.answer : r.error === "not_configured" ? s.ask_off : s.ask_err;
    setMsgs((m) => [...m, { role: "app", text: answer, emergency: r.ok && r.emergency }]);
    setBusy(false);
    if (r.ok) say(answer, state.lang);
    setTimeout(() => sv.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: s.ask_title }} />
      <ScrollView ref={sv} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
        <Title>{s.ask_title}</Title>
        <Hint>{s.ask_sub}</Hint>
        {msgs.length === 0 && (
          <View style={{ gap: 8 }}>
            {s.ask_q.map((x) => (
              <Pressable key={x} onPress={() => send(x)} accessibilityRole="button" style={({ pressed }) => ({ backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, opacity: pressed ? 0.8 : 1 })}>
                <Text style={{ flex: 1, color: t.ink, fontSize: 18 * k }}>{x}</Text><Text style={{ color: t.muted, fontSize: 22 }}>›</Text>
              </Pressable>
            ))}
          </View>
        )}
        {msgs.map((m, i) => (
          <View key={i} style={{ alignSelf: m.role === "me" ? "flex-end" : "flex-start", maxWidth: "88%", backgroundColor: m.role === "me" ? t.accent : m.emergency ? t.badBg : t.surface, borderWidth: m.role === "me" ? 0 : 1, borderColor: m.emergency ? t.bad : t.line, borderRadius: 18, padding: 14, gap: 8 }}>
            {m.emergency && <Text style={{ color: t.bad, fontWeight: "800", fontSize: 16 * k }}>⚠️ {s.ask_emergency}</Text>}
            <Text style={{ color: m.role === "me" ? t.accentInk : t.ink, fontSize: 18 * k, lineHeight: 26 * k }}>{m.text}</Text>
            {m.role === "app" && !m.emergency && (
              <Pressable onPress={() => { Speech.stop(); say(m.text, state.lang); }} accessibilityRole="button" accessibilityLabel={s.speak} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 18 }}>🔊</Text><Text style={{ color: t.accent, fontWeight: "700", fontSize: 15 * k }}>{s.speak}</Text>
              </Pressable>
            )}
          </View>
        ))}
        {busy && <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><ActivityIndicator color={t.accent} /><Hint>{s.ask_thinking}</Hint></View>}
        {msgs.some((m) => m.role === "app" && m.text.includes(s.rep_title.split(" ")[0])) && <Button title={"📄 " + s.rep_title} kind="soft" onPress={() => router.push("/report")} />}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: t.line, backgroundColor: t.surface, alignItems: "center" }}>
        <Pressable onPress={() => alert(s.ask_voice_soon)} accessibilityRole="button" style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name="mic" size={26} color={t.accent} />
        </Pressable>
        <TextInput value={q} onChangeText={setQ} placeholder={s.ask_placeholder} placeholderTextColor={t.muted} onSubmitEditing={() => send(q)} returnKeyType="send" accessibilityLabel={s.ask_placeholder}
          style={{ flex: 1, borderWidth: 1, borderColor: t.line, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, fontSize: 18 * k, color: t.ink, backgroundColor: t.bg }} />
        <Button title={s.ask_send} size="sm" disabled={!q.trim() || busy} onPress={() => send(q)} />
      </View>
    </KeyboardAvoidingView>
  );
}
