"""Build data/knockout.json — the canonical knockout bracket structure.

Fetches the 32 knockout fixtures from football-data.org and derives the
bracket topology. football-data assigns knockout match ids in bracket
order within each round, and the winner of round-N slot s advances to
round-(N+1) slot ceil(s/2) (home side if s is odd, away if even). This
was confirmed live: the finished R32 match (slot 3) propagated its
winner into R16 slot 2's home side.

Teams are seeded from the current API state (R32 known; later rounds
fill in as results come) but the live site recomputes advancement from
results, so these are only a fallback.

Reads the API key from web/.env.local.
"""
import json
import math
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ALIASES = {"URY": "URU", "SAU": "KSA"}

# Points per correct pick, from the printed sheet ("Points possible in
# RED"): R32=1, R16=2, QF=3, finalist(SF winner)=5, champion=7. The
# third-place match winner is worth 6; correctly predicting each of the
# two third-place participants is worth 4 (scored in lib/knockout.ts via
# THIRD_PLACE_PARTICIPANT_POINTS, not a round value here).
ROUNDS = [
    {"key": "R32", "name": "Round of 32", "stage": "LAST_32", "points": 1, "count": 16},
    {"key": "R16", "name": "Round of 16", "stage": "LAST_16", "points": 2, "count": 8},
    {"key": "QF", "name": "Quarter-finals", "stage": "QUARTER_FINALS", "points": 3, "count": 4},
    {"key": "SF", "name": "Semi-finals", "stage": "SEMI_FINALS", "points": 5, "count": 2},
    {"key": "F", "name": "Final", "stage": "FINAL", "points": 7, "count": 1},
    {"key": "3P", "name": "Third place", "stage": "THIRD_PLACE", "points": 6, "count": 1},
]
NEXT = {"R32": "R16", "R16": "QF", "QF": "SF", "SF": "F"}

# football-data assigns knockout match ids in FIFA match-number order. For
# most rounds that lines up with our slot numbering, but the Round of 16
# interleaves the two bracket halves (M89,M90 left → M91,M92 right →
# M93,M94 left → M95,M96 right). So the i-th R16 fixture (sorted by id)
# maps to these slots, NOT 1..8 in order. Confirmed live: the BRA/JPN
# winner (R32-9) lands in the 3rd R16 fixture, i.e. our slot R16-5.
SLOT_ORDER = {"R16": [1, 2, 5, 6, 3, 4, 7, 8]}


def code(team: dict | None) -> str | None:
    if not team:
        return None
    tla = team.get("tla")
    return ALIASES.get(tla, tla)


def main() -> None:
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

    by_stage: dict[str, list[dict]] = {}
    for m in api["matches"]:
        if m["stage"] != "GROUP_STAGE":
            by_stage.setdefault(m["stage"], []).append(m)

    matches = []
    for rnd in ROUNDS:
        fixtures = sorted(by_stage[rnd["stage"]], key=lambda m: m["id"])
        if len(fixtures) != rnd["count"]:
            raise ValueError(f"{rnd['key']}: expected {rnd['count']} matches, got {len(fixtures)}")
        order = SLOT_ORDER.get(rnd["key"], list(range(1, rnd["count"] + 1)))
        for am, slot in zip(fixtures, order):
            feeds_into = feeds_side = None
            if rnd["key"] in NEXT:
                nxt = NEXT[rnd["key"]]
                feeds_into = f"{nxt}-{math.ceil(slot / 2)}"
                feeds_side = "home" if slot % 2 == 1 else "away"
            # Only the Round of 32 has genuine first-round matchups. Later
            # rounds are left unseeded even if the API has already
            # propagated a winner — the live site computes advancement
            # from results so the bracket can never bake in stale progress.
            seed_teams = rnd["key"] == "R32"
            entry = {
                "id": f"{rnd['key']}-{slot}",
                "round": rnd["key"],
                "slot": slot,
                "apiMatchId": am["id"],
                "utcDate": am["utcDate"],
                "home": code(am["homeTeam"]) if seed_teams else None,
                "away": code(am["awayTeam"]) if seed_teams else None,
                "feedsInto": feeds_into,
                "feedsSide": feeds_side,
            }
            # Semi-final losers contest the third-place match.
            if rnd["key"] == "SF":
                entry["loserFeedsInto"] = "3P-1"
                entry["loserFeedsSide"] = "home" if slot == 1 else "away"
            matches.append(entry)

    out = {
        "comment": (
            "Knockout bracket structure. Topology derived by build_knockout.py "
            "(id-order + ceil rule). home/away are seeds from API build-time "
            "state; the site recomputes advancement live from results. points "
            "are per correct winner pick in that round."
        ),
        "rounds": [
            {"key": r["key"], "name": r["name"], "points": r["points"]} for r in ROUNDS
        ],
        "matches": matches,
    }
    path = ROOT / "data" / "knockout.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    known = sum(1 for m in matches if m["home"] and m["away"])
    print(f"wrote {path}: {len(matches)} matches ({known} with both teams known)")


if __name__ == "__main__":
    main()
