/** Delta-neutral demo execution proof JSON — CI / judge audit trail. */
/// <reference types="node" />
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type { E2eDemoMode } from "./e2e-demo-constants";
import type { E2eProofPayload } from "./e2e-demo-types";
import type { DeltaNeutralZeroDevState } from "./delta-neutral-zerodev";

export const DELTA_NEUTRAL_RUN_REL_PATH = "docs/logging/last_delta_neutral_run.json";
export const DELTA_NEUTRAL_RUN_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../docs/logging/last_delta_neutral_run.json",
);

export interface DeltaNeutralRunPayload {
  event: "DELTA_NEUTRAL_MULTI_VENUE_DEMO";
  ok: boolean;
  tripped: boolean;
  mode: E2eDemoMode;
  timestamp: string;
  zerodev: DeltaNeutralZeroDevState;
  proof: E2eProofPayload | null;
  tripReason?: string;
}

export function saveDeltaNeutralRunPayload(payload: DeltaNeutralRunPayload): void {
  mkdirSync(dirname(DELTA_NEUTRAL_RUN_PATH), { recursive: true });
  writeFileSync(DELTA_NEUTRAL_RUN_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}
