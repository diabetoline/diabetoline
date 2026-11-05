import { Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { planPrice } from "../src/money";
import { useStore } from "../src/store";
import { useTheme } from "../src/theme";
import { Icon } from "../src/ui/Icon";
import { Button, Hint, useScale } from "../src/ui/Primitives";

/**
 * Ecranul de abonare: 5 zile cu tot, fără card (proba e ținută în aplicație), sau plata pe loc.
 * Plata prin magazin vine odată cu RevenueCat; până atunci butonul e marcat „în curând”.
 */
export default function Paywall() {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state, set } = useStore();
  const start = () => {
    set({ welcomed: true, trialStart: state.trialStart ?? Date.now() });
    router.replace("/");
    // copilul merge direct la „pune codul părintelui”
    if (state.profile?.forWhom === "child") setTimeout(() => router.push("/family"), 50);
  };
  const perks = [s.q_plan_scan, s.q_plan_plate, s.q_plan_family_me, s.q_plan_report];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, padding: 24, gap: 18, justifyContent: "center" }}>
        <View style={{ alignItems: "center" }}>
          <View style={{ width: 96, height: 96, borderRadius: 30, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}><Icon name="care" size={54} color={t.accent} strokeWidth={1.8} /></View>
        </View>
        <Text style={{ color: t.ink, fontSize: 28 * k, fontWeight: "800", textAlign: "center", letterSpacing: -0.4 }}>{s.pay_title}</Text>
        <Text style={{ color: t.muted, fontSize: 18 * k, textAlign: "center" }}>{s.pay_sub}</Text>
        <View style={{ backgroundColor: t.surface, borderRadius: 20, padding: 18, gap: 10, borderWidth: 1, borderColor: t.line }}>
          {perks.map((p, j) => <Text key={j} style={{ color: t.ink, fontSize: 16 * k, lineHeight: 23 * k }}>✓ {p}</Text>)}
        </View>
        <View style={{ alignItems: "center", gap: 4 }}>
          <Text style={{ color: t.ink, fontSize: 24 * k, fontWeight: "800" }}>{s.pay_year(planPrice("year"))}</Text>
          <Text style={{ color: t.muted, fontSize: 15 * k }}>{s.pay_month(planPrice("month"))} · {s.pay_family}</Text>
        </View>
        <Button title={s.pay_trial} size="xl" onPress={start} />
        <Button title={`${s.pay_now} · ${s.pay_soon}`} kind="ghost" disabled onPress={() => {}} />
        <Hint style={{ textAlign: "center" }}>{s.pay_free_note}</Hint>
      </View>
    </SafeAreaView>
  );
}
