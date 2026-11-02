import { useEffect, useMemo } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";
import { markShown, pickReco, snooze, type Placement } from "../recommend";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { Button, useScale } from "./Primitives";

/** Un card discret „De la Diabetoline”, cu poză, o propoziție și două butoane: vezi / nu acum. */
export function RecoCard({ placement }: { placement: Placement }) {
  const t = useTheme(); const k = useScale();
  const { t: s, s: state, set } = useStore();
  const reco = useMemo(() => pickReco(placement, state.reco), [placement]);
  useEffect(() => { if (reco) set((p) => ({ reco: markShown(p.reco, reco.id) })); }, [reco?.id]);
  if (!reco) return null;
  return (
    <View style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 18, padding: 14, gap: 10 }}>
      <Text style={{ color: t.muted, fontSize: 12 * k, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" }}>{s.reco_label}</Text>
      <Pressable onPress={() => Linking.openURL(reco.url)} accessibilityRole="button" style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        {reco.image ? <Image source={{ uri: reco.image }} style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: t.bg }} /> : null}
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: t.ink, fontSize: 16 * k, lineHeight: 23 * k }}>{s[reco.textKey]}</Text>
          <Text style={{ color: t.ink, fontSize: 15 * k, fontWeight: "700" }}>{reco.name} · {reco.price.toFixed(2).replace(".", ",")} lei</Text>
        </View>
      </Pressable>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}><Button title={s.reco_view} size="sm" kind="soft" onPress={() => Linking.openURL(reco.url)} /></View>
        <View style={{ flex: 1 }}><Button title={s.reco_later} size="sm" kind="ghost" onPress={() => set((p) => ({ reco: snooze(p.reco, reco.id) }))} /></View>
      </View>
    </View>
  );
}
