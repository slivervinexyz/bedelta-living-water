#!/usr/bin/env tsx
/**
 * Arbitrum One (42161) — calibrated GMX v2 micro-fill via PolicyGuard + Gate (ZeroDev Kernel v3).
 * Dry-run default. Live: CONFIRM_GMX_MICRO_FILL=YES BROADCAST=1 WalletA_Pkey=0x… (alias WALLET_A_PRIVATE_KEY / MAINNET_PK) [--size=1] · EOA: FORCE_EOA_FALLBACK=1
 */
import { createPublicClient, http, keccak256, toHex, type Hex } from "viem";
import { arbitrum } from "viem/chains";
import { GMX_V2_EXCHANGE_ROUTER_ARBITRUM } from "../src/config/gmx-revenue";
import { computeGatedExecutorPayloadHash } from "../src/sdk/gated-executor-payload";
import { GMX_MARKET_REGISTRY } from "../src/config/gmx-markets";
import { buildGmxV2UnsignedOrderPayload } from "../src/services/adapters/gmx-v2-order-payload";
import { refreshArbitrumGasGuard } from "../src/services/risk/arbitrum-gas-guard";
import { refreshSequencerGuard } from "../src/services/risk/sequencer-guard";
import { loadMainnetEnv, resolveMainnetPrivateKey } from "./_shared/mainnet-env";
import { calibrateMicroFillExecution, parseMicroFillSize, resolveMicroFillSide } from "./gmx-micro-fill-calibration";
import { computeGmxPoolImbalanceRatio } from "../src/adapters/gmx/gmx-v2-invariants";
import { validateGmxExecutionGuards } from "./gmx-v2-execution-cli";
import { resolveSoilMinDepthUsd, shouldBypassOracleLagDeadlock, shouldBypassSoftConfirmationProbe } from "../src/core/soil-resistance-core";
import {
  GmxMicroFillExecutionError,
  isBypassSimulationEnabled,
  printGmxMicroFillError,
} from "../src/services/adapters/gmx-micro-fill-execution-errors";
import { GMX_MICRO_FILL_GATE } from "./gmx-micro-fill-gate";
import { loadGmxMicroFillMarketSnapshot } from "./gmx-micro-fill-market-loader";
import { printLiveHarnessBypassBanner } from "./_shared/live-harness-warning";
import { printVenuePreflightFail, runVenuePreflight } from "./_shared/venue-preflight-report";
import { executeGmxMicroFillLive } from "./gmx-micro-fill-live";

const allowStaleOracle = (argv: string[]): boolean =>
  argv.includes("--allow-stale-oracle") || process.env.ALLOW_STALE_ORACLE === "1" || process.env.ALLOW_STALE_ORACLE === "true";

const POLICY_GUARD = "0xc66f96611a737c4e58706d0955594456eab88959" as Hex;
const CHAIN_ID = 42161;
const DEFAULT_RPC = "https://arb1.arbitrum.io/rpc";
const AGENT_ID = keccak256(toHex("silvervine:gmx:micro-fill:42161"));

