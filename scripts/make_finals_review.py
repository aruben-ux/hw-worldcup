"""Generate finals_review.html: each person's full bracket scan next to
their parsed picks, for spot-checking before the leaderboard goes live.
"""
import json
import os
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(os.environ["TEMP"]) / "wc_finals"
IMGDIR = ROOT / "finals_review_img"

picks = json.loads((ROOT / "data" / "knockout-picks.json").read_text(encoding="utf-8"))
parts = picks["participants"]

ROUND_LABELS = [
    ("R32", [f"R32-{i}" for i in range(1, 17)]),
    ("R16", [f"R16-{i}" for i in range(1, 9)]),
    ("QF", [f"QF-{i}" for i in range(1, 5)]),
    ("SF", ["SF-1", "SF-2"]),
    ("Champion", ["F-1"]),
    ("3rd place", ["3P-A", "3P-B", "3P-1"]),
]

IMGDIR.mkdir(exist_ok=True)
for f in IMGDIR.glob("*.jpg"):
    f.unlink()

rows = [
    """<!doctype html><html><head><meta charset="utf-8"><title>Finals picks review</title>
<style>
 body{font-family:system-ui,sans-serif;background:#f4f4f8;margin:0;padding:20px}
 h2{margin:28px 0 6px;font-size:17px;position:sticky;top:0;background:#f4f4f8;padding:8px 0;border-bottom:2px solid #000}
 .card{background:#fff;border-radius:8px;padding:10px;margin:8px 0;box-shadow:0 1px 3px rgba(0,0,0,.12)}
 .card img{width:100%;max-width:1000px;height:auto;display:block;margin-bottom:10px}
 table{border-collapse:collapse;font-size:13px;width:100%}
 td,th{padding:4px 8px;border-bottom:1px solid #eee;text-align:left}
 .rk{font-weight:700;color:#888;white-space:nowrap}
 .champ{background:#fff7d6;font-weight:700}
 .unresolved{background:#ffd2d2;color:#a00;font-weight:700}
 .toc a{margin-right:12px;white-space:nowrap}
</style></head><body>
<h1>Finals bracket — parse review</h1>
<p>Each person's scanned bracket next to the parsed picks. Check anything highlighted red, and confirm the champion (yellow).</p>
<p class="toc">"""
]
for p in parts:
    rows.append(f'<a href="#{p["id"]}">{p["name"]}</a>')
rows.append("</p>")

for p in parts:
    img = p.get("img")
    if img is not None:
        src = SRC / f"img_{img:02d}.jpg"
        if src.exists():
            shutil.copy(src, IMGDIR / f"img_{img:02d}.jpg")
    rows.append(f'<h2 id="{p["id"]}">{p["name"]}</h2><div class="card">')
    if img is not None:
        rows.append(f'<img src="finals_review_img/img_{img:02d}.jpg" loading="lazy">')
    rows.append("<table>")
    for label, slots in ROUND_LABELS:
        cells = []
        for s in slots:
            v = p["picks"].get(s, "—")
            cls = "unresolved" if v == "UNRESOLVED" else ("champ" if label == "Champion" else "")
            cells.append(f'<span class="{cls}">{v}</span>')
        rows.append(f'<tr><td class="rk">{label}</td><td>{" · ".join(cells)}</td></tr>')
    rows.append("</table></div>")

rows.append("</body></html>")
(ROOT / "finals_review.html").write_text("\n".join(rows), encoding="utf-8")
print(f"wrote {ROOT / 'finals_review.html'} ({len(parts)} participants)")
