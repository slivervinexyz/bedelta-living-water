import { unwrapHlError } from "../error-unwrap";
import { HyperliquidExecutionError } from "../execution-types";

const HL_WALLET_NOT_EXIST_RE =
  /user or api wallet.*does not exist|wallet.*does not exist/i;

const HL_EXCHANGE_TIMEOUT_RE =
  /timeout|timed out|aborted|abort|network error|failed to fetch|econnreset|etimedout/i;

const HL_AGENT_ALREADY_USED_RE =
  /extra agent already used|agent already used|already used/i;

export function isHlUserWalletMissingError(detail: string): boolean {
  return HL_WALLET_NOT_EXIST_RE.test(detail);
}

/** Registration/order errors that route to verified telemetry proofs (demo guardrail). */
export function isHlTelemetryFallbackError(detail: string, err?: unknown): boolean {
  if (isHlUserWalletMissingError(detail)) return true;
  if (HL_EXCHANGE_TIMEOUT_RE.test(detail)) return true;
  if (err instanceof Error && err.name === "AbortError") return true;
  return false;
}

export function isHlAgentAlreadyUsedError(detail: string): boolean {
  return HL_AGENT_ALREADY_USED_RE.test(detail);
}

export function extractHlExchangeErrorDetail(err: unknown): string {
  if (err instanceof HyperliquidExecutionError) {
    const body = err.body;
    if (typeof body === "string") return body;
    if (body && typeof body === "object") {
      const response = (body as { response?: unknown }).response;
      if (response != null) return String(response);
      return JSON.stringify(body);
    }
  }
  if (err instanceof Error && err.name === "AbortError") {
    return "Hyperliquid exchange request timed out";
  }
  return unwrapHlError(err);
}
