# Sheet-reading instructions

You are reading ONE scanned World Cup 2026 pool sheet that a person filled
out by hand. The sheet is pre-cropped into 17 images in
`C:\Users\aruben\worldcup-app\crops\`:

- `pNN_name.jpg` — strip with the person's handwritten name (may include
  payment notes like "via Zelle"; some names are signatures)
- `pNN_<card>.jpg` — one image per date card, for cards:
  jun11, jun12, jun13, jun14, jun15, jun16, jun17, jun18, jun19, jun20,
  jun21, jun22, jun23, jun24, jun25, jun26, jun27

(`NN` = zero-padded page number you were given.)

## Match rows per card (match id, LEFT team vs RIGHT team)

- jun11: m01 MEX-RSA, m02 KOR-CZE
- jun12: m03 CAN-BIH, m04 USA-PAR
- jun13: m05 HAI-SCO, m06 AUS-TUR, m07 BRA-MAR, m08 QAT-SUI
- jun14: m09 CIV-ECU, m10 GER-CUW, m11 NED-JPN, m12 SWE-TUN
- jun15: m13 KSA-URU, m14 ESP-CPV, m15 IRN-NZL, m16 BEL-EGY
- jun16: m17 FRA-SEN, m18 IRQ-NOR, m19 ARG-ALG, m20 AUT-JOR
- jun17: m21 GHA-PAN, m22 ENG-CRO, m23 POR-COD, m24 UZB-COL
- jun18: m25 CZE-RSA, m26 SUI-BIH, m27 CAN-QAT, m28 MEX-KOR
- jun19: m29 BRA-HAI, m30 SCO-MAR, m31 TUR-PAR, m32 USA-AUS
- jun20: m33 GER-CIV, m34 ECU-CUW, m35 NED-SWE, m36 TUN-JPN
- jun21: m37 URU-CPV, m38 ESP-KSA, m39 BEL-IRN, m40 NZL-EGY
- jun22: m41 NOR-SEN, m42 FRA-IRQ, m43 ARG-AUT, m44 JOR-ALG
- jun23: m45 ENG-GHA, m46 PAN-CRO, m47 POR-UZB, m48 COL-COD
- jun24: m49 SCO-BRA, m50 MAR-HAI, m51 SUI-CAN, m52 BIH-QAT, m53 CZE-MEX, m54 RSA-KOR
- jun25: m55 CUW-CIV, m56 ECU-GER, m57 JPN-SWE, m58 TUN-NED, m59 TUR-USA, m60 PAR-AUS
- jun26: m61 NOR-FRA, m62 SEN-IRQ, m63 EGY-IRN, m64 NZL-BEL, m65 CPV-KSA, m66 URU-ESP
- jun27: m67 PAN-ENG, m68 CRO-GHA, m69 ALG-AUT, m70 JOR-ARG, m71 COL-POR, m72 COD-UZB

Rows are identified by POSITION in the card (top to bottom), matching the
order above. Some sheets are grayscale copies — do not rely on flag colors.
The printed team abbreviations should match the list; if a card's rows
visibly disagree with the list, note it, but still report by position.

## How picks are marked

Each match row reads: group letter, LEFT team + flag, LEFT BOX, "VS",
RIGHT BOX, flag + RIGHT team. People marked with X, check marks, or
scribbles. Classify each row as exactly one of:

- `home` — only the LEFT box is marked
- `away` — only the RIGHT box is marked
- `draw` — a horizontal line/strike drawn through BOTH boxes (often
  crossing the "VS"), or BOTH boxes individually marked, or a single mark
  centered on the "VS" between the boxes
- `blank` — no mark anywhere on the row
- `ambiguous` — you genuinely cannot tell (mark overlaps two boxes
  unevenly, eraser smudge, mark between two rows, row cut off by the scan
  edge, etc.). Always add a `note` explaining what you see.

Look CAREFULLY: marks are sometimes light, small, or spill outside the
box. A mark drifting slightly outside its box still counts for that box.
Check marks at the box's corner count. If a row is missing from the image
entirely (cut off), use `ambiguous` with note "row cut off".
Any stray handwriting on a card (words, team abbreviations, arrows),
transcribe it in that row's or the page's `notes`.

## Output

Write a JSON file (Write tool) to the exact output path you were given:

```json
{
  "page": <page number>,
  "name": "<handwritten name as best you can read it>",
  "nameNotes": "<anything else on the name strip, or omit>",
  "picks": [
    { "id": "m01", "pick": "home" },
    { "id": "m02", "pick": "ambiguous", "note": "mark spans both boxes" },
    ... exactly 72 entries, m01..m72, in order ...
  ]
}
```

Then reply with ONE line: `<name> | home:<n> away:<n> draw:<n> blank:<n> ambiguous:<n>`.
Do not include anything else in your reply.
