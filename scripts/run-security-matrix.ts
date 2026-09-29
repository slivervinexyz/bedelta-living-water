#!/usr/bin/env tsx
/** 3-Tier Security Matrix SSOT — --tier=fast|security|nightly. */
export type { Tier, GateVerdict, SecurityGateResult, SecurityScorecard } from "./security-matrix/types";
export { runSecurityMatrix } from "./security-matrix/runner";
export { parseTier } from "./security-matrix/gates";

import { parseTier } from "./security-matrix/gates";
import { runSecurityMatrix } from "./security-matrix/runner";

const tier = parseTier(process.argv.slice(2));
const scorecard = runSecurityMatrix(tier);
process.stdout.write(`${JSON.stringify(scorecard, null, 2)}
`);
if (scorecard.overallVerdict !== "PASS") process.exitCode = 1;
