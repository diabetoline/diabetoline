import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useStore } from "../../src/store";
import { useTheme } from "../../src/theme";

const icon = (glyph: string) => ({ color }: { color: unknown }) => <Text style={{ color: String(color), fontSize: 24 }}>{glyph}</Text>;

export default function TabLayout() {
  const t = useTheme();
  const { t: s } = useStore();
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: t.accent, tabBarInactiveTintColor: t.muted,
      tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.line, height: 64, paddingTop: 6 }, tabBarLabelStyle: { fontWeight: "700", fontSize: 13 } }}>
      <Tabs.Screen name="index" options={{ title: s.tab_home, tabBarIcon: icon("🏠") }} />
      <Tabs.Screen name="journal" options={{ title: s.tab_journal, tabBarIcon: icon("📒") }} />
      <Tabs.Screen name="more" options={{ title: s.tab_more, tabBarIcon: icon("☰") }} />
    </Tabs>
  );
}
