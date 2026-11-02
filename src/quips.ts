import type { Lang } from "./i18n";

/**
 * Glumițe scurte pentru bună dispoziție. Reguli:
 * - niciodată pe seama persoanei sau a bolii; pe seama prăjiturilor, da
 * - calde, ca de la un prieten, nu ca de la un medic
 * - una pe ecran, aleasă la întâmplare, ca să nu se repete
 */
export type QuipKey = "red" | "yellow" | "green" | "walk_done" | "med_taken" | "glu_ok" | "glu_high" | "glu_low" | "good_day" | "less_day" | "empty" | "loading" | "plate_wait";

const ro: Record<QuipKey, string[]> = {
  red: [
    "Raftul îl iartă. Glicemia, mai greu.",
    "Nu e interzis, e doar foarte… convingător. Lasă-l să convingă pe altcineva.",
    "Îl vezi, îl saluți, mergi mai departe. Ca pe un fost.",
    "Zahărul din el are propriul cod poștal.",
    "Dacă ar avea picioare, ar fugi el de tine. Fă-i tu favoarea.",
  ],
  yellow: [
    "Merge, dar cu lingurița, nu cu polonicul.",
    "O porție mică și o conștiință curată. Ambele încap.",
    "Regula de aur: jumătate acum, jumătate… niciodată.",
    "Cu măsură, adică nu „la ochi”. Ochii tăi au alte planuri.",
  ],
  green: [
    "Bravo! Ăsta poate sta la masă cu tine.",
    "Verde ca semaforul. Treci liniștit.",
    "Nici glicemia n-are obiecții. Rar lucru.",
    "Îl poți mânca și cu martori.",
  ],
  walk_done: [
    "Plimbarea bate prăjitura. Întotdeauna.",
    "Picioarele tale tocmai au făcut treaba pancreasului. Mulțumește-le.",
    "Ăsta e genul de pas pe care nu-l regreți.",
    "Vecinii cred că ai treabă. Tu știi că ai strategie.",
  ],
  med_taken: [
    "Bifat! Mai disciplinat ca mine la ora 8.",
    "Pastila luată, ziua începută cum trebuie.",
    "Medicul tău zâmbește undeva și nu știe de ce.",
    "O apăsare, o grijă mai puțin.",
  ],
  glu_ok: [
    "În interval. Pe curba asta ar putea dormi și un pisoi.",
    "Glicemie cuminte. Îi dăm o bulină verde și o lăsăm în pace.",
    "Numărul ăsta e exact genul de veste plictisitoare pe care o iubim.",
  ],
  glu_high: [
    "S-a cam urcat. Nu te certa cu ea; ia-o la o plimbare.",
    "Cifra e mare, dar ziua nu s-a terminat. Apă, pași, răbdare.",
    "Glicemia s-a entuziasmat. O calmăm cu o plimbare, nu cu o ceartă.",
  ],
  glu_low: [
    "Cam jos. Ceva de mâncat acum, glume mai târziu.",
    "Rezervorul e aproape gol. Întâi alimentezi, apoi conduci.",
  ],
  good_day: [
    "Zi bună! Dacă ar da note, azi ai lua 10 cu felicitări.",
    "O zi ca asta merită un cerc verde și o pernă bună.",
    "Azi ai fost mai tare decât cozonacul. Și cozonacul e tare.",
  ],
  less_day: [
    "O zi mai grea nu strică un om bun. Mâine o luăm de la cafea.",
    "Și maratoniștii merg uneori. Mâine alergăm iar.",
    "Ziua asta o punem la „experiență”. Mâine e pagină nouă.",
  ],
  empty: [
    "Jurnalul e gol, ca frigiderul duminică seara. Hai să-l umplem cu lucruri bune.",
    "Nimic notat încă. Nici glicemia nu știe că ai aplicație.",
  ],
  loading: ["Caut produsul… nu fugi nicăieri.", "O clipă, întreb baza de date. Și ea are zilele ei.", "Citesc eticheta mai atent decât producătorul."],
  plate_wait: ["Mă uit în farfurie… arată bine, în orice caz.", "Număr cartofii. Nu-ți fac poză ție, promit.", "O secundă, îmi pun ochelarii."],
};

const en: Record<QuipKey, string[]> = {
  red: [
    "The shelf forgives. Your blood sugar, less so.",
    "Not forbidden, just very… persuasive. Let it persuade someone else.",
    "See it, nod politely, walk on. Like an ex.",
    "The sugar in this has its own postcode.",
    "If it had legs it would run from you. Do it the favour.",
  ],
  yellow: [
    "Fine, with a teaspoon, not a ladle.",
    "A small portion and a clear conscience. Both fit.",
    "Golden rule: half now, half… never.",
    "In moderation, which is not the same as 'by eye'. Your eyes have other plans.",
  ],
  green: [
    "Well done! This one can sit at your table.",
    "Green like the traffic light. Go ahead.",
    "Even your blood sugar has no objections. Rare.",
    "You can eat this one with witnesses.",
  ],
  walk_done: [
    "A walk beats a cake. Every time.",
    "Your legs just did your pancreas a favour. Thank them.",
    "That's the kind of step you never regret.",
    "The neighbours think you're busy. You know it's strategy.",
  ],
  med_taken: [
    "Ticked! More disciplined than me at 8 a.m.",
    "Pill taken, day started right.",
    "Somewhere your doctor is smiling and doesn't know why.",
    "One tap, one worry fewer.",
  ],
  glu_ok: [
    "In range. A kitten could nap on a line that flat.",
    "A well-behaved reading. Green dot, leave it be.",
    "This number is exactly the kind of boring news we love.",
  ],
  glu_high: [
    "It climbed a bit. Don't argue with it; take it for a walk.",
    "Big number, but the day isn't over. Water, steps, patience.",
    "Your blood sugar got excited. We calm it with a walk, not a lecture.",
  ],
  glu_low: [
    "A bit low. Something to eat now, jokes later.",
    "Tank's nearly empty. Fuel first, then drive.",
  ],
  good_day: [
    "Good day! If this gave grades, you'd get an A with honours.",
    "A day like this deserves a green circle and a good pillow.",
    "Today you beat the cake. And the cake is tough.",
  ],
  less_day: [
    "A harder day doesn't spoil a good person. Tomorrow starts at coffee.",
    "Even marathon runners walk sometimes. Tomorrow we run again.",
    "We file this one under 'experience'. Tomorrow is a new page.",
  ],
  empty: [
    "The journal is as empty as the fridge on Sunday night. Let's fill it with good things.",
    "Nothing logged yet. Even your blood sugar doesn't know you have an app.",
  ],
  loading: ["Looking it up… don't go anywhere.", "One moment, asking the database. It has its days too.", "Reading the label more carefully than the manufacturer did."],
  plate_wait: ["Looking at your plate… it looks good, anyway.", "Counting the potatoes. Not photographing you, promise.", "One second, putting my glasses on."],
};

