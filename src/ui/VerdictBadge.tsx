import { useEffect, useRef } from "react";
import { Animated, Easing, Text } from "react-native";
import * as Haptics from "expo-haptics";
import type { Level } from "../engine/types";
import { levelColor, useTheme } from "../theme";

/**
 * Cercul verdictului, cu o secundă de viață: crește cu arc, bifa apare, iar telefonul confirmă discret
 * (succes la verde, atenție la galben, eroare la roșu). Roșul tremură scurt.
 */
export function VerdictBadge({ level, size = 110 }: { level: Level; size?: number }) {
  const t = useTheme();
  const c = levelColor(t, level);
  const scale = useRef(new Animated.Value(0.3)).current;
  const glyph = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scale.setValue(0.3); glyph.setValue(0); shake.setValue(0);
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.timing(glyph, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ...(level === "red" ? [Animated.sequence([-1, 1, -0.6, 0.6, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 55, useNativeDriver: true })))] : []),
    ]).start();
    Haptics.notificationAsync(level === "green" ? Haptics.NotificationFeedbackType.Success : level === "yellow" ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Error).catch(() => {});
  }, [level]);

  const g = level === "green" ? "✓" : level === "yellow" ? "!" : "✕";
  return (
    <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.fg, alignItems: "center", justifyContent: "center", marginBottom: 6,
      transform: [{ scale }, { translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] }) }],
      shadowColor: c.fg, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
      <Animated.Text style={{ color: t.surface, fontWeight: "800", fontSize: size * 0.48, opacity: glyph, transform: [{ scale: glyph.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }}>{g}</Animated.Text>
    </Animated.View>
  );
}