function resolveRpc(): string { return (process.env.ARB_MAINNET_RPC_URL ?? DEFAULT_RPC).trim(); }
function armed(): boolean { return process.env.BROADCAST === "1" && process.env.CONFIRM_GMX_MICRO_FILL === "YES"; }
function forceEoaFallbackRequested(): boolean {
  const v = (process.env.FORCE_EOA_FALLBACK ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
async function main(): Promise<void> {
  loadMainnetEnv();
  const RPC = resolveRpc();
  const minDepthUsd = resolveSoilMinDepthUsd({});
  const argv = process.argv.slice(2);
  const probeBypass = shouldBypassSoftConfirmationProbe();
  const staleOracleOk = allowStaleOracle(argv) || shouldBypassOracleLagDeadlock() || probeBypass;
  if (staleOracleOk) process.env.ALLOW_STALE_ORACLE = "1";
  printLiveHarnessBypassBanner();
  const sizeUsd = parseMicroFillSize(argv);
  const symbol = (argv.find((a, i) => argv[i - 1] === "--symbol") ?? "ETH").toUpperCase();
  const client = createPublicClient({ chain: arbitrum, transport: http(RPC) });
  if ((await client.getChainId()) !== CHAIN_ID) throw new Error(`refuse: expected chain ${CHAIN_ID}`);

  let signer: `0x${string}` | undefined;
  try {
    const { privateKeyToAccount } = await import("viem/accounts");
    signer = privateKeyToAccount(resolveMainnetPrivateKey()).address;
  } catch {
    signer = undefined;
  }
  const preflight = await runVenuePreflight({
    matrixId: "gmx-perp",
    signer,
    amountUsd: sizeUsd,
    rpc: RPC,
    client,
  });
  if (!preflight.ok) {
    printVenuePreflightFail(preflight);
    process.exit(1);
  }

  await Promise.all([refreshSequencerGuard(), refreshArbitrumGasGuard({ targetYieldUsd: sizeUsd * 0.001 })]);
  const guardVerdict = validateGmxExecutionGuards(staleOracleOk);
  if (!guardVerdict.ok) throw new Error(`GUARD_BLOCKED:${guardVerdict.reasons.join("|")}`);
  if (staleOracleOk || probeBypass) {
    console.warn("[gmx-micro-fill] stale-oracle override armed via ALLOW_STALE_ORACLE (soil probe remains mandatory)");
  }
  if (isBypassSimulationEnabled()) {
    console.warn("[gmx-micro-fill] BYPASS_SIMULATION=true — silent eth_call revert; skipping preflight and proceeding to broadcast");
  }

  const market = await loadGmxMicroFillMarketSnapshot(symbol);
  const preferredSide = resolveMicroFillSide(argv, market.pool);
  let side: "long" | "short";
  let guard: ReturnType<typeof calibrateMicroFillExecution>["guard"];
  try {
    ({ side, guard } = calibrateMicroFillExecution({ market, sizeUsd, preferredSide }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(JSON.stringify({
      event: "GMX_MICRO_FILL_BLOCKED",
      network: "arbitrum-one",
      chainId: CHAIN_ID,
      sizeUsd,
      symbol,
      preferredSide,
      pool: market.pool,
      imbalanceRatio: computeGmxPoolImbalanceRatio({
        oiLongUsd: market.pool.longTokenUsd,
        oiShortUsd: market.pool.shortTokenUsd,
        poolTvlUsd: market.poolTvlUsd,
      }),
      reason: message,
      dryRun: !armed(),
      timestamp: new Date().toISOString(),
    }, null, 2));
    process.exit(1);
  }
  const registry = GMX_MARKET_REGISTRY[`${symbol}/USDC` as keyof typeof GMX_MARKET_REGISTRY] ?? GMX_MARKET_REGISTRY["ETH/USDC"];
  const orderPayload = buildGmxV2UnsignedOrderPayload({
    side, sizeUsd, reduceOnly: false, clientOrderId: `gmx-micro-${Date.now()}`, maxSlippageBps: 30,
    marketToken: registry.marketToken, midPriceUsd: market.midPriceUsd, pool: market.pool,
    allowStaleOracle: staleOracleOk,
  });
  const bindNonce = BigInt(Date.now());
  const payloadHash = computeGatedExecutorPayloadHash({
    chainId: CHAIN_ID, executor: GMX_MICRO_FILL_GATE, initiator: "0x0000000000000000000000000000000000000001",
    target: GMX_V2_EXCHANGE_ROUTER_ARBITRUM, data: toHex(bindNonce), nonce: bindNonce,
  });
  console.log("[gmx-micro-fill] preflight OK", {
    sizeUsd, side, preferredSide, balanced: side !== preferredSide ? "flipped" : "kept",
    minDepthUsd, oracleLagBypass: staleOracleOk, softConfirmBypass: probeBypass, imbalanceOk: guard.imbalanceOk, soilOk: guard.soilOk,
    policyGuard: POLICY_GUARD, payloadHash,
  });

  if (!armed()) {
    console.log("[gmx-micro-fill] dry-run — set CONFIRM_GMX_MICRO_FILL=YES BROADCAST=1 MAINNET_PK=0x… ZERODEV_PROJECT_ID=…");
    return;
  }

  await executeGmxMicroFillLive({
    rpc: RPC,
    pk: resolveMainnetPrivateKey(),
    agentId: AGENT_ID,
    bindNonce,
    sizeUsd,
    side,
    orderPayload,
    longToken: registry.longToken as Hex,
    midPriceUsd: market.midPriceUsd,
    forceEoa: forceEoaFallbackRequested(),
  });
}

function handleMicroFillFatal(err: unknown): void {
  if (err instanceof GmxMicroFillExecutionError) {
    console.error(err.summary);
    return;
  }
  printGmxMicroFillError(err, { step: "gmx-micro-fill main" });
}

main().catch((err) => { handleMicroFillFatal(err); process.exit(1); });
