/** E2E pipeline step result types (shared across runner / proof / HUD). */
import type { E2eDemoMode } from "./e2e-demo-constants";

export interface E2eStep1Result {
  ok: boolean;
  wasmUsed: boolean;
  wasmHotPathUs: number;
  wasmP50Us: number;
  nodeE2eRttUs: number;
  deadmanOk: boolean;
}

export interface E2eStep2Result {
  outboundOk: boolean;
  inboundBlocked: boolean;
  capitalLabel: string;
}

export interface E2eStep3Result {
  uiFeeReceiver: string;
  uiFeeBps: number;
  underweightSide: string;
  payloadRef: string;
}

export interface E2eStep4Result {
  ok: boolean;
  dryRun: boolean;
  notionalUsd: number;
  oid: number | null;
  detail: string;
  ethShortSize: string;
}

export interface E2eStep5Result {
  r20Locked: boolean;
  severTarget: string | null;
  cancelCount: number;
  closeCount: number;
  withinBudget: boolean;
}

export interface E2ePipelineResult {
  pipelineSteps: 4 | 5;
  s1: E2eStep1Result;
  s2: E2eStep2Result;
  s3: E2eStep3Result;
  s4: E2eStep4Result;
  s5?: E2eStep5Result;
}

export interface E2eProofPayload {
  event: string;
  mode: E2eDemoMode;
  pipelineSteps: number;
  steps: {
    "1_verifyAgentIntent": {
      ok: boolean;
      wasmUsed: boolean;
      deadmanOk: boolean;
      wasmHotPathUs: number;
      wasmP50Us: number;
      wasmP50BandStatus: string;
      nodeE2eRttUs: number;
    };
    "2_robinhoodUnidirectionalEscort": {
      ok: boolean;
      outboundOk: boolean;
      inboundBlocked: boolean;
      capitalLabel: string;
    };
    "3_gmxGmPoolDeposit": {
      ok: boolean;
      gmDepositUsd: number;
      ethLongExposureUsd: number;
      underweightSide: string;
      uiFeeBps: number;
      uiFeeReceiver: string;
      payloadRef: string;
    };
    "4_hlSessionKeyHedge": {
      ok: boolean;
      dryRun: boolean;
      notionalUsd: number;
      ethShortSize: string;
      oid: number | null;
      detail: string;
    };
    "5_r20PanicFlash"?: {
      ok: boolean;
      severTarget: string | null;
      cancelCount: number;
      closeCount: number;
      withinBudget: boolean;
    };
  };
  capitalInvariant: {
    initialUsd: number;
    finalUsd: number;
    principalUsd: number;
    lostUsd: number;
    token: string;
    gmxGmDepositUsd: number;
    hlMarginUsd: number;
    gmxLongExposureUsd: number;
    hlShortExposureUsd: number;
    builderFeeUsd: number;
    protocolTreasuryRebateUsd: number;
    protocolTreasuryReceiver: string;
    deltaNetEth: string;
  };
  timestamp: string;
}
