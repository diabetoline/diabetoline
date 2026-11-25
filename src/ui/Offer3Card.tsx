/**
 * Oferta de ziua 3 (25 nov 2026, Alex: „să insistăm mai mult pentru plată… cu un discount de moment”): pe prima pagină,
 * în zilele 3–4 ale probei, cardul cu prețul introductiv din magazin (dacă magazinul îl are și omul e eligibil).
 * Fără preț introductiv în magazin cardul nu apare — nu promitem reduceri pe care magazinul nu le dă.
 */
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { fetchPlans, type Plan } from "../billing";
import { PAYMENTS_LIVE } from "../access";
import { track } from "../analytics";
import { TRIAL_DAYS, trialDaysLeft } from "../money";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { Button, Card, useScale } from "./Primitives";

let cached: Plan[] | null = null;
export function Offer3Card() {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state } = useStore();
  const left = trialDaysLeft(state.trialStart);
  const window = PAYMENTS_LIVE && !state.entitled && !!state.trialStart && left > 0 && TRIAL_DAYS - left >= 2; // ziua 3 și 4
  const [plans, setPlans] = useState<Plan[]>(cached ?? []);
  useEffect(() => { if (window && !cached) fetchPlans().then((p) => { cached = p; setPlans(p); }); }, [window]);
  const year = plans.find((p) => p.id === "year");
  useEffect(() => { if (window && year?.intro) track("offer3_view"); }, [window, year?.intro]);
  if (!window || !year?.intro) return null;
  return (
    <Card style={{ borderColor: t.accent, borderWidth: 2, gap: 8 }}>
      <Text style={{ color: t.ink, fontSize: 19 * k, fontWeight: "800" }}>{s.offer3_card_title}</Text>
      <Text style={{ color: t.ink, fontSize: 16 * k, lineHeight: 23 * k }}>{s.offer3_card_text(year.intro, year.price)}</Text>
      <Button title={s.offer3_btn} onPress={() => router.push({ pathname: "/paywall", params: { from: "offer3" } })} />
    </Card>
  );
}
