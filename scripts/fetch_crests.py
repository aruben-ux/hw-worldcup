"""Fetch official team crest URLs from football-data.org into teams.json.

One-time enrichment: adds a "crest" field per team. Reads the API key
from web/.env.local.
"""
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ALIASES = {"URY": "URU", "SAU": "KSA"}

key = None
for line in (ROOT / "web" / ".env.local").read_text().splitlines():
    if line.startswith("FOOTBALL_DATA_API_KEY="):
        key = line.split("=", 1)[1].strip()
assert key, "no API key in web/.env.local"

req = urllib.request.Request(
    "https://api.football-data.org/v4/competitions/WC/teams?season=2026",
    headers={"X-Auth-Token": key},
)
with urllib.request.urlopen(req) as resp:
    api = json.load(resp)

teams_path = ROOT / "data" / "teams.json"
teams = json.loads(teams_path.read_text(encoding="utf-8"))

found = 0
for t in api["teams"]:
    code = t.get("tla")
    code = ALIASES.get(code, code)
    if code in teams and t.get("crest"):
        teams[code]["crest"] = t["crest"]
        found += 1
    elif code not in teams:
        print(f"UNMAPPED API team: {t.get('name')} ({t.get('tla')})")

missing = [c for c, v in teams.items() if "crest" not in v]
print(f"crests recorded: {found}/48; missing: {missing or 'none'}")

teams_path.write_text(
    json.dumps(teams, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
)
