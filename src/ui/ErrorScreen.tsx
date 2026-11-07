import { Pressable, Text, View } from "react-native";
import buildInfo from "../build.json";

const API = process.env.EXPO_PUBLIC_API_URL || "https://curalife.expo.app";
let lastSent = "";

/** Raport de eroare către server (ajunge pe email la Alex ca „sugestie” cu rolul crash). Fără date personale. */
export function reportError(where: string, e: unknown) {
  try {
    const err = e as { message?: string; stack?: string };
    const body = `CRASH @ ${where}\n${err?.message ?? String(e)}\n${(err?.stack ?? "").split("\n").slice(0, 8).join("\n")}`;
    if (body === lastSent) return; lastSent = body;
    fetch(`${API}/api/feedback`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: body.slice(0, 1000), lang: "ro", role: "crash", build: (process.env.EXPO_PUBLIC_BUILD ?? buildInfo.sha).slice(0, 7) }) }).catch(() => {});
  } catch {}
}

/** Ecranul care apare în locul albului când ceva crapă la randare: simplu, cu buton de reluare. */
export function ErrorScreen({ error, retry }: { error: Error; retry: () => void }) {
  reportError("render", error);
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 16, backgroundColor: "#F3F5F7" }}>
      <Text style={{ fontSize: 44 }}>😕</Text>
      <Text style={{ fontSize: 24, fontWeight: "800", color: "#14213D", textAlign: "center" }}>Ceva n-a mers.</Text>
      <Text style={{ fontSize: 17, color: "#4A5568", textAlign: "center" }}>Nu s-a pierdut nimic din ce ai notat. Apasă mai jos ca să continui.</Text>
      <Pressable onPress={retry} accessibilityRole="button" style={{ backgroundColor: "#2E7D4F", borderRadius: 16, paddingVertical: 18, paddingHorizontal: 32, marginTop: 8 }}>
        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>Reîncearcă</Text>
      </Pressable>
      <Text style={{ fontSize: 12, color: "#8A94A6", textAlign: "center", marginTop: 12 }}>{String(error?.message ?? "").slice(0, 160)}</Text>
    </View>
  );
}
