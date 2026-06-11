"""Carve the 34 scanned page JPEGs out of the picks PDF.

The PDF is a RICOH copier scan with one baseline JPEG per page and no
text layer, so we extract images by scanning for JPEG SOI/EOI markers
rather than pulling in a PDF library.

Usage: python scripts/extract_pages.py "<path to pdf>"
Writes scans/page_NN.jpg (NN = 1-based page order).
"""
import re
import sys
from pathlib import Path

DEFAULT_PDF = (
    r"C:\Users\aruben\OneDrive - Harvard-Westlake School\Documents"
    r"\WC 2026 Group Stage Brackets.pdf"
)


def main() -> None:
    pdf_path = Path(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PDF)
    out_dir = Path(__file__).resolve().parent.parent / "scans"
    out_dir.mkdir(exist_ok=True)

    data = pdf_path.read_bytes()
    starts = [m.start() for m in re.finditer(rb"\xff\xd8\xff", data)]
    for i, start in enumerate(starts, 1):
        end = data.find(b"\xff\xd9", start)
        if end == -1:
            raise ValueError(f"Unterminated JPEG stream at offset {start}")
        out = out_dir / f"page_{i:02d}.jpg"
        out.write_bytes(data[start : end + 2])
        print(f"{out.name}  {end + 2 - start:,} bytes")
    print(f"{len(starts)} pages extracted to {out_dir}")


if __name__ == "__main__":
    main()
