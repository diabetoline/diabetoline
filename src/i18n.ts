import { getLocales } from "expo-localization";

export type Lang = "ro" | "en" | "de";
type Verd = { carbs: number; sugars: number; fiber: number; gl: number | null };
type Dict = Record<string, any>;

const ro = {
  // home (situații)
  tab_home: "Acasă", hello: "Bună", hello_name: (n: string) => `Bună, ${n}`,
  home_promise: "Te ajutăm cu diabetul în fiecare zi: la cumpărături, la masă, cu glicemia și cu medicamentele.", home_ask: "Unde ești acum?",
  sit_meds: "Medicamentele", sit_meds_sub: "Îți amintim la ora potrivită și bifezi „Am luat”.",
  sit_shop: "La cumpărături", sit_shop_sub: "Scanează codul de bare. Îți spun pe loc: potrivit, cu măsură sau evită.",
  sit_meal: "La masă", sit_meal_sub: "Acasă sau la restaurant: fă o poză la farfurie. Rămâne în jurnalul tău.",
  sit_glu: "Glicemia", sit_glu_sub: "Ai măsurat? Noteaz-o cu o apăsare.",
  your_day: "Ziua ta", code_toggle: "Nu citește codul? Tastează-l",
  // tabs
  tab_scan: "Scanează", tab_journal: "Jurnal", tab_more: "Mai mult",
  // home
  scan_big: "Scanează produsul", plate_big: "Poză la farfurie", type_code: "sau tastează codul de bare", check: "Verifică",
  today: "Azi", nothing_today: "Nimic notat azi. Scanează un produs sau fă o poză la ce mănânci.", last_scans: "Ultimele produse",
  // scanner
  scan_hint: "Îndreaptă camera spre codul de bare", scan_distance: "Ține telefonul la 15–20 cm, cu tot codul în cadru.",
  cam_denied: "Aplicația are nevoie de cameră ca să citească codurile de bare.", cam_allow: "Permite camera", close: "Închide", torch: "Lanternă",
  // plate
  plate_title: "Poză la farfurie", plate_hint: "Încadrează toată farfuria și apasă butonul.", plate_saved: "Masa a fost notată în jurnal.", take_photo: "Fă poza", retake: "Altă poză", use_photo: "Notează masa",
  meal_breakfast: "Mic dejun", meal_lunch: "Prânz", meal_dinner: "Cină", meal_snack: "Gustare",
  // product
  loading: "Caut produsul…", not_found: "Produsul nu e încă în baza de date.", not_found_help: "Poți scana alt produs sau poți adăuga acest produs tu, cu valorile de pe etichetă.", network: "Nu am putut ajunge la baza de date. Verifică internetul.",
  good: "Potrivit", mod: "Cu măsură", avoid: "Evită", serving: "porție", serving_assumed: "porție estimată, eticheta nu o declară",
  why: "De ce?", less: "Mai puțin", impact: "Impact asupra glicemiei", gi: "Indice glicemic", gl: "Încărcătură / porție", low: "scăzut", mid: "mediu", high: "ridicat", low_f: "scăzută", mid_f: "medie", high_f: "ridicată",
  gi_note: "Indice estimat după alimente de referință similare. Încărcătura = indice × carbohidrați pe porție ÷ 100.",
  hidden: "Zahăr ascuns în ingrediente", walk: "Doza de mișcare", walk_text: (m: number) => `O plimbare de ${m} minute după ce îl mănânci reduce vârful glicemic.`,
  nut: "Valori nutriționale", carbs: "Carbohidrați", sugars: "din care zaharuri", fiber: "Fibre",
  disclaimer: "Informații generale despre produs, nu sfat medical. Verdictul depinde de datele din baza de produse; verifică eticheta dacă ceva pare greșit.",
  ate_this: "Am mâncat asta", log_after: "Notează glicemia", speak: "Citește cu voce tare", scan_again: "Scanează altul",
  trap: (claim: string) => `Atenție la etichetă. Scrie „${claim}”, dar conține ingrediente care cresc glicemia.`,
  summary: { green: "Poți să-l mănânci liniștit.", yellow: "Merge, dar în cantitate mică.", red: "Mai bine îl lași pe raft." },
  reason: {
    carbs_low: (v: Verd) => `${v.carbs} g carbohidrați pe porție, un nivel redus.`,
    carbs_mid: (v: Verd) => `${v.carbs} g carbohidrați pe porție: ține cont de ei la masa respectivă.`,
    carbs_high: (v: Verd) => `${v.carbs} g carbohidrați pe porție: mult pentru o singură porție.`,
    sugars_mid: (v: Verd) => `${v.sugars} g zahăr pe porție, cam ${Math.max(1, Math.round(v.sugars / 4))} lingurițe.`,
    sugars_high: (v: Verd) => `${v.sugars} g zahăr pe porție, cât ${Math.round(v.sugars / 4)} lingurițe.`,
    fiber_good: (v: Verd) => `${v.fiber} g fibre pe porție încetinesc creșterea glicemiei.`,
    gi_high: () => "Indice glicemic ridicat: crește glicemia rapid.",
    gl_high: (v: Verd) => `Încărcătură glicemică ridicată pe porție (${v.gl}).`,
    sugar_dense: () => "Produsul e în cea mai mare parte zahăr, oricât de mică ar fi porția.",
    hidden_sugar: () => "Conține ingrediente care cresc glicemia, deși nu apar ca „zahăr”.",
    label_trap: () => "Eticheta promite puțin zahăr, dar conținutul spune altceva.",
  } as Record<string, (v: Verd) => string>,
  hid: { maltodextrin: "maltodextrină", glucose_fructose_syrup: "sirop de glucoză-fructoză", glucose_syrup: "sirop de glucoză", dextrose: "dextroză", fructose: "fructoză", maltitol: "maltitol", honey: "miere", invert_sugar: "zahăr invertit", other_syrup: "siropuri (orez, agave, porumb, caramel)", molasses: "melasă", juice_concentrate: "suc concentrat", maltose: "maltoză" } as Record<string, string>,
  claim: { no_added_sugar: "fără zahăr adăugat", sugar_free: "fără zahăr", for_diabetics: "pentru diabetici", light: "light" } as Record<string, string>,
  // add product
  add_product: "Adaugă produsul", add_title: "Adaugă produs", add_hint: "Copiază de pe etichetă valorile la 100 g sau 100 ml.", f_name: "Numele produsului", f_brand: "Brand (opțional)", f_carbs: "Carbohidrați la 100", f_sugars: "din care zaharuri", f_fiber: "Fibre", f_serving: "Porție (g sau ml)", f_unit_g: "grame", f_unit_ml: "mililitri", save: "Salvează și verifică", added_by_you: "adăugat de tine",
  incomplete: "Eticheta nu are tabel nutrițional în baza de date.", incomplete_help: "Verdictul nu poate fi calculat. Poți adăuga tu valorile de pe etichetă.", back: "Înapoi",
  // journal
  journal_title: "Jurnal", glu_add: "Notează glicemia", glu_value: "Glicemia", glu_when: "Când ai măsurat?", glu_saved: "Glicemia a fost notată.",
  ctx: { fasting: "Pe nemâncate", pre: "Înainte de masă", post2h: "La 2 ore după masă", evening: "Seara", other: "Altă situație" } as Record<string, string>,
  g_low: "Scăzută", g_ok: "În interval", g_high: "Ridicată", avg7: "media, 7 zile", inrange: "în interval", last: "ultima",
  no_entries: "Nicio notare încă.", meal: "Masă", med_taken: "luat", med_skipped: "neluat", delete: "Șterge",
  glu_hint: "Intervalele colorate sunt orientative (sub 70 scăzut, peste 130 pe nemâncate sau peste 180 după masă ridicat). Țintele tale le stabilește medicul.",
  // meds
  meds: "Medicamente", meds_sub: "Reamintiri la orele stabilite de medic. Aplicația nu recomandă doze.", med_add: "Adaugă medicament", med_name: "Numele medicamentului", med_times: "Orele (ex. 8:00, 20:00)", med_saved: "Reamintirea a fost setată.",
  med_take: "Am luat", med_due: "de luat la", notif_title: "E ora pentru", notif_body: (n: string) => `${n}. Apasă „Am luat” după ce l-ai luat.`, notif_denied: "Permite notificările în Setări ca să primești reamintiri.",
  // more
  family: "Familie", family_soon: "Vine în următoarea versiune: copilul tău vede ce scanezi și glicemiile tale, ca să te ajute.", care: "Îngrijire", care_soon: "În curând.", settings: "Setări", report: "Raport pentru medic", report_soon: "În curând.",
  lang: "Limba", unit: "Unitatea glicemiei", your_name: "Numele tău", big_text: "Text mai mare", reset: "Șterge toate datele",
  soon: "În lucru. Vine în versiunea următoare.",
};

