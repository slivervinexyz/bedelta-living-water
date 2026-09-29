/**
 * @deprecated Import from `../services/exchanges/hyperliquid-adapter` for market data.
 * This module wraps session-key execution (`hyperliquidAdapter.ts`) — not the canonical HL maps adapter.
 */
/**
 * Hyperliquid Session Key bridge — DRY_RUN handler + production signature gates.
 */

import {
  checkSessionKeyValidity,
  executeOrder,
  cancelOrder,
  fetchAccountBalance,
  resolveHyperliquidDryRun,
  type ExecuteOrderInput,
  type HyperliquidAdapterConfig,
  type HyperliquidFillResult,
} from "../services/hyperliquidAdapter";
import type { SessionKeyOrderPayload } from "../services/session-key-adapter";
import {
  buildSessionKeyEip712Stub,
  stubSignSessionKeyPayload,
} from "../services/session-key-adapter";
import { isSessionKeyStubAllowed } from "../services/session-key-adapter-lib/session-key-stub-guard";
import type { SystemState } from "../services/systemState";

export const HL_DRY_RUN_FLAG = "HL_DRY_RUN" as const;

const SESSION_SIG_RE = /^0x[0-9a-f]{64}$/i;

export interface HyperliquidBridgeEnv {
  HL_DRY_RUN?: string;
}

export function resolveDryRunFromEnv(
  env: HyperliquidBridgeEnv = {},
  config: HyperliquidAdapterConfig = {},
  systemState?: SystemState,
): boolean {
  if (env.HL_DRY_RUN === "true" || env.HL_DRY_RUN === "1") return true;
  return resolveHyperliquidDryRun(config, systemState);
}

export function validateSessionKeySignatureFormat(
  signatureHash: string | null | undefined,
): boolean {
  if (!signatureHash) return false;
  return SESSION_SIG_RE.test(signatureHash.trim());
}

/**
 * @deprecated TTL probe only — live signing must use `executeHlSessionKeyOrder`.
 */
export async function validateProductionSessionKeyBridge(
  payload: SessionKeyOrderPayload,
  sessionExpiryTimestamp: number,
  dryRun: boolean,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (dryRun) return { ok: true };

  const ttl = checkSessionKeyValidity(sessionExpiryTimestamp);
  if (!ttl.valid) {
    return { ok: false, reason: "SESSION_KEY_TTL_EXPIRED" };
  }

  if (!isSessionKeyStubAllowed()) {
    return { ok: false, reason: "USE_EXECUTE_HL_SESSION_KEY_ORDER" };
  }

  const signatureHash = await stubSignSessionKeyPayload(
    buildSessionKeyEip712Stub(payload, Date.now(), "0x0"),
  );

  if (!validateSessionKeySignatureFormat(signatureHash)) {
    return { ok: false, reason: "SESSION_KEY_SIGNATURE_FORMAT_INVALID" };
  }

  return { ok: true };
}

export async function executeHyperliquidOrder(
  input: ExecuteOrderInput,
  env: HyperliquidBridgeEnv = {},
): Promise<HyperliquidFillResult> {
  const state = input.systemState as Record<string, unknown> | undefined;
  const isLockedState = Boolean(
    state?.systemLocked === true ||
    state?.dailyLossLimitHit === true ||
    state?.soilResistanceTripped === true ||
    state?.rootProtectionTripped === true
  );

  if (isLockedState) {
    return {
      success: false,
      dryRun: false,
      fillId: null,
      signatureHash: null,
      rejected: true,
      reason: "[CIRCUIT_BREAKER] Hotkey signing pipeline forcefully terminated by SystemState Lock",
    };
  }

  const dryRun = resolveDryRunFromEnv(env, input.config, input.systemState);
  const config: HyperliquidAdapterConfig = { ...input.config, dryRun };

  if (input.sessionExpiryTimestamp !== undefined && !dryRun) {
    const gate = await validateProductionSessionKeyBridge(
      input.payload,
      input.sessionExpiryTimestamp,
      dryRun,
    );
    if (!gate.ok) {
      return {
        success: false,
        dryRun: false,
        fillId: null,
        signatureHash: null,
        rejected: true,
        reason: gate.reason,
      };
    }
  }

  return executeOrder({
    ...input,
    config,
    ...(dryRun ? { sessionExpiryTimestamp: undefined } : {}),
  });
}

export { cancelOrder, fetchAccountBalance, resolveHyperliquidDryRun };