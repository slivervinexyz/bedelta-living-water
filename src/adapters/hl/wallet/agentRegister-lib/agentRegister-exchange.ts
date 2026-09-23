import { HL_TESTNET_EXCHANGE_URL } from "../../../../config/constants";
import {
  splitHyperliquidSignature,
  type SessionKeyAgentResult,
} from "../../auth";
import { postExchangeRequest } from "../../execution-transport";
import type { HyperliquidExchangeResponse } from "../../execution-types";
import { OnChainFillFailedError } from "../../hl-order-response";
import {
  extractHlExchangeErrorDetail,
  isHlAgentAlreadyUsedError,
} from "../agentRegisterErrors";
import {
  HL_AGENT_REGISTRATION_TIMEOUT_MS,
} from "./agentRegister-types";
import {
  withValidApproveAgentName,
} from "./agentRegister-query";
import { awaitAgentIndexedOnL2 } from "./agentRegister-context";

function withFetchTimeout(fetchFn: typeof fetch, timeoutMs: number): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchFn(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };
}

/** POST wallet-signed ApproveAgent to Hyperliquid L2 exchange (testnet default). */
export async function registerApprovedAgentOnHlExchange(
  agentResult: SessionKeyAgentResult,
  options: {
    fetchFn?: typeof fetch;
    exchangeUrl?: string;
    timeoutMs?: number;
  } = {},
): Promise<HyperliquidExchangeResponse> {
  const baseFetch = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? HL_AGENT_REGISTRATION_TIMEOUT_MS;
  const fetchFn = withFetchTimeout(baseFetch, timeoutMs);
  const exchangeUrl = options.exchangeUrl ?? HL_TESTNET_EXCHANGE_URL;
  const action = withValidApproveAgentName(agentResult.action);
  return postExchangeRequest(
    {
      action: action as unknown as Record<string, unknown>,
      nonce: agentResult.nonce,
      signature: splitHyperliquidSignature(agentResult.signature),
    },
    fetchFn,
    exchangeUrl,
  );
}

/** POST ApproveAgent + enforce L2 indexing delay before first live order. */
export async function registerAgentWithL2IndexingAwait(
  agentResult: SessionKeyAgentResult,
  options: {
    masterWalletAddress: string;
    fetchFn?: typeof fetch;
    exchangeUrl?: string;
    onRegisterStart?: (agentAddress: string) => void;
  },
): Promise<{ skippedRegistration?: boolean }> {
  options.onRegisterStart?.(agentResult.agentAddress);
  try {
    await registerApprovedAgentOnHlExchange(agentResult, options);
    await awaitAgentIndexedOnL2(
      options.masterWalletAddress,
      agentResult.agentAddress,
      { fetchFn: options.fetchFn },
    );
    return {};
  } catch (regErr) {
    const regDetail = extractHlExchangeErrorDetail(regErr);
    if (isHlAgentAlreadyUsedError(regDetail)) {
      await awaitAgentIndexedOnL2(
        options.masterWalletAddress,
        agentResult.agentAddress,
        { fetchFn: options.fetchFn },
      );
      return { skippedRegistration: true };
    }
    throw new OnChainFillFailedError(regDetail);
  }
}
