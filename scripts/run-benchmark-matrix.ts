/**
 * Weapon Comparison Matrix — Gen1 vs Gen2 Radar / Defense + v0.8 vs v1.5.
 * Output: docs/0802_Weapon_Comparison_Log.md
 *
 * Usage: pnpm tsx scripts/run-benchmark-matrix.ts
 */

import { main } from "./benchmark-matrix/run.js";

main().catch((err) => {
  console.error("[matrix] FAILED", err);
  process.exit(1);
});
