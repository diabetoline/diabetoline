import { ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { dayProgress } from "../src/dayplan";
import { dayKeyLocal, gluClass } from "../src/engine/days";
import { say } from "../src/speech";
import { useStore } from "../src/store";
import { daySummary } from "../src/summary";
import { levelColor, useTheme } from "../src/theme";
import { Icon } from "../src/ui/Icon";
import { Button, Card, Hint, Label, useScale } from "../src/ui/Primitives";

/**
 * Raportul zilei (Alex, 15 nov 2026: „mai bine arătăm raportul, ca la cel de medic”): se deschide din notificarea de seară
 * și din lista „Azi”. Același text pozitiv ca în notificare, apoi ce s-a notat: glicemii, mese, mișcare, medicamente. Fără sfaturi medicale.
 * `?d=YYYY-MM-DD` pentru o altă zi (din Jurnal); implicit azi.
 */
export default function DayReport() {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state } = useStore();
  const { d } = useLocalSearchParams<{ d?: string }>();
  const when = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00`).getTime() : Date.now();
  const day = dayKeyLocal(when);
  const p = dayProgress(state, when);
  const sum = daySummary(state, s, when);
  const hm = (ms: number) => new Date(ms).toTimeString().slice(0, 5);
  const unit = state.unit === "mg" ? "mg/dL" : "mmol/L";
  const gv = (v: number) => (state.unit === "mg" ? Math.round(v) : (v / 18).toFixed(1));
  const meds = state.medLog.filter((l) => l.day === day);
  const dateLabel = new Date(when).toLocaleDateString(state.lang === "ro" ? "ro-RO" : state.lang === "de" ? "de-DE" : "en-GB", { weekday: "long", day: "numeric", month: "long" });
  const speak = () => { if (sum) { try { say(`${sum.title}. ${sum.body}`, state.lang).catch(() => {}); } catch {} } };
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: s.day_report }} />
      <Text style={{ color: t.muted, fontSize: 15 * k, textTransform: "capitalize" }}>{dateLabel}</Text>
      {sum ? (
        <Card style={{ gap: 10, borderLeftWidth: 5, borderLeftColor: p.anyOut ? t.warn : t.ok }}>
          <Text style={{ color: t.ink, fontSize: 24 * k, fontWeight: "800" }}>{sum.title}</Text>
          <Text style={{ color: t.ink, fontSize: 18 * k, lineHeight: 27 * k }}>{sum.body}</Text>
          <Button title={`🔊 ${s.speak}`} kind="soft" onPress={speak} />
        </Card>
      ) : (
        <Card><Text style={{ color: t.ink, fontSize: 18 * k }}>{s.day_empty}</Text></Card>
      )}

      <Card style={{ gap: 8 }}>
        <Label>{s.plan_glu}</Label>
        {p.glu.length === 0 && <Hint>{s.day_rep_none}</Hint>}
        {p.glu.map((g) => {
          const c = gluClass(g.v, g.ctx); const col = c === "ok" ? t.ok : c === "low" ? t.bad : t.warn;
          return (
            <View key={g.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: col }} />
              <Text style={{ color: t.ink, fontSize: 18 * k, fontWeight: "700", width: 110 }}>{gv(g.v)} {unit}</Text>
              <Text style={{ color: t.muted, fontSize: 15 * k, flex: 1 }}>{s.ctx[g.ctx]}</Text>
              <Text style={{ color: t.muted, fontSize: 15 * k }}>{hm(g.t)}</Text>
            </View>
          );
        })}
      </Card>

      <Card style={{ gap: 8 }}>
        <Label>{s.meals_label}</Label>
        {p.meals.length === 0 && <Hint>{s.day_rep_none}</Hint>}
        {p.meals.map((m) => (
          <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: m.level ? levelColor(t, m.level).fg : t.line }} />
            <Text style={{ color: t.ink, fontSize: 17 * k, flex: 1 }} numberOfLines={1}>{m.name ?? s[`meal_${m.slot}` as "meal_lunch"]}</Text>
            <Text style={{ color: t.muted, fontSize: 15 * k }}>{hm(m.t)}</Text>
          </View>
        ))}
      </Card>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Card style={{ flex: 1, gap: 4 }}>
          <Label>{s.plan_move}</Label>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Icon name="walk" size={22} color={p.walkMin ? t.ok : t.muted} /><Text style={{ color: t.ink, fontSize: 20 * k, fontWeight: "800" }}>{p.walkMin ? `${p.walkMin} min` : "—"}</Text></View>
        </Card>
        {state.meds.length > 0 && (
          <Card style={{ flex: 1, gap: 4 }}>
            <Label>{s.plan_meds}</Label>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Icon name="pill" size={22} color={meds.length >= p.medsTotal ? t.ok : t.warn} /><Text style={{ color: t.ink, fontSize: 20 * k, fontWeight: "800" }}>{Math.min(meds.length, p.medsTotal)} / {p.medsTotal}</Text></View>
          </Card>
        )}
      </View>

      <Hint>{s.day_rep_note}</Hint>
      <Button title={s.rep_full} kind="ghost" onPress={() => router.push("/report")} />
    </ScrollView>
  );
}
