/** Poza de profil din comunitate sau inițiala pe un cerc colorat; insignele (🩸7 · 🛒30 · 🚶7 · 👨‍👩‍👧) lângă nume. */
import { Image, Text, View } from "react-native";
import { BADGE_ICON } from "../community";
import { useTheme } from "../theme";

const PALETTE = ["#2E7D4F", "#1F6FB2", "#B3261E", "#8A5A00", "#6B3FA0", "#0B7285"];
export function Avatar({ name, photo, size = 36 }: { name: string; photo?: string | null; size?: number }) {
  const t = useTheme();
  if (photo) return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg }} />;
  const bg = PALETTE[(name.charCodeAt(0) || 0) % PALETTE.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: size * 0.45 }}>{(name.trim()[0] ?? "?").toUpperCase()}</Text>
    </View>
  );
}
export function Badges({ badges, size = 13 }: { badges?: string[]; size?: number }) {
  const t = useTheme();
  if (!badges?.length) return null;
  return <Text style={{ color: t.muted, fontSize: size }}>{badges.map((b) => BADGE_ICON[b]).filter(Boolean).join(" ")}</Text>;
}
