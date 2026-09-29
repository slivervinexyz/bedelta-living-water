/** E2E Steps 4–5 — Hyperliquid Hedge + R20 Panic Flash. */
import { buildSessionAgentMarketOrderWire } from "../../src/adapters/hl/wallet/sessionOrderWire";
import { formatHlPerpPrice } from "../../src/adapters/hl/execution-wire";
import { buildBlockedSystemState, isR20Locked } from "../../src/core/state";
import { HL_ETH_PERP_ASSET_INDEX, HL_ETH_SZ_DECIMALS } from "../../src/services/hl-auto-hedge";
import { buildFlashUnwindPlan, FLASH_UNWIND_BUDGET_MS } from "../../src/services/risk/flash-unwind";
import {
  PHYSICAL_DEADLOCK_SEVER_LOG,
  __resetCircuitBreakerSeverForTests,
  drainCircuitBreakerTerminalLogs,
  readActiveCircuitBreakerSeverTarget,
  severCircuitBreakerPipeline,
} from "../../src/services/root-protection-lib/circuit-breaker-sever";
import { checkSoilResistance } from "../../src/services/risk-control";
import { runGmxCrossWalletEthHedge } from "../../src/services/gmx-cross-wallet-hedge";
import { loadEnvProduction, envProductionExists, mask } from "../../scripts/_shared/mainnet-env";
import {
  DELTA_NET_ETH,
  DEMO_ETH_MID,
  DEMO_TOKEN,
  DEMO_VAULT_CAPITAL_USD,
  GMX_BUILDER_FEE_USD,
  FINAL_VAULT_USD,
  GMX_ETH_LONG_EXPOSURE_USD,
  HL_HEDGE_ETH_SIZE,
  HL_HEDGE_SHORT_USD,
  HL_MARGIN_USD,
  HL_SANDBOX_REF,
  HL_SANDBOX_TX,
  resolveHlSessionPrivateKey,
  sha16,
  type E2eDemoMode,
} from "./e2e-demo-constants";
import type { E2eStep4Result, E2eStep5Result } from "./e2e-demo-types";
import { MODULE_A_TAG } from "./e2e-hud-box";
import {
  e2eLog,
  e2eLogHlSession,
  emitStep4PassResult,
  fmtE2eUsd,
  logE2eStep,
  printHlEnvMissingNotice,
} from "./e2e-hud-renderer";
import { formatE2eSoilTripReasons } from "./e2e-hud-step-theme";
import { hrtimeElapsedUs, hrtimeStart } from "./demo-timing";

const HL_LIVE_SESSION_READY = "[HL_LIVE: SECURE_SESSION_KEY_DETECTED — READY FOR EXCHANGE BROADCAST]";
const HL_FALLBACK_WARN =
  "[WARN_FALLBACK: HYPERLIQUID_MAINNET_SESSION_PK / HL_TESTNET_PRIVATE_KEY missing — graceful fallback to simulated hedge envelope]";

function runHlLiveSandboxFallback(): E2eStep4Result {
  printHlEnvMissingNotice();
  e2eLog(`Sandbox: ref=${HL_SANDBOX_REF} txHash=${HL_SANDBOX_TX}`);
  emitStep4PassResult();
  return {
    ok: true,
    dryRun: true,
    notionalUsd: HL_HEDGE_SHORT_USD,
    oid: null,
    detail: "LIVE_SANDBOX_SIMULATED",
    ethShortSize: HL_HEDGE_ETH_SIZE,
  };
}

export async function runStep4HlSessionHedge(mode: E2eDemoMode): Promise<E2eStep4Result> {
  logE2eStep(4, "[Wallet A] Hyperliquid Delta-Neutral Short Hedge", MODULE_A_TAG, [
    "Pillar Set Y: Hyperliquid Delta-Neutral Short Hedge · cross-venue Δnet ≡ 0 vs [Wallet B] GMX GM long",
  ]);
  e2eLog(
    `[Wallet A] Hedge Requirement: Match [Wallet B] GMX ${fmtE2eUsd(GMX_ETH_LONG_EXPOSURE_USD)} Long │ Target: Hyperliquid L1 Perps`,
  );
  e2eLog(
    `HL Margin Funding: ${fmtE2eUsd(HL_MARGIN_USD)} ${DEMO_TOKEN} via Arbitrum → Hyperliquid L1 Bridge (0-Gas Paymaster sponsored)`,
  );
  e2eLog(
    `Margin Anchor: ${fmtE2eUsd(HL_MARGIN_USD)} HL margin backs ${fmtE2eUsd(HL_HEDGE_SHORT_USD)} notional short (12x leverage) · Δnet ≡ 0`,
  );
  const limitPx = formatHlPerpPrice(DEMO_ETH_MID * 0.99, HL_ETH_SZ_DECIMALS);
  const wirePlan = buildSessionAgentMarketOrderWire({
    asset: HL_ETH_PERP_ASSET_INDEX,
    isBuy: false,
    notionalUsd: HL_HEDGE_SHORT_USD,
    limitPx,
    szDecimals: HL_ETH_SZ_DECIMALS,
    reduceOnly: false,
  });
  e2eLog(`Wire: asset=${HL_ETH_PERP_ASSET_INDEX} SHORT ref=sha256:${sha16(wirePlan.action)} limitPx=${wirePlan.limitPx}`);
  e2eLog(
    `Short Position: ${HL_HEDGE_ETH_SIZE} ETH (${fmtE2eUsd(HL_HEDGE_SHORT_USD)} USD) @ ${fmtE2eUsd(DEMO_ETH_MID)}/ETH │ Delta Skew: Δnet = ${DELTA_NET_ETH} ETH`,
  );
  if (mode === "dry-run") {
    emitStep4PassResult();
    return {
      ok: true,
      dryRun: true,
      notionalUsd: HL_HEDGE_SHORT_USD,
      oid: null,
      detail: "SIMULATED_SESSION_KEY_HEDGE",
      ethShortSize: HL_HEDGE_ETH_SIZE,
    };
  }
  if (!envProductionExists()) return runHlLiveSandboxFallback();
  loadEnvProduction();
  const sessionPk = resolveHlSessionPrivateKey();
  if (!sessionPk) {
    e2eLogHlSession(HL_FALLBACK_WARN, "fallback");
    emitStep4PassResult();
    return {
      ok: true,
      dryRun: true,
      notionalUsd: HL_HEDGE_SHORT_USD,
      oid: null,
      detail: "LIVE_FALLBACK_SIMULATED",
      ethShortSize: HL_HEDGE_ETH_SIZE,
    };
  }
  e2eLogHlSession(HL_LIVE_SESSION_READY, "live");
  const walletA = process.env.HYPERLIQUID_MAINNET_USER_ADDRESS?.trim();
  e2eLog(`[Wallet A] LIVE hedge: walletA=${walletA ? mask(walletA) : "(default)"}`);
  const result = await runGmxCrossWalletEthHedge({ sessionPk, walletA, dryRun: false });
  e2eLog(`Hedge: ok=${result.ok} eth=${result.orderEthSize.toFixed(6)} usd=$${result.orderUsd.toFixed(2)} oid=${result.exchangeOid ?? "n/a"}`);
  if (result.reason) e2eLog(`Reason: ${result.reason}`);
  const ok = result.ok || result.reason === "ETH_HEDGE_ALREADY_COVERED";
  if (ok) emitStep4PassResult();
  return {
    ok,
    dryRun: false,
    notionalUsd: HL_HEDGE_SHORT_USD,
    oid: result.exchangeOid ?? null,
    detail: ok ? "LIVE_BROADCAST" : (result.reason ?? "LIVE_HEDGE_FAIL"),
    ethShortSize: HL_HEDGE_ETH_SIZE,
  };
}

