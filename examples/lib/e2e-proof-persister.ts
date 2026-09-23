/** E2E execution proof JSON builder + persister. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { E2E_PROOF_PATH, type E2eDemoMode } from "./e2e-demo-constants";
import { buildE2eCapitalInvariant, computeE2eFinancialLedger } from "./e2e-financial-accounting";
import { formatWasmP50BandStatus } from "./e2e-wasm-bench";
import type { E2ePipelineResult, E2eProofPayload } from "./e2e-demo-types";

export function buildE2eProofPayload(mode: E2eDemoMode, steps: E2ePipelineResult): E2eProofPayload {
  const { s1, s2, s3, s4, s5, pipelineSteps } = steps;
  const ledger = computeE2eFinancialLedger();
  const payload: E2eProofPayload = {
    event: "GRANT_E2E_EXOMESH_DEMO",
    mode,
    pipelineSteps,
    steps: {
      "1_verifyAgentIntent": {
        ok: s1.ok,
        wasmUsed: s1.wasmUsed,
        deadmanOk: s1.deadmanOk,
        wasmHotPathUs: Number(s1.wasmHotPathUs.toFixed(2)),
        wasmP50Us: Number(s1.wasmP50Us.toFixed(2)),
        wasmP50BandStatus: formatWasmP50BandStatus(s1.wasmP50Us),
        nodeE2eRttUs: Number(s1.nodeE2eRttUs.toFixed(2)),
      },
      "2_robinhoodUnidirectionalEscort": {
        ok: s2.outboundOk && s2.inboundBlocked,
        outboundOk: s2.outboundOk,
        inboundBlocked: s2.inboundBlocked,
        capitalLabel: s2.capitalLabel,
      },
      "3_gmxGmPoolDeposit": {
        ok: true,
        gmDepositUsd: ledger.gmxDepositUsd,
        ethLongExposureUsd: ledger.gmxEffectiveLongUsd,
        underweightSide: s3.underweightSide,
        uiFeeBps: s3.uiFeeBps,
        uiFeeReceiver: s3.uiFeeReceiver,
        payloadRef: s3.payloadRef,
      },
      "4_hlSessionKeyHedge": {
        ok: s4.ok,
        dryRun: s4.dryRun,
        notionalUsd: s4.notionalUsd,
        ethShortSize: s4.ethShortSize,
        oid: s4.oid,
        detail: s4.detail,
      },
    },
    capitalInvariant: buildE2eCapitalInvariant(),
    timestamp: new Date().toISOString(),
  };
  if (pipelineSteps === 5 && s5) {
    payload.steps["5_r20PanicFlash"] = {
      ok: s5.r20Locked,
      severTarget: s5.severTarget,
      cancelCount: s5.cancelCount,
      closeCount: s5.closeCount,
      withinBudget: s5.withinBudget,
    };
  }
  return payload;
}

export function saveE2eProof(payload: E2eProofPayload): string {
  mkdirSync(dirname(E2E_PROOF_PATH), { recursive: true });
  writeFileSync(E2E_PROOF_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return E2E_PROOF_PATH;
}

export function evaluateE2ePipelineOk(steps: E2ePipelineResult): boolean {
  const { s1, s2, s4, s5, pipelineSteps } = steps;
  const coreOk = Boolean(
    s1.ok && s1.deadmanOk && s2.outboundOk && s2.inboundBlocked && s4.ok,
  );
  if (pipelineSteps === 4) return coreOk;
  return coreOk && Boolean(s5?.r20Locked && s5?.withinBudget);
}
