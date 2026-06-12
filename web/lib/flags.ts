/** FIFA-style sheet code -> flagcdn.com code (ISO 3166-1 alpha-2,
 * plus gb-eng / gb-sct subdivisions). Windows can't render flag emoji,
 * so flags are shown as small images. */
const FLAGCDN: Record<string, string> = {
  MEX: "mx", KOR: "kr", RSA: "za", CZE: "cz",
  CAN: "ca", BIH: "ba", QAT: "qa", SUI: "ch",
  HAI: "ht", SCO: "gb-sct", BRA: "br", MAR: "ma",
  USA: "us", PAR: "py", AUS: "au", TUR: "tr",
  CIV: "ci", ECU: "ec", GER: "de", CUW: "cw",
  NED: "nl", JPN: "jp", SWE: "se", TUN: "tn",
  IRN: "ir", NZL: "nz", BEL: "be", EGY: "eg",
  KSA: "sa", URU: "uy", ESP: "es", CPV: "cv",
  FRA: "fr", SEN: "sn", IRQ: "iq", NOR: "no",
  ARG: "ar", ALG: "dz", AUT: "at", JOR: "jo",
  POR: "pt", COD: "cd", UZB: "uz", COL: "co",
  GHA: "gh", PAN: "pa", ENG: "gb-eng", CRO: "hr",
};

export function flagUrl(code: string): string | null {
  const cc = FLAGCDN[code];
  return cc ? `https://flagcdn.com/h20/${cc}.png` : null;
}
