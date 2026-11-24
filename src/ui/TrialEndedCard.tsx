/**
 * Cardul de după probă (24 nov 2026, Alex: „pagina de plată foarte eficient după terminarea trialului”): pe prima pagină,
 * cât timp omul e pe gratuit — cifrele lui din probă, prețul pe an (≈ pe lună) și un singur buton. Nu e popup: stă acolo, calm.
 */
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { fetchPlans, type Plan } from "../billing";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { Button, Card, useScale } from "./Primitives";

let cached: Plan[] | null = null;
export function TrialEndedCard() {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state } = useStore();
  const [plans, setPlans] = useState<Plan[]>(cached ?? []);
  useEffect(() => { if (!cached) fetchPlans().then((p) => { cached = p; setPlans(p); }); }, []);
  const year = plans.find((p) => p.id === "year");
  const since = state.trialStart ?? 0;
  const used = { sc: state.history.filter((h) => h.t >= since).length, pl: state.meals.filter((m) => m.t >= since).length, gl: state.glucose.filter((g) => g.t >= since).length };
  return (
    <Card style={{ borderColor: t.accent, borderWidth: 2, gap: 8 }}>
      <Text style={{ color: t.ink, fontSize: 19 * k, fontWeight: "800" }}>{s.te_title}</Text>
      <Text style={{ color: t.ink, fontSize: 16 * k, lineHeight: 23 * k }}>{used.sc + used.pl + used.gl >= 3 ? s.pay_used(used.sc, used.pl, used.gl) + " " : ""}{s.te_text}</Text>
      {year ? <Text style={{ color: t.accent, fontSize: 17 * k, fontWeight: "800" }}>{s.pay_year(year.price)} · {s.pay_family}</Text> : null}
      <Button title={s.te_btn} onPress={() => router.push({ pathname: "/paywall", params: { from: "home" } })} />
    </Card>
  );
}
