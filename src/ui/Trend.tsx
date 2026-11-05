import { useMemo, useState } from "react";
import { Platform, Pressable, Text, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { Card, Hint, Label, useScale } from "./Primitives";

type Pt = { t: number; v: number };
const DAY = 864e5;
const FONT = Platform.OS === "web" ? "system-ui, -apple-system, sans-serif" : undefined;

/** Media pe zi (ca să nu fie zimțat când omul notează de mai multe ori). */
function perDay(pts: Pt[], days: number): Pt[] {
  const from = Date.now() - days * DAY;
  const m = new Map<number, number[]>();
  for (const p of pts) if (p.t >= from) { const d = Math.floor(p.t / DAY); (m.get(d) ?? m.set(d, []).get(d)!).push(p.v); }
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([d, vs]) => ({ t: d * DAY, v: vs.reduce((a, b) => a + b, 0) / vs.length }));
}

/**
 * Evoluția pe 30 de zile: glicemia de dimineață (cu banda „în interval”) sau greutatea.
 * Apare doar când sunt cel puțin 3 zile cu date — altfel ar fi un grafic gol și descurajant.
 */
export function Trend() {
  const t = useTheme(); const k = useScale();
  const { t: s, s: state } = useStore();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<"glu" | "kg">("glu");

  const glu = useMemo(() => perDay(state.glucose.filter((g) => g.ctx === "fasting").map((g) => ({ t: g.t, v: g.v })), 30), [state.glucose]);
  const kg = useMemo(() => perDay((state.weights ?? []).map((w) => ({ t: w.t, v: w.kg })), 90), [state.weights]);
  const haveGlu = glu.length >= 3, haveKg = kg.length >= 3;
  if (!haveGlu && !haveKg) return null;
  const cur = tab === "glu" && haveGlu ? "glu" : tab === "kg" && haveKg ? "kg" : haveGlu ? "glu" : "kg";
  const pts = cur === "glu" ? glu : kg;
  const toU = (v: number) => (cur === "kg" ? v.toFixed(1) : state.unit === "mg" ? String(Math.round(v)) : (v / 18).toFixed(1));

  const W = Math.min(width - 32, 600) - 32, H = 150, padL = 44, padB = 22, padT = 10;
  const span = cur === "glu" ? 30 : 90;
  const t0 = Date.now() - span * DAY, t1 = Date.now();
  let lo = Math.min(...pts.map((p) => p.v)), hi = Math.max(...pts.map((p) => p.v));
  if (cur === "glu") { lo = Math.min(lo, 70); hi = Math.max(hi, 140); }
  const pad = (hi - lo) * 0.15 || 1; lo -= pad; hi += pad;
  const X = (tt: number) => padL + ((tt - t0) / (t1 - t0)) * (W - padL);
  const Y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${X(p.t).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
  const first = pts[0].v, last = pts[pts.length - 1].v, delta = last - first;
  const color = cur === "glu" ? t.accent : t.ink;
  const ticks = [lo + pad, (lo + hi) / 2, hi - pad];

  const Tab = ({ id, label }: { id: "glu" | "kg"; label: string }) => (
    <Pressable onPress={() => setTab(id)} accessibilityRole="button" style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: cur === id ? t.accent : t.accentSoft }}>
      <Text style={{ color: cur === id ? "#fff" : t.ink, fontSize: 15 * k, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Label>{s.trend_title}</Label>
        {haveGlu && haveKg && (
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Tab id="glu" label={s.trend_glu} /><Tab id="kg" label={s.trend_kg} />
          </View>
        )}
      </View>
      <Svg width={W} height={H} accessibilityLabel={s.trend_title}>
        {cur === "glu" && <Rect x={padL} y={Y(130)} width={W - padL} height={Math.max(0, Y(70) - Y(130))} fill={t.ok} opacity={0.12} />}
        {ticks.map((v, i) => (
          <SvgText key={i} x={padL - 6} y={Y(v) + 4} fontSize={11} fontFamily={FONT} fill={t.muted} textAnchor="end">{toU(v)}</SvgText>
        ))}
        <Line x1={padL} y1={H - padB} x2={W} y2={H - padB} stroke={t.line} strokeWidth={1} />
        <Path d={d} stroke={color} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <Circle key={i} cx={X(p.t)} cy={Y(p.v)} r={3.5} fill={color} />)}
        <SvgText x={padL} y={H - 6} fontSize={11} fontFamily={FONT} fill={t.muted}>{new Date(t0).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</SvgText>
        <SvgText x={W} y={H - 6} fontSize={11} fontFamily={FONT} fill={t.muted} textAnchor="end">{s.today}</SvgText>
      </Svg>
      <Hint>
        {cur === "glu" ? s.trend_glu_hint : s.trend_kg_hint}{" "}
        {Math.abs(delta) >= (cur === "glu" ? 5 : 0.5) ? (delta < 0 ? "↓ " : "↑ ") + toU(Math.abs(delta)) + (cur === "kg" ? " kg" : "") : s.trend_flat}
      </Hint>
    </Card>
  );
}
