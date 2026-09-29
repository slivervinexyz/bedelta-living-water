/** @deprecated Import from `./wallet/agentRegister` — backward-compatible re-export. */
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
  registerAgentWithL2IndexingAwait,
  registerApprovedAgentOnHlExchange,
  isSessionKeyAgentRegisteredOnL2,
  extractHlExchangeErrorDetail,
  isHlTelemetryFallbackError,
  isHlUserWalletMissingError,
} from "./wallet/agentRegister";

export {
  bootstrapBrowserSessionKeyAgent,
  type SessionKeyBootstrapResult,
} from "./wallet/agentRegisterLegacy";
