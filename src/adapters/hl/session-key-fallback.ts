/**
 * v0.8 — Session Key Revocation / Expiration graceful fallback.
 * On invalid/revoked key → READ_ONLY_OBSERVER (halt retry storm).
 */

import {
  updateSystemState,
  type CoreSystemState,
} from "../../core/state";
import type {
  SessionKeyStatusTag,
  SystemState,
} from "../../services/systemState";
import { SigningChannelLockedError } from "./auth";
import { HyperliquidExecutionError } from "./execution-types";

export const READ_ONLY_OBSERVER = "READ_ONLY_OBSERVER" as const;
export const SESSION_KEY_EXPIRED = "SESSION_KEY_EXPIRED" as const;

export type { SessionKeyRuntimeMode, SessionKeyStatusTag } from "../../services/systemState";

const REVOKED_RE =
  /revok|unauthorized|not\s*authorized|user or api wallet does not exist|agent.*invalid|invalid.*agent|expired|session\s*key/i;

export function classifySessionKeyError(err: unknown): SessionKeyStatusTag | null {
  if (err instanceof SigningChannelLockedError) {
    if (/READ_ONLY_OBSERVER/i.test(err.message)) return "SESSION_KEY_INVALID";
    if (/session\s*key|agent authorization/i.test(err.message)) {
      if (/expir/i.test(err.message)) return "SESSION_KEY_EXPIRED";
      if (/revok/i.test(err.message)) return "SESSION_KEY_REVOKED";
      return "SESSION_KEY_INVALID";
    }
    return null;
  }
  if (err instanceof HyperliquidExecutionError) {
    const blob = `${err.message} ${JSON.stringify(err.body ?? "")}`;
    if (REVOKED_RE.test(blob)) {
      return /expir/i.test(blob) ? "SESSION_KEY_EXPIRED" : "SESSION_KEY_REVOKED";
    }
  }
  if (err instanceof Error && REVOKED_RE.test(err.message)) {
    return /expir/i.test(err.message) ? "SESSION_KEY_EXPIRED" : "SESSION_KEY_REVOKED";
  }
  return null;
}

export function isReadOnlyObserver(
  state: Pick<SystemState, "sessionKeyMode">,
): boolean {
  return state.sessionKeyMode === READ_ONLY_OBSERVER;
}

/** Enter READ_ONLY_OBSERVER — closes signing channel, stops retry storms. */
export function enterReadOnlyObserver(
  status: SessionKeyStatusTag = SESSION_KEY_EXPIRED,
): CoreSystemState {
  return updateSystemState({
    patch: {
      signingChannelOpen: false,
      sessionKeyMode: READ_ONLY_OBSERVER,
      sessionKeyStatus: status === "OK" ? "SESSION_KEY_INVALID" : status,
    },
  });
}

/** Capture signature errors. true → degraded; callers must not retry. */
export function handleSessionKeySignFailure(err: unknown): boolean {
  const tag = classifySessionKeyError(err);
  if (!tag) return false;
  enterReadOnlyObserver(tag);
  console.warn(`[SESSION_KEY] ${tag} → ${READ_ONLY_OBSERVER} (retry storm halted)`);
  return true;
}

export function assertTradeSessionActive(
  state: Pick<SystemState, "sessionKeyMode" | "sessionKeyStatus">,
): void {
  if (state.sessionKeyMode === READ_ONLY_OBSERVER) {
    throw new SigningChannelLockedError(
      `Session key ${state.sessionKeyStatus ?? SESSION_KEY_EXPIRED} — ${READ_ONLY_OBSERVER}`,
      "SIGNING_CHANNEL_CLOSED",
    );
  }
}
