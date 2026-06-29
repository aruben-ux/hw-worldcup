"""Merge the double-read finals brackets into data/knockout-picks.json.

Each bracket was read twice (data/finals_reads/imgNN_a.json + _b.json).
Slots where both reads agree are accepted; disagreements (and blanks)
are listed for manual resolution. Resolutions live in
data/finals_resolutions.json ({"imgNN:SLOT": "CODE", ...}).
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
READS = ROOT / "data" / "finals_reads"
ENTRY_FEE = 20

SLOTS = (
    [f"R32-{i}" for i in range(1, 17)]
    + [f"R16-{i}" for i in range(1, 9)]
    + [f"QF-{i}" for i in range(1, 5)]
    + ["SF-1", "SF-2", "F-1", "3P-A", "3P-B", "3P-1"]
)
VALID = {
    "GER", "PAR", "FRA", "SWE", "RSA", "CAN", "NED", "MAR", "POR", "CRO",
    "ESP", "AUT", "USA", "BIH", "BEL", "SEN", "BRA", "JPN", "CIV", "NOR",
    "MEX", "ECU", "ENG", "COD", "ARG", "CPV", "AUS", "EGY", "SUI", "ALG",
    "COL", "GHA", "blank",
}


def load(img: int, suffix: str) -> dict:
    path = READS / f"img{img:02d}_{suffix}.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    return {"name": data.get("name", "?"), "picks": data.get("picks", {})}


def main() -> None:
    res_path = ROOT / "data" / "finals_resolutions.json"
    resolutions = (
        json.loads(res_path.read_text(encoding="utf-8")) if res_path.exists() else {}
    )

    imgs = sorted(
        int(p.stem[3:5]) for p in READS.glob("img*_a.json")
    )
    participants = []
    review = []
    agree = 0
    for img in imgs:
        a, b = load(img, "a"), load(img, "b")
        pid = f"f{img:02d}"
        nm = a["name"] if len(a["name"]) >= len(b["name"]) else b["name"]
        nm = resolutions.get(f"{pid}:name", nm)
        if a["name"].strip().lower() != b["name"].strip().lower() and f"{pid}:name" not in resolutions:
            review.append((pid, "name", a["name"], b["name"]))
        person = {"id": pid, "name": nm, "img": img, "picks": {}}
        for slot in SLOTS:
            key = f"{pid}:{slot}"
            pa = (a["picks"].get(slot) or "blank").upper()
            pb = (b["picks"].get(slot) or "blank").upper()
            pa = "blank" if pa == "BLANK" else pa
            pb = "blank" if pb == "BLANK" else pb
            if key in resolutions:
                person["picks"][slot] = resolutions[key]
                continue
            if pa == pb and pa in VALID and pa != "blank":
                person["picks"][slot] = pa
                agree += 1
            elif pa == pb and pa == "blank":
                person["picks"][slot] = "blank"
                review.append((pid, slot, pa, pb))  # blank on both — flag
            else:
                person["picks"][slot] = "UNRESOLVED"
                review.append((pid, slot, pa, pb))
        participants.append(person)

    out = ROOT / "data" / "knockout-picks.json"
    out.write_text(
        json.dumps(
            {
                "comment": "Knockout bracket picks, double-read from the finals PDF and reconciled. picks map slot id -> team code; 3P-A/3P-B are the third-place-match teams, 3P-1 the third-place winner.",
                "entryFee": ENTRY_FEE,
                "participants": [
                    {"id": p["id"], "name": p["name"], "picks": p["picks"]}
                    for p in participants
                ],
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    unresolved = sum(
        1 for p in participants for v in p["picks"].values() if v == "UNRESOLVED"
    )
    print(f"participants: {len(participants)}  agreed: {agree}  "
          f"resolved-by-file: {len(resolutions)}  unresolved: {unresolved}")
    for pid, slot, pa, pb in review:
        print(f"REVIEW {pid} {slot}: A={pa} B={pb}")
    if unresolved:
        sys.exit(1)


if __name__ == "__main__":
    main()
