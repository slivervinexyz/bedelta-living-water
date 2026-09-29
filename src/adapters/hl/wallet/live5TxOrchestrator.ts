import type { Eip712Signer } from "../eip712-signer";
import { createBrowserEip712Signer } from "./eip712BrowserSigner";
import type { EthereumProvider } from "./types";
import { runNonBlockingMarginPreflight } from "./marginChecker";
import { createBrowserSessionKeyMaterial } from "./browserSessionKeyMaterial";
import { resolveTestnetAssetMeta } from "./sessionOrderFillSync";
import { executeSequentialLive5TxOrders } from "./sessionOrderExecutor";
import { bootstrapLive5TxSession } from "./live5TxSessionBootstrap";
import { formatSoilPassLog, resolveLive5TxSoilAudit } from "./live5TxSoilGate";
import {
  LIVE_5TX_ACCOUNT_BALANCE_USD,
  type BrowserLive5TxProgress,
} from "./sessionOrderTypes";
import { HL_TESTNET_EXCHANGE_URL } from "../../../config/constants";
import { updateSystemState } from "../../../core/state";
import {
  VERIFIED_5TX_NOTIONAL_USD,
  VERIFIED_5TX_SYMBOL,
  type Verified5TxResults,
} from "../../../data/verified-5tx";
import { sanitizeSessionKeyForMasterWalletTrading } from "../execution-types";
import { formatSessionKeyApprovalRequestLog } from "../../../lib/gui-bridge/section1-hud-log-formatters";
import { isSessionKeyAgentRegisteredOnL2 } from "./agentRegister";

export interface Live5TxOrchestratorOptions {
  walletAddress: string;
  provider: EthereumProvider;
  signer?: Eip712Signer;
  fetchFn?: typeof fetch;
  symbol?: string;
  notionalUsd?: number;
}

/** SSOT orchestration for browser Live 5-TX — strict on-chain only, no telemetry fallback. */
export async function orchestrateBrowserLive5Tx(
  opts: Live5TxOrchestratorOptions,
  progress: BrowserLive5TxProgress,
): Promise<Verified5TxResults> {
  const fetchFn = opts.fetchFn ?? fetch;
  const symbol = opts.symbol ?? VERIFIED_5TX_SYMBOL;
  /** 5-TX action bar — always $1K testnet legs ($12 notional), never tier-display sizing. */
  const notionalUsd = VERIFIED_5TX_NOTIONAL_USD;
  const walletAddress = opts.walletAddress;
  const masterSigner =
    opts.signer ?? createBrowserEip712Signer(walletAddress, opts.provider);
  const keyMaterial = createBrowserSessionKeyMaterial(walletAddress);
  const agentAddress = keyMaterial.agentAddress;

  updateSystemState({
    patch: {
      accountBalanceUsd: LIVE_5TX_ACCOUNT_BALANCE_USD,
      currentCri: 100,
      signingChannelOpen: true,
      sessionKeyMode: "TRADE_ACTIVE",
      sessionKeyStatus: "OK",
      hardlock: false,
    },
  });

  progress.onLog({ level: "INFO", message: formatSessionKeyApprovalRequestLog() });
  progress.onLog({
    level: "INFO",
    message: `⚡ [SESSION_KEY] locked agent ${agentAddress.slice(0, 6)}…${agentAddress.slice(-4)} for approveAgent + L1 orders`,
  });
  for (const entry of await runNonBlockingMarginPreflight(walletAddress, fetchFn)) {
    progress.onLog(entry);
  }

  const registeredAgent = await isSessionKeyAgentRegisteredOnL2(
    walletAddress,
    agentAddress,
    { fetchFn },
  );
  if (registeredAgent) {
    progress.onLog({
      level: "INFO",
      message: `LIVE_5TX: reusing active Session Key on L2 (${agentAddress.slice(0, 6)}…${agentAddress.slice(-4)}) — approveAgent skipped`,
    });
  }

  const session = await bootstrapLive5TxSession({
    masterSigner,
    provider: opts.provider,
    walletAddress,
    agentAddress,
    fetchFn,
    progress,
  });

  progress.onLog({
    level: "INFO",
    message: `HL_EXCHANGE: armed for ${HL_TESTNET_EXCHANGE_URL} · 5 sequential IoC market orders`,
  });

  const soilAudit = await resolveLive5TxSoilAudit(symbol, notionalUsd, fetchFn);
  progress.onLog({
    level: "INFO",
    message: formatSoilPassLog(symbol, soilAudit.probe.depthUsd),
  });

  const { assetIndex, szDecimals } = await resolveTestnetAssetMeta(symbol, fetchFn);
  const systemState = updateSystemState({
    patch: {
      accountBalanceUsd: LIVE_5TX_ACCOUNT_BALANCE_USD,
      currentCri: 100,
      signingChannelOpen: true,
      sessionKeyMode: "TRADE_ACTIVE",
      sessionKeyStatus: "OK",
    },
  });

  progress.onLog({
    level: "INFO",
    message: `LIVE_5TX: master wallet ${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)} · $1K testnet tier · $${notionalUsd}/leg`,
  });

  return executeSequentialLive5TxOrders({
    walletAddress,
    symbol,
    notionalUsd,
    soilAudit,
    masterSigner,
    agentSigner: keyMaterial.agentSigner,
    sessionKeyCtx: sanitizeSessionKeyForMasterWalletTrading(
      session.sessionKeyCtx,
      walletAddress,
    ),
    systemState,
    walletChainIdHex: session.walletChainIdHex,
    assetIndex,
    szDecimals,
    fetchFn,
    progress,
  });
}
