/**
 * GET /api/dash?token=… — tabloul de bord al aplicației, o singură pagină HTML (pentru telefonul lui Alex).
 * Citește /api/stats cu același token. Fără token valid → 401.
 */
import { authorized } from "./stats+api";

const PAGE = `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Diabetoline – tablou de bord</title>
<style>
:root{--bg:#F3F5F7;--card:#fff;--ink:#14222B;--muted:#4B5A63;--line:#DDE3E7;--acc:#2E7D4F;--warn:#B4560A;--bad:#B3261E}
@media(prefers-color-scheme:dark){:root{--bg:#0F1519;--card:#18222A;--ink:#EDF2F5;--muted:#9AA7AE;--line:#2A3740}}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.4 Inter,system-ui,sans-serif;padding:16px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;color:var(--muted);margin:22px 0 8px;letter-spacing:.3px;text-transform:uppercase}
.sub{color:var(--muted);font-size:14px}.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.c{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px}.n{font-size:30px;font-weight:800;letter-spacing:-.5px}.l{font-size:14px;color:var(--muted)}
.bar{display:flex;align-items:center;gap:10px;margin:6px 0}.bar b{width:130px;font-size:14px;font-weight:600}.bar i{height:12px;background:var(--acc);border-radius:6px;display:block}.bar span{font-size:14px;color:var(--muted);min-width:70px}
table{width:100%;border-collapse:collapse;font-size:15px}td,th{padding:8px 6px;border-bottom:1px solid var(--line);text-align:left}th{color:var(--muted);font-weight:600;font-size:13px}td.r,th.r{text-align:right}
.tabs{display:flex;gap:8px;margin:10px 0}.tabs button{border:1px solid var(--line);background:var(--card);color:var(--ink);padding:8px 12px;border-radius:999px;font-size:14px}.tabs button.on{background:var(--acc);color:#fff;border-color:var(--acc)}
.chart{display:flex;align-items:flex-end;gap:3px;height:110px;margin-top:8px}.chart div{flex:1;background:var(--acc);border-radius:3px 3px 0 0;min-height:2px;position:relative}.chart div.t{background:#7FB8A0}
.warn{color:var(--warn)}.bad{color:var(--bad)}.ok{color:var(--acc)}
</style></head><body>
<h1>Diabetoline – tablou de bord</h1><div class="sub" id="asof">se încarcă…</div>
<div class="tabs"><button data-d="7">7 zile</button><button data-d="30" class="on">30 zile</button><button data-d="90">90 zile</button></div>
<div id="root"></div>
<script>
const token=new URLSearchParams(location.search).get("token");let days=30;
const $=s=>document.querySelector(s);const pct=(a,b)=>b?Math.round(100*a/b)+"%":"–";
document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{days=+b.dataset.d;document.querySelectorAll(".tabs button").forEach(x=>x.classList.toggle("on",x===b));load();});
async function load(){
  $("#asof").textContent="se încarcă…";
  const r=await fetch("/api/stats?days="+days+"&token="+encodeURIComponent(token),{cache:"no-store"});
  if(!r.ok){$("#asof").textContent=r.status===401?"Token greșit.":"Eroare "+r.status;return;}
  const d=await r.json();if(d.error){$("#asof").textContent="Eroare: "+d.error;return;}
  const f=d.funnel||{},g=k=>(f[k]||{}).devices||0;
  const inst=d.installs||0,wd=g("welcome_done"),tr=g("trial_start"),pw=g("paywall_view"),pu=g("purchase"),sf=g("stay_free");
  const act=d.first_action_day1||0,ret=d.retention||{};
  const daily=d.daily||[],mx=Math.max(1,...daily.map(x=>x.installs||0));
  $("#asof").textContent="Ultimele "+days+" de zile · actualizat "+new Date().toLocaleString("ro-RO");
  let h="";
  h+='<div class="row"><div class="c"><div class="n">'+inst+'</div><div class="l">instalări</div></div>'
   +'<div class="c"><div class="n">'+tr+'</div><div class="l">probe pornite · '+pct(tr,inst)+'</div></div>'
   +'<div class="c"><div class="n '+(pu?"ok":"")+'">'+pu+'</div><div class="l">abonați noi · '+pct(pu,inst)+' din instalări</div></div>'
   +'<div class="c"><div class="n">'+(ret.d1!=null?pct(ret.d1,ret.cohort):"–")+'</div><div class="l">revin a doua zi</div></div></div>';
  h+='<h2>Instalări pe zi</h2><div class="c"><div class="chart">'+daily.map(x=>'<div title="'+x.day+': '+(x.installs||0)+' instalări, '+(x.purchases||0)+' plăți" style="height:'+Math.round(100*(x.installs||0)/mx)+'%"></div>').join("")+'</div><div class="l" style="margin-top:6px">'+(daily[0]?daily[0].day:"")+' → '+(daily.length?daily[daily.length-1].day:"")+'</div></div>';
  const steps=[["Instalat",inst],["Chestionar terminat",wd],["Probă pornită",tr],["Ceva făcut în ziua 1",act],["Paywall văzut",pw],["Plătit",pu],["Rămân pe gratuit",sf]];
  h+='<h2>Pâlnia</h2><div class="c">'+steps.map(([k,v])=>'<div class="bar"><b>'+k+'</b><i style="width:'+Math.max(2,Math.round(60*v/Math.max(1,inst)))+'%"></i><span>'+v+' · '+pct(v,inst)+'</span></div>').join("")+'</div>';
  h+='<h2>Retenție (cohorta instalată cu ≥1 zi în urmă: '+(ret.cohort||0)+')</h2><div class="row"><div class="c"><div class="n">'+pct(ret.d1,ret.cohort)+'</div><div class="l">ziua 1</div></div><div class="c"><div class="n">'+pct(ret.d3,ret.cohort)+'</div><div class="l">ziua 3</div></div><div class="c"><div class="n">'+pct(ret.d7,ret.cohort)+'</div><div class="l">ziua 7</div></div></div>';
  const bs=d.by_source||[];h+='<h2>Pe sursă</h2><div class="c"><table><tr><th>sursă</th><th class="r">instalări</th><th class="r">probe</th><th class="r">plăți</th><th class="r">conv.</th></tr>'+bs.map(x=>'<tr><td>'+x.source+'</td><td class="r">'+x.installs+'</td><td class="r">'+x.trials+'</td><td class="r">'+x.purchases+'</td><td class="r">'+pct(x.purchases,x.installs)+'</td></tr>').join("")+'</table></div>';
  const bc=d.by_country||[];h+='<h2>Pe țară</h2><div class="c"><table><tr><th>țară</th><th class="r">instalări</th><th class="r">plăți</th></tr>'+bc.map(x=>'<tr><td>'+x.country+'</td><td class="r">'+x.installs+'</td><td class="r">'+x.purchases+'</td></tr>').join("")+'</table></div>';
  const pl=d.plans||{};const use=[["scan_result","scanări"],["scan_notfound","produs negăsit"],["glucose_logged","glicemii"],["plate_result","poze la farfurie"],["ask_used","Întreabă"],["ideas_used","Ce mănânc azi"],["report_made","rapoarte"],["family_code","coduri familie"],["family_linked","familii legate"],["reco_tap","click pe produs"],["reco_dismiss","„Nu acum”"],["feedback_sent","sugestii"],["data_wiped","date șterse"]];
  h+='<h2>Folosire</h2><div class="c"><table><tr><th>acțiune</th><th class="r">de câte ori</th><th class="r">oameni</th></tr>'+use.map(([k,l])=>'<tr><td>'+l+'</td><td class="r">'+((f[k]||{}).n||0)+'</td><td class="r">'+((f[k]||{}).devices||0)+'</td></tr>').join("")+'<tr><td>planuri plătite</td><td class="r" colspan="2">'+Object.entries(pl).map(([k,v])=>k+": "+v).join(" · ")+'</td></tr></table></div>';
  const nf=d.notfound||[],sf2=d.scan_from||{};
  h+='<h2>Produse negăsite (coduri)</h2><div class="c">'+(nf.length?'<table><tr><th>cod</th><th class="r">de câte ori</th><th></th></tr>'+nf.map(x=>'<tr><td>'+x.code+'</td><td class="r">'+x.n+'</td><td><a href="https://world.openfoodfacts.org/product/'+x.code+'" target="_blank">OFF</a></td></tr>').join("")+'</table>':'<div class="l">niciun cod înregistrat încă (se notează din 18 nov)</div>')
   +'<div class="l" style="margin-top:8px">de unde au venit produsele găsite: '+(Object.keys(sf2).length?Object.entries(sf2).map(([k,v])=>({cache:"memorie",partner:"Diabetoline",pack:"pachet offline",off:"Open Food Facts",shared:"baza comună"}[k]||k)+" "+v).join(" · "):"–")+'</div></div>';
  $("#root").innerHTML=h;
}
load();
</script></body></html>`;

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  return new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
