import type { SessionKeyContext } from "../../execution-types";

export {
  extractHlExchangeErrorDetail,
  isHlAgentAlreadyUsedError,
  isHlTelemetryFallbackError,
  isHlUserWalletMissingError,
} from "../agentRegisterErrors";

export const HL_AGENT_L2_INDEX_DELAY_MS = 1_500;
export const HL_AGENT_L2_INDEX_MAX_ATTEMPTS = 5;
export const HL_AGENT_L2_INDEX_POLL_MS = 1_000;
export const HL_AGENT_REGISTRATION_TIMEOUT_MS = 10_000;
export const HL_SESSION_KEY_TTL_MS = 24 * 60 * 60 * 1000;

export interface HlExtraAgentRecord {
  name: string;
  address: string;
  validUntil: number | null;
}

export type { SessionKeyContext };
