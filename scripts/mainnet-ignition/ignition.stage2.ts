import {
  appendMainnetExecutionLog,
  MAINNET_EXECUTION_LOG_PATH,
} from "../../src/services/logging/execution-logger";
import {
  CLIP_USD,
  LIVE,
  MICRO_CAPITAL_USD,
  STALE_THRESHOLD_MS,
} from "./ignition.constants";
import {
  HyperliquidExecutionError,
  PreTradeValidationError,
  buildDnEnvelope,
  buildPreTrade,
  computeSlippageBps,
  executeLiveLegs,
  printFill,
} from "./dn-execution";
import type { Stage1Context } from "./ignition.stage1";

export async function runStage2MicroClip(
  ctx: Stage1Context,
  sessionPk: string,
  userAddress: string,
): Promise<void> {
  const {
    account,
    target,
    probe,
    balanceStatus,
    stakedHypeDiscount,
    nativeEarnApy,
    excessYieldOverEarn,
  } = ctx;

  console.log("── Stage 2: $30 Micro Delta-Neutral Clip ──");
  const midPx = probe.midPx > 0 ? probe.midPx : target.midPx;
  const envelope = buildDnEnvelope({
    symbol: target.symbol,
    midPx,
    perpAssetIndex: target.assetIndex,
    perpSzDecimals: target.szDecimals,
    spotAssetIndex: target.spotAssetIndex,
    spotSzDecimals: target.spotSzDecimals,
  });

  const fundingYieldUsdHourly =
    CLIP_USD * Math.abs(target.fundingRateHourly) *
    (target.fundingRateHourly > 0 ? 1 : -1);

  console.log("Order envelope:");
  console.log(JSON.stringify(envelope, null, 2));

  if (!LIVE) {
    const logged = appendMainnetExecutionLog({
      timestamp: new Date().toISOString(),
      mode: "DRY_RUN",
      symbol: target.symbol,
      unifiedAvailableUsd: account.unifiedAvailableUsd,
      probeLatencyMs: probe.probeMs,
      probeBudgetMs: STALE_THRESHOLD_MS,
      probeOk: true,
      midPx,
      fundingRateHourly: target.fundingRateHourly,
      fundingYieldUsdHourly,
      clipUsd: CLIP_USD,
      ok: true,
      stakedHypeDiscount,
      nativeEarnApy,
      excessYieldOverEarn,
    });
    console.log("");
    console.log(
      `RESULT: DRY_RUN OK — clip=$${CLIP_USD} · probe=${probe.probeMs}ms · unified=$${account.unifiedAvailableUsd.toFixed(2)}`,
    );
    console.log(
      `Logged:  ${MAINNET_EXECUTION_LOG_PATH}  cumFunding7d=$${logged.netCumulativeFundingYieldUsd?.toFixed(6) ?? "0"}`,
    );
    console.log("");
    return;
  }

  if (balanceStatus === "FAIL") {
    appendMainnetExecutionLog({
      timestamp: new Date().toISOString(),
      mode: "LIVE",
      symbol: target.symbol,
      unifiedAvailableUsd: account.unifiedAvailableUsd,
      probeLatencyMs: probe.probeMs,
      probeBudgetMs: STALE_THRESHOLD_MS,
      probeOk: true,
      midPx,
      fundingRateHourly: target.fundingRateHourly,
      fundingYieldUsdHourly: 0,
      clipUsd: CLIP_USD,
      ok: false,
      error: "BALANCE_BELOW_CLIP",
      stakedHypeDiscount,
      nativeEarnApy,
      excessYieldOverEarn,
    });
    console.log("RESULT: ABORT LIVE — unified available below $30 clip floor");
    process.exit(1);
  }

  const preTrade = buildPreTrade(
    target.symbol,
    midPx,
    probe.depthUsd,
    probe.probeMs,
    account.unifiedAvailableUsd || MICRO_CAPITAL_USD,
  );

  try {
    const { spotFill, perpFill } = await executeLiveLegs(
      envelope,
      sessionPk,
      userAddress,
      preTrade,
    );

    const slips: number[] = [];
    if (spotFill.avgPx) {
      slips.push(computeSlippageBps(midPx, spotFill.avgPx, "BUY"));
    }
    if (perpFill.avgPx) {
      slips.push(computeSlippageBps(midPx, perpFill.avgPx, "SHORT"));
    }
    const executionSlippageBps =
      slips.length > 0
        ? slips.reduce((a, b) => a + b, 0) / slips.length
        : undefined;

    const ok = spotFill.status === "FILLED" && perpFill.status === "FILLED";

    printFill("Spot Buy", spotFill);
    printFill("Perp Short", perpFill);
    console.log(
      `Slippage: ${executionSlippageBps?.toFixed(2) ?? "n/a"} bps  ·  Probe: ${probe.probeMs}ms`,
    );

    const logged = appendMainnetExecutionLog({
      timestamp: new Date().toISOString(),
      mode: "LIVE",
      symbol: target.symbol,
      unifiedAvailableUsd: account.unifiedAvailableUsd,
      probeLatencyMs: probe.probeMs,
      probeBudgetMs: STALE_THRESHOLD_MS,
      probeOk: true,
      midPx,
      fundingRateHourly: target.fundingRateHourly,
      fundingYieldUsdHourly: ok ? fundingYieldUsdHourly : 0,
      clipUsd: CLIP_USD,
      spotFill,
      perpFill,
      executionSlippageBps,
      ok,
      error: ok ? undefined : `spot=${spotFill.status};perp=${perpFill.status}`,
      stakedHypeDiscount,
      nativeEarnApy,
      excessYieldOverEarn,
    });

    console.log("");
    console.log(
      `RESULT: ${ok ? "LIVE OK" : "LIVE PARTIAL/FAIL"}  probe=${probe.probeMs}ms  cumFunding7d=$${logged.netCumulativeFundingYieldUsd?.toFixed(6) ?? "0"}`,
    );
    console.log(`Logged:  ${MAINNET_EXECUTION_LOG_PATH}`);
    console.log("");
    if (!ok) process.exit(1);
  } catch (err) {
    let message = err instanceof Error ? err.message : String(err);
    if (err instanceof HyperliquidExecutionError) {
      message = `${message} :: ${JSON.stringify(err.body)}`;
    } else if (err instanceof PreTradeValidationError) {
      message = `${message} :: ${err.reasons.join("|")}`;
    }
    appendMainnetExecutionLog({
      timestamp: new Date().toISOString(),
      mode: "LIVE",
      symbol: target.symbol,
      unifiedAvailableUsd: account.unifiedAvailableUsd,
      probeLatencyMs: probe.probeMs,
      probeBudgetMs: STALE_THRESHOLD_MS,
      probeOk: true,
      midPx,
      fundingRateHourly: target.fundingRateHourly,
      fundingYieldUsdHourly: 0,
      clipUsd: CLIP_USD,
      ok: false,
      error: message,
      stakedHypeDiscount,
      nativeEarnApy,
      excessYieldOverEarn,
    });
    console.log("");
    console.log(`RESULT: LIVE FAIL — ${message}`);
    console.log(`Logged:  ${MAINNET_EXECUTION_LOG_PATH}`);
    console.log("");
    process.exit(1);
  }
}
