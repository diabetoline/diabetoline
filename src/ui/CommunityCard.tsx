/** Cardul „Ce au găsit alții azi” de pe prima pagină (23 nov 2026): cea mai nouă postare din țară (sub 48 h), o apăsare → Comunitate. */
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { COMMUNITY_ON, loadFeed, type Post } from "../community";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { Card, Label, useScale } from "./Primitives";
import { ago } from "./PostCard";

let cache: { at: number; post: Post | null } | null = null;
export function useLatestPost(): Post | null {
  const [post, setPost] = useState<Post | null>(cache?.post ?? null);
  useEffect(() => {
    if (!COMMUNITY_ON) return;
    if (cache && Date.now() - cache.at < 10 * 60e3) { setPost(cache.post); return; }
    void loadFeed().then((posts) => { const p = (posts ?? []).find((x) => Date.now() - new Date(x.t).getTime() < 48 * 3600e3) ?? null; cache = { at: Date.now(), post: p }; setPost(p); });
  }, []);
  return post;
}

export function CommunityCard({ post }: { post: Post }) {
  const t = useTheme(); const k = useScale(); const router = useRouter(); const { t: s } = useStore();
  return (
    <Pressable onPress={() => router.push("/community")} accessibilityRole="button">
      <Card style={{ gap: 6, borderLeftWidth: 4, borderLeftColor: t.accent }}>
        <Label>💬 {s.home_comm_title}</Label>
        <Text style={{ color: t.ink, fontSize: 16 * k, lineHeight: 23 * k }} numberOfLines={3}>
          <Text style={{ fontWeight: "800" }}>{post.name}</Text> <Text style={{ color: t.muted }}>· {ago(post.t, s)}</Text>{"\n"}{post.text}
        </Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: t.muted, fontSize: 14 * k }}>👍 {post.likes} · 💬 {post.n_comments}</Text>
          <Text style={{ color: t.accent, fontWeight: "700", fontSize: 15 * k }}>{s.home_comm_more} ›</Text>
        </View>
      </Card>
    </Pressable>
  );
}
