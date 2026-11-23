/**
 * Comunitate (22 nov 2026, Alex: „vreau să avem comunitate, să poată dialoga între ei”): feed pe țară cu postări
 * (text + opțional produsul scanat / farfuria, cu verdictul), 👍, răspunsuri, raportare/blocare; topul săptămânii.
 * Identitatea e prenumele (din Setări); poza de profil vine în treapta următoare.
 */
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { track } from "../../src/analytics";
import { createPost, loadFeed, loadTop, type Post, type PostRef, type TopItem } from "../../src/community";
import { useStore } from "../../src/store";
import { useTheme } from "../../src/theme";
import { PostCard } from "../../src/ui/PostCard";
import { Button, Card, Hint, Label, Title, useScale } from "../../src/ui/Primitives";

export default function CommunityScreen() {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state, set } = useStore();
  const params = useLocalSearchParams<{ share?: string; code?: string; name?: string; level?: string; kind?: string }>();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [top, setTop] = useState<{ green: TopItem[]; red: TopItem[] } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [text, setText] = useState(""); const [name, setName] = useState(state.name ?? "");
  const [ref, setRef] = useState<PostRef>(params.share && params.name ? { code: params.code, name: params.name, level: params.level, kind: params.kind === "plate" ? "plate" : "scan" } : null);
  const [busy, setBusy] = useState(false); const [note, setNote] = useState("");
  const load = useCallback(async () => { const [p, tp] = await Promise.all([loadFeed(), loadTop()]); if (p) setPosts(p); else if (!posts) setPosts([]); if (tp) setTop(tp); }, []);
  useEffect(() => { track("community_view"); void load(); set({ communitySeen: new Date().toISOString() }); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const onSend = async () => {
    const nm = name.trim(); const tx = text.trim();
    if (!nm) { setNote(s.com_need_name); return; } if (tx.length < 2) return;
    setBusy(true); setNote(""); if (nm !== state.name) set({ name: nm });
    const r = await createPost(nm, tx, state.lang, ref);
    setBusy(false);
    if (r.ok) { setText(""); setRef(null); setNote(s.com_sent); await load(); }
    else setNote(r.reason === "blocked" ? s.com_blocked : r.reason === "limit" ? s.post_limit : r.reason === "banned" ? s.com_banned : s.com_err);
  };
  const refColor = ref?.level === "green" ? t.ok : ref?.level === "yellow" ? t.warn : ref?.level === "red" ? t.bad : t.muted;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Stack.Screen options={{ title: s.community }} />
      <Title>{s.community}</Title>
      <Hint>{s.community_sub}</Hint>
      <Card>
        <Label>{s.post_new}</Label>
        {!state.name ? (
          <TextInput value={name} onChangeText={setName} placeholder={s.com_name_ph} placeholderTextColor={t.muted} maxLength={40} accessibilityLabel={s.your_name}
            style={{ borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 12, fontSize: 17 * k, color: t.ink, backgroundColor: t.bg }} />
        ) : null}
        {ref ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 10, backgroundColor: t.bg }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: refColor }} />
            <Text style={{ flex: 1, color: t.ink, fontSize: 15 * k }} numberOfLines={2}>{ref.kind === "plate" ? "🍽 " : "🛒 "}{ref.name}</Text>
            <Text onPress={() => setRef(null)} style={{ color: t.muted, fontSize: 18 * k, paddingHorizontal: 6 }}>✕</Text>
          </View>
        ) : null}
        <TextInput value={text} onChangeText={setText} placeholder={ref ? s.post_ph_ref : s.post_ph} placeholderTextColor={t.muted} maxLength={600} multiline accessibilityLabel={s.post_new}
          style={{ borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 12, fontSize: 17 * k, color: t.ink, backgroundColor: t.bg, minHeight: 72 }} />
        <Button title={busy ? "…" : s.post_send} disabled={busy || text.trim().length < 2} onPress={onSend} />
        {note ? <Text style={{ color: note === s.com_sent ? t.ok : t.bad, fontSize: 15 * k }}>{note}</Text> : null}
        <Hint>{s.com_rules}</Hint>
      </Card>
      {top && (top.green.length > 0 || top.red.length > 0) ? (
        <Card>
          <Label>{s.top_title}</Label>
          <Hint>{s.top_sub}</Hint>
          {top.green.length > 0 ? <TopList title={s.top_green} items={top.green} color={t.ok} /> : null}
          {top.red.length > 0 ? <TopList title={s.top_red} items={top.red} color={t.bad} /> : null}
        </Card>
      ) : null}
      {posts === null ? <Text style={{ color: t.muted, fontSize: 16 * k }}>…</Text>
        : posts.length === 0 ? <Card><Text style={{ color: t.ink, fontSize: 17 * k, lineHeight: 25 * k }}>{s.feed_empty}</Text></Card>
        : posts.map((p) => <PostCard key={p.id} post={p} onChange={(np) => setPosts(posts.map((x) => x.id === np.id ? np : x))} onRemoved={() => setPosts(posts.filter((x) => x.id !== p.id))} />)}
      <Button title={"📷 " + s.tile_scan} kind="soft" onPress={() => router.push("/scan")} />
    </ScrollView>
  );
}

function TopList({ title, items, color }: { title: string; items: TopItem[]; color: string }) {
  const t = useTheme(); const k = useScale(); const router = useRouter(); const { t: s } = useStore();
  return (
    <View style={{ gap: 6, marginTop: 8 }}>
      <Text style={{ color: t.ink, fontWeight: "700", fontSize: 16 * k }}>{title}</Text>
      {items.slice(0, 5).map((it) => (
        <Text key={it.code} onPress={() => router.push({ pathname: "/product/[code]", params: { code: it.code } })} style={{ color: t.ink, fontSize: 16 * k, lineHeight: 24 * k }}>
          <Text style={{ color }}>●</Text> {it.name} <Text style={{ color: t.muted, fontSize: 14 * k }}>· {s.top_n(it.n)}</Text>
        </Text>
      ))}
    </View>
  );
}
