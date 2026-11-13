import { useState } from "react";
import { Text, View } from "react-native";
import { scheduleGlucoseCheck } from "../notifications";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { Button, useScale } from "./Primitives";
import { RecoCard } from "./RecoCard";

/**
 * După o glicemie în afara intervalului nu glumim (Alex, 13 nov 2026): pași concreți, generali, fără doze.
 * - ridicată (peste interval): apă, plimbare, nimic dulce, remăsurare la 2 ore, medicamentele ca de obicei
 * - mult peste (≥ 250 mg/dL): în plus „sună medicul azi” și semnele de urgență → 112; fără recomandări de produse
 * - scăzută (< 70): regula clasică — ceva dulce rapid, 15 minute, remăsurare, gustare; semnele de urgență → 112
 */
export const VERY_HIGH = 250;

export function GlucoseGuide({ cls, value }: { cls: "high" | "low"; value: number }) {
  const t = useTheme(); const k = useScale();
  const { t: s, addWalk } = useStore();
  const [walked, setWalked] = useState(false);
  const [remindAt, setRemindAt] = useState<string | null>(null);
  const veryHigh = cls === "high" && value >= VERY_HIGH;
  const col = cls === "low" || veryHigh ? t.bad : t.warn;
  const recheckMin = cls === "low" ? 15 : 120;

  const Step = ({ icon, text, children }: { icon: string; text: string; children?: React.ReactNode }) => (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <Text style={{ fontSize: 26 }}>{icon}</Text>
        <Text style={{ flex: 1, color: t.ink, fontSize: 18 * k, lineHeight: 25 * k }}>{text}</Text>
      </View>
      {children}
    </View>
  );
  const Remind = () => remindAt
    ? <Text style={{ color: t.ok, fontWeight: "700", fontSize: 17 * k }}>✓ {s.care_check_set(remindAt)}</Text>
    : <Button title={s.gg_recheck_btn(recheckMin)} kind="soft" onPress={async () => { const h = await scheduleGlucoseCheck(s, recheckMin); if (h) setRemindAt(h); else alert(s.notif_denied); }} />;

  return (
    <View style={{ gap: 14 }}>
      <View style={{ backgroundColor: t.surface, borderColor: col, borderWidth: 2, borderRadius: 18, padding: 16, gap: 16 }}>
        <Text style={{ color: t.ink, fontSize: 20 * k, fontWeight: "800" }}>{cls === "low" ? s.gg_low_title : veryHigh ? s.gg_vhigh_title : s.gg_high_title}</Text>
        {cls === "low" ? (
          <>
            <Step icon="🍯" text={s.gg_low_sugar} />
            <Step icon="🪑" text={s.gg_low_wait} />
            <Step icon="🩸" text={s.gg_low_recheck}><Remind /></Step>
            <Step icon="🥪" text={s.gg_low_snack} />
            <Step icon="🚨" text={s.gg_low_112} />
            <Step icon="👨‍⚕️" text={s.gg_low_tell} />
          </>
        ) : (
          <>
            {veryHigh && <Step icon="📞" text={s.gg_vhigh_doctor} />}
            {veryHigh && <Step icon="🚨" text={s.gg_vhigh_112} />}
            <Step icon="💧" text={s.gg_water} />
            <Step icon="🚶" text={s.gg_walk(20)}>
              {walked ? <Text style={{ color: t.ok, fontWeight: "700", fontSize: 17 * k }}>✓ {s.care_walk_done}</Text>
                : <Button title={s.care_walk_btn} kind="soft" onPress={() => { addWalk(20); setWalked(true); }} />}
            </Step>
            <Step icon="🚫" text={s.gg_nosweet} />
            <Step icon="🩸" text={s.gg_recheck}><Remind /></Step>
            <Step icon="💊" text={s.gg_meds} />
            {!veryHigh && <Step icon="👨‍⚕️" text={s.gg_repeat} />}
          </>
        )}
      </View>
      {cls === "high" && !veryHigh && <RecoCard placement="glucose_high" />}
    </View>
  );
}
