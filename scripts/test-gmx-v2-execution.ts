#!/usr/bin/env tsx
/** GMX v2 Arbitrum One — guard-gated depth probe + unsigned deposit/order payload test. */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gmxV2ArbitrumAdapter } from "../src/services/adapters/gmx-v2-adapter";
import {
  buildGmxV2UnsignedDepositPayload,
  buildGmxV2UnsignedWithdrawPayload,
} from "../src/services/adapters/gmx-v2-order-payload";
import {
  buildArbitrumGasGuardMetrics,
  refreshArbitrumGasGuard,
} from "../src/services/risk/arbitrum-gas-guard";
import {
  buildSequencerHealthMetrics,
  refreshSequencerGuard,
} from "../src/services/risk/sequencer-guard";
import {
  isGmxV2ExecutionHelpRequested,
  parseGmxV2ExecutionCli,
  printGmxV2ExecutionHelp,
  resolveGmxV2ExecutionPath,
  resolveOracleLagAuditorNote,
  validateGmxExecutionGuards,
} from "./gmx-v2-execution-cli";
import { printLiveHarnessBypassBanner } from "./_shared/live-harness-warning";

const METRICS_PATH = resolve("docs/audit/gmx-v2-execution-metrics.json");

function guardRef(payload: unknown): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16)}`;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (isGmxV2ExecutionHelpRequested(argv)) {
    printGmxV2ExecutionHelp();
    return;
  }

  const cli = parseGmxV2ExecutionCli(argv);
  if (cli.allowStaleOracle) process.env.ALLOW_STALE_ORACLE = "1";
  printLiveHarnessBypassBanner();
  const t0 = performance.now();
  const mode = cli.liveRead ? "live-read" : "dry-run";
  const executionPath = resolveGmxV2ExecutionPath(cli);

  await Promise.all([
    refreshSequencerGuard(),
    refreshArbitrumGasGuard({ targetYieldUsd: cli.sizeUsd * 0.001 }),
  ]);

  const guardVerdict = validateGmxExecutionGuards(cli.allowStaleOracle);
  if (!guardVerdict.ok) {
    const gasMetrics = buildArbitrumGasGuardMetrics();
    const auditorNote = resolveOracleLagAuditorNote(guardVerdict.reasons, gasMetrics);
    console.log(JSON.stringify({
      event: "GMX_V2_EXECUTION_BLOCKED",
      network: "arbitrum-one",
      mode,
      guards: { sequencer: buildSequencerHealthMetrics(), gas: gasMetrics },
      reasons: guardVerdict.reasons,
      ...(auditorNote ? { auditorNote } : {}),
      timestamp: new Date().toISOString(),
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  const [depth, rates, health, marketCtx] = await Promise.all([
    gmxV2ArbitrumAdapter.getMarketDepth({ symbol: cli.symbol, market: "perp" }),
    gmxV2ArbitrumAdapter.getFundingAndBorrowRates({ symbol: cli.symbol, side: cli.side }),
    gmxV2ArbitrumAdapter.checkHealth?.() ?? Promise.resolve(null),
    gmxV2ArbitrumAdapter.buildUnsignedHedgeOrder({
      symbol: cli.symbol,
      side: cli.side,
      sizeUsd: cli.sizeUsd,
      reduceOnly: executionPath === "decrease",
      clientOrderId: `gmx-test-${Date.now()}`,
      maxSlippageBps: 30,
      allowStaleOracle: cli.allowStaleOracle,
    }),
  ]);

  const marketToken = String(marketCtx.payload.addresses?.market ?? cli.symbol);
  const order = executionPath === "withdraw" ? null : marketCtx;
  const deposit =
    executionPath === "increase-deposit"
      ? buildGmxV2UnsignedDepositPayload({ marketToken, sizeUsd: cli.sizeUsd })
      : null;
  const withdraw =
    executionPath === "withdraw"
      ? buildGmxV2UnsignedWithdrawPayload({
          marketToken,
          sizeUsd: cli.sizeUsd,
          skipFailClosedGuards: true,
          allowStaleOracle: cli.allowStaleOracle,
        })
      : null;

  const metrics = {
    event: "GMX_V2_EXECUTION_METRICS",
    network: "arbitrum-one",
    mode,
    executionPath,
    input: cli,
    guards: { sequencer: buildSequencerHealthMetrics(), gas: buildArbitrumGasGuardMetrics() },
    gmx: {
      depth,
      rates,
      health,
      gmPoolLiquidityUsd: depth.gmPoolLiquidityUsd ?? null,
      spreadBps: depth.spreadBps,
      dataStoreRates: {
        fundingRateHourly: rates.fundingRateHourly,
        borrowRateHourly: rates.borrowRateHourly,
        netCarryHourly: rates.netCarryHourly,
      },
    },
    payloads: {
      ...(deposit ? { deposit } : {}),
      ...(withdraw ? { withdraw } : {}),
      ...(order
        ? {
            order: order.payload,
            orderMeta: {
              venue: order.venue,
              side: order.side,
              sizeUsd: order.sizeUsd,
              expiresAtMs: order.expiresAtMs,
            },
            createOrderParams: {
              addresses: order.payload.addresses,
              numbers: order.payload.numbers,
              orderType: order.payload.orderType,
              isLong: order.payload.isLong,
              referralCode: order.payload.referralCode,
              uiFeeReceiver: order.payload.addresses.uiFeeReceiver,
            },
          }
        : {}),
      ...(withdraw
        ? {
            createWithdrawalParams: {
              addresses: withdraw.addresses,
              numbers: withdraw.numbers,
              shouldUnwrapNativeToken: withdraw.shouldUnwrapNativeToken,
              referralCode: withdraw.referralCode,
            },
          }
        : {}),
    },
    refs: {
      ...(deposit ? { deposit: guardRef(deposit) } : {}),
      ...(withdraw ? { withdraw: guardRef(withdraw) } : {}),
      ...(order ? { order: guardRef(order.payload) } : {}),
    },
    elapsedMs: Number((performance.now() - t0).toFixed(2)),
    timestamp: new Date().toISOString(),
    liveNote: cli.liveRead
      ? `Live-read: ${executionPath} unsigned payloads exported — no on-chain broadcast`
      : `Dry-run only — ${executionPath} stdout JSON only`,
  };

  console.log(JSON.stringify(metrics, null, 2));

  if (cli.liveRead) {
    writeFileSync(METRICS_PATH, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
    console.error(`[gmx-v2-test] metrics written → ${METRICS_PATH}`);
  }
}

main().catch((err) => {
  console.error("[gmx-v2-test] fatal", err);
  process.exitCode = 1;
});
