"""Crop each finals bracket scan into legible regions for reading.

The bracket is a single landscape page: left half (R32 matches 73-80 +
their R16/QF picks), centre (semis, final, champion, third place), and
right half (R32 matches 81-88 + R16/QF picks). We upscale generously so
the handwritten picks read clearly.
"""
import os
import sys
from pathlib import Path

from PIL import Image

SRC = Path(os.environ["TEMP"]) / "wc_finals"
OUT = Path(os.environ["TEMP"]) / "wc_finals_crops"


def main() -> None:
    OUT.mkdir(exist_ok=True)
    for f in OUT.glob("*.jpg"):
        f.unlink()
    imgs = sorted(SRC.glob("img_*.jpg"))
    if len(sys.argv) > 1:
        imgs = [SRC / f"img_{int(sys.argv[1]):02d}.jpg"]
    for img in imgs:
        im = Image.open(img).convert("RGB")
        w, h = im.size
        stem = img.stem  # img_NN
        regions = {
            "name": (int(w * 0.30), 0, w, int(h * 0.16)),
            "left": (0, int(h * 0.10), int(w * 0.42), h),
            "center": (int(w * 0.33), int(h * 0.10), int(w * 0.67), h),
            "right": (int(w * 0.58), int(h * 0.10), w, h),
        }
        for key, box in regions.items():
            crop = im.crop(box)
            crop = crop.resize((crop.width * 2, crop.height * 2), Image.LANCZOS)
            crop.save(OUT / f"{stem}_{key}.jpg", quality=90)
        print(f"{stem}: {im.size}")
    print(f"crops -> {OUT}")


if __name__ == "__main__":
    main()
