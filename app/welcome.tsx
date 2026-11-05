import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore, type Profile } from "../src/store";
import { useTheme } from "../src/theme";
import { Icon, type IconName } from "../src/ui/Icon";
import { Button, Hint, useScale } from "../src/ui/Primitives";

/**
 * Prima deschidere: un chestionar scurt (next-next-next), apoi „Planul pentru …” și ecranul de probă.
 * Nu e tutorial și nu e cont. Răspunsurile personalizează prima pagină, tonul și raportul pentru medic.
 * Fără diagnostic: „ce ți-a spus medicul” e doar ce spune omul.
 */
type Step = "intro" | "who" | "name" | "cond" | "body" | "concern" | "meter" | "plan";
const STEPS: Step[] = ["intro", "who", "name", "cond", "body", "concern", "meter", "plan"];

export default function Welcome() {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state, set, addWeight } = useStore();
  const [i, setI] = useState(0);
  const [who, setWho] = useState<Profile["forWhom"] | null>(state.profile?.forWhom ?? null);
  const [name, setName] = useState(state.name ?? "");
  const [cond, setCond] = useState<Profile["condition"] | null>(state.profile?.condition ?? null);
  const [age, setAge] = useState(state.profile?.age ? String(state.profile.age) : "");
  const [height, setHeight] = useState(state.profile?.heightCm ? String(state.profile.heightCm) : "");
  const [weight, setWeight] = useState("");
  const [concerns, setConcerns] = useState<string[]>(state.profile?.concerns ?? []);
  const [meter, setMeter] = useState<boolean | null>(state.profile?.meter ?? null);
  const step = STEPS[i];
  const last = step === "plan";
  const num = (v: string) => { const n = parseFloat(v.replace(",", ".")); return Number.isFinite(n) && n > 0 ? n : undefined; };

  const canNext = step === "who" ? who != null : step === "name" ? name.trim().length > 0 : step === "cond" ? cond != null : step === "concern" ? concerns.length > 0 : step === "meter" ? meter != null : true;

  const save = () => {
    const profile: Profile = { forWhom: who ?? "me", condition: cond ?? "unsure", age: num(age), heightCm: num(height), concerns, meter: meter ?? undefined };
    set({ profile, name: name.trim() });
    const kg = num(weight);
    if (kg && kg >= 30 && kg <= 300 && !(state.weights ?? []).length) addWeight(kg);
  };
  const next = () => {
    if (!canNext) return;
    if (step === "meter") save();
    if (last) { router.replace("/paywall"); return; }
    setI(i + 1);
  };
  const back = () => setI(Math.max(0, i - 1));
  const toggle = (c: string) => setConcerns((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  const Opt = ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={{ borderWidth: 2, borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accentSoft : t.surface, borderRadius: 16, padding: 18 }}>
      <Text style={{ color: t.ink, fontSize: 19 * k, fontWeight: on ? "700" : "500" }}>{on ? "● " : "○ "}{label}</Text>
    </Pressable>
  );
  const Field = ({ label, value, onChange, ph }: { label: string; value: string; onChange: (v: string) => void; ph: string }) => (
    <View style={{ gap: 6 }}>
      <Text style={{ color: t.muted, fontSize: 15 * k, fontWeight: "700" }}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} keyboardType="number-pad" placeholder={ph} placeholderTextColor={t.muted} accessibilityLabel={label}
        style={{ borderWidth: 2, borderColor: t.line, borderRadius: 14, padding: 14, fontSize: 24 * k, fontWeight: "700", color: t.ink, backgroundColor: t.surface }} />
    </View>
  );
  const Title = ({ children }: { children: string }) => <Text style={{ color: t.ink, fontSize: 28 * k, fontWeight: "800", letterSpacing: -0.4, lineHeight: 36 * k }}>{children}</Text>;

  const planName = name.trim() || s.q_name_ph;
  const planLines: { icon: IconName; text: string }[] = [
    { icon: "barcode", text: s.q_plan_scan },
    { icon: "plate", text: s.q_plan_plate },
    { icon: "drop", text: meter === false ? s.q_plan_glu_nometer : s.q_plan_glu },
    ...(concerns.includes("meds") ? [{ icon: "pill" as IconName, text: s.q_plan_meds }] : []),
    ...(concerns.includes("weight") || num(weight) ? [{ icon: "walk" as IconName, text: s.q_plan_weight }] : []),
    { icon: "family", text: who === "child" ? s.q_plan_family_child : s.q_plan_family_me },
    { icon: "report", text: s.q_plan_report },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, height: 48 }}>
        {i > 0 && !last ? <Pressable onPress={back} hitSlop={12} accessibilityRole="button"><Text style={{ color: t.muted, fontSize: 17 * k, fontWeight: "600" }}>‹ {s.w_next === "Next" ? "Back" : s.w_next === "Weiter" ? "Zurück" : "Înapoi"}</Text></Pressable> : <View />}
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", gap: 5 }}>
          {STEPS.map((_, j) => <View key={j} style={{ width: j === i ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: j <= i ? t.accent : t.line }} />)}
        </View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16, flexGrow: 1, justifyContent: step === "intro" ? "center" : "flex-start" }} keyboardShouldPersistTaps="handled">
          {step === "intro" && (
            <View style={{ alignItems: "center", gap: 24 }}>
              <View style={{ width: 120, height: 120, borderRadius: 38, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}><Icon name="care" size={66} color={t.accent} strokeWidth={1.8} /></View>
              <Text style={{ color: t.ink, fontSize: 30 * k, fontWeight: "800", textAlign: "center", letterSpacing: -0.5 }}>{s.q_intro_title}</Text>
              <Text style={{ color: t.muted, fontSize: 19 * k, textAlign: "center" }}>{s.q_intro_text}</Text>
            </View>
          )}
          {step === "who" && (<><Title>{s.q_who}</Title>
            <Opt label={s.q_who_me} on={who === "me"} onPress={() => setWho("me")} />
            <Opt label={s.q_who_parent} on={who === "parent"} onPress={() => setWho("parent")} />
            <Opt label={s.q_who_child} on={who === "child"} onPress={() => setWho("child")} /></>)}
          {step === "name" && (<><Title>{who === "me" || who === "child" ? s.q_name : s.q_name_parent}</Title>
            <TextInput value={name} onChangeText={setName} placeholder={s.q_name_ph} placeholderTextColor={t.muted} autoFocus autoCapitalize="words" returnKeyType="done" onSubmitEditing={next} accessibilityLabel={s.q_name}
              style={{ borderWidth: 2, borderColor: name ? t.accent : t.line, borderRadius: 16, padding: 18, fontSize: 26 * k, fontWeight: "700", color: t.ink, backgroundColor: t.surface }} /></>)}
          {step === "cond" && (<><Title>{s.q_cond}</Title>
            {(["t2", "pre", "t1", "unsure"] as const).map((c) => <Opt key={c} label={s[`q_cond_${c}`]} on={cond === c} onPress={() => setCond(c)} />)}</>)}
          {step === "body" && (<><Title>{s.q_body}</Title><Hint>{s.q_body_hint}</Hint>
            <Field label={s.q_age} value={age} onChange={setAge} ph="65" />
            <Field label={s.q_height} value={height} onChange={setHeight} ph="170" />
            <Field label={s.q_weight} value={weight} onChange={setWeight} ph="80" /></>)}
          {step === "concern" && (<><Title>{s.q_concern}</Title><Hint>{s.q_concern_hint}</Hint>
            {([["food", s.q_c_food], ["glu", s.q_c_glu], ["meds", s.q_c_meds], ["weight", s.q_c_weight], ["family", s.q_c_family]] as const).map(([c, l]) => <Opt key={c} label={l} on={concerns.includes(c)} onPress={() => toggle(c)} />)}</>)}
          {step === "meter" && (<><Title>{s.q_meter}</Title>
            <Opt label={s.q_yes} on={meter === true} onPress={() => setMeter(true)} />
            <Opt label={s.q_no} on={meter === false} onPress={() => setMeter(false)} /></>)}
          {step === "plan" && (<><Title>{s.q_plan_title(planName)}</Title>
            <View style={{ backgroundColor: t.surface, borderRadius: 20, padding: 18, gap: 16, borderWidth: 1, borderColor: t.line }}>
              {planLines.map((l, j) => (
                <View key={j} style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
                  <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}><Icon name={l.icon} size={26} color={t.accent} strokeWidth={2} /></View>
                  <Text style={{ flex: 1, color: t.ink, fontSize: 17 * k, lineHeight: 24 * k }}>{l.text}</Text>
                </View>
              ))}
            </View>
            <Hint>{s.q_plan_pre}</Hint></>)}
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={{ padding: 20 }}>
        <Button title={last ? s.w_start : s.w_next} size="xl" disabled={!canNext} onPress={next} />
      </View>
    </SafeAreaView>
  );
}
