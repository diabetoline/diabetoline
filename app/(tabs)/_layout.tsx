import { Stack, Tabs } from "expo-router";
import { Icon, type IconName } from "../../src/ui/Icon";
import { useStore } from "../../src/store";
import { useTheme } from "../../src/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { useEffect, useState } from "react";
import { COMMUNITY_ON, loadInbox } from "../../src/community";

const icon = (name: IconName) => ({ color }: { color: unknown }) => <Icon name={name} size={26} color={String(color)} />;

export default function TabLayout() {
  const t = useTheme();
  const { t: s, s: state } = useStore();
  // bulina de pe fila Comunitate: răspunsuri noi la postările mele de la ultima vizită (reîmprospătată la fiecare 5 min)
  const [inbox, setInbox] = useState(0);
  useEffect(() => {
    if (!COMMUNITY_ON) return;
    let alive = true; const tick = () => void loadInbox(state.communitySeen).then((n) => { if (alive) setInbox(n); });
    tick(); const id = setInterval(tick, 5 * 60e3); return () => { alive = false; clearInterval(id); };
  }, [state.communitySeen]);
  const ins = useSafeAreaInsets();   // pe Android aplicația se întinde sub butoanele de sistem: meniul urcă deasupra lor
  // unele telefoane (MIUI cu butoane) raportează 0 deși bara există: lăsăm loc oricum
  const bottom = Platform.OS === "android" ? Math.max(ins.bottom, 48) : ins.bottom;
  return (<>
    {/* antetul Stack-ului părinte nu trebuie să apară niciodată peste tab-uri (a apărut „(tabs)” după un flux cu modale, 15 nov 2026) */}
    <Stack.Screen options={{ headerShown: false }} />
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: t.accent, tabBarInactiveTintColor: t.muted,
      tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.line, height: 64 + bottom, paddingTop: 6, paddingBottom: Math.max(bottom, 8) }, tabBarLabelStyle: { fontWeight: "700", fontSize: 13 } }}>
      <Tabs.Screen name="index" options={{ title: s.tab_home, tabBarIcon: icon("home") }} />
      <Tabs.Screen name="journal" options={{ title: s.tab_journal, tabBarIcon: icon("journal") }} />
      <Tabs.Screen name="community" options={{ title: s.community, tabBarIcon: icon("community"), href: COMMUNITY_ON ? undefined : null, tabBarBadge: inbox > 0 ? inbox : undefined, tabBarBadgeStyle: { backgroundColor: t.brandRed, color: "#fff", fontWeight: "800" } }} />
      <Tabs.Screen name="more" options={{ title: s.tab_more, tabBarIcon: icon("more") }} />
    </Tabs>
  </>);
}
