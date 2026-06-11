"""Merge the double-read agent outputs into data/picks.json.

Each page was read twice (data/reads/pNN_a.json, pNN_b.json). Picks where
both passes agree are accepted; disagreements, blanks, and ambiguous rows
are listed for manual resolution. Resolutions live in
data/resolutions.json ({"pNN:mMM": "home|draw|away|blank", ...}) and
override everything.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
READS = ROOT / "data" / "reads"
VALID = {"home", "away", "draw", "blank", "ambiguous"}


def load(page: int, suffix: str) -> dict:
    path = READS / f"p{page:02d}_{suffix}.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    picks = {p["id"]: p for p in data["picks"]}
    ids = [f"m{i:02d}" for i in range(1, 73)]
    missing = [i for i in ids if i not in picks]
    if missing:
        raise ValueError(f"{path.name}: missing ids {missing}")
    bad = [p for p in data["picks"] if p["pick"] not in VALID]
    if bad:
        raise ValueError(f"{path.name}: invalid picks {bad}")
    return {"name": data["name"], "picks": picks, "notes": data.get("nameNotes")}


def main() -> None:
    resolutions_path = ROOT / "data" / "resolutions.json"
    resolutions = (
        json.loads(resolutions_path.read_text(encoding="utf-8"))
        if resolutions_path.exists()
        else {}
    )

    participants = []
    needs_review = []
    agree_count = 0
    for page in range(1, 35):
        a, b = load(page, "a"), load(page, "b")
        pid = f"p{page:02d}"
        person = {
            "id": pid,
            "page": page,
            "name": a["name"] if len(a["name"]) >= len(b["name"]) else b["name"],
            "picks": {},
        }
        if a["name"].strip().lower() != b["name"].strip().lower():
            needs_review.append((pid, "name", a["name"], b["name"], None))
        for i in range(1, 73):
            mid = f"m{i:02d}"
            pa, pb = a["picks"][mid], b["picks"][mid]
            key = f"{pid}:{mid}"
            if key in resolutions:
                person["picks"][mid] = resolutions[key]
                continue
            if pa["pick"] == pb["pick"] and pa["pick"] in ("home", "away", "draw"):
                person["picks"][mid] = pa["pick"]
                agree_count += 1
            else:
                person["picks"][mid] = "unresolved"
                needs_review.append(
                    (pid, mid, pa["pick"], pb["pick"],
                     pa.get("note") or pb.get("note"))
                )
        participants.append(person)

    out = ROOT / "data" / "picks.json"
    out.write_text(
        json.dumps({"participants": participants}, indent=2), encoding="utf-8"
    )
    unresolved = sum(
        1 for p in participants for v in p["picks"].values() if v == "unresolved"
    )
    print(f"agreed: {agree_count}  resolved-by-file: "
          f"{sum(1 for k in resolutions)}  unresolved: {unresolved}")
    for row in needs_review:
        pid, mid, pa, pb, note = row
        flag = "" if mid == "name" else ("" if pa == pb else " A!=B")
        print(f"REVIEW {pid} {mid}: A={pa} B={pb}{flag}"
              + (f"  note: {note}" if note else ""))
    if unresolved:
        sys.exit(1)


if __name__ == "__main__":
    main()
