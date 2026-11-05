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
          <Stack.Screen name="welcome" options={{ headerShown: false, presentation: "fullScreenModal", animation: "fade" }} />
          <Stack.Screen name="messages" />
          <Stack.Screen name="paywall" options={{ headerShown: false, presentation: "fullScreenModal", animation: "fade" }} />
          <Stack.Screen name="scan" options={{ headerShown: false, presentation: "fullScreenModal" }} />
          <Stack.Screen name="plate" options={{ headerShown: false, presentation: "fullScreenModal" }} />
          <Stack.Screen name="glucose/new" options={{ title: "", headerBackButtonDisplayMode: "minimal" }} />
          <Stack.Screen name="meds" options={{ title: "", headerBackButtonDisplayMode: "minimal" }} />
          <Stack.Screen name="meal/[id]" options={{ title: "", headerBackButtonDisplayMode: "minimal" }} />
          <Stack.Screen name="family" options={{ title: "", headerBackButtonDisplayMode: "minimal" }} />
          <Stack.Screen name="family/parent" options={{ title: "", headerBackButtonDisplayMode: "minimal" }} />
          <Stack.Screen name="ask" options={{ title: "", headerBackButtonDisplayMode: "minimal" }} />
          <Stack.Screen name="shop" options={{ title: "", headerBackButtonDisplayMode: "minimal" }} />
          <Stack.Screen name="list" options={{ title: "", headerBackButtonDisplayMode: "minimal" }} />
          <Stack.Screen name="ideas" options={{ title: "", headerBackButtonDisplayMode: "minimal" }} />
          <Stack.Screen name="report" options={{ title: "", headerBackButtonDisplayMode: "minimal" }} />
          <Stack.Screen name="care" options={{ title: "", headerBackButtonDisplayMode: "minimal" }} />
          <Stack.Screen name="settings" options={{ title: "", headerBackButtonDisplayMode: "minimal" }} />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
