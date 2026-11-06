import * as Speech from "expo-speech";
import { File, Paths } from "expo-file-system";
import type { Lang } from "./i18n";
import { speechLocale } from "./i18n";

const API = process.env.EXPO_PUBLIC_API_URL || "https://curalife.expo.app";

/**
 * Citit cu voce tare. Întâi vocea naturală de pe server (OpenAI, aceeași peste tot), cu fișierele
 * ținute în cache pe telefon; dacă serverul nu răspunde sau build-ul nu are modulul audio, vocea telefonului.
 */
type Player = { play: () => void; pause: () => void; remove: () => void; addListener: (ev: string, cb: (s: { didJustFinish?: boolean }) => void) => { remove: () => void } };
type AudioMod = { createAudioPlayer: (src: { uri: string }) => Player; setAudioModeAsync?: (m: Record<string, unknown>) => Promise<void> };
let audio: AudioMod | null | undefined;
function audioMod(): AudioMod | null {
  if (audio !== undefined) return audio;
  try { audio = require("expo-audio") as AudioMod; } catch { audio = null; }
  return audio;
}
let current: Player | null = null;
let seq = 0;            // fiecare apel say() primește un număr; cele mai vechi se opresc singure la revenirea din await
let speakingText = "";  // ce se citește acum (ca a doua apăsare pe același buton să oprească, nu să pornească din nou)
let serverDown = 0; // nu mai încercăm serverul câteva minute după un eșec

function hash(s: string): string { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); }

async function fetchNatural(text: string, lang: Lang): Promise<string | null> {
  if (Date.now() < serverDown) return null;
  const f = new File(Paths.cache, `tts-${lang}-${hash(text)}.mp3`);
  if (f.exists) return f.uri;
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`${API}/api/tts`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, lang }), signal: ctrl.signal });
    if (!r.ok) { if (r.status === 503) serverDown = Date.now() + 10 * 60e3; return null; }
    const bytes = new Uint8Array(await r.arrayBuffer());
    if (bytes.length < 500) return null;
    f.write(bytes);
    return f.uri;
  } catch { serverDown = Date.now() + 2 * 60e3; return null; }
  finally { clearTimeout(to); }
}

let voiceCache: Record<string, string | undefined> = {};
/** Cea mai bună voce instalată pe telefon pentru limbă (calitate „enhanced/premium” dacă există). */
async function bestVoice(lang: Lang): Promise<string | undefined> {
  const loc = speechLocale[lang];
  if (loc in voiceCache) return voiceCache[loc];
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const mine = voices.filter((v) => v.language?.toLowerCase().replace("_", "-").startsWith(loc.toLowerCase().slice(0, 2)));
    const rank = (v: Speech.Voice) => (v.quality === Speech.VoiceQuality.Enhanced ? 2 : 0) + (/premium|enhanced|neural|siri/i.test(v.identifier + v.name) ? 1 : 0);
    mine.sort((a, b) => rank(b) - rank(a));
    voiceCache[loc] = mine[0]?.identifier;
  } catch { voiceCache[loc] = undefined; }
  return voiceCache[loc];
}

export function stop() {
  seq++; speakingText = "";
  Speech.stop();
  if (current) { try { current.pause(); current.remove(); } catch {} current = null; }
}

/** Citește cu voce tare: vocea naturală dacă se poate, altfel cea de pe telefon. */
export async function say(text: string, lang: Lang) {
  const again = speakingText === text;
  try { stop(); } catch {}
  if (again) return; // a doua apăsare pe același text = oprește
  const my = seq; speakingText = text;
  try {
    const mod = audioMod();
    if (mod) {
      await mod.setAudioModeAsync?.({ playsInSilentMode: true, interruptionMode: "mixWithOthers" }).catch(() => {});
      const uri = await fetchNatural(text, lang);
      if (my !== seq) return; // între timp s-a apăsat altceva
      if (uri) {
        const p = mod.createAudioPlayer({ uri });
        current = p;
        p.addListener("playbackStatusUpdate", (st) => { if (st.didJustFinish && current === p) { try { p.remove(); } catch {} current = null; speakingText = ""; } });
        p.play();
        return;
      }
    }
  } catch { current = null; }
  if (my !== seq) return;
  try {
    const voice = await bestVoice(lang);
    if (my !== seq) return;
    Speech.speak(text, { language: speechLocale[lang], voice, rate: 0.92, pitch: 1.0, onDone: () => { if (my === seq) speakingText = ""; }, onStopped: () => { if (my === seq) speakingText = ""; } });
  } catch { Speech.speak(text, { language: speechLocale[lang] }); }
}
