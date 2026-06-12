// Copy the canonical data JSONs from the repo root into web/data.
// Run after re-generating picks or adding apiMatchIds to matches.json.
import { copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
for (const f of ["matches.json", "teams.json", "picks.json"]) {
  copyFileSync(join(here, "../../data", f), join(here, "../data", f));
  console.log(`synced ${f}`);
}