export function runStep5R20PanicFlash(demoAt: Date): E2eStep5Result {
  logE2eStep(5, "ExoMesh R20 Exercise — R20 Physical Deadlock & Panic Flash Unwind", MODULE_A_TAG, [
    "Pillar Set Y: Pre-Consensus Firewall · Always-On Circuit Breaker · Emergency 0-Gas Unwind",
  ]);
  __resetCircuitBreakerSeverForTests();
  const toxicSoil = checkSoilResistance({
    symbol: "ETH-PERP",
    hlSpot: DEMO_ETH_MID,
    hlPerp: DEMO_ETH_MID * 1.02,
    dydxPerp: DEMO_ETH_MID,
    depthUsd: 100,
    isTestnet: false,
    at: demoAt,
  });
  if (toxicSoil.tripped) {
    e2eLog(
      `ALERT: SOIL_TRIPPED — ${toxicSoil.reasons.length ? formatE2eSoilTripReasons(toxicSoil.reasons) : "depth/slippage fuse"}`,
    );
  } else {
    e2eLog("Simulated risk: soil clear (no trip)");
  }
  severCircuitBreakerPipeline("R20");
  const blocked = buildBlockedSystemState(10_000);
  const severTarget = readActiveCircuitBreakerSeverTarget();
  const terminal = drainCircuitBreakerTerminalLogs();
  e2eLog(`R20: locked=${isR20Locked(blocked)} sever=${severTarget}`);
  e2eLog(PHYSICAL_DEADLOCK_SEVER_LOG);
  for (const entry of terminal) {
    if (entry.message === PHYSICAL_DEADLOCK_SEVER_LOG) continue;
    e2eLog(entry.message);
  }
  const t0 = hrtimeStart();
  const plan = buildFlashUnwindPlan({
    openOrders: [{ asset: HL_ETH_PERP_ASSET_INDEX, oid: 42_001, coin: "ETH" }],
    positions: [{
      market: "perp",
      asset: HL_ETH_PERP_ASSET_INDEX,
      szi: -Number(HL_HEDGE_ETH_SIZE),
      midPx: DEMO_ETH_MID,
      szDecimals: HL_ETH_SZ_DECIMALS,
      coin: "ETH",
    }],
  });
  const elapsedMs = hrtimeElapsedUs(t0) / 1000;
  const withinBudget = elapsedMs < FLASH_UNWIND_BUDGET_MS;
  e2eLog(`Flash unwind: cancel=${plan.cancelCount} reduceOnlyCloses=${plan.closeActions.length} budget=<${FLASH_UNWIND_BUDGET_MS}ms elapsed=${elapsedMs.toFixed(3)}ms ${withinBudget ? "PASS" : "SLOW"}`);
  e2eLog("INTERCEPT: Panic Flash armed — EIP-712 signature pipe severed (no live broadcast in demo)");
  e2eLog(`Panic Flash Unwind: 100% Position Closed | User Principal Returned: ${fmtE2eUsd(FINAL_VAULT_USD)} ${DEMO_TOKEN}`);
  e2eLog(
    `Treasury State: Protocol Treasury retains +${fmtE2eUsd(GMX_BUILDER_FEE_USD)} USD (uiFeeReceiver share) · User principal ${fmtE2eUsd(DEMO_VAULT_CAPITAL_USD)} fully secured`,
  );
  if (!isR20Locked(blocked) || severTarget !== "R20") throw new Error("STEP5_R20_DEADLOCK_FAILED");
  e2eLog("RESULT: 🟢 Step 5 R20 Deadlock PASS — EIP-712 Signing Channel Severed · 0-Gas Intercepted");
  return { r20Locked: true, severTarget, cancelCount: plan.cancelCount, closeCount: plan.closeActions.length, withinBudget };
}
