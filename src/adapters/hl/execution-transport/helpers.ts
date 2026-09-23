import {
  SigningChannelLockedError,
  verifySessionKeyValidity,
  type SigningGateInput,
} from "../auth";
import { readActiveSystemState } from "../../../core/state";
import {
  HyperliquidExecutionError,
  type HlOrderWire,
  type SessionKeyContext,
} from "../execution-types";
import {
  assertTradeSessionActive,
  enterReadOnlyObserver,
} from "../session-key-fallback";

export function resolveSigningGate(
  gate: SigningGateInput | undefined,
  soilTripped: boolean,
): SigningGateInput {
  return {
    ...gate,
    soilResistanceTripped: gate?.soilResistanceTripped ?? soilTripped,
  };
}

export function assertSessionKey(sessionKey?: SessionKeyContext): void {
  assertTradeSessionActive(readActiveSystemState());
  if (!sessionKey) return;
  if (!sessionKey.masterWalletAddress) {
    throw new SigningChannelLockedError(
      "Session key missing masterWalletAddress — order margin context invalid",
      "SIGNING_CHANNEL_CLOSED",
    );
  }
  if (!verifySessionKeyValidity(sessionKey.agentAddress, sessionKey.expiresAt)) {
    enterReadOnlyObserver("SESSION_KEY_EXPIRED");
    throw new SigningChannelLockedError(
      "Session key expired or invalid — agent authorization rejected",
      "SIGNING_CHANNEL_CLOSED",
    );
  }
}

export function isOpeningOrderAction(action: Record<string, unknown>): boolean {
  if (action.type !== "order") return false;
  const orders = action.orders;
  if (!Array.isArray(orders)) return false;
  return orders.some((order) => {
    if (!order || typeof order !== "object") return false;
    return (order as HlOrderWire).r !== true;
  });
}

export async function parseResponseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HyperliquidExecutionError(
      "Invalid JSON response from Hyperliquid exchange",
      "INVALID_RESPONSE",
      res.status,
      text,
    );
  }
}
