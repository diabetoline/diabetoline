import React from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle, type TextStyle } from "react-native";
import { useTheme } from "../theme";
import { useStore } from "../store";

/** Text scale: the app targets older users; "big text" raises everything ~15% */
export function useScale() { const { s } = useStore(); return s.bigText ? 1.15 : 1; }

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.surface, borderColor: t.line, borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 }, style]}>{children}</View>;
}
export function Label({ children }: { children: React.ReactNode }) {
  const t = useTheme(); const k = useScale();
  return <Text style={{ fontSize: 12 * k, letterSpacing: 1, textTransform: "uppercase", color: t.muted, fontWeight: "700", marginBottom: 6 }}>{children}</Text>;
}
export function Hint({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const t = useTheme(); const k = useScale();
  return <Text style={[{ fontSize: 15 * k, color: t.muted, lineHeight: 21 * k }, style]}>{children}</Text>;
}
export function Body({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const t = useTheme(); const k = useScale();
  return <Text style={[{ fontSize: 18 * k, color: t.ink, lineHeight: 26 * k }, style]}>{children}</Text>;
}
export function Title({ children }: { children: React.ReactNode }) {
  const t = useTheme(); const k = useScale();
  return <Text style={{ fontSize: 26 * k, fontWeight: "800", color: t.ink, letterSpacing: -0.3 }}>{children}</Text>;
}
export function Button({ title, onPress, kind = "primary", disabled, size = "md", icon }: { title: string; onPress: () => void; kind?: "primary" | "soft" | "ghost" | "danger"; disabled?: boolean; size?: "sm" | "md" | "xl"; icon?: string }) {
  const t = useTheme(); const k = useScale();
  const bg = kind === "primary" ? t.accent : kind === "soft" ? t.accentSoft : kind === "danger" ? t.badBg : "transparent";
  const fg = kind === "primary" ? t.accentInk : kind === "danger" ? t.bad : t.ink;
  const pad = size === "xl" ? 22 : size === "sm" ? 10 : 16;
  const fs = (size === "xl" ? 22 : size === "sm" ? 15 : 18) * k;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={({ pressed }) => [st.btn, { backgroundColor: bg, borderColor: kind === "ghost" ? t.line : bg, paddingVertical: pad, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }]}>
      {icon ? <Text style={{ fontSize: fs * 1.3, marginRight: 10 }}>{icon}</Text> : null}
      <Text style={{ color: fg, fontWeight: "700", fontSize: fs }}>{title}</Text>
    </Pressable>
  );
}
const st = StyleSheet.create({
  btn: { borderRadius: 16, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, flexDirection: "row", minHeight: 52 },
});
