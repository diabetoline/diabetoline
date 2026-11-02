import { useState } from "react";
import { Text, View } from "react-native";
import type { Level } from "../engine/types";
import { scheduleGlucoseCheck } from "../notifications";
import { useStore } from "../store";
import { levelColor, useTheme } from "../theme";
import { Button, useScale } from "./Primitives";
import { Quip } from "./Quip";

/**
 * După o masă „cu măsură” sau „mai grea”: nu certăm, ghidăm.
 * Pași simpli și generali (mișcare, măsurare, apă, masa următoare) — fără doze sau sfaturi medicale.
 */
export function AfterMeal({ level, walkMinutes }: { level: Exclude<Level, "green">; walkMinutes?: number }) {
  const t = useTheme(); const k = useScale();
  const { t: s, addWalk } = useStore();
  const min = walkMinutes && walkMinutes > 0 ? walkMinutes : level === "red" ? 20 : 15;
  const [walked, setWalked] = useState(false);
  const [remindAt, setRemindAt] = useState<string | null>(null);
  const c = levelColor(t, level);

  const Step = ({ icon, text, children }: { icon: string; text: string; children?: React.ReactNode }) => (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <Text style={{ fontSize: 26 }}>{icon}</Text>
        <Text style={{ flex: 1, color: t.ink, fontSize: 18 * k, lineHeight: 25 * k }}>{text}</Text>
      </View>
      {children}
    </View>
  );

  return (
    <View style={{ backgroundColor: t.surface, borderColor: c.fg, borderWidth: 2, borderRadius: 18, padding: 16, gap: 16 }}>
      <Text style={{ color: t.ink, fontSize: 20 * k, fontWeight: "800" }}>{level === "red" ? s.care_title_red : s.care_title_yellow}</Text>

      <Step icon="🚶" text={s.care_walk(min)}>
        {walked ? <View style={{ gap: 4 }}><Text style={{ color: t.ok, fontWeight: "700", fontSize: 17 * k }}>✓ {s.care_walk_done}</Text><Quip k="walk_done" style={{ textAlign: "left" }} /></View>
          : <Button title={s.care_walk_btn} kind="soft" onPress={() => { addWalk(min); setWalked(true); }} />}
      </Step>

      <Step icon="🩸" text={s.care_check}>
        {remindAt ? <Text style={{ color: t.ok, fontWeight: "700", fontSize: 17 * k }}>✓ {s.care_check_set(remindAt)}</Text>
          : <Button title={s.care_check_btn} kind="soft" onPress={async () => { const h = await scheduleGlucoseCheck(s); if (h) setRemindAt(h); else alert(s.notif_denied); }} />}
      </Step>

      <Step icon="💧" text={s.care_water} />
      {level === "red" && <Step icon="🥗" text={s.care_next} />}
      {level === "red" && <Step icon="💊" text={s.care_meds} />}
    </View>
  );
}
