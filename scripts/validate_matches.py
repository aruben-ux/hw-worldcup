"""Validate data/matches.json against football-data.org fixtures and
record each match's API id.

Usage: python scripts/validate_matches.py
Reads the key from web/.env.local (FOOTBALL_DATA_API_KEY=...).
Exits nonzero if any sheet match has no API counterpart or dates differ.
"""
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

ALIASES = {
    "SAU": "KSA",
    "URY": "URU",
}

key = None
for line in (ROOT / "web" / ".env.local").read_text().splitlines():
    if line.startswith("FOOTBALL_DATA_API_KEY="):
        key = line.split("=", 1)[1].strip()
assert key, "no API key in web/.env.local"

req = urllib.request.Request(
    "https://api.football-data.org/v4/competitions/WC/matches?season=2026",
    headers={"X-Auth-Token": key},
)
with urllib.request.urlopen(req) as resp:
    api = json.load(resp)

data = json.loads((ROOT / "data" / "matches.json").read_text(encoding="utf-8"))
ours = data["matches"]
our_codes = {c for m in ours for c in (m["home"], m["away"])}


def code(team: dict) -> str | None:
    tla = team.get("tla")
    if tla in our_codes:
        return tla
    return ALIASES.get(tla)


pair = lambda a, b: "-".join(sorted((a, b)))
api_by_pair = {}
group_stage = 0
for am in api["matches"]:
    if am.get("stage") != "GROUP_STAGE":
        continue
    group_stage += 1
    h, a = code(am["homeTeam"]), code(am["awayTeam"])
    if h and a:
        api_by_pair[pair(h, a)] = am
    else:
        print(f"UNMAPPED API teams: {am['homeTeam'].get('name')} vs {am['awayTeam'].get('name')}"
              f" (tla {am['homeTeam'].get('tla')}/{am['awayTeam'].get('tla')})")

print(f"API group-stage matches: {group_stage}, mapped: {len(api_by_pair)}")

errors = 0
for m in ours:
    am = api_by_pair.get(pair(m["home"], m["away"]))
    if not am:
        print(f"MISSING in API: {m['id']} {m['home']}-{m['away']} {m['date']}")
        errors += 1
        continue
    api_date = am["utcDate"][:10]
    # Sheet dates are US-local; a UTC date one day later is fine (evening
    # kickoffs cross midnight UTC).
    from datetime import date, timedelta

    d_sheet = date.fromisoformat(m["date"])
    d_api = date.fromisoformat(api_date)
    if not (timedelta(0) <= d_api - d_sheet <= timedelta(days=1)):
        print(f"DATE MISMATCH {m['id']} {m['home']}-{m['away']}: sheet {m['date']} api {am['utcDate']}")
        errors += 1
    m["apiMatchId"] = am["id"]
    m["utcDate"] = am["utcDate"]

if errors:
    raise SystemExit(f"{errors} mismatches")

(ROOT / "data" / "matches.json").write_text(
    json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
)
print("OK: all 72 matches matched; apiMatchId + utcDate recorded.")
