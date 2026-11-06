import { Linking, Platform, Text, View } from "react-native";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { Button, Card, useScale } from "./Primitives";

/**
 * Cererea de recenzie, o singură dată, politicos: după 7 zile de la prima deschidere și cel puțin 10 notări.
 * „Nu acum” = 30 de zile pauză; întrebăm de cel mult 2 ori în total. Folosește fereastra nativă de rating dacă există.
 */
const DAY = 864e5;
const STORE = Platform.select({ ios: "https://apps.apple.com/app/id0000000000?action=write-review", default: "market://details?id=com.curalife.diabetoline" })!;

export function ReviewCard() {
  const t = useTheme(); const k = useScale();
  const { t: s, s: state, set } = useStore();
  const rv = state.review ?? { asked: 0, next: 0 };
  const start = state.trialStart ?? 0;
  const entries = state.glucose.length + state.meals.length + state.medLog.length + (state.walks?.length ?? 0);
  if (rv.done || rv.asked >= 2 || !start || Date.now() - start < 7 * DAY || entries < 10 || Date.now() < rv.next) return null;

  const later = () => set({ review: { asked: rv.asked + 1, next: Date.now() + 30 * DAY } });
  const yes = async () => {
    set({ review: { asked: rv.asked + 1, next: Date.now() + 365 * DAY, done: true } });
    try {
      const SR = require("expo-store-review") as { isAvailableAsync: () => Promise<boolean>; requestReview: () => Promise<void> };
      if (await SR.isAvailableAsync()) { await SR.requestReview(); return; }
    } catch {}
    Linking.openURL(STORE).catch(() => {});
  };
  return (
    <Card style={{ gap: 10 }}>
      <Text style={{ color: t.ink, fontSize: 20 * k, fontWeight: "800" }}>⭐ {s.rv_title}</Text>
      <Text style={{ color: t.ink, fontSize: 16 * k, lineHeight: 23 * k }}>{s.rv_text}</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Button title={s.rv_yes} onPress={yes} /></View>
        <View style={{ flex: 1 }}><Button title={s.rv_no} kind="soft" onPress={later} /></View>
      </View>
    </Card>
  );
}
