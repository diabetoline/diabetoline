/**
 * GET /api/offers?token=… — pagina de pe telefonul lui Alex pentru push-uri comerciale scrise de el (22 nov 2026:
 * „aș vrea push-urile cu reclame să pot să le formulez manual și să le trimit”). Titlu + text (ro; en/de opțional),
 * produsul, țara; „Câți primesc” → GET /api/offer; „Test pe telefonul meu” → trimite doar la device-ul ales;
 * „Trimite la toți” → POST /api/offer. Limita de 2/săptămână o ține serverul.
 */
import { authorized } from "./stats+api";
import catalog from "../../src/catalog.json";

const items = (catalog as { id: string; name: string; url: string; available: boolean }[]).filter((i) => i.available);
const OPTIONS = items.map((i) => `<option value="${i.url}">${i.name.replace(/</g, "")}</option>`).join("");

const PAGE = `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Diabetoline – oferte push</title>
<style>
:root{--bg:#F3F5F7;--card:#fff;--ink:#14222B;--muted:#4B5A63;--line:#DDE3E7;--acc:#2E7D4F;--bad:#B3261E}
@media(prefers-color-scheme:dark){:root{--bg:#0F1519;--card:#18222A;--ink:#EDF2F5;--muted:#9AA7AE;--line:#2A3740}}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.4 Inter,system-ui,sans-serif;padding:16px;max-width:560px;margin:auto}
h1{font-size:22px;margin:0 0 4px}.sub{color:var(--muted);font-size:14px;margin-bottom:14px}
label{display:block;font-size:14px;color:var(--muted);margin:14px 0 4px}
input,textarea,select{width:100%;box-sizing:border-box;font:17px system-ui;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink)}
textarea{min-height:84px}
.btn{display:block;width:100%;padding:14px;border-radius:14px;border:0;font:700 17px system-ui;margin-top:12px;background:var(--acc);color:#fff}
.btn.soft{background:var(--card);color:var(--ink);border:1px solid var(--line)}.btn.bad{background:var(--bad)}
.prev{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px;margin-top:16px}.prev b{display:block}
.out{margin-top:12px;font-size:15px;color:var(--muted);white-space:pre-wrap}
small{color:var(--muted)}
</style></head><body>
<h1>Oferte push</h1><div class="sub">Scrii, vezi câți primesc, testezi pe telefonul tău, apoi trimiți. Serverul nu lasă mai mult de 2 pe săptămână de om.</div>
<label>Id ofertă (scurt, fără spații — ca să știm în statistici ce a mers)</label><input id="id" placeholder="curalin-nov-1">
<label>Titlu (ro)</label><input id="t_ro" maxlength="60" placeholder="Curalin cu 15 % săptămâna asta">
<label>Text (ro)</label><textarea id="b_ro" maxlength="170" placeholder="Doar până duminică, cu livrare gratuită. Apasă și comanzi dintr-o apăsare."></textarea>
<label>Titlu / text (en) — opțional, altfel primesc textul ro</label><input id="t_en" maxlength="60"><textarea id="b_en" maxlength="170" style="margin-top:6px"></textarea>
<label>Titlu / text (de) — opțional</label><input id="t_de" maxlength="60"><textarea id="b_de" maxlength="170" style="margin-top:6px"></textarea>
<label>Produsul pe care îl deschide apăsarea (cu APP10 și comandă dintr-o apăsare)</label><select id="url">${OPTIONS}<option value="https://www.diabetoline.com/">Magazinul (prima pagină)</option></select>
<label>Țara (gol = toate)</label><input id="country" placeholder="RO" maxlength="2">
<label>Platforma (gol = toate)</label><select id="platform"><option value="">toate</option><option value="android">Android</option><option value="ios">iPhone</option></select>
<div class="prev"><b id="p_t">—</b><span id="p_b">—</span><br><small>așa arată pe telefon</small></div>
<button class="btn soft" onclick="count()">Câți primesc acum?</button>
<label>Id-ul telefonului tău pentru test (din Setări → jos, „id”; gol = sare peste test)</label><input id="me" placeholder="…">
<button class="btn soft" onclick="send(true)">Test pe telefonul meu</button>
<button class="btn" onclick="send(false)">Trimite la toți</button>
<div class="out" id="out"></div>
<script>
const token=new URLSearchParams(location.search).get("token");const $=s=>document.querySelector(s);
const sync=()=>{$("#p_t").textContent=$("#t_ro").value||"—";$("#p_b").textContent=$("#b_ro").value||"—";};
["#t_ro","#b_ro"].forEach(s=>$(s).addEventListener("input",sync));
const body=()=>({id:$("#id").value.trim(),title:{ro:$("#t_ro").value.trim(),en:$("#t_en").value.trim()||undefined,de:$("#t_de").value.trim()||undefined},body:{ro:$("#b_ro").value.trim(),en:$("#b_en").value.trim()||undefined,de:$("#b_de").value.trim()||undefined},url:$("#url").value,country:$("#country").value.trim().toUpperCase()||undefined,platform:$("#platform").value||undefined});
async function count(){const q=new URLSearchParams({token});const c=$("#country").value.trim();if(c)q.set("country",c.toUpperCase());const p=$("#platform").value;if(p)q.set("platform",p);const r=await fetch("/api/offer?"+q);const j=await r.json();$("#out").textContent=j.ok?"Înregistrați: "+j.registered+" · ar primi acum: "+j.eligible+"\\n"+Object.entries(j.byCountry).map(([k,v])=>k+": "+v).join(" · "):"Eroare: "+JSON.stringify(j);}
async function send(test){const b=body();if(!b.id||!b.title.ro||!b.body.ro){$("#out").textContent="Completează id, titlul și textul (ro).";return;}
 if(test){const me=$("#me").value.trim();if(!me){$("#out").textContent="Pune id-ul telefonului tău pentru test.";return;}b.device=me;}
 else if(!confirm("Trimiți la toți cei eligibili? Nu se poate anula.")){return;}
 $("#out").textContent="se trimite…";const r=await fetch("/api/offer?token="+encodeURIComponent(token),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)});const j=await r.json();
 $("#out").textContent=j.ok?"Trimis: "+j.sent+" din "+j.eligible+(j.errors&&j.errors.length?"\\nErori: "+j.errors.join("; "):""):"Eroare: "+JSON.stringify(j);}
</script></body></html>`;

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) return new Response("401", { status: 401 });
  return new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
