# Diabetoline (aplicația) — context de proiect

Aplicație mobilă (Expo / React Native, TypeScript) pentru diabetici, publicată de Curalife Development SRL (D-U-N-S 525405034). Numele aplicației: **Diabetoline** (fără „Scan”).

## Public și principii
- Utilizatori în vârstă, puțin obișnuiți cu tehnologia. Copiii lor instalează, plătesc și urmăresc.
- Simplitate înainte de orice: un buton mare pe primul ecran, text ≥ 18 px, fără gesturi ascunse, fără cont obligatoriu. La prima deschidere, o întâmpinare de 4 ecrane (`app/welcome.tsx`: la ce folosește, nu cum se apasă), apoi pe prima pagină un card „Încearcă acum” până la prima notare.
- Verdictul pe tot ecranul (cerc colorat + un cuvânt + o propoziție); detaliile doar la „De ce?”. Buton de citit cu voce tare.
- Rolul aplicației: ajută și ghidează diabeticul în toate situațiile din zi.
- Doar 3 secțiuni: Acasă · Jurnal · Mai mult. Prima pagină e organizată pe situații („Unde ești acum?”): La cumpărături (scanare) · La masă, acasă sau la restaurant (poză la farfurie) · Glicemia · Medicamentele.
- Limbi: ro, en, de. Preț: 99 lei/an în RO, 19,99 €/an în rest; pachet de familie.
- Glumițe (`src/quips.ts`, componenta `Quip`): scurte, calde, pe seama prăjiturilor, niciodată pe seama persoanei sau a bolii; o singură replică pe ecran; se pot opri din Setări.
- Fără sfaturi medicale, fără doze, fără diagnostic (evităm încadrarea ca dispozitiv medical). Reamintirile de medicație sunt doar reamintiri.

## Scope V1 (decis 1 nov 2026)
1. Scanare cu verdict simplu (motor în `src/engine`, date din Open Food Facts)
2. Poză la farfurie: AI recunoaște alimentele, estimează porția, carbohidrații și indicele glicemic, dă verdictul mesei (`src/engine/plate.ts`, pragurile `MEAL_T`) și recomandări (`app/api/plate+api.ts`). Dacă serverul nu răspunde, omul spune singur cum a fost masa.
3. Jurnal de glicemie (o apăsare; momentul propus după ora din zi)
4. Medicamente cu reamintire și buton „Am luat”
5. Cont de familie (Supabase, UE, proiect `diabetoline`, schema în `supabase/migrations/0001_family.sql`, cod în `src/family/`): utilizatori anonimi; părintele acceptă explicit, primește un cod de 6 cifre, copilul îl introduce; jurnalul (fără poze) se sincronizează automat; copilul vede jurnalul și „de urmărit”; părintele poate rupe legătura și șterge datele de pe server
6. Raport pentru medic (PDF, 30 de zile, trimis de obicei de copil)
7. Îndrumare după masă (2 nov 2026): la un produs roșu/galben mâncat sau la o farfurie notată „cu măsură”/„mai grea” nu certăm, ghidăm: plimbare, reamintire de măsurat glicemia la 2 ore, apă, masa următoare ușoară (`src/ui/AfterMeal.tsx`). Calendarul zilelor bune / mai puțin bune în Jurnal (`src/engine/days.ts`).
8. Produs negăsit → poză la tabelul nutrițional, citit de AI pe server (`app/api/label+api.ts`), omul doar confirmă. Niciodată introducere manuală de la zero.

După lansare: rețete, coș, plan de mese, senzor (Libre/Dexcom), meniu de restaurant, scanare raft.

## Tehnic
- `npm run typecheck`, `npm test` (motorul de verdict, Node test runner, build în `.test-build`)
- Open Food Facts nu e accesibil din mediul de dezvoltare Claude; testele pe produse reale se fac pe telefon.
- Server: rute API Expo Router (`app/api/*+api.ts`, `web.output: "server"`), găzduite pe EAS Hosting la https://curalife.expo.app (publicare automată din GitHub Actions, `.github/workflows/update.yml`). Secret: `ANTHROPIC_API_KEY` (variabilă secretă EAS). Aplicația găsește serverul prin `EXPO_PUBLIC_API_URL`.
- Politica de confidențialitate: diabetoline.com/pages/confidentialitate-aplicatie (link în Mai mult).
- Supabase: URL și cheia publică în `src/family/client.ts`; cheia service_role e în EAS (`SUPABASE_SERVICE_KEY`), neutilizată încă. Anonymous sign-ins trebuie activat în Supabase Auth. Abonamente: RevenueCat (de făcut).
- Pragurile de verdict (`src/engine/verdict.ts`, obiectul `T`, și `MEAL_T` din `src/engine/plate.ts`) sunt punct de pornire; de validat cu un diabetolog înainte de lansare.
