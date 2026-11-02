import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StoreProvider } from "../src/store";
import { useTheme } from "../src/theme";

export default function Root() {
  const t = useTheme();
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerStyle: { backgroundColor: t.surface }, headerTintColor: t.ink, headerTitleStyle: { fontWeight: "700" }, contentStyle: { backgroundColor: t.bg } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="product/[code]" options={{ title: "", headerBackButtonDisplayMode: "minimal" }} />
          <Stack.Screen name="product/add" options={{ title: "", headerBackButtonDisplayMode: "minimal" }} />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
