/** Cardul unei postări din comunitate: prenume · când · textul · produsul/farfuria atașată cu verdictul · 👍 · 💬 · ··· */
import { Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { useScale } from "./Primitives";
import { blockPostAuthor, deletePost, likePost, reportPost, type Post } from "../community";
import { Avatar, Badges } from "./Avatar";

export function ago(iso: string, s: { ago_now: string; ago_min: (n: number) => string; ago_h: (n: number) => string; ago_d: (n: number) => string }): string {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return s.ago_now; if (m < 60) return s.ago_min(m); if (m < 1440) return s.ago_h(Math.round(m / 60)); return s.ago_d(Math.round(m / 1440));
}

export function PostCard({ post, onChange, onRemoved, open }: { post: Post; onChange: (p: Post) => void; onRemoved: () => void; open?: boolean }) {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s } = useStore();
  const color = post.ref?.level === "green" ? t.ok : post.ref?.level === "yellow" ? t.warn : post.ref?.level === "red" ? t.bad : t.muted;
  const onLike = async () => { onChange({ ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) }); await likePost(post.id); };
  const onMore = () => {
    if (post.mine) { Alert.alert(s.post_delete, "", [{ text: s.cancel, style: "cancel" }, { text: s.post_delete, style: "destructive", onPress: async () => { await deletePost(post.id); onRemoved(); } }]); return; }
    Alert.alert(s.com_more, "", [
      { text: s.cancel, style: "cancel" },
      { text: s.com_report, onPress: async () => { await reportPost(post.id); onRemoved(); } },
      { text: s.com_block, style: "destructive", onPress: async () => { await blockPostAuthor(post.id); onRemoved(); } },
    ]);
  };
  const body = (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <Avatar name={post.name} photo={post.photo} size={40 * k} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.ink, fontWeight: "800", fontSize: 16 * k }}>{post.name}{post.mine ? ` (${s.com_you})` : ""} <Badges badges={post.badges} size={13 * k} /></Text>
          <Text style={{ color: t.muted, fontSize: 13 * k }}>{ago(post.t, s)}</Text>
        </View>
        <Pressable onPress={onMore} hitSlop={10} accessibilityLabel={s.com_more}><Text style={{ color: t.muted, fontSize: 20 * k }}>···</Text></Pressable>
      </View>
      <Text style={{ color: t.ink, fontSize: 17 * k, lineHeight: 25 * k }}>{post.text}</Text>
      {post.ref ? (
        <Pressable onPress={() => post.ref?.code && post.ref.kind !== "plate" ? router.push({ pathname: "/product/[code]", params: { code: post.ref.code } }) : undefined}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 10, backgroundColor: t.bg }}>
          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: color }} />
          <Text style={{ flex: 1, color: t.ink, fontSize: 15 * k }} numberOfLines={2}>{post.ref.kind === "plate" ? "🍽 " : "🛒 "}{post.ref.name}</Text>
        </Pressable>
      ) : null}
      <View style={{ flexDirection: "row", gap: 18 }}>
        <Pressable onPress={onLike} hitSlop={8}><Text style={{ color: post.liked ? t.accent : t.muted, fontWeight: post.liked ? "800" : "500", fontSize: 15 * k }}>👍 {post.likes}</Text></Pressable>
        {!open ? <Text style={{ color: t.muted, fontSize: 15 * k }}>💬 {post.n_comments}</Text> : null}
      </View>
    </View>
  );
  if (open) return <View style={{ backgroundColor: t.surface, borderRadius: 16, padding: 14 }}>{body}</View>;
  return <Pressable onPress={() => router.push({ pathname: "/community/[id]", params: { id: String(post.id) } })} accessibilityRole="button" style={{ backgroundColor: t.surface, borderRadius: 16, padding: 14 }}>{body}</Pressable>;
}
