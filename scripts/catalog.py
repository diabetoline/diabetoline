"""Generează src/catalog.json din data/catalog/products-1.json (descărcat de workflow-ul „Catalog diabetoline.com”).
Doar produsele relevante pentru aplicație; textele cu promisiuni medicale sunt înlocuite cu formulări neutre."""
import json, re, html
ps = json.load(open("data/catalog/products-1.json"))["products"]
SHOP = "https://diabetoline.com"
def clean(s): return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()
out = []
for p in ps:
    t = p["title"]; h = p["handle"]; v = p["variants"][0]; img = (p.get("images") or [{}])[0].get("src")
    price = float(v["price"]); avail = any(x.get("available") for x in p["variants"])
    item = None
    if "Diabetoline" in t and ("Cremă" in t or "Spray" in t or "Set" in t):
        item = dict(section="skin", name=t.replace(" — ", ", "), desc=None)
    elif "FiberPasta" in t or "PastaPro" in t:
        item = dict(section="food", name=t.split(" — ")[0].replace(" bogate în fibre", "").replace(" bogat în fibre", "").replace(" din grâu dur italian, bogată în fibre", "") + (" — " + t.split(" — ")[1] if " — " in t else ""), desc=None)
    elif t.lower().startswith("curalin") and "kapsu" not in t.lower():   # fără varianta poloneză
        n = "180" if "180" in t else "90"
        item = dict(section="supp", name=f"Curalin, {n} capsule", desc="Supliment alimentar pe bază de extracte din plante.")
    if not item: continue
    out.append(dict(id=h, **item, price=price, url=f"{SHOP}/products/{h}", image=img, available=avail, sku=v.get("sku")))
order = {"skin": 0, "food": 1, "supp": 2}
out.sort(key=lambda x: (order[x["section"]], -x["price"] if x["section"] == "skin" else x["price"]))
json.dump(out, open("src/catalog.json", "w"), ensure_ascii=False, indent=1)
try:
    r = json.load(open("data/catalog/rates.json")); json.dump({"base": "RON", "date": r.get("date"), "rates": r.get("rates", {})}, open("src/rates.json", "w"), indent=1)
    print("curs", r.get("date"), r.get("rates", {}).get("EUR"))
except Exception as e: print("fără curs:", e)
print(len(out), "produse în aplicație")
for x in out: print(x["section"], "|", x["name"], "|", x["price"], "|", "stoc" if x["available"] else "epuizat")
