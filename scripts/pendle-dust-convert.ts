/** Pendle Convert API v3 — deposit (USDai→PT) and redeem (PT→USDai) dust harness. */
import { VENUE_USDAI_ARBITRUM } from "../src/core/venue-execution-matrix";
import { PENDLE_API_BASE, PENDLE_API_HOST } from "../src/adapters/pendle/pendle-api-discovery";
import { assertRpcAllowlisted } from "../src/services/defense/rpc-fetch-gate-lib/rpc-fetch-gate-eval";
import type {
  PendleConvertResponse,
  PendleConvertTokenAmount,
} from "../src/adapters/pendle/pendle-api-types";
import type { PendlePtRegistryEntry } from "../src/adapters/pendle/pendle-pt-registry";
import { PENDLE_PT_REGISTRY_CHAIN_ID } from "../src/adapters/pendle/pendle-pt-registry";

export interface PendleDustConvertRequest {
  receiver: `0x${string}`;
  entry: PendlePtRegistryEntry;
  tokenIn: `0x${string}`;
  amountIn: bigint;
  slippage: number;
}

export interface PendleDustRedeemRequest {
  receiver: `0x${string}`;
  entry: PendlePtRegistryEntry;
  ptAmount: bigint;
  tokenOut: `0x${string}`;
  slippage: number;
}

export interface PendleDustConvertPlan {
  router: `0x${string}`;
  data: `0x${string}`;
  approvals: PendleConvertTokenAmount[];
  action: string;
}

async function postPendleConvert(body: Record<string, unknown>): Promise<PendleDustConvertPlan> {
  const url = `${PENDLE_API_BASE}/v3/sdk/${PENDLE_PT_REGISTRY_CHAIN_ID}/convert`;
  assertRpcAllowlisted(url, [PENDLE_API_HOST]);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`PENDLE_CONVERT_FAIL:${res.status}:${errText.slice(0, 200)}`);
  }
  const payload = (await res.json()) as PendleConvertResponse;
  const route = payload.routes?.[0];
  if (!route?.tx?.to || !route.tx.data) throw new Error("PENDLE_CONVERT_EMPTY_ROUTE");
  return {
    router: route.tx.to as `0x${string}`,
    data: route.tx.data as `0x${string}`,
    approvals: payload.requiredApprovals ?? route.requiredApprovals ?? [],
    action: payload.action,
  };
}

export async function buildPendleDustConvertPlan(
  req: PendleDustConvertRequest,
): Promise<PendleDustConvertPlan> {
  const pt = req.entry.ptAddress;
  if (!pt) throw new Error("PENDLE_DUST_MISSING_PT_ADDRESS");
  return postPendleConvert({
    receiver: req.receiver,
    slippage: req.slippage,
    enableAggregator: false,
    useLimitOrder: false,
    inputs: [{ token: req.tokenIn, amount: req.amountIn.toString() }],
    outputs: [pt],
  });
}

export async function buildPendleDustRedeemPlan(
  req: PendleDustRedeemRequest,
): Promise<PendleDustConvertPlan> {
  const pt = req.entry.ptAddress;
  if (!pt) throw new Error("PENDLE_DUST_MISSING_PT_ADDRESS");
  return postPendleConvert({
    receiver: req.receiver,
    slippage: req.slippage,
    enableAggregator: false,
    useLimitOrder: false,
    inputs: [{ token: pt, amount: req.ptAmount.toString() }],
    outputs: [req.tokenOut],
  });
}

export function resolvePendleDustTokenIn(entry: PendlePtRegistryEntry): `0x${string}` {
  const inputs = entry.inputTokenAddresses;
  if (inputs?.length) return inputs[0]!;
  if (entry.underlyingAddress) return entry.underlyingAddress;
  throw new Error("PENDLE_DUST_NO_INPUT_TOKEN");
}

/** SY redeem output — prefer sUSDai/underlying; USDai input-only on some markets. */
export function resolvePendleDustTokenOut(entry: PendlePtRegistryEntry): `0x${string}` {
  const inputs = entry.inputTokenAddresses ?? [];
  if (entry.underlyingAddress) return entry.underlyingAddress;
  if (inputs.length > 1) return inputs[1]!;
  return VENUE_USDAI_ARBITRUM;
}
