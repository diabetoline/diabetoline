#!/usr/bin/env bash
# Test de fum după publicare: sănătatea serverului și analiza unei poze de probă.
set -u
BASE="${1:-https://curalife.expo.app}"
echo "== health"; curl -s "$BASE/api/health"; echo
python3 - <<'PY'
from PIL import Image, ImageDraw
import base64, io
im = Image.new("RGB", (900, 900), (245, 245, 240))
d = ImageDraw.Draw(im)
d.ellipse((150, 400, 750, 850), fill=(230, 230, 225), outline=(200, 200, 195), width=6)   # farfurie
d.ellipse((330, 420, 570, 660), fill=(200, 30, 40))                                      # măr
d.ellipse((380, 440, 520, 640), fill=(215, 50, 55))
d.line((450, 420, 470, 350), fill=(90, 60, 30), width=14)                                 # codiță
d.ellipse((470, 340, 540, 380), fill=(60, 140, 60))                                       # frunză
b = io.BytesIO(); im.save(b, "JPEG", quality=85)
open("/tmp/apple.json", "w").write('{"image":"%s","lang":"ro"}' % base64.b64encode(b.getvalue()).decode())
PY
echo "== plate"; curl -s -X POST "$BASE/api/plate" -H "content-type: application/json" --data @/tmp/apple.json; echo
echo "== ideas"; curl -s -o /tmp/ideas.out -w "HTTP %{http_code}\n" -X POST "$BASE/api/ideas" -H "content-type: application/json" -d '{"lang":"ro","slot":"snack","products":[{"name":"Iaurt grecesc","level":"green"},{"name":"Nutella","level":"red"}],"recentMeals":[]}'; head -c 600 /tmp/ideas.out; echo
