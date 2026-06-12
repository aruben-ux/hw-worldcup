"""Generate review.html: every card crop next to its parsed picks so the
parse can be spot-checked against the original handwriting.

Open review.html in a browser from the repo root (references crops/).
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

matches = {
    m["id"]: m
    for m in json.loads((ROOT / "data" / "matches.json").read_text(encoding="utf-8"))["matches"]
}
participants = json.loads(
    (ROOT / "data" / "picks.json").read_text(encoding="utf-8")
)["participants"]

CARDS = [
    "jun11", "jun12", "jun13", "jun14", "jun15", "jun16", "jun17", "jun18",
    "jun19", "jun20", "jun21", "jun22", "jun23", "jun24", "jun25", "jun26",
    "jun27",
]
by_card: dict[str, list[dict]] = {c: [] for c in CARDS}
for m in matches.values():
    by_card[m["card"]].append(m)
for c in CARDS:
    by_card[c].sort(key=lambda m: m["row"])

LABEL = {"home": "&#10004; LEFT", "away": "RIGHT &#10004;", "draw": "&mdash; DRAW &mdash;",
         "blank": "(no pick)", "unresolved": "?? UNRESOLVED"}
CLS = {"home": "h", "away": "a", "draw": "d", "blank": "b", "unresolved": "u"}

rows = []
rows.append("""<!doctype html><html><head><meta charset="utf-8">
<title>Picks parse review</title>
<style>
 body { font-family: system-ui, sans-serif; background:#f4f4f8; margin:0; padding:20px; }
 h1 { font-size:20px; } h2 { margin:30px 0 6px; font-size:17px; position:sticky; top:0;
      background:#f4f4f8; padding:8px 0; border-bottom:2px solid #1a2b50; }
 .card { display:flex; gap:14px; margin:10px 0; background:#fff; border-radius:8px;
         padding:10px; box-shadow:0 1px 3px rgba(0,0,0,.12); }
 .card img { width:520px; height:auto; align-self:flex-start; }
 table { border-collapse:collapse; font-size:14px; }
 td { padding:7px 10px; border-bottom:1px solid #eee; white-space:nowrap; }
 td.pick { font-weight:700; text-align:center; border-radius:4px; }
 .h { color:#0a7a2f; } .a { color:#0a4fa8; } .d { color:#b06a00; }
 .b { color:#888; } .u { background:#ffd2d2; color:#a00; }
 .namestrip img { width:760px; }
 .toc a { margin-right:12px; }
</style></head><body>
<h1>World Cup pool &mdash; parse review (LEFT = left team wins, RIGHT = right team wins)</h1>
<p>Check each card image against the parsed pick beside it. Report any row that looks wrong.</p>
<p class="toc">""")
for p in participants:
    rows.append(f'<a href="#{p["id"]}">{p["name"]}</a>')
rows.append("</p>")

for p in participants:
    pid = p["id"]
    rows.append(f'<h2 id="{pid}">{p["name"]} &mdash; page {p["page"]}</h2>')
    rows.append(
        f'<div class="card namestrip"><img src="crops/{pid}_name.jpg" loading="lazy"></div>'
    )
    for c in CARDS:
        rows.append('<div class="card">')
        rows.append(f'<img src="crops/{pid}_{c}.jpg" loading="lazy">')
        rows.append("<table>")
        for m in by_card[c]:
            pick = p["picks"][m["id"]]
            rows.append(
                f'<tr><td>{m["home"]} vs {m["away"]}</td>'
                f'<td class="pick {CLS[pick]}">{LABEL[pick]}</td></tr>'
            )
        rows.append("</table></div>")
rows.append("</body></html>")

out = ROOT / "review.html"
out.write_text("\n".join(rows), encoding="utf-8")
print(f"wrote {out} ({out.stat().st_size:,} bytes)")
