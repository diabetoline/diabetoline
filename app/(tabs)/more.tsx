import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "../../src/store";
import { privacyUrl } from "../../src/i18n";
import { useTheme } from "../../src/theme";
import { Hint, Title, useScale } from "../../src/ui/Primitives";

export default function More() {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state } = useStore();
  const items: { icon: string; title: string; sub?: string; to?: string; url?: string }[] = [
    { icon: "💊", title: s.meds, sub: state.meds.length ? state.meds.map((m) => m.name).join(", ") : s.meds_sub, to: "/meds" },
    { icon: "👪", title: s.family, sub: s.family_soon },
    { icon: "🩺", title: s.report, sub: s.report_soon },
    { icon: "🧴", title: s.care, sub: s.care_soon },
    { icon: "⚙️", title: s.settings, to: "/settings" },
    { icon: "🔒", title: s.privacy, sub: s.privacy_sub, url: privacyUrl[state.lang] },
  ];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}>
        <Title>{s.tab_more}</Title>
        {items.map((it) => (
          <Pressable key={it.title} onPress={() => (it.url ? Linking.openURL(it.url) : it.to && router.push(it.to as any))} disabled={!it.to && !it.url} accessibilityRole="button"
            style={({ pressed }) => ({ backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, opacity: pressed ? 0.8 : it.to || it.url ? 1 : 0.7 })}>
            <Text style={{ fontSize: 30 }}>{it.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.ink, fontSize: 20 * k, fontWeight: "700" }}>{it.title}</Text>
              {it.sub ? <Hint>{it.sub}</Hint> : null}
            </View>
            {(it.to || it.url) && <Text style={{ color: t.muted, fontSize: 24 }}>›</Text>}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
