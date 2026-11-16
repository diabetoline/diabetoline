#!/usr/bin/env python3
"""
Pachetul offline de produse (15–16 nov 2026): cele mai scanate produse din Open Food Facts pe țară,
cu doar câmpurile pe care le citește `normalize()` din src/api/off.ts → public/pack/<ȚARĂ>.json (servit static de EAS Hosting);
aplicația îl descarcă o dată la 14 zile.

Sursa: exportul CSV complet al OFF (~1 GB gz), citit în flux, o singură trecere pentru toate țările.
(API-ul de căutare nu dă mai mult de 1.000 de rezultate pe căutare și răspunde des 503 — pe 15–16 nov 2026 două rulări au picat.)
Folosire: python3 scripts/pack.py 5000 RO DE GB US AT HU
"""
import csv, gzip, heapq, io, json, sys, time, urllib.request

CSV_URL = "https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz"
COUNTRY = {"RO": "en:romania", "DE": "en:germany", "AT": "en:austria", "GB": "en:united-kingdom", "US": "en:united-states", "IT": "en:italy", "FR": "en:france", "ES": "en:spain", "HU": "en:hungary", "PL": "en:poland"}
NUTR = {"carbohydrates_100g": "carbohydrates_100g", "sugars_100g": "sugars_100g", "fiber_100g": "fiber_100g", "proteins_100g": "proteins_100g", "alcohol_100g": "alcohol_100g"}
csv.field_size_limit(10 ** 8)

def num(x):
    try: return float(x)
    except (TypeError, ValueError): return None

def main(limit, ccs):
    heaps = {cc: [] for cc in ccs}          # (unique_scans_n, idx, slim)
    tags = {cc: COUNTRY[cc] for cc in ccs}
    req = urllib.request.Request(CSV_URL, headers={"User-Agent": "Diabetoline/1.0 (contact@diabetoline.com)"})
    t0 = time.time(); rows = kept = 0
    with urllib.request.urlopen(req, timeout=120) as resp:
        gz = gzip.GzipFile(fileobj=resp)
        reader = csv.DictReader(io.TextIOWrapper(gz, encoding="utf-8", errors="replace", newline=""), delimiter="\t", quoting=csv.QUOTE_NONE)
        for row in reader:
            rows += 1
            if rows % 500000 == 0: print(rows, "rânduri,", int(time.time() - t0), "s", file=sys.stderr)
            ct = row.get("countries_tags") or ""
            if not ct: continue
            mine = [cc for cc, tag in tags.items() if tag in ct]
            if not mine: continue
            code = row.get("code") or ""
            carbs, sugars = num(row.get("carbohydrates_100g")), num(row.get("sugars_100g"))
            if not code or (carbs is None and sugars is None): continue
            scans = num(row.get("unique_scans_n")) or 0
            # pragul minim: nu merită să încărcăm telefonul cu produse pe care nu le scanează nimeni
            if scans < 2: continue
            slim = {"code": code}
            for k in ("product_name", "brands", "quantity", "labels"):
                v = row.get(k)
                if v: slim[k] = v[:120]
            lt = (row.get("labels_tags") or "").split(",")
            if lt and lt[0]: slim["labels_tags"] = lt[:8]
            cats = (row.get("categories_tags") or "").split(",")
            if cats and cats[0]: slim["categories_tags"] = cats[-6:]
            ing = row.get("ingredients_text")
            if ing: slim["ingredients_text"] = ing[:400]
            n = {}
            for k in NUTR:
                v = num(row.get(k))
                if v is not None: n[k] = v
            slim["nutriments"] = n
            sq = num(row.get("serving_quantity"))
            if sq is not None: slim["serving_quantity"] = sq
            for cc in mine:
                h = heaps[cc]; item = (scans, kept, slim)
                if len(h) < limit: heapq.heappush(h, item)
                elif scans > h[0][0]: heapq.heapreplace(h, item)
            kept += 1
    print(rows, "rânduri citite în", int(time.time() - t0), "s", file=sys.stderr)
    for cc, h in heaps.items():
        out = [x[2] for x in sorted(h, key=lambda x: -x[0])]
        with open(f"public/pack/{cc}.json", "w", encoding="utf-8") as f:
            json.dump({"country": cc, "at": int(time.time()), "n": len(out), "products": out}, f, ensure_ascii=False, separators=(",", ":"))
        print(cc, len(out), "produse")

if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 5000, sys.argv[2:] or ["RO", "DE", "GB", "US", "AT", "HU"])
