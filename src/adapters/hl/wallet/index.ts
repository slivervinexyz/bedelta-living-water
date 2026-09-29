/** HL browser wallet micro-modules — clean architecture barrel. */
export type { EthereumProvider } from "./types";

export {
  HL_HYPEREVM_TESTNET_CHAIN_ID_HEX,
  HL_HYPEREVM_TESTNET_CHAIN_CONFIG,
  fetchWalletChainIdHex,
  ensureHyperEvmTestnetChain,
  prepareWalletForHlSigning,
} from "./chainIdResolver";

export { createBrowserEip712Signer } from "./eip712BrowserSigner";

export {
  HL_AGENT_L2_INDEX_DELAY_MS,
  HL_AGENT_L2_INDEX_MAX_ATTEMPTS,
  HL_AGENT_L2_INDEX_POLL_MS,
  HL_AGENT_REGISTRATION_TIMEOUT_MS,
  HL_SESSION_KEY_TTL_MS,
  awaitAgentIndexedOnL2,
  buildReusedSessionKeyContext,
  fetchHlExtraAgents,
  findActiveRegisteredSessionKeyAgent,
  isHlAgentAlreadyUsedError,
  isSessionKeyAgentRegisteredOnL2,
  registerAgentWithL2IndexingAwait,
  registerApprovedAgentOnHlExchange,
  extractHlExchangeErrorDetail,
  isHlTelemetryFallbackError,
  isHlUserWalletMissingError,
} from "./agentRegister";

export {
  bootstrapBrowserSessionKeyAgent,
  type SessionKeyBootstrapResult,
} from "./agentRegisterLegacy";

export {
  buildClearinghouseStateRequest,
  fetchHlTestnetPerpsMargin,
  formatMarginLowProceedWarnLog,
  formatMarginPreflightBypassLog,
  formatMarginPreflightPassLog,
  isPerpsEquityFunded,
  parseHlPerpsMarginSnapshot,
  runNonBlockingMarginPreflight,
  shouldWarnMarginPreflight,
  type HlClearinghouseState,
  type HlPerpsMarginSnapshot,
  type MarginPreflightLogEntry,
} from "./marginChecker";

export {
  shouldBlockLive5TxForMargin,
  fetchHlTestnetMarginUsd,
  parseHlMarginUsd,
  formatInsufficientTestnetMarginWarn,
  hasInsufficientTestnetMargin,
  InsufficientTestnetMarginError,
} from "./marginCheckerLegacy";

export {
  createBrowserSessionKeyMaterial,
  loadBrowserSessionKeyMaterial,
  type BrowserSessionKeyMaterial,
} from "./browserSessionKeyMaterial";

export {
  deriveBrowserSessionKeyAgentAddress,
  fetchUserFills,
  formatOrderSizeLabel,
  isRealFillHash,
  L2_FILL_POLL_INTERVAL_MS,
  L2_FILL_POLL_MAX_ATTEMPTS,
  L2_FILL_POLL_TIMEOUT_MS,
  resolveTestnetAssetMeta,
  waitForNewFill,
} from "./sessionOrderFillSync";

export {
  completeTelemetryFallbackBatch,
  soilAuditSummary,
} from "./sessionOrderFallback";

export { executeSequentialLive5TxOrders } from "./sessionOrderExecutor";
export { submitSingleLive5TxOrder } from "./sessionOrderSingle";
export { bootstrapLive5TxSession } from "./live5TxSessionBootstrap";
export { resolveLive5TxSoilAudit, formatSoilPassLog } from "./live5TxSoilGate";
export { orchestrateBrowserLive5Tx } from "./live5TxOrchestrator";

export type {
  BrowserLive5TxLogEntry,
  BrowserLive5TxProgress,
} from "./sessionOrderTypes";

export type { Live5TxOrchestratorOptions } from "./live5TxOrchestrator";
export type { ExecuteSequentialLive5TxOrdersInput } from "./sessionOrderExecutor";
