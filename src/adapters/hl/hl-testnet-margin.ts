/** @deprecated Import from `./wallet/marginChecker` — backward-compatible re-export. */
export {
  buildClearinghouseStateRequest,
  fetchHlTestnetPerpsMargin,
  formatMarginLowProceedWarnLog,
  formatMarginPreflightBypassLog,
  formatMarginPreflightPassLog,
  isPerpsEquityFunded,
  parseHlPerpsMarginSnapshot,
  shouldWarnMarginPreflight,
  type HlClearinghouseState,
  type HlPerpsMarginSnapshot,
} from "./wallet/marginChecker";

export {
  shouldBlockLive5TxForMargin,
  fetchHlTestnetMarginUsd,
  parseHlMarginUsd,
  formatInsufficientTestnetMarginWarn,
  hasInsufficientTestnetMargin,
  InsufficientTestnetMarginError,
} from "./wallet/marginCheckerLegacy";
