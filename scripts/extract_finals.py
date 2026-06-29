"""Carve the scanned bracket JPEGs out of the finals picks PDF."""
import os
import re
import sys
from pathlib import Path

SRC = Path(
    r"C:\Users\aruben\OneDrive - Harvard-Westlake School\Desktop"
    r"\Finals Bracket WC 2026.pdf"
)
OUT = Path(os.environ["TEMP"]) / "wc_finals"


def main() -> None:
    OUT.mkdir(exist_ok=True)
    for f in OUT.glob("*.jpg"):
        f.unlink()
    data = SRC.read_bytes()
    starts = [m.start() for m in re.finditer(rb"\xff\xd8\xff", data)]
    n = 0
    for s in starts:
        e = data.find(b"\xff\xd9", s) + 2
        jpg = data[s : e]
        if len(jpg) < 20000:  # skip tiny masks/thumbnails
            continue
        n += 1
        (OUT / f"img_{n:02d}.jpg").write_bytes(jpg)
        print(f"img_{n:02d}.jpg  {len(jpg):,}")
    print(f"{n} images -> {OUT}")


if __name__ == "__main__":
    main()
