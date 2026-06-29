# Bracket-reading instructions (knockout finals)

You are reading ONE person's hand-filled World Cup 2026 knockout bracket.
The bracket is pre-cropped into 4 images in
`C:\Users\aruben\AppData\Local\Temp\wc_finals_crops\`:

- `imgNN_name.jpg` — handwritten name (top-right of the sheet)
- `imgNN_left.jpg` — LEFT half: Round-of-32 printed matchups (matches
  73–88 labels) plus the person's handwritten winners
- `imgNN_right.jpg` — RIGHT half: the other Round-of-32 matchups plus
  handwritten winners
- `imgNN_center.jpg` — the finalists, CHAMPION box, and THIRD PLACE boxes

(`NN` = the zero-padded image number you are given.)

## How the bracket works

Standard single-elimination bracket. The printed Round-of-32 matchups are
the SAME on every sheet (listed below). The person writes the winner of
each match in the box in the NEXT column toward the centre:
- Round-of-32 winners are written in the "Round of 16" column.
- Round-of-16 winners in the "Quarterfinals" column.
- Quarter-final winners in the "Semifinals" column.
- Semi-final winners (the two FINALISTS) in the "Final" column.
- The overall winner goes in the big CHAMPION box.
- The two teams for the THIRD PLACE match and its winner are at the
  bottom-centre.

## The fixed matchups and the slot ids to report

LEFT half (top to bottom):
- R32-1: Germany(GER) vs Paraguay(PAR)
- R32-2: France(FRA) vs Sweden(SWE)
- R32-3: South Africa(RSA) vs Canada(CAN)
- R32-4: Netherlands(NED) vs Morocco(MAR)
- R32-5: Portugal(POR) vs Croatia(CRO)
- R32-6: Spain(ESP) vs Austria(AUT)
- R32-7: USA(USA) vs Bosnia(BIH)
- R32-8: Belgium(BEL) vs Senegal(SEN)
- R16-1: winner(R32-1) vs winner(R32-2)
- R16-2: winner(R32-3) vs winner(R32-4)
- R16-3: winner(R32-5) vs winner(R32-6)
- R16-4: winner(R32-7) vs winner(R32-8)
- QF-1: winner(R16-1) vs winner(R16-2)
- QF-2: winner(R16-3) vs winner(R16-4)
- SF-1: winner(QF-1) vs winner(QF-2)   ← left finalist

RIGHT half (top to bottom):
- R32-9:  Brazil(BRA) vs Japan(JPN)
- R32-10: Ivory Coast(CIV) vs Norway(NOR)
- R32-11: Mexico(MEX) vs Ecuador(ECU)
- R32-12: England(ENG) vs DR Congo(COD)
- R32-13: Argentina(ARG) vs Cape Verde(CPV)
- R32-14: Australia(AUS) vs Egypt(EGY)
- R32-15: Switzerland(SUI) vs Algeria(ALG)
- R32-16: Colombia(COL) vs Ghana(GHA)
- R16-5: winner(R32-9) vs winner(R32-10)
- R16-6: winner(R32-11) vs winner(R32-12)
- R16-7: winner(R32-13) vs winner(R32-14)
- R16-8: winner(R32-15) vs winner(R32-16)
- QF-3: winner(R16-5) vs winner(R16-6)
- QF-4: winner(R16-7) vs winner(R16-8)
- SF-2: winner(QF-3) vs winner(QF-4)   ← right finalist

CENTRE:
- F-1: the CHAMPION (winner of SF-1 vs SF-2)
- 3P-A and 3P-B: the two teams written in the THIRD PLACE box (order does
  not matter)
- 3P-1: the team in the "3RD PLACE WINNER" box

## Team codes (map handwriting/abbreviations to these)

GER Germany, PAR Paraguay, FRA France, SWE Sweden, RSA South Africa,
CAN Canada, NED Netherlands(Holland), MAR Morocco, POR Portugal,
CRO Croatia, ESP Spain, AUT Austria, USA USA, BIH Bosnia, BEL Belgium,
SEN Senegal, BRA Brazil, JPN Japan, CIV Ivory Coast, NOR Norway,
MEX Mexico, ECU Ecuador, ENG England, COD DR Congo/Congo, ARG Argentina,
CPV Cape Verde, AUS Australia, EGY Egypt, SUI Switzerland(written "SUIT"
sometimes), ALG Algeria, COL Colombia, GHA Ghana.

Common handwritten forms: GERM=GER, NETH=NED, POR/PORT=POR, SPAIN=ESP,
ARG=ARG, SUIT/SWITZ=SUI, COL=COL. Read carefully; a pick for an R32 slot
must be one of that match's two printed teams.

## Output

Write a JSON file with the Write tool to the exact path you are given:

```json
{
  "img": <number>,
  "name": "<handwritten name>",
  "picks": {
    "R32-1": "GER", "R32-2": "FRA", ... "R32-16": "...",
    "R16-1": "...", ... "R16-8": "...",
    "QF-1": "...", ... "QF-4": "...",
    "SF-1": "...", "SF-2": "...",
    "F-1": "...",
    "3P-A": "...", "3P-B": "...", "3P-1": "..."
  }
}
```

All 34 keys must be present. If a box is blank or you cannot read it, use
`"blank"` (or `"?"` with the value, and add a `"notes"` field describing
what's unclear). Then reply with ONE line:
`<name> | champion:<F-1> | unclear:<count>`
