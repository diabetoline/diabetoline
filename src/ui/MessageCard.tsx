import { useCallback, useEffect, useState } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { fetchUnread, markRead, sendMessage, type Msg } from "../family/messages";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { Button, Card, useScale } from "./Primitives";

/** Pe prima pagină: ultimul mesaj necitit de la familie, cu răspunsuri dintr-o apăsare. Dispare după răspuns sau „Am citit”. */
export function MessageCard() {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state } = useStore();
  const fam = state.family;
  const me: "parent" | "child" = fam.role === "child" ? "child" : "parent";
  const linkIds = me === "parent" ? fam.children.map((c) => c.linkId) : fam.parent ? [fam.parent.linkId] : [];
  const [msg, setMsg] = useState<Msg | null>(null);
  const load = useCallback(async () => { try { setMsg((await fetchUnread(linkIds, me))[0] ?? null); } catch {} }, [linkIds.join(","), me]);
  useEffect(() => {
    if (!linkIds.length || (me === "parent" && !fam.consent)) return;
    load();
    const sub = AppState.addEventListener("change", (st) => { if (st === "active") load(); });
    return () => sub.remove();
  }, [load, linkIds.length, fam.consent]);
  if (!msg) return null;
  const who = me === "parent" ? fam.children.find((c) => c.linkId === msg.link_id)?.name ?? "" : fam.parent?.name ?? "";
  const quick = me === "parent" ? s.msg_quick_parent : s.msg_quick_child;
  const reply = async (body: string) => { setMsg(null); try { await markRead([msg.id]); await sendMessage(msg.link_id, me, body, state.name || s.msg_me); } catch {} };
  return (
    <Card style={{ borderColor: t.accent, borderWidth: 2, gap: 10 }}>
      <Text style={{ color: t.muted, fontSize: 14 * k, fontWeight: "700", letterSpacing: 0.5 }}>💬 {s.msg_from(who).toUpperCase()}</Text>
      <Text style={{ color: t.ink, fontSize: 21 * k, lineHeight: 29 * k, fontWeight: "600" }}>{msg.body}</Text>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {quick.map((q) => (
          <Pressable key={q} onPress={() => reply(q)} accessibilityRole="button" style={{ backgroundColor: t.accentSoft, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 18 }}>
            <Text style={{ color: t.ink, fontSize: 18 * k, fontWeight: "700" }}>{q}</Text>
          </Pressable>
        ))}
      </View>
      <Button title={s.msg_reply} kind="soft" onPress={async () => { try { await markRead([msg.id]); } catch {} setMsg(null); router.push({ pathname: "/messages", params: { link: msg.link_id, name: who } }); }} />
    </Card>
  );
}
