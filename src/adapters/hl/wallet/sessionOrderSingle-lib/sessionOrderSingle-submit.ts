import { createSessionKeyAgent } from "../../auth";
import { executeHlSessionKeyOrder } from "../../session-key-executor";
import { unwrapHlError } from "../../error-unwrap";
import { sanitizeSessionKeyForMasterWalletTrading } from "../../execution-types";
import type { IntentLeg } from "../../../../core/intent-ledger";
import { HL_LIVE_MIN_NOTIONAL_USD } from "../../../../data/verified-5tx";
import {
  formatLive5TxRejectLog,
  formatLive5TxSubmitLog,
  formatSessionKeyAgentRegistrationLog,
} from "../../../../lib/gui-bridge/section1-hud-log-formatters";
import { buildLive5TxFillRecord } from "../sessionOrderFillRecord";
import {
  extractHlExchangeErrorDetail,
  isHlTelemetryFallbackError,
  registerAgentWithL2IndexingAwait,
} from "../agentRegister";
import { waitForNewFill } from "../sessionOrderFillSync";
import {
  ON_CHAIN_FILL_FAILED_PREFIX,
  OnChainFillFailedError,
} from "../on-chain-fill-errors";
import { buildLive5TxOrderWirePlan } from "../sessionOrderWire";
import { HL_TESTNET_EXCHANGE_URL } from "../../../../config/constants";
import type {
  SubmitSingleLive5TxOrderInput,
  SubmitSingleLive5TxOrderResult,
} from "./sessionOrderSingle-types";

const SESSION_KEY_TTL_MS = 24 * 60 * 60 * 1000;

function resolveRawHlL2Error(err: unknown, fallback?: string): string {
  const detail = extractHlExchangeErrorDetail(err);
  if (detail && detail !== "UNKNOWN") return detail;
  if (fallback) return fallback;
  return unwrapHlError(err);
}

function failOnChain(
  index: number,
  reason: string,
  progress: SubmitSingleLive5TxOrderInput["progress"],
): { ok: false; error: Error } {
  progress.onLog({
    level: "ERROR",
    message: formatLive5TxRejectLog(index, reason),
  });
  return { ok: false, error: new OnChainFillFailedError(reason) };
}

async function retryApproveAgentRegistration(
  input: SubmitSingleLive5TxOrderInput,
): Promise<void> {
  const agentAddress = input.sessionKeyCtx.agentAddress;
  input.progress.onLog({
    level: "INFO",
    message: `⚡ [SESSION_KEY] L2 agent unlink detected — retrying approveAgent for ${agentAddress.slice(0, 6)}…${agentAddress.slice(-4)}`,
  });
  const agentResult = await createSessionKeyAgent(
    input.masterSigner,
    agentAddress,
    SESSION_KEY_TTL_MS,
    {
      isTestnet: true,
      gate: { signingChannelOpen: true, hardlock: false },
      signatureChainId: input.walletChainIdHex,
    },
  );
  await registerAgentWithL2IndexingAwait(agentResult, {
    fetchFn: input.fetchFn,
    exchangeUrl: HL_TESTNET_EXCHANGE_URL,
    masterWalletAddress: input.walletAddress,
    onRegisterStart: (addr) => {
      input.progress.onLog({
        level: "INFO",
        message: formatSessionKeyAgentRegistrationLog(addr),
      });
    },
  });
}

/** Submit one IoC market leg, poll L2 fill hash, build verified record. */
export async function submitSingleLive5TxOrder(
  input: SubmitSingleLive5TxOrderInput,
): Promise<SubmitSingleLive5TxOrderResult> {
  const orderNotionalUsd = Math.max(input.notionalUsd, HL_LIVE_MIN_NOTIONAL_USD);
  const plan = buildLive5TxOrderWirePlan(
    input.soilAudit,
    input.side,
    orderNotionalUsd,
    input.szDecimals,
  );
  input.progress.onLog({
    level: "INFO",
    message: formatLive5TxSubmitLog(input.index, input.side, input.symbol, plan.sizeLabel),
  });
  const submitStartedAt = performance.now();
  input.progress.onOrderSubmitted?.(input.index, input.side, 0);

  const leg: IntentLeg = {
    venue: "HL",
    side: input.side,
    sizeUsd: orderNotionalUsd,
    symbol: input.symbol,
  };
  const sessionKeyCtx = sanitizeSessionKeyForMasterWalletTrading(
    input.sessionKeyCtx,
    input.walletAddress,
  );
  const execOpts = {
    signer: input.agentSigner,
    sessionKey: sessionKeyCtx,
    dryRun: false as const,
    isTestnet: true,
    systemState: input.systemState,
    limitPx: plan.orderLimitPx,
    preTrade: plan.preTrade,
    marketIoc: true,
    szDecimals: input.szDecimals,
    resolveAssetIndex: () => input.assetIndex,
    signatureChainId: input.walletChainIdHex,
  };

  if (
    sessionKeyCtx.masterWalletAddress.toLowerCase() !==
    input.walletAddress.toLowerCase()
  ) {
    return failOnChain(
      input.index,
      `Session key master wallet mismatch (${sessionKeyCtx.masterWalletAddress} ≠ ${input.walletAddress})`,
      input.progress,
    );
  }

  let exec;
  try {
    exec = await executeHlSessionKeyOrder(leg, execOpts);
  } catch (err) {
    return failOnChain(
      input.index,
      resolveRawHlL2Error(err),
      input.progress,
    );
  }

  if (!exec.ok) {
    const reason = unwrapHlError(exec.reason ?? "UNKNOWN");
    if (isHlTelemetryFallbackError(reason)) {
      try {
        await retryApproveAgentRegistration(input);
        exec = await executeHlSessionKeyOrder(leg, execOpts);
      } catch (retryErr) {
        return failOnChain(
          input.index,
          resolveRawHlL2Error(retryErr),
          input.progress,
        );
      }
    }
    if (!exec.ok) {
      return failOnChain(
        input.index,
        unwrapHlError(exec.reason ?? reason),
        input.progress,
      );
    }
  }

  let latest;
  try {
    latest = await waitForNewFill(
      input.walletAddress,
      input.symbol,
      input.seenFillHashes,
      input.fetchFn,
    );
  } catch (err) {
    const failReason =
      err instanceof OnChainFillFailedError
        ? err.message.slice(ON_CHAIN_FILL_FAILED_PREFIX.length + 1)
        : resolveRawHlL2Error(err);
    return failOnChain(input.index, failReason, input.progress);
  }

  const latencyMs = Math.max(1, Math.round(performance.now() - submitStartedAt));
  input.seenFillHashes.add(String(latest.hash).trim());
  const record = buildLive5TxFillRecord({
    index: input.index,
    side: input.side,
    symbol: input.symbol,
    notionalUsd: orderNotionalUsd,
    soilAudit: input.soilAudit,
    latest,
    orderLimitPx: plan.orderLimitPx,
    w01DepthRefillBps: plan.w01DepthRefillBps,
  });
  input.progress.onFillConfirmed?.(input.index, input.side, record.txHash, latencyMs);
  return { ok: true, record };
}
