import { HyperliquidExecutionError } from "./execution-types";

function stringifyUnknown(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const record = err as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.length > 0) {
      return record.message;
    }
    try {
      return JSON.stringify(err);
    } catch {
      return Object.prototype.toString.call(err);
    }
  }
  return String(err);
}

function extractHyperliquidBodyMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (typeof record.response === "string") return record.response;
  if (typeof record.error === "string") return record.error;
  if (record.response && typeof record.response === "object") {
    const nested = record.response as Record<string, unknown>;
    if (typeof nested.data === "string") return nested.data;
    if (typeof nested.error === "string") return nested.error;
  }
  return null;
}

/** Unwrap wallet/RPC/HL errors — never emit `[object Object]`. */
export function unwrapHlError(err: unknown): string {
  if (err instanceof HyperliquidExecutionError) {
    const bodyMsg = extractHyperliquidBodyMessage(err.body);
    return bodyMsg ?? err.message;
  }
  if (err instanceof Error) {
    return err.message || err.name;
  }
  return stringifyUnknown(err);
}
