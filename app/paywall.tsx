import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { trialDaysLeft } from "../src/money";
import { PAYMENTS_LIVE } from "../src/access";
import { fetchPlans, purchase, restore, type Plan } from "../src/billing";
import { useStore } from "../src/store";
import { track } from "../src/analytics";
import { useTheme } from "../src/theme";
import { Icon } from "../src/ui/Icon";
import { Button, Hint, useScale } from "../src/ui/Primitives";

/**
 * Ecranul de abonare: 5 zile cu tot, fără card (proba e ținută în aplicație), sau plata pe loc.
 * Plata prin magazin: RevenueCat (`src/billing.ts`); în build-urile fără modul apare doar proba.
 */
export default function Paywall() {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state, set } = useStore();
  const { from } = useLocalSearchParams<{ from?: string }>();
  // deschis dintr-o funcție blocată (după probă): titlu diferit și „Rămân pe gratuit” în loc de „Începe proba”
  const locked = !!from && state.trialStart != null && trialDaysLeft(state.trialStart) === 0 && !state.entitled;
  useEffect(() => { track("paywall_view", { from: from ?? "welcome", locked }); if (locked) set({ paywallAt: Date.now() }); }, []);
  // titlul spune ce pierde omul concret (24 nov 2026, Alex: „pagina de plată foarte eficient după probă”)
  const lockedTitle = from === "plate" ? s.pay_lock_plate : from === "ideas" ? s.pay_lock_ideas : from === "ask" ? s.pay_lock_ask : from === "report" ? s.pay_lock_report : from === "family" ? s.pay_lock_family : from === "scan" ? s.pay_lock_scan : s.pay_locked_title;
  const perMonth = (price: string) => { const n = parseFloat(price.replace(/[^\d.,]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".")); const cur = price.replace(/[\d.,\s]/g, "").trim(); return Number.isFinite(n) && n > 0 ? `${(n / 12).toFixed(2).replace(".", ",")} ${cur}` : null; };
  const start = () => {
    if (!state.trialStart) track("trial_start");
    set({ welcomed: true, trialStart: state.trialStart ?? Date.now() });
    router.replace("/");
    // copilul merge direct la „pune codul părintelui”
    if (state.profile?.forWhom === "child") setTimeout(() => router.push("/family"), 50);
  };
  const perks = [s.q_plan_scan, s.q_plan_plate, s.q_plan_family_me, s.q_plan_report];
  // ce a folosit omul în probă (17 nov 2026): cifrele lui, nu promisiuni
  const since = state.trialStart ?? 0;
  const used = { sc: state.history.filter((h) => h.t >= since).length, pl: state.meals.filter((m) => m.t >= since).length, gl: state.glucose.filter((g) => g.t >= since).length };
  const showUsed = locked && used.sc + used.pl + used.gl >= 3;
  // planurile cu prețul magazinului; cumpărarea deschide fereastra Apple/Google
  const [plans, setPlans] = useState<Plan[]>([]); const [busy, setBusy] = useState(false);
  useEffect(() => { if (PAYMENTS_LIVE) fetchPlans().then(setPlans); }, []);
  const year = plans.find((p) => p.id === "year"), month = plans.find((p) => p.id === "month");
  const done = () => { set({ entitled: true, welcomed: true }); router.replace("/"); };
  const buy = async (p: Plan) => {
    setBusy(true); const r = await purchase(p); setBusy(false);
    if (r.ok) { track("purchase", { plan: p.id, from: from ?? "welcome" }); done(); } else if (!r.cancelled) Alert.alert(s.pay_fail);
  };
  const doRestore = async () => {
    setBusy(true); const ok = await restore(); setBusy(false);
    if (ok) { track("restore"); done(); } else Alert.alert(s.pay_restore_none);
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, padding: 24, gap: 18, justifyContent: "center" }}>
        <View style={{ alignItems: "center" }}>
          <View style={{ width: 96, height: 96, borderRadius: 30, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}><Icon name="care" size={54} color={t.accent} strokeWidth={1.8} /></View>
        </View>
        <Text style={{ color: t.ink, fontSize: 28 * k, fontWeight: "800", textAlign: "center", letterSpacing: -0.4 }}>{locked ? lockedTitle : s.pay_title}</Text>
        <Text style={{ color: t.muted, fontSize: 18 * k, textAlign: "center" }}>{locked ? s.pay_locked_sub : s.pay_sub}</Text>
        {showUsed && <Text style={{ color: t.ink, fontSize: 17 * k, textAlign: "center", fontWeight: "700" }}>{s.pay_used(used.sc, used.pl, used.gl)}</Text>}
        <View style={{ backgroundColor: t.surface, borderRadius: 20, padding: 18, gap: 10, borderWidth: 1, borderColor: t.line }}>
          {perks.map((p, j) => <Text key={j} style={{ color: t.ink, fontSize: 16 * k, lineHeight: 23 * k }}>✓ {p}</Text>)}
        </View>
        {year && (
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ color: t.ink, fontSize: 24 * k, fontWeight: "800" }}>{s.pay_year(year.price)}</Text>
            {perMonth(year.price) ? <Text style={{ color: t.accent, fontSize: 16 * k, fontWeight: "700" }}>{s.pay_per_month(perMonth(year.price)!)}</Text> : null}
            <Text style={{ color: t.muted, fontSize: 15 * k }}>{month ? `${s.pay_month(month.price)} · ` : ""}{s.pay_family}</Text>
          </View>
        )}
        {locked ? (
          <>
            {year && <Button title={s.pay_buy_year} size="xl" disabled={busy} onPress={() => buy(year)} />}
            {month && <Button title={s.pay_buy_month} kind="soft" disabled={busy} onPress={() => buy(month)} />}
            <Button title={s.pay_stay_free} kind={year ? "ghost" : undefined} size={year ? undefined : "xl"} onPress={() => { track("stay_free", { from: from ?? "" }); router.canGoBack() ? router.back() : router.replace("/"); }} />
          </>
        ) : (
          <>
            <Button title={s.pay_trial} size="xl" onPress={start} />
            {year && <Button title={s.pay_buy_year} kind="ghost" disabled={busy} onPress={() => buy(year)} />}
          </>
        )}
        {PAYMENTS_LIVE && <Button title={s.pay_restore} kind="ghost" disabled={busy} onPress={doRestore} />}
        <Hint style={{ textAlign: "center" }}>{s.pay_free_note}</Hint>
      </View>
    </SafeAreaView>
  );
}
