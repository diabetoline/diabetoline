import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { dayKeyLocal } from "../src/engine/days";
import { useStore } from "../src/store";
import { useTheme } from "../src/theme";
import { Icon } from "../src/ui/Icon";
import { Button, Card, Hint, useScale } from "../src/ui/Primitives";
import { Quip } from "../src/ui/Quip";

/**
 * „Ai făcut mișcare azi?” — ecranul deschis de notificarea de la 19:00 (Alex, 16 nov 2026: apăsarea ducea pe prima pagină,
 * „e confuz”, și nu exista „nu am făcut”). Da (15 / 30 / 60 min) sau „Nu, azi n-am făcut” (nu mai întrebăm azi). Fără predică.
 */
export default function MoveScreen() {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state, set, addWalk } = useStore();
  const today = dayKeyLocal(Date.now());
  const walked = (state.walks ?? []).filter((w) => dayKeyLocal(w.t) === today).reduce((a, w) => a + w.min, 0);
  const [done, setDone] = useState<"yes" | "no" | null>(walked > 0 ? "yes" : state.moveAskedDay === today ? "no" : null);
  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} style={{ backgroundColor: t.bg }}>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Icon name="walk" size={30} color={t.accent} />
          <Text style={{ flex: 1, color: t.ink, fontSize: 22 * k, fontWeight: "800" }}>{s.mv_ask}</Text>
        </View>
        {done === "yes" ? (
          <>
            <Text style={{ color: t.ok, fontSize: 18 * k, fontWeight: "700" }}>✓ {walked ? s.plan_move_done(walked) : s.mv_thanks}</Text>
            <Quip k="walk_done" style={{ textAlign: "left" }} />
          </>
        ) : done === "no" ? (
          <Text style={{ color: t.ink, fontSize: 17 * k }}>{s.mv_no_thanks}</Text>
        ) : (
          <>
            <Hint>{s.mv_hint}</Hint>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[15, 30, 60].map((m) => <View key={m} style={{ flex: 1 }}><Button title={s.mv_yes(m)} size="md" onPress={() => { addWalk(m); setDone("yes"); }} /></View>)}
            </View>
            <Button title={s.mv_no_today} kind="ghost" onPress={() => { set({ moveAskedDay: today }); setDone("no"); }} />
          </>
        )}
      </Card>
      {done && <Button title={s.mv_done_btn} size="xl" onPress={close} />}
    </ScrollView>
  );
}
