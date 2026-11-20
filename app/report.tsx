import { useState, useEffect } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { buildReport } from "../src/engine/report";
import { reportHtml } from "../src/report/html";
import { useGate } from "../src/access";
import { useStore } from "../src/store";
import { track, resetAnalytics } from "../src/analytics";
import { useTheme } from "../src/theme";
import { Button, Card, Hint, Title, useScale } from "../src/ui/Primitives";

const LOCALE = { ro: "ro-RO", en: "en-GB", de: "de-DE" } as const;

/** Raportul pentru medic: 30 de zile într-un PDF, trimis prin orice aplicație (WhatsApp, e-mail) sau printat. */
export default function Report() {
  const t = useTheme(); const k = useScale();
  const { t: s, s: state, set } = useStore();
  const gate = useGate(state);
  useEffect(() => { gate("report"); }, []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // vârsta și înălțimea se cer aici, unde contează (au ieșit din chestionarul de start, 20 nov 2026); opțional
  const askBody = !!state.profile && state.profile.forWhom !== "child" && (!state.profile.age || !state.profile.heightCm);
  const [age, setAge] = useState(state.profile?.age ? String(state.profile.age) : "");
  const [height, setHeight] = useState(state.profile?.heightCm ? String(state.profile.heightCm) : "");
  const numOk = (v: string, lo: number, hi: number) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= lo && n <= hi ? n : undefined; };
  const saveBody = () => {
    if (!state.profile) return state.profile;
    const p = { ...state.profile, age: numOk(age, 10, 110) ?? state.profile.age, heightCm: numOk(height, 100, 230) ?? state.profile.heightCm };
    set({ profile: p }); return p;
  };
  const r = buildReport({ glucose: state.glucose, meals: state.meals, walks: state.walks ?? [], meds: state.meds, medLog: state.medLog, weights: state.weights ?? [] });
  const empty = r.glucose.count === 0 && r.meals.count === 0;

  const make = async () => {
    const profile = askBody ? saveBody() : state.profile;
    setBusy(true); setErr("");
    try {
      const html = reportHtml(r, s, { name: state.name, unit: state.unit, locale: LOCALE[state.lang], profile });
      const { uri } = await Print.printToFileAsync({ html }); track("report_made");
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: s.rep_share });
      else await Print.printAsync({ uri });
    } catch (e) { setErr(String(e)); }
    finally { setBusy(false); }
  };

  const Stat = ({ v, l }: { v: string; l: string }) => (
    <View style={{ flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 14, padding: 12 }}>
      <Text style={{ fontSize: 24 * k, fontWeight: "800", color: t.ink }}>{v}</Text>
      <Text style={{ fontSize: 13 * k, color: t.muted }}>{l}</Text>
    </View>
  );
  const u = (v: number) => (state.unit === "mg" ? String(Math.round(v)) : (v / 18).toFixed(1));

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: s.rep_title }} />
      <Title>{s.rep_title}</Title>
      <Hint>{s.rep_sub}</Hint>
      {askBody && (
        <Card style={{ gap: 10 }}>
          <Text style={{ color: t.ink, fontSize: 18 * k, fontWeight: "800" }}>{s.w_body_ask}</Text>
          <Hint>{s.q_body_hint}</Hint>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput value={age} onChangeText={setAge} onEndEditing={saveBody} keyboardType="number-pad" placeholder={s.q_age} placeholderTextColor={t.muted} accessibilityLabel={s.q_age}
              style={{ flex: 1, borderWidth: 2, borderColor: t.line, borderRadius: 14, padding: 12, fontSize: 20 * k, fontWeight: "700", color: t.ink, backgroundColor: t.surface }} />
            <TextInput value={height} onChangeText={setHeight} onEndEditing={saveBody} keyboardType="number-pad" placeholder={s.q_height} placeholderTextColor={t.muted} accessibilityLabel={s.q_height}
              style={{ flex: 1, borderWidth: 2, borderColor: t.line, borderRadius: 14, padding: 12, fontSize: 20 * k, fontWeight: "700", color: t.ink, backgroundColor: t.surface }} />
          </View>
        </Card>
      )}
      {empty ? <Card><Hint>{s.rep_empty}</Hint></Card> : (
        <>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Stat v={r.glucose.avg != null ? u(r.glucose.avg) : "–"} l={`${s.rep_avg} ${state.unit === "mg" ? "mg/dL" : "mmol/L"}`} />
            <Stat v={r.glucose.inRange != null ? `${r.glucose.inRange}%` : "–"} l={s.rep_inrange} />
            <Stat v={String(r.glucose.count)} l={s.rep_readings} />
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Stat v={String(r.meals.count)} l={s.rep_meals} />
            <Stat v={`${r.walks.minutes} min`} l={s.rep_walks} />
            <Stat v={`${r.goodDays}/${r.goodDays + r.lessDays}`} l={s.cal_good} />
          </View>
          <Button title={busy ? s.rep_making : "📄 " + s.rep_make} size="xl" onPress={make} disabled={busy} />
          {err ? <Hint style={{ color: t.bad }}>{err}</Hint> : null}
        </>
      )}
    </ScrollView>
  );
}
