/**
 * Poza de profil pentru comunitate (23 nov 2026): făcută pe loc cu camera din față (galeria vine în build-ul 1.1.3,
 * care adaugă expo-image-picker), micșorată la 256 px, verificată pe server (doar o persoană adultă / ceva inofensiv),
 * urcată în bucket-ul public `avatars`. „Fără poză” o șterge de pe server.
 */
import { useRef, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { removeAvatar, uploadAvatar } from "../../src/community";
import { useStore } from "../../src/store";
import { useTheme } from "../../src/theme";
import { Avatar } from "../../src/ui/Avatar";
import { Button, Card, Hint, Title, useScale } from "../../src/ui/Primitives";

export default function PhotoScreen() {
  const t = useTheme(); const k = useScale(); const router = useRouter();
  const { t: s, s: state, set } = useStore();
  const [perm, requestPerm] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const [shot, setShot] = useState<string | null>(null); const [facing, setFacing] = useState<"front" | "back">("front");
  const [busy, setBusy] = useState(false); const [note, setNote] = useState("");
  const take = async () => {
    if (!cam.current) return; setBusy(true);
    try { const p = await cam.current.takePictureAsync({ quality: 0.8, skipProcessing: true }); if (p?.uri) setShot(p.uri); } finally { setBusy(false); }
  };
  const save = async () => {
    if (!shot) return; setBusy(true); setNote("");
    try {
      const small = await manipulateAsync(shot, [{ resize: { width: 256 } }], { compress: 0.8, format: SaveFormat.JPEG, base64: true });
      const r = await uploadAvatar(small.base64 ?? "", state.name);
      if (r.ok && r.photo) { set({ photo: r.photo }); router.back(); }
      else setNote(r.reason === "rejected" ? s.photo_rejected : s.com_err);
    } catch { setNote(s.com_err); } finally { setBusy(false); }
  };
  const clear = async () => { setBusy(true); await removeAvatar(); set({ photo: undefined }); setBusy(false); router.back(); };
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, padding: 16, gap: 14 }}>
      <Stack.Screen options={{ title: s.photo_title }} />
      <Title>{s.photo_title}</Title>
      <Hint>{s.photo_hint}</Hint>
      <View style={{ alignSelf: "center", width: 260, height: 260, borderRadius: 130, overflow: "hidden", backgroundColor: t.surface }}>
        {shot ? <Image source={{ uri: shot }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : perm?.granted ? <CameraView ref={cam} style={StyleSheet.absoluteFill} facing={facing} />
          : <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
              {state.photo ? <Avatar name={state.name || "?"} photo={state.photo} size={200} /> : <Button title={s.photo_allow} onPress={() => void requestPerm()} />}
            </View>}
      </View>
      {shot ? (
        <Card>
          <Button title={busy ? "…" : s.photo_use} disabled={busy} onPress={save} />
          <Button title={s.photo_retake} kind="soft" disabled={busy} onPress={() => setShot(null)} />
        </Card>
      ) : perm?.granted ? (
        <Card>
          <Button title={busy ? "…" : "📷 " + s.photo_take} disabled={busy} onPress={take} />
          <Button title={s.photo_flip} kind="soft" onPress={() => setFacing(facing === "front" ? "back" : "front")} />
        </Card>
      ) : null}
      {state.photo ? <Button title={s.photo_remove} kind="soft" disabled={busy} onPress={clear} /> : null}
      {note ? <Text style={{ color: t.bad, fontSize: 15 * k }}>{note}</Text> : null}
    </View>
  );
}
