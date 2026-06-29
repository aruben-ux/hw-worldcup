"""Extract Kwaisi's updated bracket image(s) from his PDF for reading."""
import os
import re
from pathlib import Path

SRC = Path(
    r"C:\Users\aruben\OneDrive - Harvard-Westlake School\Desktop\Kwaisi.pdf"
)
OUT = Path(os.environ["TEMP"]) / "wc_kwaisi"


def main() -> None:
    OUT.mkdir(exist_ok=True)
    for f in OUT.glob("*.jpg"):
        f.unlink()
    data = SRC.read_bytes()
    print("size", len(data), "pages", data.count(b"/Type/Page") + data.count(b"/Type /Page"))
    starts = [m.start() for m in re.finditer(rb"\xff\xd8\xff", data)]
    n = 0
    for s in starts:
        e = data.find(b"\xff\xd9", s) + 2
        jpg = data[s:e]
        if len(jpg) < 5000:
            continue
        n += 1
        (OUT / f"k_{n:02d}.jpg").write_bytes(jpg)
        print(f"k_{n:02d}.jpg {len(jpg):,}")
    print(f"{n} images -> {OUT}")


if __name__ == "__main__":
    main()
