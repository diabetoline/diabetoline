import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore, type Profile } from "../src/store";
import { track } from "../src/analytics";
import { useTheme } from "../src/theme";
import { Icon, type IconName } from "../src/ui/Icon";
import { Button, Hint, useScale } from "../src/ui/Primitives";

/**
 * Prima deschidere (20 nov 2026, Alex: „mai întâi scanarea, apoi chestionarul”; 3 din 4 renunțau la chestionarul de 8 pași):
 * 1. un singur buton mare „Scanează un produs din casă” (sau „Mai târziu”) — omul vede verdictul în primele secunde;
 * 2. după primul verdict (prima pagină trimite aici cu `?part=who`) sau după „Mai târziu”: doar al cui e telefonul + prenumele;
 * 3. planul scurt + „Ai 5 zile cu tot inclus” — proba pornește singură, fără buton și fără card.
 * Restul întrebărilor vin când contează: „ce a spus medicul” la prima glicemie (`glucose/new`),
 * vârsta și înălțimea la raportul pentru medic (`report`). Fiecare pas trimite `welcome_step`, ca să vedem unde pleacă oamenii.
 */
type Step = "start" | "who" | "name" | "ready";
const STEPS: Step[] = ["start", "who", "name", "ready"];

/** Componentele stau în afara ecranului: definite înăuntru, ar fi recreate la fiecare literă și câmpul ar pierde focusul (iOS, 11 nov 2026). */
type Th = ReturnType<typeof useTheme>;
const Opt = ({ label, on, onPress, t, k }: { label: string; on: boolean; onPress: () => void; t: Th; k: number }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}
    style={{ borderWidth: 2, borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accentSoft : t.surface, borderRadius: 16, padding: 18 }}>
    <Text style={{ color: t.ink, fontSize: 19 * k, fontWeight: on ? "700" : "500" }}>{on ? "● " : "○ "}{label}</Text>
  </Pressable>
);
const Title = ({ children, t, k }: { children: string; t: Th; k: number }) => <Text style={{ color: t.ink, fontSize: 28 * k, fontWeight: "800", letterSpacing: -0.4, lineHeight: 36 * k }}>{children}</Text>;

