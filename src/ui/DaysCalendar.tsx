import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { dayKeyLocal, dayStatuses } from "../engine/days";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { Card, Hint, Label, useScale } from "./Primitives";

/** Calendarul lunii: verde = zi bună, portocaliu = zi mai puțin bună, gol = nimic notat. */
export function DaysCalendar() {
  const t = useTheme(); const k = useScale();
  const { t: s, s: state } = useStore();
  const [offset, setOffset] = useState(0); // 0 = luna curentă, -1 = luna trecută
  const statuses = useMemo(() => dayStatuses(state.glucose, state.meals, state.walks ?? []), [state.glucose, state.meals, state.walks]);

  const first = new Date(); first.setDate(1); first.setMonth(first.getMonth() + offset);
  const year = first.getFullYear(), month = first.getMonth();
  const daysIn = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // luni = prima coloană
  const todayK = dayKeyLocal(Date.now());
  const monthName = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(undefined, { weekday: "narrow" }));
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  let good = 0, less = 0;
  for (let d = 1; d <= daysIn; d++) { const st = statuses.get(dayKeyLocal(new Date(year, month, d).getTime())); if (st === "good") good++; else if (st === "less") less++; }

  const Arrow = ({ dir }: { dir: -1 | 1 }) => (
    <Pressable onPress={() => setOffset((o) => Math.min(0, o + dir))} disabled={dir === 1 && offset === 0} hitSlop={12} accessibilityRole="button"
      style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: dir === 1 && offset === 0 ? 0.3 : 1 }}>
      <Text style={{ fontSize: 26, color: t.ink }}>{dir === -1 ? "‹" : "›"}</Text>
    </Pressable>
  );

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Arrow dir={-1} />
        <View style={{ alignItems: "center" }}>
          <Label>{s.cal_title}</Label>
          <Text style={{ color: t.ink, fontSize: 18 * k, fontWeight: "700", textTransform: "capitalize" }}>{monthName}</Text>
        </View>
        <Arrow dir={1} />
      </View>

      <View style={{ flexDirection: "row" }}>
        {weekdays.map((w, i) => <Text key={i} style={{ flex: 1, textAlign: "center", color: t.muted, fontSize: 13 * k, fontWeight: "700" }}>{w}</Text>)}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((d, i) => {
          if (d == null) return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
          const key = dayKeyLocal(new Date(year, month, d).getTime());
          const st = statuses.get(key);
          const bg = st === "good" ? t.ok : st === "less" ? t.warn : "transparent";
          return (
            <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }}>
              <View style={{ flex: 1, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: bg, borderWidth: key === todayK ? 2 : 0, borderColor: t.ink }}>
                <Text style={{ color: st ? "#fff" : t.ink, fontWeight: st ? "800" : "500", fontSize: 15 * k }}>{d}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", gap: 16, justifyContent: "center" }}>
        <Legend color={t.ok} text={`${s.cal_good}: ${good}`} />
        <Legend color={t.warn} text={`${s.cal_less}: ${less}`} />
      </View>
      <Hint>{s.cal_hint}</Hint>
    </Card>
  );
}
function Legend({ color, text }: { color: string; text: string }) {
  const t = useTheme(); const k = useScale();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: color }} />
      <Text style={{ color: t.ink, fontSize: 15 * k, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}
