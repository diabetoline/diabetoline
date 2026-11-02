import { ScrollView } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useStore } from "../src/store";
import { AfterMeal } from "../src/ui/AfterMeal";
import { Button } from "../src/ui/Primitives";

/** Ecranul de după poza unei mese „cu măsură” sau „mai grea” (acasă sau la restaurant). */
export default function Care() {
  const { level } = useLocalSearchParams<{ level?: string }>();
  const router = useRouter();
  const { t: s } = useStore();
  const lv = level === "red" ? "red" : "yellow";
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: "" }} />
      <AfterMeal level={lv} />
      <Button title={s.care_done} size="xl" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
    </ScrollView>
  );
}