export default function Welcome() {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { part } = useLocalSearchParams<{ part?: string }>();
  const { t: s, s: state, set } = useStore();
  const [step, setStep] = useState<Step>(part === "who" ? "who" : "start");
  const [who, setWho] = useState<Profile["forWhom"] | null>(state.profile?.forWhom ?? null);
  const [name, setName] = useState(state.name ?? "");
  useEffect(() => { track("welcome_step", { step, from: part ?? "" }); }, [step]);

  /** proba pornește singură (fără card): la primul scan sau la sfârșitul celor două întrebări */
  const trialStart = () => {
    if (!state.trialStart) track("trial_start", { auto: true });
    return state.trialStart ?? Date.now();
  };
  const scanFirst = () => { set({ welcomed: true, trialStart: trialStart() }); router.replace("/scan"); };

  const finish = () => {
    const profile: Profile = { ...state.profile, forWhom: who ?? "me", concerns: state.profile?.concerns ?? [] };
    // rolul în familie se deduce din răspuns; părintele tot trebuie să accepte explicit pe ecranul Familie
    const family = who === "child" ? { ...state.family, role: "child" as const } : { ...state.family, role: "parent" as const, consent: false };
    set({ profile, name: name.trim(), family: state.family.role ? state.family : family, welcomed: true, trialStart: trialStart() });
    track("welcome_done", { who: who ?? "me", first: state.history.length > 0 ? "scan" : "later" });
    router.replace("/");
    // copilul merge direct la „pune codul părintelui”
    if (who === "child") setTimeout(() => router.push("/family"), 50);
  };

  const canNext = step === "who" ? who != null : step === "name" ? name.trim().length > 0 : true;
  const next = () => {
    if (!canNext) return;
    if (step === "ready") return finish();
    setStep(STEPS[STEPS.indexOf(step) + 1]);
  };
  const i = STEPS.indexOf(step);
  const back = () => { if (i > 1) setStep(STEPS[i - 1]); };

  const planName = name.trim() || s.q_name_ph;
  const planLines: { icon: IconName; text: string }[] = who === "child" ? [
    { icon: "family", text: s.q_plan_family_child },
    { icon: "barcode", text: s.q_plan_scan },
    { icon: "report", text: s.q_plan_report },
  ] : [
    { icon: "barcode", text: s.q_plan_scan },
    { icon: "plate", text: s.q_plan_plate },
    { icon: "drop", text: s.q_plan_glu },
    { icon: "family", text: s.q_plan_family_me },
  ];

  if (step === "start") return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 24 }}>
        <View style={{ alignItems: "center", gap: 20 }}>
          <View style={{ width: 120, height: 120, borderRadius: 38, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}><Icon name="barcode" size={66} color={t.accent} strokeWidth={1.8} /></View>
          <Text style={{ color: t.ink, fontSize: 30 * k, fontWeight: "800", textAlign: "center", letterSpacing: -0.5, lineHeight: 38 * k }}>{s.w_hero_title}</Text>
          <Text style={{ color: t.muted, fontSize: 19 * k, textAlign: "center", lineHeight: 27 * k }}>{s.w_hero_text}</Text>
        </View>
        <Button title={s.w_scan_first} size="xl" onPress={scanFirst} />
        <Pressable onPress={() => setStep("who")} hitSlop={12} accessibilityRole="button">
          <Text style={{ color: t.muted, fontSize: 17 * k, textAlign: "center", textDecorationLine: "underline" }}>{s.w_later}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, height: 48 }}>
        {i > 1 ? <Pressable onPress={back} hitSlop={12} accessibilityRole="button"><Text style={{ color: t.muted, fontSize: 17 * k, fontWeight: "600" }}>‹ {s.w_next === "Next" ? "Back" : s.w_next === "Weiter" ? "Zurück" : "Înapoi"}</Text></Pressable> : <View />}
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", gap: 5 }}>
          {STEPS.slice(1).map((_, j) => <View key={j} style={{ width: j + 1 === i ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: j + 1 <= i ? t.accent : t.line }} />)}
        </View>
      </View>
      {/* fără KeyboardAvoidingView și fără Stack.Screen în interior (tastatura dispărea pe iOS într-un ecran modal, 11–12 nov 2026) */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, gap: 16, flexGrow: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
        {step === "who" && (<><Title t={t} k={k}>{s.q_who}</Title>
          <Opt t={t} k={k} label={s.q_who_me} on={who === "me"} onPress={() => setWho("me")} />
          <Opt t={t} k={k} label={s.q_who_parent} on={who === "parent"} onPress={() => setWho("parent")} />
          <Opt t={t} k={k} label={s.q_who_child} on={who === "child"} onPress={() => setWho("child")} /></>)}
        {step === "name" && (<><Title t={t} k={k}>{who === "me" || who === "child" ? s.q_name : s.q_name_parent}</Title>
          <TextInput value={name} onChangeText={setName} placeholder={s.q_name_ph} placeholderTextColor={t.muted} autoFocus autoCapitalize="words" returnKeyType="done" onSubmitEditing={next} accessibilityLabel={s.q_name}
            style={{ borderWidth: 2, borderColor: name ? t.accent : t.line, borderRadius: 16, padding: 18, fontSize: 26 * k, fontWeight: "700", color: t.ink, backgroundColor: t.surface }} /></>)}
        {step === "ready" && (<><Title t={t} k={k}>{s.q_plan_title(planName)}</Title>
          <View style={{ backgroundColor: t.surface, borderRadius: 20, padding: 18, gap: 16, borderWidth: 1, borderColor: t.line }}>
            {planLines.map((l, j) => (
              <View key={j} style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
                <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}><Icon name={l.icon} size={26} color={t.accent} strokeWidth={2} /></View>
                <Text style={{ flex: 1, color: t.ink, fontSize: 17 * k, lineHeight: 24 * k }}>{l.text}</Text>
              </View>
            ))}
          </View>
          <Text style={{ color: t.ink, fontSize: 19 * k, fontWeight: "800", textAlign: "center" }}>{s.w_trial_auto}</Text></>)}
        {/* butonul e în zona derulabilă, ca tastatura să nu-l acopere (iOS, 12 nov 2026) */}
        <View style={{ marginTop: "auto", paddingTop: 20 }}>
          <Button title={step === "ready" ? s.w_start : s.w_next} size="xl" disabled={!canNext} onPress={next} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
