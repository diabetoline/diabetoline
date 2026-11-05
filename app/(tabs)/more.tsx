import { useState } from "react";
import { Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import buildInfo from "../../src/build.json";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "../../src/store";
import { privacyUrl } from "../../src/i18n";
import { useTheme } from "../../src/theme";
import { Button, Card, Hint, Label, Title, useScale } from "../../src/ui/Primitives";
import { Icon, type IconName } from "../../src/ui/Icon";

export default function More() {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state } = useStore();
  const [fb, setFb] = useState(""); const [fbMail, setFbMail] = useState(""); const [fbNote, setFbNote] = useState("");
  const sendFb = async () => {
    const body = fb.trim(); if (body.length < 3) return;
    try {
      const r = await fetch(`${process.env.EXPO_PUBLIC_API_URL || "https://curalife.expo.app"}/api/feedback`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body, email: fbMail.trim(), lang: state.lang, role: state.family.role ?? state.profile?.forWhom ?? "", build: (process.env.EXPO_PUBLIC_BUILD ?? buildInfo.sha).slice(0, 7) }) });
      if (!r.ok) throw new Error(); setFb(""); setFbNote(s.fb_ok);
    } catch { setFbNote(s.fb_err); }
  };
  const items: { icon: IconName; title: string; sub?: string; to?: string; url?: string }[] = [
    { icon: "pill", title: s.meds, sub: state.meds.length ? state.meds.map((m) => m.name).join(", ") : s.meds_sub, to: "/meds" },
    { icon: "family", title: s.family, sub: state.family.role === "child" && state.family.parent ? s.fam_parent_of(state.family.parent.name) : state.family.role === "parent" && state.family.children.length ? state.family.children.map((c) => c.name).join(", ") : s.fam_short, to: "/family" },
    { icon: "cart", title: s.list_title, sub: (state.list ?? []).filter((x) => !x.done).length ? s.list_count((state.list ?? []).filter((x) => !x.done).length) : s.list_sub, to: "/list" },
    { icon: "report", title: s.report, sub: s.rep_short, to: "/report" },
    { icon: "care", title: s.care, sub: s.skin_sub, to: "/shop" },
    { icon: "settings", title: s.settings, to: "/settings" },
    { icon: "lock", title: s.privacy, sub: s.privacy_sub, url: privacyUrl[state.lang] },
  ];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Title>{s.tab_more}</Title>
        {items.map((it) => (
          <Pressable key={it.title} onPress={() => (it.url ? Linking.openURL(it.url) : it.to && router.push(it.to as any))} disabled={!it.to && !it.url} accessibilityRole="button"
            style={({ pressed }) => ({ backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, opacity: pressed ? 0.8 : it.to || it.url ? 1 : 0.7 })}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}><Icon name={it.icon} size={26} color={t.accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.ink, fontSize: 20 * k, fontWeight: "700" }}>{it.title}</Text>
              {it.sub ? <Hint>{it.sub}</Hint> : null}
            </View>
            {(it.to || it.url) && <Text style={{ color: t.muted, fontSize: 24 }}>›</Text>}
          </Pressable>
        ))}
        <Card style={{ gap: 10, marginTop: 6 }}>
          <Label>💡 {s.fb_title}</Label>
          <Text style={{ color: t.ink, fontSize: 16 * k, lineHeight: 23 * k }}>{s.fb_text}</Text>
          <TextInput value={fb} onChangeText={(v) => { setFb(v); setFbNote(""); }} placeholder={s.fb_ph} placeholderTextColor={t.muted} multiline maxLength={1000} accessibilityLabel={s.fb_title}
            style={{ borderWidth: 2, borderColor: t.line, borderRadius: 14, padding: 14, minHeight: 90, fontSize: 18 * k, color: t.ink, backgroundColor: t.bg, textAlignVertical: "top" }} />
          <TextInput value={fbMail} onChangeText={setFbMail} placeholder={s.fb_email} placeholderTextColor={t.muted} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={120} accessibilityLabel={s.fb_email}
            style={{ borderWidth: 2, borderColor: t.line, borderRadius: 14, padding: 14, fontSize: 17 * k, color: t.ink, backgroundColor: t.bg }} />
          <Button title={s.fb_send} onPress={sendFb} disabled={fb.trim().length < 3} />
          {fbNote ? <Hint>{fbNote}</Hint> : null}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
