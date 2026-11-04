import { useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ctxForHour, useStore, type GluCtx } from "../../src/store";
import { useTheme } from "../../src/theme";
import { Button, Card, Hint, Label, Title, useScale } from "../../src/ui/Primitives";
import { Quip } from "../../src/ui/Quip";
import { RecoCard } from "../../src/ui/RecoCard";
import { gluClass } from "../../src/engine/days";

const CTX: GluCtx[] = ["fasting", "pre", "post2h", "evening", "other"];

export default function NewGlucose() {
  const { after } = useLocalSearchParams<{ after?: string }>();
  const t = useTheme(); const k = useScale(); const router = useRouter(); const ins = useSafeAreaInsets();
  const { t: s, s: state, addGlucose } = useStore();
  const [val, setVal] = useState("");
  const [saved, setSaved] = useState<{ v: number; ctx: GluCtx } | null>(null);
  const [ctx, setCtx] = useState<GluCtx>(after ? "post2h" : ctxForHour(new Date().getHours()));
  const unitLbl = state.unit === "mg" ? "mg/dL" : "mmol/L";
  const parsed = parseFloat(val.replace(",", "."));
  const mg = state.unit === "mg" ? parsed : parsed * 18;
  const valid = Number.isFinite(mg) && mg >= 20 && mg <= 600;

  const save = () => {
    if (!valid) return;
    addGlucose({ v: Math.round(mg), ctx, note: after ? `după ${after}` : "" });
    setSaved({ v: Math.round(mg), ctx });
  };
  if (saved) {
    const c = gluClass(saved.v, saved.ctx);
    const col = c === "ok" ? t.ok : c === "low" ? t.bad : t.warn;
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Stack.Screen options={{ title: s.glu_add }} />
        <Card style={{ alignItems: "center", gap: 10, borderColor: col, borderWidth: 2 }}>
          <Text style={{ color: col, fontSize: 48 * k, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{state.unit === "mg" ? saved.v : (saved.v / 18).toFixed(1)}</Text>
          <Text style={{ color: col, fontSize: 20 * k, fontWeight: "700" }}>{c === "ok" ? s.g_ok : c === "low" ? s.g_low : s.g_high} · {s.ctx[saved.ctx]}</Text>
          <Text style={{ color: t.ink, fontSize: 17 * k }}>{s.glu_saved}</Text>
          <Quip k={c === "ok" ? "glu_ok" : c === "low" ? "glu_low" : "glu_high"} seed={saved.v} />
        </Card>
        {c === "high" && <RecoCard placement="glucose_high" />}
        <Button title={s.care_done} size="xl" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
      </ScrollView>
    );
  }
  // Butonul de salvare stă într-o bară fixă jos, deasupra tastaturii, ca să fie mereu la vedere.
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}>
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={{ flex: 1 }}>
      <Stack.Screen options={{ title: s.glu_add }} />
      <Title>{s.glu_add}</Title>
      {after ? <Hint>{after}</Hint> : null}
      <Card>
        <Label>{s.glu_value} ({unitLbl})</Label>
        <TextInput value={val} onChangeText={setVal} keyboardType="decimal-pad" autoFocus returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} placeholder={state.unit === "mg" ? "120" : "6,7"} placeholderTextColor={t.muted} accessibilityLabel={s.glu_value}
          style={{ borderWidth: 2, borderColor: valid ? t.ok : t.line, borderRadius: 14, padding: 16, fontSize: 40 * k, fontWeight: "800", color: t.ink, textAlign: "center", backgroundColor: t.bg, fontVariant: ["tabular-nums"] }} />
        <Label>{s.glu_when}</Label>
        <View style={{ gap: 8 }}>
          {CTX.map((c) => (
            <Pressable key={c} onPress={() => setCtx(c)} accessibilityRole="button"
              style={{ borderWidth: 2, borderColor: ctx === c ? t.accent : t.line, backgroundColor: ctx === c ? t.accentSoft : t.surface, borderRadius: 14, padding: 14 }}>
              <Text style={{ color: t.ink, fontSize: 18 * k, fontWeight: ctx === c ? "700" : "500" }}>{ctx === c ? "● " : "○ "}{s.ctx[c]}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
      <Hint>{s.glu_hint}</Hint>
    </ScrollView>
    <View style={{ padding: 16, paddingBottom: Math.max(ins.bottom, 12), backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.line }}>
      <Button title={s.save.split(" ")[0]} size="xl" onPress={() => { Keyboard.dismiss(); save(); }} disabled={!valid} />
    </View>
    </KeyboardAvoidingView>
  );
}
