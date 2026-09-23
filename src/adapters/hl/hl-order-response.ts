/** Hyperliquid L2 exchange order response parsing — real fill enforcement only. */

export const ON_CHAIN_FILL_FAILED_PREFIX = "[ERROR] On-Chain Fill Failed:" as const;

export function formatOnChainFillFailedError(reason: string): string {
  return `${ON_CHAIN_FILL_FAILED_PREFIX} ${reason}`;
}

export class OnChainFillFailedError extends Error {
  constructor(reason: string) {
    super(formatOnChainFillFailedError(reason));
    this.name = "OnChainFillFailedError";
  }
}

export interface HlOrderStatusParseResult {
  filled: boolean;
  rejected: boolean;
  error?: string;
  oid?: number;
  avgPx?: string;
  totalSz?: string;
}

export function parseHlOrderStatuses(response: unknown): HlOrderStatusParseResult {
  const statuses = (
    response as { response?: { data?: { statuses?: unknown[] } } } | undefined
  )?.response?.data?.statuses;

  if (!Array.isArray(statuses) || statuses.length === 0) {
    return {
      filled: false,
      rejected: true,
      error: "Empty or missing L2 order statuses",
    };
  }

  const first = statuses[0];
  if (!first || typeof first !== "object") {
    return { filled: false, rejected: true, error: "Unrecognized L2 order status" };
  }

  if ("error" in first) {
    return {
      filled: false,
      rejected: true,
      error: String((first as { error: string }).error),
    };
  }

  if ("filled" in first) {
    const filled = (first as {
      filled: { oid?: number; avgPx?: string; totalSz?: string };
    }).filled;
    return {
      filled: true,
      rejected: false,
      oid: filled.oid,
      avgPx: filled.avgPx,
      totalSz: filled.totalSz,
    };
  }

  if ("resting" in first) {
    const resting = (first as { resting: { oid?: number } }).resting;
    return {
      filled: false,
      rejected: true,
      error: `IoC order did not fill (resting oid=${resting.oid ?? "?"})`,
    };
  }

  return { filled: false, rejected: true, error: "Unrecognized L2 order status" };
}

export function assertHlOrderFilled(response: unknown): HlOrderStatusParseResult {
  const parsed = parseHlOrderStatuses(response);
  if (!parsed.filled || parsed.rejected) {
    throw new OnChainFillFailedError(parsed.error ?? "L2 order rejected");
  }
  return parsed;
}
