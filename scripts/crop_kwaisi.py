"""Upscaled halves of Kwaisi's updated bracket for an accurate read."""
import os
from pathlib import Path

from PIL import Image

SRC = Path(os.environ["TEMP"]) / "wc_kwaisi" / "k_01.jpg"
OUT = Path(os.environ["TEMP"]) / "wc_kwaisi"
im = Image.open(SRC).convert("RGB")
w, h = im.size
regions = {
    "left": (0, int(h * 0.12), int(w * 0.42), h),
    "center": (int(w * 0.33), int(h * 0.12), int(w * 0.67), h),
    "right": (int(w * 0.58), int(h * 0.12), w, h),
}
for key, box in regions.items():
    c = im.crop(box)
    c = c.resize((c.width * 3, c.height * 3), Image.LANCZOS)
    c.save(OUT / f"k_{key}.jpg", quality=92)
print("done", im.size)
