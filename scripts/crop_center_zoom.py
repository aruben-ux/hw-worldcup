"""Tight high-zoom crop of one bracket's centre column (points + finals)."""
import os
import sys
from pathlib import Path

from PIL import Image

SRC = Path(os.environ["TEMP"]) / "wc_finals"
n = int(sys.argv[1]) if len(sys.argv) > 1 else 1
im = Image.open(SRC / f"img_{n:02d}.jpg").convert("RGB")
w, h = im.size
# Centre column: champion / final / semifinal winners / third place.
box = (int(w * 0.40), int(h * 0.12), int(w * 0.60), h)
crop = im.crop(box)
crop = crop.resize((crop.width * 3, crop.height * 3), Image.LANCZOS)
out = Path(os.environ["TEMP"]) / "wc_finals_crops" / f"img_{n:02d}_centerzoom.jpg"
crop.save(out, quality=92)
print(out)
