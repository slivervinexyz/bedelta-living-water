import { sanitizeSessionKeyForMasterWalletTrading } from "../../execution-types";
import { fetchHlTestnetPerpsMargin } from "../marginChecker";
import { OnChainFillFailedError } from "../../hl-order-response";
import {
  HL_AGENT_L2_INDEX_MAX_ATTEMPTS,
  HL_AGENT_L2_INDEX_POLL_MS,
  HL_SESSION_KEY_TTL_MS,
  type SessionKeyContext,
} from "./agentRegister-types";
import { isSessionKeyAgentRegisteredOnL2 } from "./agentRegister-query";

export function buildReusedSessionKeyContext(
  agentAddress: string,
  validUntilMs: number | null,
  masterWalletAddress: string,
  nowMs = Date.now(),
): SessionKeyContext {
  const expiresAt =
    validUntilMs != null && validUntilMs > nowMs
      ? validUntilMs
      : nowMs + HL_SESSION_KEY_TTL_MS;
  return sanitizeSessionKeyForMasterWalletTrading(
    {
      agentAddress: agentAddress.toLowerCase(),
      expiresAt,
      masterWalletAddress: masterWalletAddress.toLowerCase(),
    },
    masterWalletAddress,
  );
}

/** Poll extraAgents + clearinghouseState until L2 indexes the approved agent. */
export async function awaitAgentIndexedOnL2(
  masterWalletAddress: string,
  agentAddress: string,
  options: {
    fetchFn?: typeof fetch;
    infoUrl?: string;
    maxAttempts?: number;
    intervalMs?: number;
  } = {},
): Promise<void> {
  const fetchFn = options.fetchFn ?? fetch;
  const maxAttempts = options.maxAttempts ?? HL_AGENT_L2_INDEX_MAX_ATTEMPTS;
  const intervalMs = options.intervalMs ?? HL_AGENT_L2_INDEX_POLL_MS;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const registered = await isSessionKeyAgentRegisteredOnL2(
      masterWalletAddress,
      agentAddress,
      { fetchFn, infoUrl: options.infoUrl },
    );
    if (registered) {
      const margin = await fetchHlTestnetPerpsMargin(masterWalletAddress, fetchFn);
      if (margin.apiOk) return;
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw new OnChainFillFailedError(
    `L2 agent ${agentAddress} not linked to master ${masterWalletAddress} after ${maxAttempts} polls`,
  );
}
