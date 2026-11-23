/**
 * Secțiunea „Alții au scanat” de pe ecranul produsului (comunitate, treapta 1): câți l-au scanat și cu ce verdict,
 * Util / Nu e util, comentarii scurte cu 👍, Raportează / Blochează (cerute de magazine la conținut de utilizatori).
 * Comentariile cer un prenume (din Setări → „Cum te cheamă”); fără el apare un câmp aici.
 */
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { blockAuthor, comment, like, loadProductCommunity, myBadges, remove, report, vote, type Comment, type ProductCommunity } from "../community";
import { Avatar, Badges } from "./Avatar";
import { Button, Card, Hint, Label, useScale } from "./Primitives";

export function CommunitySection({ code }: { code: string }) {
  const t = useTheme(); const k = useScale();
  const { t: s, s: state, set } = useStore();
  const [d, setD] = useState<ProductCommunity | null>(null);
  const [text, setText] = useState(""); const [name, setName] = useState(state.name ?? "");
  const [busy, setBusy] = useState(false); const [note, setNote] = useState("");
  const reload = () => { void loadProductCommunity(code).then((x) => { if (x) setD(x); }); };
  useEffect(() => { reload(); }, [code]);
  if (!d) return null;
  const onVote = async (useful: boolean) => { setD({ ...d, myVote: useful, useful: d.useful + (useful ? 1 : 0) - (d.myVote === true ? 1 : 0), notUseful: d.notUseful + (!useful ? 1 : 0) - (d.myVote === false ? 1 : 0) }); await vote(code, useful); };
  const onSend = async () => {
    const nm = name.trim(); const tx = text.trim();
    if (!nm) { setNote(s.com_need_name); return; } if (tx.length < 2) return;
    setBusy(true); setNote("");
    if (nm !== state.name) set({ name: nm });
    const r = await comment(code, nm, tx, state.lang, myBadges(state));
    setBusy(false);
    if (r.ok) { setText(""); setNote(s.com_sent); reload(); }
    else setNote(r.reason === "blocked" ? s.com_blocked : r.reason === "limit" ? s.com_limit : r.reason === "banned" ? s.com_banned : s.com_err);
  };
  const onLike = async (c: Comment) => { setD({ ...d, comments: d.comments.map((x) => x.id === c.id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x) }); await like(c.id); };
  const onMore = (c: Comment) => {
    if (c.mine) { Alert.alert(s.com_delete, "", [{ text: s.cancel, style: "cancel" }, { text: s.com_delete, style: "destructive", onPress: async () => { await remove(c.id); reload(); } }]); return; }
    Alert.alert(s.com_more, "", [
      { text: s.cancel, style: "cancel" },
      { text: s.com_report, onPress: async () => { await report(c.id); setD({ ...d, comments: d.comments.filter((x) => x.id !== c.id) }); setNote(s.com_reported); } },
      { text: s.com_block, style: "destructive", onPress: async () => { await blockAuthor(c.id); reload(); } },
    ]);
  };
  const lvl = (n: number, color: string, label: string) => n > 0 ? <Text style={{ color, fontWeight: "700", fontSize: 15 * k }}>{n} {label}</Text> : null;
  return (
    <Card>
      <Label>{s.com_title}</Label>
      {d.scans > 0 ? (
        <View style={{ gap: 4 }}>
          <Text style={{ color: t.ink, fontSize: 17 * k }}>{s.com_scanned(d.scans)}</Text>
          <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>{lvl(d.levels.green, t.ok, s.com_green)}{lvl(d.levels.yellow, t.warn, s.com_yellow)}{lvl(d.levels.red, t.bad, s.com_red)}</View>
        </View>
      ) : <Text style={{ color: t.muted, fontSize: 16 * k }}>{s.com_first}</Text>}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
        {([true, false] as const).map((u) => (
          <Pressable key={String(u)} onPress={() => onVote(u)} accessibilityRole="button"
            style={{ flex: 1, borderWidth: 2, borderColor: d.myVote === u ? t.accent : t.line, backgroundColor: d.myVote === u ? t.accentSoft : t.surface, borderRadius: 12, padding: 12, alignItems: "center" }}>
            <Text style={{ color: t.ink, fontWeight: d.myVote === u ? "800" : "600", fontSize: 16 * k }}>{u ? `👍 ${s.com_useful}` : `👎 ${s.com_not_useful}`} · {u ? d.useful : d.notUseful}</Text>
          </Pressable>
        ))}
      </View>
      {d.comments.length > 0 && (
        <View style={{ gap: 10, marginTop: 10 }}>
          {d.comments.map((c) => (
            <View key={c.id} style={{ backgroundColor: t.bg, borderRadius: 12, padding: 12, gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <Avatar name={c.name} photo={c.photo} size={28 * k} />
                <Text style={{ flex: 1, color: t.ink, fontWeight: "800", fontSize: 15 * k }}>{c.name}{c.mine ? ` (${s.com_you})` : ""} <Badges badges={c.badges} size={12 * k} /></Text>
                <Pressable onPress={() => onMore(c)} hitSlop={10} accessibilityLabel={s.com_more}><Text style={{ color: t.muted, fontSize: 18 * k }}>···</Text></Pressable>
              </View>
              <Text style={{ color: t.ink, fontSize: 16 * k, lineHeight: 23 * k }}>{c.text}</Text>
              <Pressable onPress={() => onLike(c)} hitSlop={8} style={{ alignSelf: "flex-start" }}>
                <Text style={{ color: c.liked ? t.accent : t.muted, fontWeight: c.liked ? "800" : "500", fontSize: 15 * k }}>👍 {c.likes}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <View style={{ gap: 8, marginTop: 10 }}>
        {!state.name ? (
          <TextInput value={name} onChangeText={setName} placeholder={s.com_name_ph} placeholderTextColor={t.muted} maxLength={40} accessibilityLabel={s.your_name}
            style={{ borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 12, fontSize: 17 * k, color: t.ink, backgroundColor: t.bg }} />
        ) : null}
        <TextInput value={text} onChangeText={setText} placeholder={s.com_ph} placeholderTextColor={t.muted} maxLength={300} multiline accessibilityLabel={s.com_ph}
          style={{ borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 12, fontSize: 17 * k, color: t.ink, backgroundColor: t.bg, minHeight: 60 }} />
        <Button title={busy ? "…" : s.com_send} kind="soft" disabled={busy || text.trim().length < 2} onPress={onSend} />
        {note ? <Text style={{ color: note === s.com_sent ? t.ok : t.bad, fontSize: 15 * k }}>{note}</Text> : null}
        <Hint>{s.com_rules}</Hint>
      </View>
    </Card>
  );
}
