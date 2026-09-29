#!/usr/bin/env tsx
/**
 * Delta-Neutral Multi-Venue Escort Demo — 4-step institutional trade lifecycle (grant auditor CLI).
 *
 * Usage:
 *   pnpm demo:delta-neutral
 *   pnpm demo:delta-neutral --zerodev=on   # default — Kernel v3 AA + ERC-7715/7710
 *   pnpm demo:delta-neutral --zerodev=off  # native EIP-1193 signer
 *   pnpm demo:delta-neutral --json
 *   pnpm demo:delta-neutral --hedge-live
 *   pnpm demo:delta-neutral --livingwater
 *   pnpm demo:delta-neutral --trip
 *   pnpm demo:delta-neutral --unwind
 */
import { E2E_PROOF_REL_PATH, IS_E2E_UNWIND_MODE, parseE2eMode } from "../examples/lib/e2e-demo-constants";
import {
  logDeltaNeutralZeroDevState,
  resolveDeltaNeutralZeroDevState,
} from "../examples/lib/delta-neutral-zerodev";
import {
  saveDeltaNeutralRunPayload,
  type DeltaNeutralRunPayload,
} from "../examples/lib/delta-neutral-run-persister";
import {
  e2eLog,
  logE2eHeaderClock,
  logE2eHeaderMode,
  logE2ePipelineRoadmap,
  paintE2eBanner,
  printE2eSummaryHud,
} from "../examples/lib/e2e-hud-renderer";
import {
  buildE2eProofPayload,
  evaluateE2ePipelineOk,
  saveE2eProof,
} from "../examples/lib/e2e-proof-persister";
import { runE2ePipeline, runE2eTripIntercept } from "../examples/lib/e2e-steps-runner";
import { IS_LIVINGWATER_MODE, IS_TRIP_MODE, wrapDemoExecution } from "../examples/lib/demo-harness";
import { isDemoJsonArgv, releaseDemoStdin } from "../examples/lib/demo-utils";
import { resetProbes } from "./_shared/santenmoku-stress-probes";

function withSilentConsole<T>(fn: () => T | Promise<T>): Promise<T> {
  const log = console.log;
  console.log = () => {};
  return Promise.resolve(fn()).finally(() => {
    console.log = log;
  });
}

wrapDemoExecution(async ({ nowMs, at }) => {
  const jsonMode = isDemoJsonArgv();
  const mode = parseE2eMode(process.argv.slice(2));
  const timestamp = new Date(nowMs).toISOString();
  const zerodev = await resolveDeltaNeutralZeroDevState(process.argv.slice(2));

  if (IS_TRIP_MODE) {
    const tripPayload: DeltaNeutralRunPayload = {
      event: "DELTA_NEUTRAL_MULTI_VENUE_DEMO",
      ok: false,
      tripped: true,
      mode,
      timestamp,
      zerodev,
      proof: null,
      tripReason: "FAIL_CLOSED",
    };
    if (jsonMode) {
      saveDeltaNeutralRunPayload(tripPayload);
      process.stdout.write(`${JSON.stringify(tripPayload, null, 2)}\n`);
      releaseDemoStdin();
      return { tripped: true, reason: "FAIL_CLOSED", suppressInterceptBanner: true };
    }
    e2eLog("");
    paintE2eBanner(zerodev);
    logE2eHeaderMode(mode);
    logE2eHeaderClock(IS_LIVINGWATER_MODE);
    logDeltaNeutralZeroDevState(zerodev);
    logE2ePipelineRoadmap();
    if (!IS_LIVINGWATER_MODE) resetProbes(nowMs);
    runE2eTripIntercept(nowMs);
    saveDeltaNeutralRunPayload(tripPayload);
    return { tripped: true, reason: "FAIL_CLOSED" };
  }

  const runPipeline = async () => {
    if (!IS_LIVINGWATER_MODE) resetProbes(nowMs);
    return runE2ePipeline(mode, nowMs, at, { includeUnwind: IS_E2E_UNWIND_MODE });
  };

  const steps = jsonMode
    ? await withSilentConsole(runPipeline)
    : await (async () => {
        e2eLog("");
        paintE2eBanner(zerodev);
        logE2eHeaderMode(mode);
        logE2eHeaderClock(IS_LIVINGWATER_MODE);
        logDeltaNeutralZeroDevState(zerodev);
        logE2ePipelineRoadmap();
        return runPipeline();
      })();

  const proof = buildE2eProofPayload(mode, steps);
  const allOk = evaluateE2ePipelineOk(steps);
  const payload: DeltaNeutralRunPayload = {
    event: "DELTA_NEUTRAL_MULTI_VENUE_DEMO",
    ok: allOk,
    tripped: false,
    mode,
    timestamp,
    zerodev,
    proof,
  };

  if (jsonMode) {
    saveDeltaNeutralRunPayload(payload);
    saveE2eProof(proof);
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    releaseDemoStdin();
    if (!allOk) process.exitCode = 1;
    return { tripped: false, suppressInterceptBanner: true };
  }

  e2eLog("");
  saveE2eProof(proof);
  saveDeltaNeutralRunPayload(payload);
  printE2eSummaryHud(proof, E2E_PROOF_REL_PATH, allOk);
  releaseDemoStdin();

  if (!allOk) {
    process.exitCode = 1;
    return;
  }
  process.exit(0);
});
