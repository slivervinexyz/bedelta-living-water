/** Chaos black-swan matrix — shared types. */
export type ChaosGroup = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J";
export type ChaosScenarioId =
  | "oracle_lag_spike"
  | "price_impact_toxicity"
  | "sequencer_down"
  | "malformed_telemetry"
  | ChaosGroup;

export interface ChaosAttackResult {
  scenario: ChaosScenarioId;
  id?: number;
  blocked: boolean;
  trigger: string;
  capitalLossUsd: number;
  crashed: boolean;
  reasons: string[];
  expectedReasonPrefix?: string;
  reasonPrefixMatched?: boolean;
}

export interface ChaosAuditReport {
  blocked: number;
  total: number;
  crashed: number;
  prefixMismatches: number;
  capitalLossUsd: number;
  line: string;
  pass: boolean;
  byScenario: Record<
    ChaosScenarioId,
    { blocked: number; total: number; crashed: number }
  >;
  timestamp: string;
}

export interface GatewayRuleInput {
  oracleUpdatedAtMs?: number;
  l2BlockTimestampMs?: number;
  sequencerAnswer?: number;
  sequencerElapsedSec?: number;
  gmxPenaltyBps?: number;
  depthUsd?: number;
  hlSpot?: number;
  hlPerp?: number;
  dydxPerp?: number;
  l1SurchargeUsd?: number;
  targetYieldUsd?: number;
  estimatedLossUsd?: number;
  accountBalanceUsd?: number;
  criHardlock?: boolean;
  dailyLossUsd?: number;
  dailySlCount?: number;
  orderSizeUsd?: number;
  sagaRetries?: number;
  payload?: string;
  payloadBytes?: number;
  blackSwanSlippage?: number;
  usdcUsd?: number;
  protocolPaused?: boolean;
  driftBlocks?: number;
  timeboostDelayMs?: number;
  skipArm?: boolean;
}
