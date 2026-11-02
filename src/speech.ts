import * as Speech from "expo-speech";
import type { Lang } from "./i18n";
import { speechLocale } from "./i18n";

let cache: Record<string, string | undefined> = {};
/** Cea mai bună voce instalată pe telefon pentru limbă (calitate „enhanced/premium” dacă există). */
async function bestVoice(lang: Lang): Promise<string | undefined> {
  const loc = speechLocale[lang];
  if (loc in cache) return cache[loc];
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const mine = voices.filter((v) => v.language?.toLowerCase().replace("_", "-").startsWith(loc.toLowerCase().slice(0, 2)));
    const rank = (v: Speech.Voice) => (v.quality === Speech.VoiceQuality.Enhanced ? 2 : 0) + (/premium|enhanced|neural|siri/i.test(v.identifier + v.name) ? 1 : 0);
    mine.sort((a, b) => rank(b) - rank(a));
    cache[loc] = mine[0]?.identifier;
  } catch { cache[loc] = undefined; }
  return cache[loc];
}

/** Citește cu voce tare, cu vocea cea mai bună de pe telefon și un ritm liniștit. */
export async function say(text: string, lang: Lang) {
  Speech.stop();
  const voice = await bestVoice(lang);
  Speech.speak(text, { language: speechLocale[lang], voice, rate: 0.92, pitch: 1.0 });
}
