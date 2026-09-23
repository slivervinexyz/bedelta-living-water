import { HL_WS_URL } from "../../src/adapters/hl/websocket/types";
import {
  appendMainnetExecutionLog,
  MAINNET_EXECUTION_LOG_PATH,
} from "../../src/services/logging/execution-logger";
import { computeNetFundingApy } from "../../src/services/yield/apy-calculator";
import {
  fundingHourlyToGrossApy,
  resolveCapitalAllocation,
} from "../../src/services/yield/rebalance-rules";
import type { probeNativeUsdcEarnApy } from "../../src/services/hyperliquid/earn-probe";
import {
  BALANCE_PASS_FLOOR_USD,
  CLIP_USD,
  LIVE,
  MICRO_CAPITAL_USD,
  STALE_THRESHOLD_MS,
} from "./ignition.constants";
import { fetchUnifiedAccount } from "./hl-account";
import {
  fetchMetaBundle,
  fetchSpotMeta,
  pickDualListedTarget,
} from "./hl-meta-target";
import { connectMainnetL2Ws, probeL2FailClosed } from "./l2-probe-ws";
import type { DualTarget } from "./ignition.types";

export interface Stage1Context {
  account: Awaited<ReturnType<typeof fetchUnifiedAccount>>;
  target: DualTarget;
  probe: Awaited<ReturnType<typeof probeL2FailClosed>>;
  allocation: ReturnType<typeof resolveCapitalAllocation>;
  balanceStatus: string;
  targetNetApy: number;
  excessYieldOverEarn: number;
  stakedHypeDiscount: number;
  nativeEarnApy: number;
}

export async function runStage1Probe(args: {
  userAddress: string;
  stakedHypeAmount: number;
  stakedHypeDiscount: number;
  earn: Awaited<ReturnType<typeof probeNativeUsdcEarnApy>>;
}): Promise<Stage1Context | null> {
  const { userAddress, stakedHypeAmount, stakedHypeDiscount, earn } = args;
  const nativeEarnApy = earn.nativeUsdcEarnApy;

  console.log("── Stage 1: Unified Account & Probe ──");
  const account = await fetchUnifiedAccount(userAddress);
  const balanceStatus =
    !account.apiOk && account.unifiedAvailableUsd <= 0
      ? "FAIL (API)"
      : account.unifiedAvailableUsd >= BALANCE_PASS_FLOOR_USD
        ? "PASS"
        : account.unifiedAvailableUsd >= CLIP_USD
          ? "WARN"
          : "FAIL";

  console.log(
    `Balance:  ${balanceStatus}  unifiedAvailable=$${account.unifiedAvailableUsd.toFixed(2)}  (spotStable=$${account.spotUsdcUsd.toFixed(2)} · perpsEquity=$${account.accountValueUsd.toFixed(2)})  target≈$${MICRO_CAPITAL_USD}`,
  );
  console.log(
    `Unified:  spotStable collateral usable for Spot+Perps — no clearinghouse transfer required`,
  );

  const [meta, spotMeta] = await Promise.all([
    fetchMetaBundle(),
    fetchSpotMeta(),
  ]);
  const target = pickDualListedTarget(meta, spotMeta);
  const targetNetApy = computeNetFundingApy({
    grossFundingApy: fundingHourlyToGrossApy(target.fundingRateHourly),
    stakedHypeAmount,
  }).netApy;
  const allocation = resolveCapitalAllocation({
    targetNetApy,
    nativeEarnApy: earn.HURDLE_RATE_APY,
  });
  const excessYieldOverEarn = allocation.excessYieldOverEarn;
  console.log(
    `Target:   ${target.symbol} (Spot+Perp)  funding=${(target.fundingRateHourly * 100).toFixed(4)}%/h  mid=$${target.midPx}  perp#${target.assetIndex}  spot#${target.spotAssetIndex}`,
  );
  console.log(
    `Hurdle:   netApy=${(targetNetApy * 100).toFixed(2)}%  excess=${(excessYieldOverEarn * 100).toFixed(2)}%  → ${allocation.action}`,
  );

  const ws = await connectMainnetL2Ws(target.symbol);
  console.log(
    `WS L2:    ${ws.connected && ws.bookReceived ? "PASS" : "FAIL"}  connected=${ws.connected}  book=${ws.bookReceived}  latencyMs=${ws.latencyMs ?? "n/a"}  url=${HL_WS_URL}`,
  );

  const probe = await probeL2FailClosed(target.symbol);
  console.log(
    `L2 Probe: ${probe.ok ? "PASS" : "FAIL"}  ${probe.probeMs}ms (budget ${STALE_THRESHOLD_MS}ms)  depth=$${probe.depthUsd.toFixed(0)}  mid=$${probe.midPx}`,
  );
  if (!probe.ok) {
    console.log(`         reason=${probe.reason}`);
    appendMainnetExecutionLog({
      timestamp: new Date().toISOString(),
      mode: LIVE ? "LIVE" : "DRY_RUN",
      symbol: target.symbol,
      unifiedAvailableUsd: account.unifiedAvailableUsd,
      probeLatencyMs: probe.probeMs,
      probeBudgetMs: STALE_THRESHOLD_MS,
      probeOk: false,
      midPx: target.midPx,
      fundingRateHourly: target.fundingRateHourly,
      fundingYieldUsdHourly: 0,
      clipUsd: CLIP_USD,
      ok: false,
      error: probe.reason ?? "L2_FAIL_CLOSED",
      stakedHypeDiscount,
      nativeEarnApy,
      excessYieldOverEarn,
    });
    console.log("RESULT: ABORT — L2 fail-closed probe blocked ignition");
    process.exit(1);
  }

  if (allocation.action === "ALLOCATE_NATIVE_EARN") {
    appendMainnetExecutionLog({
      timestamp: new Date().toISOString(),
      mode: LIVE ? "LIVE" : "DRY_RUN",
      symbol: target.symbol,
      unifiedAvailableUsd: account.unifiedAvailableUsd,
      probeLatencyMs: probe.probeMs,
      probeBudgetMs: STALE_THRESHOLD_MS,
      probeOk: true,
      midPx: probe.midPx > 0 ? probe.midPx : target.midPx,
      fundingRateHourly: target.fundingRateHourly,
      fundingYieldUsdHourly: 0,
      clipUsd: CLIP_USD,
      ok: true,
      error: allocation.reason,
      stakedHypeDiscount,
      nativeEarnApy,
      excessYieldOverEarn,
    });
    console.log("");
    console.log(
      `RESULT: ALLOCATE_NATIVE_EARN — ${allocation.reason} (DN not opened)`,
    );
    console.log(`Logged:  ${MAINNET_EXECUTION_LOG_PATH}`);
    console.log("");
    return null;
  }

  console.log("");
  return {
    account,
    target,
    probe,
    allocation,
    balanceStatus,
    targetNetApy,
    excessYieldOverEarn,
    stakedHypeDiscount,
    nativeEarnApy,
  };
}
