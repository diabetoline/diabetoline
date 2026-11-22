/**
 * POST /api/reorder — o dată pe zi (nudge.yml): cui i-a venit Curalin din aplicație acum 24–27 de zile și n-a comandat iar,
 * îi trimitem un singur push „cutia se termină” cu comanda dintr-o apăsare. Intră în limita de 2 oferte/săptămână.
 */
import { createClient } from "@supabase/supabase-js";
const URL = process.env.SUPABASE_URL ?? "https://boxyorzzmvjezaspestt.supabase.co";
const DAY = 864e5;
const CURALIN = new Set([44579711811850, 44579712205066]);
const CURALIN_URL = "https://www.diabetoline.com/products/curalin-90-capsule";
const TITLE = { ro: "Curalin pe terminate?", en: "Running low on Curalin?", de: "Curalin geht zur Neige?" };
const BODY = { ro: "Cutia comandată acum ~25 de zile se apropie de sfârșit. Comandă din nou dintr-o apăsare, cu livrare acasă.", en: "The box you ordered ~25 days ago is nearly done. Reorder with one tap, delivered home.", de: "Die vor ~25 Tagen bestellte Packung ist fast leer. Mit einem Tipp nachbestellen, Lieferung nach Hause." };

export async function POST(): Promise<Response> {
  const key = process.env.SUPABASE_SERVICE_KEY; if (!key) return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
  const db = createClient(URL, key, { auth: { persistSession: false } });
  const now = Date.now();
  const { data: orders } = await db.from("orders_app").select("order_id, device, items, t").is("reminded_at", null).gte("t", new Date(now - 27 * DAY).toISOString()).lte("t", new Date(now - 24 * DAY).toISOString()).not("device", "is", null);
  let sent = 0;
  for (const o of (orders ?? []) as { order_id: number; device: string; items: { v?: number }[]; t: string }[]) {
    if (!o.items.some((i) => i.v && CURALIN.has(i.v))) { await db.from("orders_app").update({ reminded_at: new Date().toISOString() }).eq("order_id", o.order_id); continue; }
    // a comandat iar între timp? atunci nu-l mai deranjăm
    const { count: later } = await db.from("orders_app").select("order_id", { count: "exact", head: true }).eq("device", o.device).gt("t", o.t);
    if ((later ?? 0) > 0) { await db.from("orders_app").update({ reminded_at: new Date().toISOString() }).eq("order_id", o.order_id); continue; }
    const { data: tk } = await db.from("push_tokens").select("token, lang, offers").eq("device", o.device).maybeSingle();
    const { count: recent } = await db.from("offer_sends").select("id", { count: "exact", head: true }).eq("device", o.device).gte("t", new Date(now - 7 * DAY).toISOString());
    if (tk?.token && tk.offers !== false && (recent ?? 0) < 2) {
      const lang = (tk.lang === "en" || tk.lang === "de" ? tk.lang : "ro") as "ro" | "en" | "de";
      try {
        const r = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify([{ to: tk.token, title: TITLE[lang], body: BODY[lang], sound: "default", channelId: "reminders", data: { kind: "offer", url: CURALIN_URL, id: "reorder-curalin" } }]) });
        if (r.ok) { sent++; await db.from("offer_sends").insert({ device: o.device, offer: "reorder-curalin" }); }
      } catch {}
    }
    await db.from("orders_app").update({ reminded_at: new Date().toISOString() }).eq("order_id", o.order_id);
  }
  return Response.json({ ok: true, sent, checked: orders?.length ?? 0 });
}
