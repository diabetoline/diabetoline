import { Tabs } from "expo-router";
import { Icon, type IconName } from "../../src/ui/Icon";
import { useStore } from "../../src/store";
import { useTheme } from "../../src/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";

const icon = (name: IconName) => ({ color }: { color: unknown }) => <Icon name={name} size={26} color={String(color)} />;

export default function TabLayout() {
  const t = useTheme();
  const { t: s } = useStore();
  const ins = useSafeAreaInsets();   // pe Android aplicația se întinde sub butoanele de sistem: meniul urcă deasupra lor
  // unele telefoane (MIUI cu butoane) raportează 0 deși bara există: lăsăm loc oricum
  const bottom = Platform.OS === "android" ? Math.max(ins.bottom, 48) : ins.bottom;
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: t.accent, tabBarInactiveTintColor: t.muted,
      tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.line, height: 64 + bottom, paddingTop: 6, paddingBottom: Math.max(bottom, 8) }, tabBarLabelStyle: { fontWeight: "700", fontSize: 13 } }}>
      <Tabs.Screen name="index" options={{ title: s.tab_home, tabBarIcon: icon("home") }} />
      <Tabs.Screen name="journal" options={{ title: s.tab_journal, tabBarIcon: icon("journal") }} />
      <Tabs.Screen name="more" options={{ title: s.tab_more, tabBarIcon: icon("more") }} />
    </Tabs>
  );
}
