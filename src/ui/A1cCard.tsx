/**
 * „Media pe 90 de zile ≈ HbA1c estimată” în Jurnal (24 nov 2026). Doar cifre + nota că e o estimare din ce notează omul;
 * fără interpretare medicală. Apare abia când sunt destule date (`estimateA1c`).
 */
import { useMemo } from "react";
import { Text, View } from "react-native";
import { estimateA1c } from "../engine/a1c";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { Card, Hint, Label, useScale } from "./Primitives";

export function A1cCard() {
  const t = useTheme(); const k = useScale();
  const { t: s, s: state } = useStore();
  const e = useMemo(() => estimateA1c(state.glucose), [state.glucose]);
  if (!e) return null;
  const avg = state.unit === "mg" ? `${Math.round(e.avg)} mg/dL` : `${(e.avg / 18).toFixed(1)} mmol/L`;
  const a1c = e.a1c.toFixed(1).replace(".", ",");
  return (
    <Card style={{ gap: 6 }}>
      <Label>{s.a1c_title}</Label>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <Text style={{ color: t.ink, fontSize: 26 * k, fontWeight: "800" }}>{avg}</Text>
        <Text style={{ color: t.ink, fontSize: 20 * k, fontWeight: "700" }}>≈ HbA1c {a1c} %</Text>
      </View>
      <Text style={{ color: t.muted, fontSize: 14 * k }}>{s.a1c_from(e.n, e.days)}</Text>
      <Hint>{s.a1c_note}</Hint>
    </Card>
  );
}
