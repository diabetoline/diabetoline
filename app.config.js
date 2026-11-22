// Configurația Expo = app.json + ce depinde de variabile de mediu (22 nov 2026, build 1.1.2).
// SDK-ul Meta (campanii „App installs”) are nevoie de App ID + Client token la compilare; le ținem în EAS
// (mediul `production`, variabilele FB_APP_ID / FB_CLIENT_TOKEN), nu în repo. Fără ele build-ul iese fără SDK-ul Meta,
// iar `src/attribution.ts` sare peste el — aplicația merge la fel.
const base = require("./app.json");

module.exports = () => {
  const cfg = { ...base.expo, plugins: [...base.expo.plugins] };
  const appID = process.env.FB_APP_ID;
  const clientToken = process.env.FB_CLIENT_TOKEN;
  if (appID && clientToken) {
    cfg.plugins.push([
      "react-native-fbsdk-next",
      {
        appID,
        clientToken,
        displayName: "Diabetoline",
        scheme: `fb${appID}`,
        // evenimentele standard (instalare, deschidere) pleacă singure — atât îi trebuie Meta ca să optimizeze instalările
        autoLogAppEventsEnabled: true,
        advertiserIDCollectionEnabled: true,
        isAutoInitEnabled: true,
        // fără fereastra ATT pe iPhone (Alex: iOS mai târziu); pe iOS atribuirea rămâne prin SKAdNetwork
      },
    ]);
  }
  return cfg;
};
