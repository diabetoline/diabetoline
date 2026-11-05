import { useColorScheme } from "react-native";

const light = {
  bg: "#EEF2F5", surface: "#FFFFFF", ink: "#14202B", muted: "#5B6B78", line: "#D6DEE5",
  accent: "#1E7A3C", accentInk: "#FFFFFF", accentSoft: "#E4F3E9", brandRed: "#D7262E",
  ok: "#1D8A4E", okBg: "#E3F4EA", warn: "#B97400", warnBg: "#FDF1D9", bad: "#C43A2C", badBg: "#FBE4E1",
};
const dark: typeof light = {
  bg: "#0F161D", surface: "#18222C", ink: "#E6EDF3", muted: "#9AABB9", line: "#2B3946",
  accent: "#5FD394", accentInk: "#0D1621", accentSoft: "#163527", brandRed: "#FF6B6B",
  ok: "#5FD394", okBg: "#163527", warn: "#F2B54A", warnBg: "#3A2D12", bad: "#FF8273", badBg: "#3D1D1A",
};
export type Theme = typeof light;
// pe web, ?theme=light|dark forțează tema (folosit la capturile pentru magazine)
const forced = typeof location !== "undefined" ? new URLSearchParams(location.search).get("theme") : null;
export function useTheme(): Theme { const sys = useColorScheme(); const mode = forced ?? sys; return mode === "dark" ? dark : light; }

export const levelColor = (t: Theme, level: "green" | "yellow" | "red") =>
  level === "green" ? { fg: t.ok, bg: t.okBg } : level === "yellow" ? { fg: t.warn, bg: t.warnBg } : { fg: t.bad, bg: t.badBg };
