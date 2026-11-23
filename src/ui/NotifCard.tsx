/**
 * Cardul de permisiune pentru notificări (23 nov 2026, după retenția d1 de 13 %): apare pe prima pagină după primul verdict,
 * cu un motiv concret („la 10:00 îți amintesc glicemia”), în loc de dialogul sistemului tras orbește la pornire.
 * „Permite” → dialogul sistemului; „Nu acum” → nu mai apare (se poate porni din Setări).
 */
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import { track } from "../analytics";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { Button, Card, Label, useScale } from "./Primitives";

export function NotifCard() {
  const t = useTheme(); const k = useScale();
  const { t: s, s: state, set } = useStore();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (state.notifAsked || state.history.length === 0) { setShow(false); return; }
    Notifications.getPermissionsAsync().then((p) => setShow(!p.granted && p.canAskAgain)).catch(() => setShow(false));
  }, [state.notifAsked, state.history.length]);
  if (!show) return null;
  const allow = async () => {
    set({ notifAsked: true });
    const p = await Notifications.requestPermissionsAsync().catch(() => ({ granted: false }));
    track("notif_perm", { granted: !!p.granted });
    // replanificarea reamintirilor pornește singură din store la schimbarea stării
    set({ notifAsked: true });
  };
  return (
    <Card style={{ borderLeftWidth: 4, borderLeftColor: t.accent }}>
      <Label>🔔 {s.notif_card_title}</Label>
      <Text style={{ color: t.ink, fontSize: 17 * k, lineHeight: 25 * k }}>{s.notif_card_text}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}><Button title={s.notif_card_ok} onPress={allow} /></View>
        <View style={{ flex: 1 }}><Button title={s.reco_later} kind="ghost" onPress={() => { track("notif_perm", { granted: false, later: true }); set({ notifAsked: true }); }} /></View>
      </View>
    </Card>
  );
}
