import React from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle, type TextStyle } from "react-native";
import { useTheme } from "../theme";

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.surface, borderColor: t.line, borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 }, style]}>{children}</View>;
}
export function Label({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return <Text style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: t.muted, fontWeight: "700", marginBottom: 6 }}>{children}</Text>;
}
export function Hint({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const t = useTheme();
  return <Text style={[{ fontSize: 13, color: t.muted, lineHeight: 18 }, style]}>{children}</Text>;
}
export function Button({ title, onPress, kind = "primary", disabled, small }: { title: string; onPress: () => void; kind?: "primary" | "soft" | "ghost"; disabled?: boolean; small?: boolean }) {
  const t = useTheme();
  const bg = kind === "primary" ? t.accent : kind === "soft" ? t.accentSoft : "transparent";
  const fg = kind === "primary" ? t.accentInk : t.ink;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={({ pressed }) => [st.btn, { backgroundColor: bg, borderColor: kind === "ghost" ? t.line : bg, opacity: disabled ? 0.55 : pressed ? 0.85 : 1 }, small && st.small]}>
      <Text style={{ color: fg, fontWeight: "600", fontSize: small ? 14 : 16 }}>{title}</Text>
    </Pressable>
  );
}
const st = StyleSheet.create({
  btn: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18, alignItems: "center", borderWidth: 1 },
  small: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10 },
});
