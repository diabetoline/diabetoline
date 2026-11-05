import { Image, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { deviceLang, type Lang } from "../i18n";
import { Icon } from "./Icon";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { dayKeyLocal, gluClass } from "../engine/days";
import buildInfo from "../build.json";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { useScale } from "./Primitives";

/**
 * Antetul primei pagini: salut după oră, cum stă ziua (inelul cu 4 pași: glicemie, masă, mișcare, medicamente)
 * și o propoziție cu ce mai e de făcut. Sobru, fără personaje.
 */
export function DayHeader() {
  const t = useTheme(); const k = useScale();
  const { t: s, s: state, set } = useStore();
  const router = useRouter();
  const first = deviceLang();
  const langs: Lang[] = [first, ...(["ro", "en", "de"] as Lang[]).filter((l) => l !== first)];
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
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Image source={require("../../assets/logo-wordmark.png")} style={{ width: 200, height: 200 * 153 / 1062 }} resizeMode="contain" accessibilityLabel="Diabetoline" />
        <View style={{ flexDirection: "row", backgroundColor: t.surface, borderRadius: 999, padding: 3, borderWidth: 1, borderColor: t.line }} accessibilityLabel={s.lang_pick}>
          {langs.map((l) => (
            <Pressable key={l} onPress={() => set({ lang: l, langManual: true })} accessibilityRole="button" accessibilityState={{ selected: state.lang === l }}
              style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: state.lang === l ? t.accent : "transparent" }}>
              <Text style={{ color: state.lang === l ? t.accentInk : t.muted, fontWeight: "800", fontSize: 13 }}>{l.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: t.ink, fontSize: 20 * k, fontWeight: "700", letterSpacing: -0.2 }}>{hi}{state.name ? `, ${state.name}` : ""}</Text>
          <Text style={{ color: t.ink, opacity: 0.8, fontSize: 15 * k, lineHeight: 21 * k }}>{line}</Text>
          <Text style={{ color: t.muted, fontSize: 10, opacity: 0.6 }}>v{(process.env.EXPO_PUBLIC_BUILD ?? buildInfo.sha).slice(0, 7)}</Text>
        </View>
        <Pressable onPress={() => router.push("/ask")} accessibilityRole="button" accessibilityLabel={s.ask_title} style={({ pressed }) => ({ width: 52, height: 52, borderRadius: 26, backgroundColor: t.accent, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.85 : 1 })}>
          <Icon name="chat" size={26} color={t.accentInk} />
        </Pressable>
        <View style={{ width: 68, height: 68, alignItems: "center", justifyContent: "center" }} accessibilityLabel={s.day_progress(done, steps.length)}>
          <Svg width={68} height={68} viewBox="0 0 76 76" style={{ position: "absolute" }}>
            <Circle cx="38" cy="38" r={R} stroke={t.line} strokeWidth="7" fill="none" />
            <Circle cx="38" cy="38" r={R} stroke={ring} strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray={`${C * pct} ${C}`} transform="rotate(-90 38 38)" />
          </Svg>
          <Text style={{ color: t.ink, fontSize: 15 * k, fontWeight: "800" }}>{done}/{steps.length}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}
