import { useColorScheme } from "react-native";

const light = {
  bg: "#EEF2F5", surface: "#FFFFFF", ink: "#14202B", muted: "#5B6B78", line: "#D6DEE5",
  accent: "#1F4F8F", accentInk: "#FFFFFF", accentSoft: "#E1EAF6",
  ok: "#1D8A4E", okBg: "#E3F4EA", warn: "#B97400", warnBg: "#FDF1D9", bad: "#C43A2C", badBg: "#FBE4E1",
};
const dark: typeof light = {
  bg: "#0F161D", surface: "#18222C", ink: "#E6EDF3", muted: "#9AABB9", line: "#2B3946",
  accent: "#7FB0EF", accentInk: "#0D1621", accentSoft: "#1E3047",
  ok: "#5FD394", okBg: "#163527", warn: "#F2B54A", warnBg: "#3A2D12", bad: "#FF8273", badBg: "#3D1D1A",
};
export type Theme = typeof light;
export function useTheme(): Theme { return useColorScheme() === "dark" ? dark : light; }

export const levelColor = (t: Theme, level: "green" | "yellow" | "red") =>
  level === "green" ? { fg: t.ok, bg: t.okBg } : level === "yellow" ? { fg: t.warn, bg: t.warnBg } : { fg: t.bad, bg: t.badBg };
