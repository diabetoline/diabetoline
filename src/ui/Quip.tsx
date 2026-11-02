import { Text, type TextStyle } from "react-native";
import { quip, type QuipKey } from "../quips";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { useScale } from "./Primitives";

/** O glumiță pentru bună dispoziție. `seed` ține aceeași replică pe durata ecranului. */
export function Quip({ k, seed, style }: { k: QuipKey; seed?: number | string; style?: TextStyle }) {
  const t = useTheme(); const sc = useScale();
  const { s } = useStore();
  if (!s.humor) return null;
  return <Text style={[{ color: t.muted, fontSize: 16 * sc, lineHeight: 23 * sc, fontStyle: "italic", textAlign: "center" }, style]}>{quip(s.lang, k, seed)}</Text>;
}
