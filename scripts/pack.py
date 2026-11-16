#!/usr/bin/env python3
"""
Pachetul offline de produse (15 nov 2026): cele mai scanate produse din Open Food Facts pe țară,
cu doar câmpurile pe care le citește `normalize()` din src/api/off.ts. Rulat de workflow-ul `pack.yml`,
scrie public/pack/<ȚARĂ>.json (servit static de EAS Hosting); aplicația îl descarcă o dată la 14 zile.
Folosire: python3 scripts/pack.py RO 5000
"""
import json, sys, time, urllib.parse, urllib.request

COUNTRY = {"RO": "romania", "DE": "germany", "AT": "austria", "GB": "united-kingdom", "US": "united-states", "IT": "italy", "FR": "france", "ES": "spain", "HU": "hungary", "PL": "poland"}
FIELDS = "code,product_name,product_name_en,product_name_de,product_name_ro,brands,nutriments,serving_quantity,quantity,ingredients_text,ingredients_text_en,ingredients_text_ro,ingredients_text_de,categories_tags,labels_tags,labels"
KEEP_NUTR = ("carbohydrates_100g", "sugars_100g", "fiber_100g", "proteins_100g", "alcohol_100g")

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Diabetoline/1.0 (contact@diabetoline.com)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)

def main(cc, limit):
    tag = COUNTRY[cc]
    out, page, size, fails = [], 1, 100, 0
    while len(out) < limit:
        q = urllib.parse.urlencode({"countries_tags_en": tag, "sort_by": "unique_scans_n", "page_size": size, "page": page, "fields": FIELDS})
        try:
            data = fetch(f"https://world.openfoodfacts.org/api/v2/search?{q}")
        except Exception as e:
            # OFF limitează căutarea la ~10 cereri/minut; nu reîncercăm la nesfârșit (pe 15 nov 2026 workflow-ul a rulat 6 ore și a fost oprit)
            fails += 1; print("retry", page, e, file=sys.stderr)
            if fails > 6: print("renunț la", cc, "după", page - 1, "pagini", file=sys.stderr); break
            time.sleep(30); continue
        fails = 0
        prods = data.get("products") or []
        if not prods: break
        for p in prods:
            n = p.get("nutriments") or {}
            if not p.get("code") or ("carbohydrates_100g" not in n and "sugars_100g" not in n): continue
            slim = {k: p[k] for k in ("code", "product_name", "product_name_en", "product_name_de", "product_name_ro", "brands", "serving_quantity", "quantity", "categories_tags", "labels_tags", "labels") if p.get(k)}
            slim["nutriments"] = {k: n[k] for k in KEEP_NUTR if k in n}
            ing = p.get("ingredients_text_ro") or p.get("ingredients_text_de") or p.get("ingredients_text_en") or p.get("ingredients_text")
            if ing: slim["ingredients_text"] = str(ing)[:400]
            if slim.get("categories_tags"): slim["categories_tags"] = slim["categories_tags"][-6:]
            out.append(slim)
        page += 1
        time.sleep(6.5)  # limita OFF pentru căutare: 10 cereri/minut
    out = out[:limit]
    with open(f"public/pack/{cc}.json", "w", encoding="utf-8") as f:
        json.dump({"country": cc, "at": int(time.time()), "n": len(out), "products": out}, f, ensure_ascii=False, separators=(",", ":"))
    print(cc, len(out), "produse")

if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 5000)