const en: typeof ro = {
  tab_home: "Home", hello: "Hello", hello_name: (n: string) => `Hello, ${n}`,
  home_promise: "We help you with diabetes every day: when shopping, at meals, with your blood sugar and your medication.", home_ask: "Where are you right now?",
  sit_meds: "Medication", sit_meds_sub: "We remind you at the right time and you tick \"Taken\".",
  sit_shop: "Shopping", sit_shop_sub: "Scan the barcode. You get an instant answer: good, in moderation or avoid.",
  sit_meal: "At the table", sit_meal_sub: "At home or in a restaurant: take a photo of your plate. It stays in your journal.",
  sit_glu: "Blood sugar", sit_glu_sub: "Just measured? Log it with one tap.",
  your_day: "Your day", code_toggle: "Won't read the code? Type it",
  tab_scan: "Scan", tab_journal: "Journal", tab_more: "More",
  scan_big: "Scan a product", plate_big: "Photo of my plate", type_code: "or type the barcode", check: "Check",
  today: "Today", nothing_today: "Nothing logged today. Scan a product or take a photo of what you eat.", last_scans: "Latest products",
  scan_hint: "Point the camera at the barcode", scan_distance: "Hold the phone 15–20 cm away, with the whole code in frame.",
  cam_denied: "The app needs the camera to read barcodes.", cam_allow: "Allow camera", close: "Close", torch: "Torch",
  plate_title: "Photo of my plate", plate_hint: "Frame the whole plate and press the button.", plate_saved: "Meal saved to your journal.", take_photo: "Take photo", retake: "Retake", use_photo: "Save meal",
  meal_breakfast: "Breakfast", meal_lunch: "Lunch", meal_dinner: "Dinner", meal_snack: "Snack",
  loading: "Looking up the product…", not_found: "This product isn't in the database yet.", not_found_help: "Scan another product, or add this one yourself with the label values.", network: "Couldn't reach the database. Check your connection.",
  good: "Good choice", mod: "In moderation", avoid: "Avoid", serving: "serving", serving_assumed: "estimated serving, the label doesn't declare one",
  why: "Why?", less: "Less", impact: "Impact on blood sugar", gi: "Glycemic index", gl: "Glycemic load / serving", low: "low", mid: "medium", high: "high", low_f: "low", mid_f: "medium", high_f: "high",
  gi_note: "Index estimated from similar reference foods. Load = index × carbs per serving ÷ 100.",
  hidden: "Hidden sugar in ingredients", walk: "Movement dose", walk_text: (m: number) => `A ${m}-minute walk after eating it lowers the glucose peak.`,
  nut: "Nutrition facts", carbs: "Carbohydrates", sugars: "of which sugars", fiber: "Fiber",
  disclaimer: "General product information, not medical advice. The verdict depends on the product database; check the label if something looks wrong.",
  ate_this: "I ate this", log_after: "Log glucose", speak: "Read aloud", scan_again: "Scan another",
  trap: (claim: string) => `Watch the label. It says "${claim}", but it contains ingredients that raise blood sugar.`,
  summary: { green: "You can eat it without worry.", yellow: "Fine, but keep the portion small.", red: "Better to leave it on the shelf." },
  reason: {
    carbs_low: (v: Verd) => `${v.carbs} g carbs per serving, a low amount.`,
    carbs_mid: (v: Verd) => `${v.carbs} g carbs per serving: count them in that meal.`,
    carbs_high: (v: Verd) => `${v.carbs} g carbs per serving: a lot for one serving.`,
    sugars_mid: (v: Verd) => `${v.sugars} g sugar per serving, about ${Math.max(1, Math.round(v.sugars / 4))} teaspoons.`,
    sugars_high: (v: Verd) => `${v.sugars} g sugar per serving, ${Math.round(v.sugars / 4)} teaspoons.`,
    fiber_good: (v: Verd) => `${v.fiber} g fiber per serving slows the glucose rise.`,
    gi_high: () => "High glycemic index: raises blood sugar fast.",
    gl_high: (v: Verd) => `High glycemic load per serving (${v.gl}).`,
    sugar_dense: () => "The product is mostly sugar, however small the serving.",
    hidden_sugar: () => "Contains ingredients that raise blood sugar without being called \"sugar\".",
    label_trap: () => "The label promises little sugar; the contents say otherwise.",
  },
  hid: { maltodextrin: "maltodextrin", glucose_fructose_syrup: "glucose-fructose syrup", glucose_syrup: "glucose syrup", dextrose: "dextrose", fructose: "fructose", maltitol: "maltitol", honey: "honey", invert_sugar: "invert sugar", other_syrup: "syrups (rice, agave, corn, caramel)", molasses: "molasses", juice_concentrate: "juice concentrate", maltose: "maltose" },
  claim: { no_added_sugar: "no added sugar", sugar_free: "sugar-free", for_diabetics: "for diabetics", light: "light" },
  add_product: "Add this product", add_title: "Add product", add_hint: "Copy the values per 100 g or 100 ml from the label.", f_name: "Product name", f_brand: "Brand (optional)", f_carbs: "Carbohydrates per 100", f_sugars: "of which sugars", f_fiber: "Fiber", f_serving: "Serving (g or ml)", f_unit_g: "grams", f_unit_ml: "millilitres", save: "Save and check", added_by_you: "added by you",
  incomplete: "The database has no nutrition table for this label.", incomplete_help: "The verdict can't be calculated. You can add the label values yourself.", back: "Back",
  journal_title: "Journal", glu_add: "Log glucose", glu_value: "Blood glucose", glu_when: "When did you measure?", glu_saved: "Glucose saved.",
  ctx: { fasting: "Fasting", pre: "Before a meal", post2h: "2 hours after a meal", evening: "Evening", other: "Other" },
  g_low: "Low", g_ok: "In range", g_high: "High", avg7: "7-day average", inrange: "in range", last: "latest",
  no_entries: "Nothing logged yet.", meal: "Meal", med_taken: "taken", med_skipped: "not taken", delete: "Delete",
  glu_hint: "Colored ranges are indicative (below 70 low, above 130 fasting or above 180 after meals high). Your doctor sets your targets.",
  meds: "Medication", meds_sub: "Reminders at the times your doctor set. The app never suggests doses.", med_add: "Add medication", med_name: "Medication name", med_times: "Times (e.g. 8:00, 20:00)", med_saved: "Reminder set.",
  med_take: "Taken", med_due: "due at", notif_title: "Time for", notif_body: (n: string) => `${n}. Tap "Taken" once you've had it.`, notif_denied: "Allow notifications in Settings to get reminders.",
  family: "Family", family_soon: "Coming in the next version: your child sees what you scan and your glucose, to help you.", care: "Care", care_soon: "Coming soon.", settings: "Settings", report: "Doctor report", report_soon: "Coming soon.",
  lang: "Language", unit: "Glucose unit", your_name: "Your name", big_text: "Larger text", reset: "Delete all data",
  soon: "In progress. Coming in the next version.",
};

