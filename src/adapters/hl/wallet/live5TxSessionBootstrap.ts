import type { Eip712Signer } from "../eip712-signer";
import { chainIdHexToNumber, createSessionKeyAgent } from "../auth";
import type { SessionKeyContext } from "../execution-types";
import { sessionKeyFromAgentResult } from "../execution-types";
import {
  buildReusedSessionKeyContext,
  extractHlExchangeErrorDetail,
  isSessionKeyAgentRegisteredOnL2,
  registerAgentWithL2IndexingAwait,
} from "./agentRegister";
import { prepareWalletForHlSigning } from "./chainIdResolver";
import type { EthereumProvider } from "./types";
import { HL_TESTNET_EXCHANGE_URL } from "../../../config/constants";
import {
  formatLive5TxActiveWalletLog,
  formatSessionKeyApprovalSuccessLog,
  formatSessionKeyAgentRegistrationLog,
} from "../../../lib/gui-bridge/section1-hud-log-formatters";
import { truncateSessionKeyWallet } from "../../../data/verified-5tx";
import type { BrowserLive5TxProgress } from "./sessionOrderTypes";

const SESSION_KEY_TTL_MS = 24 * 60 * 60 * 1000;

function formatSessionKeyReuseSkipLog(agentAddress: string): string {
  return `⚡ [SESSION_KEY] Agent ${truncateSessionKeyWallet(agentAddress)} already registered on L2 — skipping approveAgent POST`;
}

export interface Live5TxSessionBootstrapResult {
  sessionKeyCtx: SessionKeyContext;
  walletChainIdHex: string;
}

/** Wallet network prep, mandatory ApproveAgent EIP-712 sign, L2 POST + indexing delay. */
export async function bootstrapLive5TxSession(args: {
  masterSigner: Eip712Signer;
  provider: EthereumProvider;
  walletAddress: string;
  agentAddress: string;
  fetchFn: typeof fetch;
  progress: BrowserLive5TxProgress;
}): Promise<Live5TxSessionBootstrapResult> {
  args.progress.onLog({
    level: "INFO",
    message: "⚡ [NETWORK] Ensuring HyperEVM Testnet (chainId 998)…",
  });
  const walletChainIdHex = await prepareWalletForHlSigning(args.provider);
  args.progress.onLog({
    level: "INFO",
    message: formatLive5TxActiveWalletLog(
      args.walletAddress,
      chainIdHexToNumber(walletChainIdHex),
    ),
  });

  const registeredAgent = await isSessionKeyAgentRegisteredOnL2(
    args.walletAddress,
    args.agentAddress,
    { fetchFn: args.fetchFn },
  );
  if (registeredAgent) {
    args.progress.onLog({
      level: "INFO",
      message: formatSessionKeyReuseSkipLog(args.agentAddress),
    });
    args.progress.onSessionBound?.();
    return {
      sessionKeyCtx: buildReusedSessionKeyContext(
        args.agentAddress,
        registeredAgent.validUntil,
        args.walletAddress,
      ),
      walletChainIdHex,
    };
  }

  args.progress.onLog({
    level: "INFO",
    message: "⚡ [SESSION_KEY] awaiting eth_signTypedData_v4 popup...",
  });

  try {
    const agentResult = await createSessionKeyAgent(
      args.masterSigner,
      args.agentAddress,
      SESSION_KEY_TTL_MS,
      {
        isTestnet: true,
        gate: { signingChannelOpen: true, hardlock: false },
        signatureChainId: walletChainIdHex,
      },
    );
    const sessionKeyCtx = sessionKeyFromAgentResult(agentResult, args.walletAddress);
    args.progress.onLog({
      level: "SUCCESS",
      message: formatSessionKeyApprovalSuccessLog(agentResult.agentAddress),
    });
    const reg = await registerAgentWithL2IndexingAwait(agentResult, {
      fetchFn: args.fetchFn,
      exchangeUrl: HL_TESTNET_EXCHANGE_URL,
      masterWalletAddress: args.walletAddress,
      onRegisterStart: (addr) => {
        args.progress.onLog({
          level: "INFO",
          message: formatSessionKeyAgentRegistrationLog(addr),
        });
      },
    });
    if (reg.skippedRegistration) {
      args.progress.onLog({
        level: "INFO",
        message: formatSessionKeyReuseSkipLog(agentResult.agentAddress),
      });
    }
    args.progress.onSessionBound?.();
    return { sessionKeyCtx, walletChainIdHex };
  } catch (err) {
    const detail = extractHlExchangeErrorDetail(err);
    args.progress.onLog({
      level: "ERROR",
      message: `❌ [SESSION_KEY] REJECTED | HL L2: ${detail}`,
    });
    throw new Error(detail);
  }
}
