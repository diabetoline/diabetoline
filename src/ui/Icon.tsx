import { MaterialCommunityIcons } from "@expo/vector-icons";

export type IconName = "pot" | "barcode" | "plate" | "drop" | "pill" | "home" | "journal" | "more" | "walk" | "family" | "report" | "settings" | "care" | "lock";

/** Iconițe din setul Material Community (profesionist, consecvent), un singur loc de mapare. */
const MAP: Record<IconName, keyof typeof MaterialCommunityIcons.glyphMap> = {
  barcode: "barcode-scan", plate: "silverware-fork-knife", drop: "water", pill: "pill", home: "home-variant", journal: "notebook-outline", more: "menu",
  walk: "walk", family: "account-group-outline", report: "file-chart-outline", settings: "cog-outline", care: "heart-outline", lock: "lock-outline", pot: "pot-steam-outline",
};

export function Icon({ name, size = 28, color = "#14202B" }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  return <MaterialCommunityIcons name={MAP[name]} size={size} color={color} />;
}
