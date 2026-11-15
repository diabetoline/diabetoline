/**
 * POST /api/watch — raportul zilnic pe email către Alex (Resend, `FEEDBACK_TO`), chemat de workflow-ul `nudge.yml`.
 * Cifrele de ieri + 7 zile, cu semnale de alarmă: zero instalări/scanări (server căzut?), paywall mult văzut fără nicio plată,
 * retenție sub 20% în ziua 1. Fără cheie Resend → doar întoarce cifrele.
 */
import { statsFor } from "./stats+api";

export async function POST(): Promise<Response> {
  const [d1, d7] = await Promise.all([statsFor(1), statsFor(7)]);
  if (!d1 || !d7) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  type F = Record<string, { devices: number; n: number }>;
  const g = (d: Record<string, unknown>, k: string) => ((d.funnel as F | null)?.[k]?.devices ?? 0);
  const ret = (d7.retention as { cohort: number; d1: number } | null) ?? { cohort: 0, d1: 0 };
  const flags: string[] = [];
  if ((d1.installs as number) === 0 && (d7.installs as number) > 20) flags.push("Zero instalări ieri, deși în ultimele 7 zile au fost — verifică magazinele.");
  if (g(d1, "scan_result") === 0 && g(d7, "scan_result") > 30) flags.push("Nicio scanare reușită ieri — serverul sau Open Food Facts pot fi căzute.");
  if (g(d7, "paywall_view") >= 30 && g(d7, "purchase") === 0) flags.push("Paywall-ul a fost văzut de ≥ 30 de oameni în 7 zile și nimeni n-a plătit — verifică prețurile/RevenueCat.");
  if (ret.cohort >= 30 && ret.d1 / ret.cohort < 0.2) flags.push(`Retenția în ziua 1 e ${Math.round(100 * ret.d1 / ret.cohort)}% (sub 20%) — oamenii nu revin a doua zi.`);
  const line = (d: Record<string, unknown>) => `instalări ${d.installs} · probe ${g(d, "trial_start")} · plăți ${g(d, "purchase")} · scanări ${g(d, "scan_result")} · glicemii ${g(d, "glucose_logged")} · farfurii ${g(d, "plate_result")} · familii ${g(d, "family_linked")}`;
  const rk = process.env.RESEND_API_KEY, to = process.env.FEEDBACK_TO;
  if (rk && to) {
    const esc = (x: string) => x.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
    const html = `<div style="font:16px/1.5 system-ui"><p><b>Ieri:</b> ${esc(line(d1))}</p><p><b>7 zile:</b> ${esc(line(d7))} · revin a doua zi: ${ret.cohort ? Math.round(100 * ret.d1 / ret.cohort) + "%" : "–"}</p>${flags.length ? `<p style="color:#B3261E"><b>De verificat:</b></p><ul>${flags.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : "<p style=\"color:#2E7D4F\">Nimic de semnalat.</p>"}<p style="color:#666">Tabloul de bord: ${process.env.EXPO_PUBLIC_API_URL ?? "https://curalife.expo.app"}/api/dash?token=… (tokenul tău)</p></div>`;
    try {
      await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${rk}`, "content-type": "application/json" }, body: JSON.stringify({
        from: process.env.FEEDBACK_FROM ?? "Diabetoline <onboarding@resend.dev>", to: [to], subject: `Diabetoline ieri: ${d1.installs} instalări · ${g(d1, "purchase")} plăți${flags.length ? " · ⚠ " + flags.length + " de verificat" : ""}`, html,
      }) });
    } catch {}
  }
  return Response.json({ ok: true, yesterday: line(d1), week: line(d7), flags });
}