const de: typeof ro = {
  tab_home: "Start", hello: "Hallo", hello_name: (n: string) => `Hallo, ${n}`,
  home_promise: "Wir helfen dir jeden Tag mit Diabetes: beim Einkaufen, beim Essen, beim Blutzucker und bei den Medikamenten.", home_ask: "Wo bist du gerade?",
  sit_meds: "Medikamente", sit_meds_sub: "Wir erinnern dich zur richtigen Zeit, du hakst \"Genommen\" ab.",
  sit_shop: "Beim Einkaufen", sit_shop_sub: "Barcode scannen. Sofort die Antwort: geeignet, in Maßen oder vermeiden.",
  sit_meal: "Beim Essen", sit_meal_sub: "Zu Hause oder im Restaurant: Teller fotografieren. Es bleibt in deinem Tagebuch.",
  sit_glu: "Blutzucker", sit_glu_sub: "Gerade gemessen? Mit einem Tipp eintragen.",
  your_day: "Dein Tag", code_toggle: "Code wird nicht erkannt? Eintippen",
  tab_scan: "Scannen", tab_journal: "Tagebuch", tab_more: "Mehr",
  scan_big: "Produkt scannen", plate_big: "Foto vom Teller", type_code: "oder Barcode eingeben", check: "Prüfen",
  today: "Heute", nothing_today: "Heute noch nichts eingetragen. Scanne ein Produkt oder fotografiere dein Essen.", last_scans: "Letzte Produkte",
  scan_hint: "Kamera auf den Barcode richten", scan_distance: "Handy 15–20 cm entfernt halten, der ganze Code im Bild.",
  cam_denied: "Die App braucht die Kamera, um Barcodes zu lesen.", cam_allow: "Kamera erlauben", close: "Schließen", torch: "Licht",
  plate_title: "Foto vom Teller", plate_hint: "Den ganzen Teller ins Bild nehmen und auf den Knopf drücken.", plate_saved: "Mahlzeit im Tagebuch gespeichert.", take_photo: "Foto machen", retake: "Neues Foto", use_photo: "Mahlzeit speichern",
  meal_breakfast: "Frühstück", meal_lunch: "Mittagessen", meal_dinner: "Abendessen", meal_snack: "Snack",
  loading: "Produkt wird gesucht…", not_found: "Dieses Produkt ist noch nicht in der Datenbank.", not_found_help: "Scanne ein anderes Produkt oder füge dieses mit den Werten vom Etikett hinzu.", network: "Datenbank nicht erreichbar. Prüfe deine Verbindung.",
  good: "Geeignet", mod: "In Maßen", avoid: "Vermeiden", serving: "Portion", serving_assumed: "geschätzte Portion, das Etikett nennt keine",
  why: "Warum?", less: "Weniger", impact: "Wirkung auf den Blutzucker", gi: "Glykämischer Index", gl: "Glykämische Last / Portion", low: "niedrig", mid: "mittel", high: "hoch", low_f: "niedrig", mid_f: "mittel", high_f: "hoch",
  gi_note: "Index geschätzt anhand ähnlicher Referenzlebensmittel. Last = Index × Kohlenhydrate pro Portion ÷ 100.",
  hidden: "Versteckter Zucker in den Zutaten", walk: "Bewegungsdosis", walk_text: (m: number) => `Ein ${m}-minütiger Spaziergang danach senkt die Blutzuckerspitze.`,
  nut: "Nährwerte", carbs: "Kohlenhydrate", sugars: "davon Zucker", fiber: "Ballaststoffe",
  disclaimer: "Allgemeine Produktinformation, keine medizinische Beratung. Die Bewertung hängt von der Produktdatenbank ab; prüfe das Etikett, wenn etwas falsch aussieht.",
  ate_this: "Das habe ich gegessen", log_after: "Blutzucker eintragen", speak: "Vorlesen", scan_again: "Weiteres scannen",
  trap: (claim: string) => `Achtung Etikett. Es steht „${claim}“, aber es enthält Zutaten, die den Blutzucker erhöhen.`,
  summary: { green: "Das kannst du bedenkenlos essen.", yellow: "Geht, aber nur eine kleine Portion.", red: "Lass es lieber im Regal." },
  reason: {
    carbs_low: (v: Verd) => `${v.carbs} g Kohlenhydrate pro Portion, wenig.`,
    carbs_mid: (v: Verd) => `${v.carbs} g Kohlenhydrate pro Portion: bei der Mahlzeit mitrechnen.`,
    carbs_high: (v: Verd) => `${v.carbs} g Kohlenhydrate pro Portion: viel für eine Portion.`,
    sugars_mid: (v: Verd) => `${v.sugars} g Zucker pro Portion, etwa ${Math.max(1, Math.round(v.sugars / 4))} Teelöffel.`,
    sugars_high: (v: Verd) => `${v.sugars} g Zucker pro Portion, ${Math.round(v.sugars / 4)} Teelöffel.`,
    fiber_good: (v: Verd) => `${v.fiber} g Ballaststoffe pro Portion bremsen den Anstieg.`,
    gi_high: () => "Hoher glykämischer Index: lässt den Blutzucker schnell steigen.",
    gl_high: (v: Verd) => `Hohe glykämische Last pro Portion (${v.gl}).`,
    sugar_dense: () => "Das Produkt besteht größtenteils aus Zucker, egal wie klein die Portion.",
    hidden_sugar: () => "Enthält Zutaten, die den Blutzucker erhöhen, ohne „Zucker“ zu heißen.",
    label_trap: () => "Das Etikett verspricht wenig Zucker, der Inhalt sagt etwas anderes.",
  },
  hid: { maltodextrin: "Maltodextrin", glucose_fructose_syrup: "Glukose-Fruktose-Sirup", glucose_syrup: "Glukosesirup", dextrose: "Dextrose", fructose: "Fruktose", maltitol: "Maltit", honey: "Honig", invert_sugar: "Invertzucker", other_syrup: "Sirupe (Reis, Agave, Mais, Karamell)", molasses: "Melasse", juice_concentrate: "Saftkonzentrat", maltose: "Maltose" },
  claim: { no_added_sugar: "ohne Zuckerzusatz", sugar_free: "zuckerfrei", for_diabetics: "für Diabetiker", light: "light" },
  add_product: "Produkt hinzufügen", add_title: "Produkt hinzufügen", add_hint: "Übernimm die Werte pro 100 g oder 100 ml vom Etikett.", f_name: "Produktname", f_brand: "Marke (optional)", f_carbs: "Kohlenhydrate pro 100", f_sugars: "davon Zucker", f_fiber: "Ballaststoffe", f_serving: "Portion (g oder ml)", f_unit_g: "Gramm", f_unit_ml: "Milliliter", save: "Speichern und prüfen", added_by_you: "von dir hinzugefügt",
  incomplete: "Für dieses Etikett gibt es keine Nährwerttabelle in der Datenbank.", incomplete_help: "Die Bewertung kann nicht berechnet werden. Du kannst die Werte vom Etikett selbst eintragen.", back: "Zurück",
  journal_title: "Tagebuch", glu_add: "Blutzucker eintragen", glu_value: "Blutzucker", glu_when: "Wann gemessen?", glu_saved: "Blutzucker gespeichert.",
  ctx: { fasting: "Nüchtern", pre: "Vor dem Essen", post2h: "2 Stunden nach dem Essen", evening: "Abends", other: "Sonstiges" },
  g_low: "Niedrig", g_ok: "Im Zielbereich", g_high: "Hoch", avg7: "Durchschnitt, 7 Tage", inrange: "im Zielbereich", last: "zuletzt",
  no_entries: "Noch nichts eingetragen.", meal: "Mahlzeit", med_taken: "genommen", med_skipped: "nicht genommen", delete: "Löschen",
  glu_hint: "Farbige Bereiche sind Richtwerte (unter 70 niedrig, über 130 nüchtern oder über 180 nach dem Essen hoch). Deine Zielwerte legt dein Arzt fest.",
  meds: "Medikamente", meds_sub: "Erinnerungen zu den vom Arzt festgelegten Zeiten. Die App schlägt nie Dosierungen vor.", med_add: "Medikament hinzufügen", med_name: "Name des Medikaments", med_times: "Uhrzeiten (z. B. 8:00, 20:00)", med_saved: "Erinnerung eingerichtet.",
  med_take: "Genommen", med_due: "fällig um", notif_title: "Zeit für", notif_body: (n: string) => `${n}. Tippe auf „Genommen“, wenn du es genommen hast.`, notif_denied: "Erlaube Mitteilungen in den Einstellungen, um Erinnerungen zu bekommen.",
  family: "Familie", family_soon: "Kommt in der nächsten Version: dein Kind sieht, was du scannst, und deine Werte, um dir zu helfen.", care: "Pflege", care_soon: "Bald verfügbar.", settings: "Einstellungen", report: "Arztbericht", report_soon: "Bald verfügbar.",
  lang: "Sprache", unit: "Blutzuckereinheit", your_name: "Dein Name", big_text: "Größere Schrift", reset: "Alle Daten löschen",
  soon: "In Arbeit. Kommt in der nächsten Version.",
};

const STR: Record<Lang, typeof ro> = { ro, en, de };
export type Strings = typeof ro;
/**
 * Limba implicită. În Expo Go iOS raportează doar limbile pe care le are Expo Go (engleză),
 * așa că ne uităm și la regiunea telefonului: telefon din România/Moldova → română,
 * din Germania/Austria/Elveția → germană. Restul lumii → engleză.
 */
export function deviceLang(): Lang {
  const locs = getLocales();
  const langs = locs.map((l) => l.languageCode);
  const region = locs.map((l) => l.regionCode).find(Boolean) ?? "";
  if (langs.includes("ro") || region === "RO" || region === "MD") return "ro";
  if (langs.includes("de") || region === "DE" || region === "AT" || region === "CH") return "de";
  return "en";
}
export function strings(lang: Lang): Strings { return STR[lang] ?? ro; }
/** BCP-47 tag for text-to-speech */
export const speechLocale: Record<Lang, string> = { ro: "ro-RO", en: "en-US", de: "de-DE" };
