/** Sanctuary demo execution proof JSON — CI / judge audit trail. */
/// <reference types="node" />
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type { DemoBenchmarkSnapshot } from "./demo-timing";
import { getDemoPersistTimestamp } from "./demo-utils";

export const SANCTUARY_RUN_REL_PATH = "docs/logging/last_sanctuary_run.json";
export const SANCTUARY_RUN_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../docs/logging/last_sanctuary_run.json",
);

export type SanctuaryScenarioId = "A" | "B" | "C";

export interface SanctuaryScenarioJsonResult {
  scenario: SanctuaryScenarioId;
  status: "ALLOW_DEPOSIT" | "REJECT_OPERATOR" | "REJECT_SLIPPAGE";
  wasmUs: number;
  code: string | null;
  driftBps?: number;
  selector?: string;
  operator?: string;
}

export interface SanctuaryRunPayload {
  event: "SANCTUARY_ASYNC_ESCORT_DEMO";
  timestamp: string;
  benchmark: {
    pureInvariantUs: number;
    fullMatrixUs: number;
    e2eHarnessUs: number;
  };
  scenarios: SanctuaryScenarioJsonResult[];
}

export function buildSanctuaryRunPayload(
  scenarios: SanctuaryScenarioJsonResult[],
  benchmark: DemoBenchmarkSnapshot,
  timestamp: string = getDemoPersistTimestamp(),
): SanctuaryRunPayload {
  return {
    event: "SANCTUARY_ASYNC_ESCORT_DEMO",
    timestamp,
    benchmark: {
      pureInvariantUs: benchmark.pureInvariantUs,
      fullMatrixUs: benchmark.fullMatrixUs,
      e2eHarnessUs: benchmark.e2eHarnessUs,
    },
    scenarios,
  };
}

export function saveSanctuaryRunPayload(payload: SanctuaryRunPayload): void {
  mkdirSync(dirname(SANCTUARY_RUN_PATH), { recursive: true });
  writeFileSync(SANCTUARY_RUN_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}
