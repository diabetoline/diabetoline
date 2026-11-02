import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { estimateGi } from "../../src/engine/gi";
import type { Product } from "../../src/engine/types";
import { useStore } from "../../src/store";
import { useTheme } from "../../src/theme";
import { Button, Card, Hint, Label } from "../../src/ui/Primitives";

const num = (v: string) => { const x = parseFloat(v.replace(",", ".")); return Number.isFinite(x) ? x : 0; };

export default function AddProduct() {
  const { code, name: name0, brand: brand0 } = useLocalSearchParams<{ code: string; name?: string; brand?: string }>();
  const t = useTheme(); const router = useRouter();
  const { t: s, addUserProduct } = useStore();
  const [name, setName] = useState(name0 ?? ""); const [brand, setBrand] = useState(brand0 ?? "");
  const [carbs, setCarbs] = useState(""); const [sugars, setSugars] = useState(""); const [fiber, setFiber] = useState("");
  const [serving, setServing] = useState(""); const [unit, setUnit] = useState<"g" | "ml">("g");
  const valid = name.trim().length > 1 && carbs.trim().length > 0;

  const save = () => {
    const c = num(carbs), su = num(sugars), f = num(fiber);
    const gi = estimateGi({ categories: [], carbs100: c, fiber100: f, sugars100: su, name });
    const p: Product = { code, name: name.trim(), brand: brand.trim() || undefined, carbs100: c, sugars100: su, fiber100: f,
      serving: num(serving) > 0 ? num(serving) : undefined, unit, ingredients: [], categories: [], claims: [], gi: gi.gi, giSource: gi.source, source: "user" };
    addUserProduct(p);
    router.replace({ pathname: "/product/[code]", params: { code } });
  };
  const field = (label: string, value: string, set: (v: string) => void, numeric = true, placeholder = "") => (
    <View style={{ gap: 4 }}><Label>{label}</Label>
      <TextInput value={value} onChangeText={set} placeholder={placeholder} placeholderTextColor={t.muted} keyboardType={numeric ? "decimal-pad" : "default"} accessibilityLabel={label}
        style={{ borderWidth: 1, borderColor: t.line, borderRadius: 10, padding: 12, fontSize: 18, color: t.ink, backgroundColor: t.bg }} /></View>
  );
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: s.add_title }} />
      <Card>
        <Text style={{ color: t.ink, fontWeight: "800", fontSize: 20 }}>{s.add_title}</Text>
        <Hint>{code} · {s.add_hint}</Hint>
        {field(s.f_name, name, setName, false)}
        {field(s.f_brand, brand, setBrand, false)}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}><Button title={`${s.f_unit_g}`} kind={unit === "g" ? "primary" : "ghost"} small onPress={() => setUnit("g")} /></View>
          <View style={{ flex: 1 }}><Button title={`${s.f_unit_ml}`} kind={unit === "ml" ? "primary" : "ghost"} small onPress={() => setUnit("ml")} /></View>
        </View>
        {field(`${s.f_carbs} ${unit}`, carbs, setCarbs, true, "0")}
        {field(s.f_sugars, sugars, setSugars, true, "0")}
        {field(s.f_fiber, fiber, setFiber, true, "0")}
        {field(s.f_serving, serving, setServing, true, "")}
        <Button title={s.save} onPress={save} disabled={!valid} />
      </Card>
    </ScrollView>
  );
}
