import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { claimCode, createCode, deleteServerData, myLinks, pushEntries, revokeLink } from "../src/family/sync";
import { registerChildPush } from "../src/family/alerts";
import { useGate } from "../src/access";
import { useStore } from "../src/store";
import { useTheme } from "../src/theme";
import { Button, Card, Hint, Label, Title, useScale } from "../src/ui/Primitives";

/**
 * Familie. Părintele: acceptă, primește un cod, îl spune copilului; vede cine îl urmărește și poate rupe legătura.
 * Copilul: introduce codul, apoi deschide jurnalul părintelui.
 */
export default function Family() {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state, set } = useStore();
  const gate = useGate(state);
  useEffect(() => { gate("family"); }, []);
  const fam = state.family;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [input, setInput] = useState(""); const [childName, setChildName] = useState(state.name);

  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(""); try { await fn(); } catch (e) { setMsg(String((e as Error)?.message ?? e)); } finally { setBusy(false); } };
  const setFam = (patch: Partial<typeof fam>) => set({ family: { ...fam, ...patch } });

  // părintele: reîncarcă lista copiilor legați
  useEffect(() => {
    if (fam.role !== "parent" || !fam.consent) return;
    run(async () => {
      const links = await myLinks();
      setFam({ children: links.filter((l) => l.status === "active").map((l) => ({ linkId: l.id as string, name: (l.child_name as string) || "—" })) });
      await pushEntries(state); setFam({ lastSync: Date.now() });
    });
  }, [fam.role, fam.consent]);

  const Choice = ({ icon, title, sub, onPress }: { icon: string; title: string; sub: string; onPress: () => void }) => (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 18, padding: 18, flexDirection: "row", alignItems: "center", gap: 14, opacity: pressed ? 0.8 : 1 })}>
      <Text style={{ fontSize: 34 }}>{icon}</Text>
      <View style={{ flex: 1 }}><Text style={{ color: t.ink, fontSize: 21 * k, fontWeight: "800" }}>{title}</Text><Hint>{sub}</Hint></View>
      <Text style={{ color: t.muted, fontSize: 26 }}>›</Text>
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Stack.Screen options={{ title: s.fam_title }} />
      <Title>{s.fam_title}</Title>

      {/* 1. Alegerea rolului */}
      {!fam.role && (<>
        <Hint>{s.fam_intro}</Hint>
        <Choice icon="🧓" title={s.fam_i_parent} sub={s.fam_i_parent_sub} onPress={() => setFam({ role: "parent" })} />
        <Choice icon="👩‍👦" title={s.fam_i_child} sub={s.fam_i_child_sub} onPress={() => setFam({ role: "child" })} />
      </>)}

      {/* 2. Părinte: consimțământ explicit, apoi codul */}
      {fam.role === "parent" && !fam.consent && (
        <Card>
          <Text style={{ color: t.ink, fontSize: 18 * k, lineHeight: 26 * k }}>{s.fam_consent}</Text>
          <Button title={s.fam_consent_btn} size="xl" onPress={() => setFam({ consent: true })} />
          <Button title={s.back} kind="ghost" onPress={() => setFam({ role: null })} />
        </Card>
      )}
      {fam.role === "parent" && fam.consent && (<>
        <Card>
          <Label>{s.fam_code_title}</Label>
          {code ? <Text style={{ color: t.accent, fontSize: 48 * k, fontWeight: "800", textAlign: "center", letterSpacing: 6, fontVariant: ["tabular-nums"] }}>{code}</Text> : null}
          <Hint>{s.fam_code_hint}</Hint>
          <Button title={code ? s.fam_code_new : s.fam_code_title} size="xl" disabled={busy} onPress={() => run(async () => { const r = await createCode(state.name); setCode(r.code); })} />
        </Card>
        <Card>
          <Label>{s.fam_children}</Label>
          {fam.children.length === 0 ? <Hint>{s.fam_none_yet}</Hint> : fam.children.map((c) => (
            <View key={c.linkId} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ flex: 1, color: t.ink, fontSize: 18 * k, fontWeight: "700" }}>👩‍👦 {c.name}</Text>
              <Button title={s.fam_unlink} size="sm" kind="danger" onPress={() => run(async () => { await revokeLink(c.linkId); setFam({ children: fam.children.filter((x) => x.linkId !== c.linkId) }); setMsg(s.fam_unlinked); })} />
            </View>
          ))}
          {fam.lastSync ? <Hint>{s.fam_last_sync(new Date(fam.lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))}</Hint> : null}
        </Card>
        <Button title={s.fam_stop} kind="ghost" onPress={() => run(async () => { for (const c of fam.children) await revokeLink(c.linkId); await deleteServerData(); setFam({ role: null, consent: false, children: [], lastSync: undefined }); setMsg(s.fam_deleted); })} />
      </>)}

      {/* 3. Copil: introduce codul, apoi vede jurnalul */}
      {fam.role === "child" && !fam.parent && (
        <Card>
          <Label>{s.fam_your_name}</Label>
          <TextInput value={childName} onChangeText={setChildName} placeholderTextColor={t.muted} accessibilityLabel={s.fam_your_name}
            style={{ borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 14, fontSize: 18 * k, color: t.ink, backgroundColor: t.bg }} />
          <Label>{s.fam_enter_code}</Label>
          <TextInput value={input} onChangeText={setInput} keyboardType="number-pad" maxLength={6} placeholder="123456" placeholderTextColor={t.muted} accessibilityLabel={s.fam_enter_code}
            style={{ borderWidth: 2, borderColor: input.length === 6 ? t.ok : t.line, borderRadius: 14, padding: 16, fontSize: 36 * k, fontWeight: "800", color: t.ink, textAlign: "center", letterSpacing: 6, backgroundColor: t.bg, fontVariant: ["tabular-nums"] }} />
          <Button title={s.fam_link} size="xl" disabled={busy || input.length !== 6} onPress={() => run(async () => {
            try { const r = await claimCode(input, childName); setFam({ parent: { linkId: r.linkId, parentId: r.parentId, name: r.parentName || "—" } }); setMsg(s.fam_linked(r.parentName || "—")); registerChildPush(r.linkId, state.lang).then((ok) => { if (!ok) setMsg((m) => m + " " + s.fam_push_off); }); }
            catch { setMsg(s.fam_bad_code); }
          })} />
          <Button title={s.back} kind="ghost" onPress={() => setFam({ role: null })} />
        </Card>
      )}
      {fam.role === "child" && fam.parent && (<>
        <Card>
          <Text style={{ color: t.ink, fontSize: 18 * k }}>{s.fam_linked(fam.parent.name)}</Text>
          <Hint>{s.fam_push_info}</Hint>
          <Button title={s.fam_push_btn} kind="ghost" size="sm" onPress={() => run(async () => { const ok = await registerChildPush(fam.parent!.linkId, state.lang); setMsg(ok ? s.fam_push_ok : s.fam_push_off); })} />
          <Button title={"📒 " + s.fam_parent_of(fam.parent.name)} size="xl" onPress={() => router.push("/family/parent")} />
        </Card>
        <Button title={s.fam_role_reset} kind="ghost" onPress={() => setFam({ role: null, parent: undefined })} />
      </>)}

      {busy && <ActivityIndicator color={t.accent} />}
      {msg ? <Hint style={{ textAlign: "center" }}>{msg}</Hint> : null}
    </ScrollView>
  );
}
