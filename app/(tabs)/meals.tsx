import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "../../src/store";
import { useTheme } from "../../src/theme";
import { Hint } from "../../src/ui/Primitives";

export default function Screen() {
  const t = useTheme(); const { t: s } = useStore();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: t.ink }}>{s.tab_meals}</Text>
        <Hint>{s.soon}</Hint>
      </View>
    </SafeAreaView>
  );
}
