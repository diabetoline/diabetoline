/** O postare din comunitate cu răspunsurile ei; răspuns nou (filtrat de AI), 👍, raportare/blocare. */
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { blockAuthor, commentPost, like, loadPost, remove, report, type Comment, type Post } from "../../src/community";
import { useStore } from "../../src/store";
import { useTheme } from "../../src/theme";
import { ago, PostCard } from "../../src/ui/PostCard";
import { Button, Card, Hint, useScale } from "../../src/ui/Primitives";
import { Avatar, Badges } from "../../src/ui/Avatar";
import { myBadges } from "../../src/community";

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state, set } = useStore();
  const [post, setPost] = useState<Post | null>(null); const [comments, setComments] = useState<Comment[]>([]); const [gone, setGone] = useState(false);
  const [text, setText] = useState(""); const [name, setName] = useState(state.name ?? ""); const [busy, setBusy] = useState(false); const [note, setNote] = useState("");
  const load = async () => { const r = await loadPost(Number(id)); if (r) { setPost(r.post); setComments(r.comments); } else setGone(true); };
  useEffect(() => { void load(); }, [id]);
  const onSend = async () => {
    const nm = name.trim(); const tx = text.trim();
    if (!nm) { setNote(s.com_need_name); return; } if (tx.length < 2) return;
    setBusy(true); setNote(""); if (nm !== state.name) set({ name: nm });
    const r = await commentPost(Number(id), nm, tx, state.lang, myBadges(state));
    setBusy(false);
    if (r.ok) { setText(""); setNote(s.com_sent); await load(); }
    else setNote(r.reason === "blocked" ? s.com_blocked : r.reason === "limit" ? s.com_limit : r.reason === "banned" ? s.com_banned : s.com_err);
  };
  const onLike = async (c: Comment) => { setComments(comments.map((x) => x.id === c.id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x)); await like(c.id); };
  const onMore = (c: Comment) => {
    if (c.mine) { Alert.alert(s.com_delete, "", [{ text: s.cancel, style: "cancel" }, { text: s.com_delete, style: "destructive", onPress: async () => { await remove(c.id); await load(); } }]); return; }
    Alert.alert(s.com_more, "", [
      { text: s.cancel, style: "cancel" },
      { text: s.com_report, onPress: async () => { await report(c.id); setComments(comments.filter((x) => x.id !== c.id)); setNote(s.com_reported); } },
      { text: s.com_block, style: "destructive", onPress: async () => { await blockAuthor(c.id); await load(); } },
    ]);
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: s.community }} />
      {gone ? <Card><Text style={{ color: t.ink, fontSize: 17 * k }}>{s.post_gone}</Text></Card> : post ? (
        <>
          <PostCard post={post} open onChange={setPost} onRemoved={() => router.back()} />
          {comments.map((c) => (
            <View key={c.id} style={{ backgroundColor: t.surface, borderRadius: 14, padding: 12, gap: 6, marginLeft: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <Avatar name={c.name} photo={c.photo} size={30 * k} />
                <Text style={{ flex: 1, color: t.ink, fontWeight: "800", fontSize: 15 * k }}>{c.name}{c.mine ? ` (${s.com_you})` : ""} <Badges badges={c.badges} size={12 * k} /> <Text style={{ color: t.muted, fontWeight: "400", fontSize: 13 * k }}>· {ago(c.t, s)}</Text></Text>
                <Pressable onPress={() => onMore(c)} hitSlop={10} accessibilityLabel={s.com_more}><Text style={{ color: t.muted, fontSize: 18 * k }}>···</Text></Pressable>
              </View>
              <Text style={{ color: t.ink, fontSize: 16 * k, lineHeight: 23 * k }}>{c.text}</Text>
              <Pressable onPress={() => onLike(c)} hitSlop={8} style={{ alignSelf: "flex-start" }}><Text style={{ color: c.liked ? t.accent : t.muted, fontWeight: c.liked ? "800" : "500", fontSize: 15 * k }}>👍 {c.likes}</Text></Pressable>
            </View>
          ))}
          <Card>
            {!state.name ? (
              <TextInput value={name} onChangeText={setName} placeholder={s.com_name_ph} placeholderTextColor={t.muted} maxLength={40} accessibilityLabel={s.your_name}
                style={{ borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 12, fontSize: 17 * k, color: t.ink, backgroundColor: t.bg }} />
            ) : null}
            <TextInput value={text} onChangeText={setText} placeholder={s.reply_ph} placeholderTextColor={t.muted} maxLength={300} multiline accessibilityLabel={s.reply_ph}
              style={{ borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 12, fontSize: 17 * k, color: t.ink, backgroundColor: t.bg, minHeight: 60 }} />
            <Button title={busy ? "…" : s.reply_send} disabled={busy || text.trim().length < 2} onPress={onSend} />
            {note ? <Text style={{ color: note === s.com_sent ? t.ok : t.bad, fontSize: 15 * k }}>{note}</Text> : null}
            <Hint>{s.com_rules}</Hint>
          </Card>
        </>
      ) : <Text style={{ color: t.muted }}>…</Text>}
    </ScrollView>
  );
}
