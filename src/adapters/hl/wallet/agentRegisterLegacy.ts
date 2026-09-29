import type { Eip712Signer } from "../eip712-signer";
import {
  createSessionKeyAgent,
  type SessionKeyAgentResult,
} from "../auth";
import { sessionKeyFromAgentResult, type SessionKeyContext } from "../execution-types";
import {
  registerAgentWithL2IndexingAwait,
} from "./agentRegister";

export interface SessionKeyBootstrapResult {
  agentResult: SessionKeyAgentResult;
  sessionKeyCtx: SessionKeyContext;
  deferTelemetryFallback: boolean;
}

/** @deprecated Use bootstrapLive5TxSession or sign + registerAgentWithL2IndexingAwait. */
export async function bootstrapBrowserSessionKeyAgent(args: {
  signer: Eip712Signer;
  walletAddress: string;
  agentAddress: string;
  sessionKeyTtlMs: number;
  walletChainIdHex: string;
  fetchFn: typeof fetch;
  exchangeUrl?: string;
  onRegisterStart?: (agentAddress: string) => void;
}): Promise<SessionKeyBootstrapResult> {
  const agentResult = await createSessionKeyAgent(
    args.signer,
    args.agentAddress,
    args.sessionKeyTtlMs,
    {
      isTestnet: true,
      gate: { signingChannelOpen: true, hardlock: false },
      signatureChainId: args.walletChainIdHex,
    },
  );
  await registerAgentWithL2IndexingAwait(agentResult, {
    fetchFn: args.fetchFn,
    exchangeUrl: args.exchangeUrl,
    masterWalletAddress: args.walletAddress,
    onRegisterStart: args.onRegisterStart,
  });
  return {
    agentResult,
    sessionKeyCtx: sessionKeyFromAgentResult(agentResult, args.walletAddress),
    deferTelemetryFallback: false,
  };
}
