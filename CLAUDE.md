# Diabetoline (aplicația) — context de proiect

Aplicație mobilă (Expo / React Native, TypeScript) pentru diabetici, publicată de Curalife Development SRL (D-U-N-S 525405034). Numele aplicației: **Diabetoline** (fără „Scan”).

## Public și principii
- Utilizatori în vârstă, puțin obișnuiți cu tehnologia. Copiii lor instalează, plătesc și urmăresc.
- Simplitate înainte de orice: un buton mare pe primul ecran, text ≥ 18 px, fără gesturi ascunse, fără cont obligatoriu, fără tutorial.
- Verdictul pe tot ecranul (cerc colorat + un cuvânt + o propoziție); detaliile doar la „De ce?”. Buton de citit cu voce tare.
- Doar 3 secțiuni: Scanează · Jurnal · Mai mult.
- Limbi: ro, en, de. Preț: 99 lei/an în RO, 19,99 €/an în rest; pachet de familie.
- Fără sfaturi medicale, fără doze, fără diagnostic (evităm încadrarea ca dispozitiv medical). Reamintirile de medicație sunt doar reamintiri.

## Scope V1 (decis 1 nov 2026)
1. Scanare cu verdict simplu (motor în `src/engine`, date din Open Food Facts)
2. Poză la farfurie (jurnal foto al meselor, în istoric)
3. Jurnal de glicemie (o apăsare; momentul propus după ora din zi)
4. Medicamente cu reamintire și buton „Am luat”
5. Cont de familie: copilul vede scanările, pozele, glicemiile, medicația; alerte; părintele acceptă și poate rupe legătura oricând
6. Raport pentru medic (PDF, 30 de zile, trimis de obicei de copil)

După lansare: rețete, coș, plan de mese, senzor (Libre/Dexcom), meniu de restaurant, scanare raft, AI pe poza farfuriei.

## Tehnic
- `npm run typecheck`, `npm test` (motorul de verdict, Node test runner, build în `.test-build`)
- Open Food Facts nu e accesibil din mediul de dezvoltare Claude; testele pe produse reale se fac pe telefon.
- Backend planificat: Supabase în UE (conturi, familie, poze criptate). Abonamente: RevenueCat.
- Pragurile de verdict (`src/engine/verdict.ts`, obiectul `T`) sunt punct de pornire; de validat cu un diabetolog înainte de lansare.
