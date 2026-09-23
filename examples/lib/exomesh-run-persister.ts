/** ExoMesh demo execution proof JSON — CI / judge audit trail. */
/// <reference types="node" />
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type { Eip1193ScenarioJsonResult } from "./eip1193-extension-helpers";
import { getDemoPersistTimestamp } from "./demo-utils";

export const EXOMESH_RUN_REL_PATH = "docs/logging/last_exomesh_run.json";
export const EXOMESH_RUN_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../docs/logging/last_exomesh_run.json",
);

export interface ExomeshRunPayload {
  event: "EXOMESH_AGENTIC_GUARD_DEMO";
  timestamp: string;
  scenarios: Eip1193ScenarioJsonResult[];
}

export function saveExomeshRunPayload(scenarios: Eip1193ScenarioJsonResult[]): void {
  const payload: ExomeshRunPayload = {
    event: "EXOMESH_AGENTIC_GUARD_DEMO",
    timestamp: getDemoPersistTimestamp(),
    scenarios,
  };
  mkdirSync(dirname(EXOMESH_RUN_PATH), { recursive: true });
  writeFileSync(EXOMESH_RUN_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}
