import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ctxForHour, useStore, type GluCtx } from "../../src/store";
import { useTheme } from "../../src/theme";
import { Button, Card, Hint, Label, Title, useScale } from "../../src/ui/Primitives";

const CTX: GluCtx[] = ["fasting", "pre", "post2h", "evening", "other"];

export default function NewGlucose() {
  const { after } = useLocalSearchParams<{ after?: string }>();
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state, addGlucose } = useStore();
  const [val, setVal] = useState("");
  const [ctx, setCtx] = useState<GluCtx>(after ? "post2h" : ctxForHour(new Date().getHours()));
  const unitLbl = state.unit === "mg" ? "mg/dL" : "mmol/L";
  const parsed = parseFloat(val.replace(",", "."));
  const mg = state.unit === "mg" ? parsed : parsed * 18;
  const valid = Number.isFinite(mg) && mg >= 20 && mg <= 600;

  const save = () => {
    if (!valid) return;
    addGlucose({ v: Math.round(mg), ctx, note: after ? `după ${after}` : "" });
    router.back();
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: s.glu_add }} />
      <Title>{s.glu_add}</Title>
      {after ? <Hint>{after}</Hint> : null}
      <Card>
        <Label>{s.glu_value} ({unitLbl})</Label>
        <TextInput value={val} onChangeText={setVal} keyboardType="decimal-pad" autoFocus placeholder={state.unit === "mg" ? "120" : "6,7"} placeholderTextColor={t.muted} accessibilityLabel={s.glu_value}
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
        <Button title={s.save.split(" ")[0]} size="xl" onPress={save} disabled={!valid} />
      </Card>
      <Hint>{s.glu_hint}</Hint>
    </ScrollView>
  );
}
