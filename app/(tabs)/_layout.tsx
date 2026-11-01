import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useStore } from "../../src/store";
import { useTheme } from "../../src/theme";

const icon = (glyph: string) => ({ color }: { color: unknown }) => <Text style={{ color: String(color), fontSize: 20 }}>{glyph}</Text>;

export default function TabLayout() {
  const t = useTheme();
  const { t: s, s: state } = useStore();
  const open = state.cart.filter((c) => !c.done).length;
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: t.accent, tabBarInactiveTintColor: t.muted,
      tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.line }, tabBarLabelStyle: { fontWeight: "600", fontSize: 11 } }}>
      <Tabs.Screen name="index" options={{ title: s.tab_scan, tabBarIcon: icon("▥") }} />
      <Tabs.Screen name="meals" options={{ title: s.tab_meals, tabBarIcon: icon("🧺"), tabBarBadge: open || undefined }} />
      <Tabs.Screen name="glucose" options={{ title: s.tab_glu, tabBarIcon: icon("💧") }} />
      <Tabs.Screen name="family" options={{ title: s.tab_family, tabBarIcon: icon("👪") }} />
      <Tabs.Screen name="more" options={{ title: s.tab_more, tabBarIcon: icon("⋯") }} />
    </Tabs>
  );
}
