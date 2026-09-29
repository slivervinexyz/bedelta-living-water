/** E2E Steps 1–5 pipeline orchestrator. */
import type { E2eDemoMode } from "./e2e-demo-constants";
import type { E2ePipelineResult } from "./e2e-demo-types";
import { assertE2eFinancialInvariants, computeE2eFinancialLedger } from "./e2e-financial-accounting";
import { runStep1ExoMeshPreExec, runStep2RobinhoodEscort, runStep3GmxUnderweightRebalance } from "./e2e-steps-early";
import { runStep4HlSessionHedge, runStep5R20PanicFlash } from "./e2e-steps-late";
import { runE2eStep1TripIntercept } from "./e2e-trip-intercept";

export type { E2ePipelineResult } from "./e2e-demo-types";

export interface RunE2ePipelineOptions {
  includeUnwind?: boolean;
}

export function runE2eTripIntercept(demoNowMs: number): void {
  runE2eStep1TripIntercept(demoNowMs);
}

export async function runE2ePipeline(
  mode: E2eDemoMode,
  demoNowMs: number,
  demoAt: Date,
  options: RunE2ePipelineOptions = {},
): Promise<E2ePipelineResult> {
  const s1 = runStep1ExoMeshPreExec(demoNowMs);
  const s2 = runStep2RobinhoodEscort(demoNowMs);
  const s3 = runStep3GmxUnderweightRebalance();
  const s4 = await runStep4HlSessionHedge(mode);
  assertE2eFinancialInvariants(computeE2eFinancialLedger());
  if (!options.includeUnwind) {
    return { pipelineSteps: 4, s1, s2, s3, s4 };
  }
  const s5 = runStep5R20PanicFlash(demoAt);
  return { pipelineSteps: 5, s1, s2, s3, s4, s5 };
}
