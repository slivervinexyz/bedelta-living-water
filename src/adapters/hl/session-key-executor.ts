/**
 * Hyperliquid Session Key executor — TRADE_ONLY orders with Dynamic Max SL weld.
 * Workers-safe: uses hl/execution pipeline + injectable Eip712Signer (no ethers on hot path).
 */

export * from "./session-key-executor/types";
export { executeHlSessionKeyOrder } from "./session-key-executor/execute-order";
export { flattenHlLeg, cancelHlOrder } from "./session-key-executor/flatten-cancel";

export { HL_SESSION_KEY_AGENT_NAME } from "./auth";
export {
  HL_AGENT_L2_INDEX_DELAY_MS,
  HL_AGENT_REGISTRATION_TIMEOUT_MS,
  extractHlExchangeErrorDetail,
  isHlTelemetryFallbackError,
  isHlUserWalletMissingError,
  registerApprovedAgentOnHlExchange,
} from "./wallet/agentRegister";
