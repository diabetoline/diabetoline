import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { fetchParentEntries, type Entry } from "../../src/family/sync";
import { gluClass } from "../../src/engine/days";
import { useStore } from "../../src/store";
import { levelColor, useTheme } from "../../src/theme";
import { Button, Card, Hint, Label, Title, useScale } from "../../src/ui/Primitives";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { buildReport } from "../../src/engine/report";
import { reportHtml } from "../../src/report/html";
import { dayKeyLocal } from "../../src/engine/days";

/** Ecranul copilului: jurnalul părintelui pe ultimele 14 zile, cu ce merită urmărit sus. */
export default function ParentJournal() {
  const t = useTheme(); const k = useScale();
  const { t: s, s: state } = useStore();
  const parent = state.family.parent;
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    if (!parent) return;
    try { setRows(await fetchParentEntries(parent.parentId)); setErr(""); } catch (e) { setErr(s.fam_sync_err); }
  }, [parent?.parentId]);
  useEffect(() => { load(); }, [load]);

  const [making, setMaking] = useState(false);
  /** Raportul pentru medic din jurnalul părintelui (intrările de pe server → același motor de raport). */
  const makeReport = async () => {
    if (!rows) return;
    setMaking(true);
    try {
      const all = await fetchParentEntries(parent!.parentId, 31);
      const ts = (e: Entry) => new Date(e.t).getTime();
      const glucose = all.filter((e) => e.kind === "glucose").map((e) => ({ v: Number(e.data.v), ctx: String(e.data.ctx), t: ts(e), note: String(e.data.note ?? "") }));
      const meals = all.filter((e) => e.kind === "meal").map((e) => ({ level: (e.data.level as "green" | "yellow" | "red" | null) ?? undefined, t: ts(e), name: (e.data.name as string) ?? undefined, slot: String(e.data.slot), carbs: typeof e.data.carbs === "number" ? e.data.carbs : undefined }));
      const walks = all.filter((e) => e.kind === "walk").map((e) => ({ t: ts(e), min: Number(e.data.min) }));
      const weights = all.filter((e) => e.kind === "weight").map((e) => ({ t: ts(e), kg: Number(e.data.kg) }));
      // medicamentele: din prizele bifate reconstruim lista (nume + ore văzute)
      const medMap = new Map<string, Set<string>>();
      for (const e of all.filter((x) => x.kind === "med")) { const n = String(e.data.name); if (!medMap.has(n)) medMap.set(n, new Set()); medMap.get(n)!.add(String(e.data.time)); }
      const meds = [...medMap.entries()].map(([name, times]) => ({ id: name, name, times: [...times].sort() }));
      const medLog = all.filter((e) => e.kind === "med").map((e) => ({ medId: String(e.data.name), time: String(e.data.time), day: dayKeyLocal(ts(e)) }));
      const r = buildReport({ glucose, meals, walks, meds, medLog, weights });
      const LOCALE = { ro: "ro-RO", en: "en-GB", de: "de-DE" } as const;
      const html = reportHtml(r, s, { name: parent!.name, unit: state.unit, locale: LOCALE[state.lang] });
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: s.rep_share }); else await Print.printAsync({ uri });
    } catch (e) { setErr(String((e as Error)?.message ?? e)); }
    finally { setMaking(false); }
  };

  if (!parent) return null;
  const toU = (v: number) => (state.unit === "mg" ? String(Math.round(v)) : (v / 18).toFixed(1));
  const col = { low: t.bad, ok: t.ok, high: t.warn } as const;
  const since3 = Date.now() - 3 * 864e5;

  // de urmărit: ultimele 3 zile
  const alerts: string[] = [];
  for (const r of rows ?? []) {
    const tt = new Date(r.t).getTime(); if (tt < since3) continue;
    const when = new Date(r.t).toLocaleDateString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
    if (r.kind === "glucose") { const c = gluClass(Number(r.data.v), String(r.data.ctx)); if (c === "high") alerts.push(`${s.fam_alert_high}: ${toU(Number(r.data.v))} · ${when}`); if (c === "low") alerts.push(`${s.fam_alert_low}: ${toU(Number(r.data.v))} · ${when}`); }
    if (r.kind === "meal" && r.data.level === "red") alerts.push(`${s.fam_alert_heavy}: ${r.data.name ?? s.meal} · ${when}`);
  }

  const days = new Map<string, Entry[]>();
  for (const r of rows ?? []) { const d = r.t.slice(0, 10); if (!days.has(d)) days.set(d, []); days.get(d)!.push(r); }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: parent.name }} />
      <Title>{s.fam_parent_of(parent.name)}</Title>
      {rows == null && !err && <ActivityIndicator color={t.accent} size="large" />}
      {err ? <Hint style={{ color: t.bad }}>{err}</Hint> : null}

      {rows && (
        <Card style={alerts.length ? { borderColor: t.warn, borderWidth: 2 } : undefined}>
          <Label>{s.fam_attention}</Label>
          {alerts.length === 0 ? <Hint>{s.fam_quiet}</Hint> : alerts.slice(0, 6).map((a, i) => <Text key={i} style={{ color: t.ink, fontSize: 17 * k }}>⚠️ {a}</Text>)}
        </Card>
      )}

      {rows && rows.length === 0 && <Hint>{s.fam_no_entries}</Hint>}
      {[...days.entries()].map(([d, list]) => (
        <Card key={d}>
          <Label>{new Date(list[0].t).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</Label>
          {list.map((r) => {
            const time = new Date(r.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            if (r.kind === "glucose") { const v = Number(r.data.v); const c = gluClass(v, String(r.data.ctx)); return (
              <Row key={r.client_id} left={<Text style={{ fontSize: 24 * k, fontWeight: "800", color: col[c], width: 70, fontVariant: ["tabular-nums"] }}>{toU(v)}</Text>} text={s.ctx[String(r.data.ctx)] ?? ""} sub={c === "ok" ? s.g_ok : c === "low" ? s.g_low : s.g_high} time={time} />); }
            if (r.kind === "meal") { const lv = r.data.level as "green" | "yellow" | "red" | null; return (
              <Row key={r.client_id} left={<Text style={{ fontSize: 22 }}>🍽️</Text>} text={String(r.data.name ?? s.meal)} sub={lv ? (lv === "green" ? s.meal_green : lv === "yellow" ? s.meal_yellow : s.meal_red) : s[`meal_${r.data.slot}` as "meal_lunch"]} dot={lv ? levelColor(t, lv).fg : undefined} time={time} />); }
            if (r.kind === "med") return <Row key={r.client_id} left={<Text style={{ fontSize: 22 }}>💊</Text>} text={`${r.data.name} · ${s.med_taken}`} time={time} />;
            if (r.kind === "weight") return <Row key={r.client_id} left={<Text style={{ fontSize: 22 }}>⚖️</Text>} text={s.wt_entry(Number(r.data.kg))} time={time} />;
            if (r.kind === "walk") return <Row key={r.client_id} left={<Text style={{ fontSize: 22 }}>🚶</Text>} text={s.walk_entry(Number(r.data.min))} time={time} />;
            return <Row key={r.client_id} left={<Text style={{ fontSize: 22 }}>🛒</Text>} text={String(r.data.name)} dot={r.data.level ? levelColor(t, r.data.level as "green").fg : undefined} time={time} />;
          })}
        </Card>
      ))}
      {rows && rows.length > 0 && <Button title={making ? s.rep_making : "📄 " + s.rep_title} size="xl" disabled={making} onPress={makeReport} />}
      <Button title={s.fam_refresh} kind="soft" onPress={() => { setRows(null); load(); }} />
    </ScrollView>
  );
}
function Row({ left, text, sub, dot, time }: { left: React.ReactNode; text: string; sub?: string; dot?: string; time: string }) {
  const t = useTheme(); const k = useScale();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}>
      {left}
      <View style={{ flex: 1 }}><Text style={{ color: t.ink, fontSize: 16 * k }} numberOfLines={2}>{text}</Text>{sub ? <Text style={{ color: t.muted, fontSize: 14 * k }}>{sub}</Text> : null}</View>
      {dot && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: dot }} />}
      <Text style={{ color: t.muted, fontSize: 14 * k }}>{time}</Text>
    </View>
  );
}
