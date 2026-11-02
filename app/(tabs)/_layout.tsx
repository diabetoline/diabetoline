import { Tabs } from "expo-router";
import { Icon, type IconName } from "../../src/ui/Icon";
import { useStore } from "../../src/store";
import { useTheme } from "../../src/theme";

const icon = (name: IconName) => ({ color }: { color: unknown }) => <Icon name={name} size={26} color={String(color)} />;

export default function TabLayout() {
  const t = useTheme();
  const { t: s } = useStore();
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: t.accent, tabBarInactiveTintColor: t.muted,
      tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.line, height: 64, paddingTop: 6 }, tabBarLabelStyle: { fontWeight: "700", fontSize: 13 } }}>
      <Tabs.Screen name="index" options={{ title: s.tab_home, tabBarIcon: icon("home") }} />
      <Tabs.Screen name="journal" options={{ title: s.tab_journal, tabBarIcon: icon("journal") }} />
      <Tabs.Screen name="more" options={{ title: s.tab_more, tabBarIcon: icon("more") }} />
    </Tabs>
  );
}
