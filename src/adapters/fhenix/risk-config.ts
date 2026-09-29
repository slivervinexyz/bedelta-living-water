/** Agent risk envelope for confidential ingress (slippage bps + exposure cap). */

export interface RiskConfig {
  /** Max slippage in basis points (aligns with soil / MAX_SLIPPAGE semantics). */
  maxSlippageBps: number;
  /** Optional notional cap for intent sizing (USD). */
  maxIntentExposureUsd?: number;
}

export interface ConfidentialPolicyLimit {
  maxSlippageBps: number;
}