const de: Record<QuipKey, string[]> = {
  red: [
    "Das Regal verzeiht. Dein Blutzucker weniger.",
    "Nicht verboten, nur sehr… überzeugend. Lass es jemand anderen überzeugen.",
    "Ansehen, höflich nicken, weitergehen. Wie bei einem Ex.",
    "Der Zucker darin hat eine eigene Postleitzahl.",
    "Hätte es Beine, würde es vor dir weglaufen. Tu ihm den Gefallen.",
  ],
  yellow: [
    "Geht, mit dem Teelöffel, nicht mit der Kelle.",
    "Eine kleine Portion und ein gutes Gewissen. Beides passt.",
    "Goldene Regel: die Hälfte jetzt, die Hälfte… nie.",
    "In Maßen heißt nicht „nach Augenmaß“. Deine Augen haben andere Pläne.",
  ],
  green: [
    "Prima! Das darf mit an deinen Tisch.",
    "Grün wie die Ampel. Einfach weiter.",
    "Sogar dein Blutzucker hat nichts einzuwenden. Selten.",
    "Das kannst du auch vor Zeugen essen.",
  ],
  walk_done: [
    "Ein Spaziergang schlägt jeden Kuchen. Immer.",
    "Deine Beine haben gerade deiner Bauchspeicheldrüse geholfen. Bedank dich.",
    "Diese Schritte bereut man nie.",
    "Die Nachbarn denken, du hast zu tun. Du weißt: Es ist Strategie.",
  ],
  med_taken: [
    "Abgehakt! Disziplinierter als ich um 8 Uhr.",
    "Tablette genommen, Tag richtig gestartet.",
    "Irgendwo lächelt dein Arzt und weiß nicht, warum.",
    "Ein Tipp, eine Sorge weniger.",
  ],
  glu_ok: [
    "Im Bereich. Auf so einer flachen Linie könnte ein Kätzchen schlafen.",
    "Ein braver Wert. Grüner Punkt, in Ruhe lassen.",
    "Diese Zahl ist genau die langweilige Nachricht, die wir lieben.",
  ],
  glu_high: [
    "Etwas hoch. Nicht streiten, sondern spazieren gehen.",
    "Große Zahl, aber der Tag ist nicht vorbei. Wasser, Schritte, Geduld.",
    "Dein Blutzucker ist aufgeregt. Wir beruhigen ihn mit Bewegung, nicht mit Vorwürfen.",
  ],
  glu_low: [
    "Etwas niedrig. Jetzt etwas essen, Witze später.",
    "Der Tank ist fast leer. Erst tanken, dann fahren.",
  ],
  good_day: [
    "Guter Tag! Gäbe es Noten, wärst du heute Klassenbester.",
    "So ein Tag verdient einen grünen Kreis und ein gutes Kissen.",
    "Heute warst du stärker als der Kuchen. Und der Kuchen ist stark.",
  ],
  less_day: [
    "Ein schwerer Tag macht keinen guten Menschen schlecht. Morgen geht's beim Kaffee weiter.",
    "Auch Marathonläufer gehen mal. Morgen laufen wir wieder.",
    "Den Tag buchen wir unter „Erfahrung“. Morgen ist eine neue Seite.",
  ],
  empty: [
    "Das Tagebuch ist so leer wie der Kühlschrank am Sonntagabend. Füllen wir es mit Gutem.",
    "Noch nichts eingetragen. Dein Blutzucker weiß noch gar nicht, dass du eine App hast.",
  ],
  loading: ["Ich suche das Produkt… bleib kurz da.", "Einen Moment, ich frage die Datenbank. Sie hat auch ihre Tage.", "Ich lese das Etikett genauer als der Hersteller."],
  plate_wait: ["Ich schaue auf den Teller… sieht jedenfalls gut aus.", "Ich zähle die Kartoffeln. Dich fotografiere ich nicht, versprochen.", "Sekunde, ich setze die Brille auf."],
};

const ALL: Record<Lang, Record<QuipKey, string[]>> = { ro, en, de };

/** O replică la întâmplare; `seed` fixează alegerea pe un ecran, ca să nu se schimbe la fiecare redesenare. */
export function quip(lang: Lang, key: QuipKey, seed?: number | string): string {
  const pool = ALL[lang]?.[key] ?? ALL.ro[key];
  const n = seed == null ? Math.floor(Math.random() * pool.length)
    : Math.abs(String(seed).split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)) % pool.length;
  return pool[n];
}
