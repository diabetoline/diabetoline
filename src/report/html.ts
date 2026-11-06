import type { ReportData } from "../engine/report";
import type { Strings } from "../i18n";
import { gluClass } from "../engine/days";

const esc = (x: string) => x.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

/** HTML-ul raportului: A4, lizibil printat alb-negru. */
export function reportHtml(r: ReportData, s: Strings, opts: { name: string; unit: "mg" | "mmol"; locale: string; profile?: { condition: "t2" | "t1" | "pre" | "unsure"; age?: number; heightCm?: number } }): string {
  const u = (v: number) => (opts.unit === "mg" ? String(Math.round(v)) : (v / 18).toFixed(1));
  const unitLbl = opts.unit === "mg" ? "mg/dL" : "mmol/L";
  const date = (t: number) => new Date(t).toLocaleDateString(opts.locale, { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = (t: number) => new Date(t).toLocaleTimeString(opts.locale, { hour: "2-digit", minute: "2-digit" });
  const col = { low: "#C43A2C", ok: "#1D8A4E", high: "#B97400" } as const;
  const g = r.glucose;

  const rows = [...g.entries].reverse().map((e) => {
    const c = gluClass(e.v, e.ctx);
    return `<tr><td>${date(e.t)}</td><td>${time(e.t)}</td><td style="font-weight:700;color:${col[c]}">${u(e.v)}</td><td>${esc(s.ctx[e.ctx] ?? e.ctx)}</td><td>${esc(e.note ?? "")}</td></tr>`;
  }).join("");
  const byCtx = g.byCtx.map((x) => `<tr><td>${esc(s.ctx[x.ctx] ?? x.ctx)}</td><td>${x.count}</td><td style="font-weight:700">${u(x.avg)} ${unitLbl}</td></tr>`).join("");
  const dots = (n: number, c: string) => n ? `<span style="color:${c};font-weight:700">${"●".repeat(Math.min(n, 5))}${n > 5 ? ` ×${n}` : ""}</span>` : "";
  const byDay = r.byDay.map((d) => `<tr><td>${date(d.t)}</td><td>${d.gluAvg != null ? `<b>${u(d.gluAvg)}</b> <span style="color:#5B6B78">(${d.gluCount})</span>` : "—"}</td>` +
    `<td>${[dots(d.green, col.ok), dots(d.yellow, col.high), dots(d.red, col.low)].filter(Boolean).join(" ") || "—"}</td>` +
    `<td>${d.walkMin ? `🚶 <b>${d.walkMin} min</b>` : `<span style="color:#9AABB9">${esc(s.rep_nowalk)}</span>`}</td>` +
    `<td>${d.status === "good" ? `<span style="color:${col.ok};font-weight:700">✓ ${esc(s.cal_good)}</span>` : d.status === "less" ? `<span style="color:${col.high}">${esc(s.cal_less)}</span>` : "—"}</td></tr>`).join("");
  const meds = r.meds.length ? r.meds.map((m) => `<tr><td>${esc(m.name)}</td><td>${m.taken} / ${m.expected}</td><td style="font-weight:700">${m.pct}%</td></tr>`).join("") : `<tr><td colspan="3">—</td></tr>`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 16mm; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #14202B; font-size: 12px; line-height: 1.45; }
    h1 { font-size: 22px; margin: 0 0 2px; } h2 { font-size: 15px; margin: 18px 0 6px; border-bottom: 2px solid #14202B; padding-bottom: 3px; }
    .meta { color: #5B6B78; margin-bottom: 6px; }
    .grid { display: flex; gap: 10px; margin: 8px 0; } .box { flex: 1; border: 1px solid #D6DEE5; border-radius: 8px; padding: 8px 10px; }
    .box b { display: block; font-size: 20px; } .box span { color: #5B6B78; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; } th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #E3E8ED; vertical-align: top; }
    th { background: #EEF2F5; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; }
    .foot { margin-top: 18px; color: #5B6B78; font-size: 10px; border-top: 1px solid #D6DEE5; padding-top: 6px; }
  </style></head><body>
    <h1>Diabetoline · ${esc(s.rep_title)}</h1>
    <div class="meta">${esc(s.rep_patient)}: <b>${esc(opts.name || "—")}</b> &nbsp;·&nbsp; ${esc(s.rep_period)}: ${date(r.from)} – ${date(r.to)} (${r.days} ${esc(s.rep_days.toLowerCase())})</div>
    ${opts.profile ? `<div class="meta">${esc(s.rep_profile)}: ${[s[`q_cond_${opts.profile.condition}`], opts.profile.age ? `${opts.profile.age} ${esc(s.rep_years)}` : "", opts.profile.heightCm ? `${opts.profile.heightCm} cm` : ""].filter(Boolean).map(esc).join(" · ")} <span style="color:#5B6B78">(${esc(s.rep_profile_note)})</span></div>` : ""}

    <h2>${esc(s.rep_glu)} · ${g.count} ${esc(s.rep_readings)}</h2>
    <div class="grid">
      <div class="box"><b>${g.avg != null ? u(g.avg) : "—"}</b><span>${esc(s.rep_avg)}, ${unitLbl}</span></div>
      <div class="box"><b>${g.min != null ? `${u(g.min)} / ${u(g.max!)}` : "—"}</b><span>${esc(s.rep_minmax)}</span></div>
      <div class="box"><b>${g.inRange != null ? `${g.inRange}%` : "—"}</b><span>${esc(s.rep_inrange)}</span></div>
      <div class="box"><b style="color:${col.low}">${g.low}</b><span>${esc(s.rep_lows)}</span></div>
      <div class="box"><b style="color:${col.high}">${g.high}</b><span>${esc(s.rep_highs)}</span></div>
    </div>
    ${byCtx ? `<table><tr><th>${esc(s.rep_byctx)}</th><th>${esc(s.rep_readings)}</th><th>${esc(s.rep_avg)}</th></tr>${byCtx}</table>` : ""}

    <h2>${esc(s.rep_meals)} · ${esc(s.rep_walks)} · ${esc(s.rep_days)}</h2>
    <div class="meta">${esc(s.rep_legend)}</div>
    <div class="grid">
      <div class="box"><b>${r.meals.count}</b><span>${esc(s.rep_meals)}: ${esc(s.rep_meals_v(r.meals.green, r.meals.yellow, r.meals.red))}</span></div>
      <div class="box"><b>${r.meals.avgCarbs != null ? `${r.meals.avgCarbs} g` : "—"}</b><span>${esc(s.rep_avgcarbs)}</span></div>
      <div class="box"><b>${r.walks.minutes} min</b><span>${esc(s.rep_movedays(r.walks.days, r.days))} · ${esc(s.rep_walks_v(r.walks.count, r.walks.minutes))}${r.walkDaysPct != null ? ` · ${esc(s.rep_walkdays(r.walkDaysPct))}` : ""}</span></div>
      ${r.weight ? `<div class="box"><b>${r.weight.last} kg</b><span>${esc(s.rep_weight)}: ${esc(s.rep_weight_v(r.weight.first, r.weight.last))} (${esc(s.wt_change(r.weight.change))})</span></div>` : ""}
      <div class="box"><b>${r.goodDays} / ${r.goodDays + r.lessDays}</b><span>${esc(s.rep_days_v(r.goodDays, r.lessDays))}</span></div>
    </div>

    <h2>${esc(s.rep_byday)}</h2>
    <table><tr><th>${esc(s.rep_date)}</th><th>${esc(s.rep_glu)} (${unitLbl})</th><th>${esc(s.rep_meals)}</th><th>${esc(s.rep_walks)}</th><th>${esc(s.rep_days)}</th></tr>${byDay || `<tr><td colspan="5">—</td></tr>`}</table>

    <h2>${esc(s.rep_meds)}</h2>
    <table><tr><th>${esc(s.med_name)}</th><th>${esc(s.med_taken)}</th><th>%</th></tr>${meds}</table>

    <h2>${esc(s.rep_all)} (${unitLbl})</h2>
    <table><tr><th>${esc(s.rep_date)}</th><th>${esc(s.rep_time)}</th><th>${esc(s.rep_value)}</th><th>${esc(s.rep_moment)}</th><th>${esc(s.rep_note)}</th></tr>${rows || `<tr><td colspan="5">—</td></tr>`}</table>

    <div class="foot">${esc(s.rep_generated)} ${date(r.to)} ${time(r.to)}. ${esc(s.rep_disclaimer)}</div>
  </body></html>`;
}
