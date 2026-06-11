"""Crop each scanned sheet into a name strip + 16 date-card images.

Scan alignment drifts page to page, so card positions are detected per
page: the dark date-header bars (solid bands ~440px wide) are located by
darkness, clustered into 4 columns, and each card is cropped from its
header to the next header in the column (or a fixed height for the
bottom cards).

Expected layout (verified against the Oddspedia template):
  col 1: 11 Jun(2), 12 Jun(2), 16 Jun(4), 20 Jun(4), 24 Jun(6)
  col 2: 13 Jun(4), 17 Jun(4), 21 Jun(4), 25 Jun(6)
  col 3: 14 Jun(4), 18 Jun(4), 22 Jun(4), 26 Jun(6)
  col 4: 15 Jun(4), 19 Jun(4), 23 Jun(4), 27 Jun(6)

Outputs crops/pNN_name.jpg and crops/pNN_cMM.jpg (MM = card 01..16 in
column-major order as listed above). Exits nonzero if any page does not
yield exactly 4 columns with 5/4/4/4 headers.
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
STEP = 4
DARK = 120
MIN_RUN = 300  # minimum header bar width, px
EXPECTED_HEADERS = [5, 4, 4, 4]

CARD_NAMES = [
    "jun11", "jun12", "jun16", "jun20", "jun24",
    "jun13", "jun17", "jun21", "jun25",
    "jun14", "jun18", "jun22", "jun26",
    "jun15", "jun19", "jun23", "jun27",
]


def bands(frac_by_y: dict[int, float], thresh: float, min_height: int) -> list[tuple[int, int]]:
    """Contiguous y-ranges where the dark fraction exceeds thresh."""
    out, start, prev = [], None, None
    for y in sorted(frac_by_y):
        hit = frac_by_y[y] >= thresh
        if hit and start is None:
            start = y
        elif not hit and start is not None:
            if prev - start + STEP >= min_height:
                out.append((start, prev + STEP))
            start = None
        if hit:
            prev = y
    if start is not None and prev - start + STEP >= min_height:
        out.append((start, prev + STEP))
    return out


def find_headers(im: Image.Image) -> list[list[tuple[int, int, int, int]]]:
    """Return per-column lists of header boxes (x0, x1, y0, y1).

    The four columns' header bars sit at the same heights, so the four
    main header rows are found first (rows that are mostly dark across
    the full page width). One row band is then segmented along x into
    the four bars to get column ranges, and finally each column gets
    its own precise header bands (which also picks up the 12th June
    header that exists only in column 1). Thresholds are adaptive
    because scan brightness varies sheet to sheet.
    """
    last_err: Exception | None = None
    for dark in (120, 150, 95):
        try:
            return _find_headers_at(im, dark)
        except ValueError as e:
            last_err = e
    raise last_err


def _find_headers_at(im: Image.Image, DARK: int) -> list[list[tuple[int, int, int, int]]]:
    gray = im.convert("L")
    w, h = gray.size
    px = gray.load()

    samples_per_row = len(range(0, w, STEP))
    row_frac = {
        y: sum(1 for x in range(0, w, STEP) if px[x, y] < DARK) / samples_per_row
        for y in range(0, h, STEP)
    }

    def segment_bars(y0: int, y1: int, solid_thresh: float) -> list[list[int]]:
        ys = list(range(y0, y1, STEP))
        solid = [
            sum(1 for y in ys if px[x, y] < DARK) >= solid_thresh * len(ys)
            for x in range(0, w, STEP)
        ]
        pieces, start = [], None
        for i, s in enumerate(solid):
            if s and start is None:
                start = i
            elif not s and start is not None:
                pieces.append((start * STEP, i * STEP))
                start = None
        if start is not None:
            pieces.append((start * STEP, len(solid) * STEP))
        # Merge bar fragments (split by the white date text) into bars of
        # at most ~card width (some rescans are zoomed, so allow slack).
        merged: list[list[int]] = []
        for px0, px1 in pieces:
            if px1 - px0 < 12:  # stray noise
                continue
            if merged and px1 - merged[-1][0] <= 600:
                merged[-1][1] = px1
            else:
                merged.append([px0, px1])
        return [b for b in merged if MIN_RUN <= b[1] - b[0] <= 620]

    # Candidate header rows; validate each by whether it splits into the
    # four column bars. Scan shadows/footers fail validation naturally.
    bars: list[list[int]] | None = None
    candidates = bands(row_frac, 0.35, 12)
    for y0, y1 in candidates:
        for solid_thresh in (0.7, 0.5):
            got = segment_bars(max(0, y0 - 8), min(h, y1 + 8), solid_thresh)
            if len(got) == 4:
                bars = got
                break
        if bars:
            break
    if not bars:
        raise ValueError(f"no candidate row segmented into 4 bars (candidates: {candidates})")

    # Per-column header bands. The expected count per column is known
    # from the template, so the band threshold self-tunes: highest
    # threshold that yields exactly the expected number of header-sized
    # bands wins.
    bars.sort(key=lambda b: b[0])
    col_fracs = []
    detected: list[list[tuple[int, int]] | None] = []
    for (x0, x1), expected in zip(bars, EXPECTED_HEADERS):
        n = len(range(x0, x1, STEP))
        col_frac = {
            y: sum(1 for x in range(x0, x1, STEP) if px[x, y] < DARK) / n
            for y in range(0, h, STEP)
        }
        col_fracs.append(col_frac)
        col_bands = None
        for thresh in (0.8, 0.72, 0.64, 0.55, 0.46, 0.38):
            got = [
                b
                for b in bands(col_frac, thresh, 16)
                # Header-sized, and away from the page edges (scan-edge
                # stripes on some copies produce full-width dark bands).
                if b[1] - b[0] <= 64 and 60 <= b[0] <= h - 300
            ]
            if len(got) == expected:
                col_bands = got
                break
        detected.append(col_bands)

    # Columns where no threshold worked (edge shadow, skew): infer band
    # positions from the columns that did detect, snapping to any local
    # band found at a permissive threshold. Header rows align across
    # columns; col 1's extra 12th-June header sits at a fixed fraction
    # of the row-1 -> row-2 spacing.
    ok_cols = [
        (i, b) for i, b in enumerate(detected) if b is not None and i > 0
    ]
    if any(b is None for b in detected):
        if len([b for b in detected if b is not None]) < 2:
            raise ValueError("too few columns detected to infer the rest")
        # Reference y for the 4 main rows: median over detected non-col-1
        # columns (col 1 included only if it detected, skipping its 12 Jun).
        def col_rows(i: int, b: list[tuple[int, int]]) -> list[tuple[int, int]]:
            return [b[0], b[2], b[3], b[4]] if i == 0 else b

        sources = [col_rows(i, b) for i, b in enumerate(detected) if b is not None]
        ref_rows = []
        for r in range(4):
            tops = sorted(s[r][0] for s in sources)
            heights = sorted(s[r][1] - s[r][0] for s in sources)
            top = tops[len(tops) // 2]
            ref_rows.append((top, top + heights[len(heights) // 2]))

        for i, col_bands in enumerate(detected):
            if col_bands is not None:
                continue
            expect = list(ref_rows)
            if i == 0:
                jun12_top = ref_rows[0][0] + round(
                    0.465 * (ref_rows[1][0] - ref_rows[0][0])
                )
                height = ref_rows[0][1] - ref_rows[0][0]
                expect.insert(1, (jun12_top, jun12_top + height))
            loose = [
                b for b in bands(col_fracs[i], 0.38, 14) if b[1] - b[0] <= 64
            ]
            snapped = []
            for ey0, ey1 in expect:
                ec = (ey0 + ey1) // 2
                near = [b for b in loose if abs((b[0] + b[1]) // 2 - ec) <= 60]
                snapped.append(near[0] if near else (ey0, ey1))
            detected[i] = snapped

    return [
        [(x0, x1, b0, b1) for b0, b1 in col_bands]
        for (x0, x1), col_bands in zip(bars, detected)
    ]


def crop_page(path: Path, out_dir: Path) -> list[str]:
    im = Image.open(path)
    stem = path.stem.replace("page_", "p")
    # A few sheets were scanned at an angle; sweep small rotations until
    # header detection succeeds.
    columns = None
    last_err: Exception | None = None
    for angle in (0, -1, 1, -1.5, 1.5, -2, 2, -2.5, 2.5, -3, 3, -4, 4):
        candidate = (
            im if angle == 0 else im.rotate(angle, Image.BICUBIC, fillcolor=(255, 255, 255))
        )
        try:
            columns = find_headers(candidate)
            im = candidate
            break
        except ValueError as e:
            last_err = e
    if columns is None:
        raise ValueError(f"{path.name}: {last_err}")
    w, h = im.size

    counts = [len(c) for c in columns]
    if counts != EXPECTED_HEADERS:
        raise ValueError(f"{path.name}: expected {EXPECTED_HEADERS} headers per column, got {counts}")

    written = []
    # Name strip: full width from top to just above the first header row.
    first_header_y = min(col[0][2] for col in columns)
    name = im.crop((0, 0, w, max(60, first_header_y - 10)))
    name_path = out_dir / f"{stem}_name.jpg"
    name.save(name_path, quality=90)
    written.append(name_path.name)

    # Height of the bottom 6-match cards, scaled off the header-to-header
    # spacing (a 4-match card plus header) so zoomed rescans work too.
    spacings = sorted(
        col[i + 1][2] - col[i][2]
        for col in columns[1:]
        for i in range(len(col) - 1)
    )
    last_card_height = round(1.55 * spacings[len(spacings) // 2])

    card_idx = 0
    for col in columns:
        for i, (x0, x1, y0, _y1) in enumerate(col):
            if i + 1 < len(col):
                bottom = col[i + 1][2] - 12
            else:
                bottom = min(h, y0 + last_card_height)
            box = (max(0, x0 - 26), max(0, y0 - 6), min(w, x1 + 34), bottom)
            card = im.crop(box)
            # Upscale 2x so handwriting reads clearly.
            card = card.resize((card.width * 2, card.height * 2), Image.LANCZOS)
            card_path = out_dir / f"{stem}_{CARD_NAMES[card_idx]}.jpg"
            card.save(card_path, quality=90)
            written.append(card_path.name)
            card_idx += 1
    return written


def main() -> None:
    out_dir = ROOT / "crops"
    out_dir.mkdir(exist_ok=True)
    pages = sorted((ROOT / "scans").glob("page_*.jpg"))
    if len(sys.argv) > 1:
        pages = [ROOT / "scans" / f"{p}.jpg" for p in sys.argv[1:]]
    failures = []
    for page in pages:
        try:
            files = crop_page(page, out_dir)
            print(f"{page.name}: {len(files)} crops")
        except ValueError as e:
            failures.append(str(e))
            print(f"FAIL {e}")
    if failures:
        sys.exit(1)


if __name__ == "__main__":
    main()
