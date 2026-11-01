# Diabetoline (aplicația)

Scanner de produse pentru diabetici: verdict verde / galben / roșu, indice și încărcătură glicemică estimate, zahăr ascuns, alternative.

- Expo (React Native) + TypeScript, expo-router
- Date produse: Open Food Facts (`src/api/off.ts`)
- Motorul de verdict: `src/engine/` (teste: `npm test`)

## Rulare
```
npm install
npm run typecheck && npm test
npx expo start        # scanează QR-ul cu Expo Go pe telefon
```
Build nativ (iOS/Android) prin EAS: `npx eas build --platform all`.
