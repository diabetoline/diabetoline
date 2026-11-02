import { Image, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { dayKeyLocal, gluClass } from "../engine/days";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { useScale } from "./Primitives";

/**
 * Antetul primei pagini: salut după oră, cum stă ziua (inelul cu 4 pași: glicemie, masă, mișcare, medicamente)
 * și o propoziție cu ce mai e de făcut. Sobru, fără personaje.
 */
export function DayHeader() {
  const t = useTheme(); const k = useScale();
  const { t: s, s: state } = useStore();
  const h = new Date().getHours();
  const hi = h < 11 ? s.hi_morning : h < 18 ? s.hi_day : s.hi_evening;
  const today = dayKeyLocal(Date.now());
  const glu = state.glucose.filter((g) => dayKeyLocal(g.t) === today);
  const meals = state.meals.filter((m) => dayKeyLocal(m.t) === today);
  const walked = (state.walks ?? []).some((w) => dayKeyLocal(w.t) === today);
  const nowHM = new Date().toTimeString().slice(0, 5);
  const medsDue = state.meds.flatMap((m) => m.times.filter((time) => time <= nowHM).map((time) => ({ m, time })));
  const medsOk = medsDue.every(({ m, time }) => state.medLog.some((l) => l.medId === m.id && l.time === time && l.day === today));
  const steps = [
    { ok: glu.length > 0, label: s.d_glu, show: true },
    { ok: meals.length > 0, label: s.d_meal, show: true },
    { ok: walked, label: s.d_move, show: h >= 12 },
    { ok: medsOk && medsDue.length > 0, label: s.d_meds, show: state.meds.length > 0 },
  ].filter((x) => x.show);
  const done = steps.filter((x) => x.ok).length;
  const todo = steps.filter((x) => !x.ok).map((x) => x.label);
  const anyOut = glu.some((g) => gluClass(g.v, g.ctx) !== "ok") || meals.some((m) => m.level === "red" && !walked);
  const nothing = glu.length === 0 && meals.length === 0 && !walked;
  const line = nothing ? s.day_empty : todo.length === 0 && !anyOut ? s.day_all_good : s.day_todo(todo.join(", ") || s.d_move);
  const ring = anyOut ? t.warn : t.ok;

  const R = 30, C = 2 * Math.PI * R, pct = steps.length ? done / steps.length : 0;
  const dark = useTheme().bg === "#0F161D";
  return (
    <LinearGradient colors={dark ? ["#163527", "#0F161D"] : ["#E4F3E9", "#EEF2F5"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18, gap: 14 }}>
      <Image source={require("../../assets/logo-wordmark.png")} style={{ width: 140, height: 140 * 153 / 1062 }} resizeMode="contain" accessibilityLabel="Diabetoline" />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: t.ink, fontSize: 26 * k, fontWeight: "800", letterSpacing: -0.4 }}>{hi}{state.name ? `, ${state.name}` : ""}</Text>
          <Text style={{ color: t.ink, opacity: 0.8, fontSize: 16 * k, lineHeight: 23 * k }}>{line}</Text>
        </View>
        <View style={{ width: 76, height: 76, alignItems: "center", justifyContent: "center" }} accessibilityLabel={s.day_progress(done, steps.length)}>
          <Svg width={76} height={76} viewBox="0 0 76 76" style={{ position: "absolute" }}>
            <Circle cx="38" cy="38" r={R} stroke={t.line} strokeWidth="7" fill="none" />
            <Circle cx="38" cy="38" r={R} stroke={ring} strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray={`${C * pct} ${C}`} transform="rotate(-90 38 38)" />
          </Svg>
          <Text style={{ color: t.ink, fontSize: 17 * k, fontWeight: "800" }}>{done}/{steps.length}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}
