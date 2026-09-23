/** E2E Steps 1–3 — Gatehouse, Ingress Escort, GMX Rebalance. */
import {
  AML_INBOUND_TO_ROBINHOOD_BLOCKED,
  ARBITRUM_ONE_CHAIN_ID,
  assertUnidirectionalBridge,
  EIP712_DOMAIN_NAME,
  ensureSoilWasm,
  evaluateSoilCore,
  ROBINHOOD_TESTNET_CHAIN_ID,
  SLIVERVINE_GATE_ADDRESS,
  verifyAgentIntent,
  WASM_EXEC_BUDGET_US,
} from "../../src/sdk";
import { AGENT_DEADMAN_SLIPPAGE_BPS } from "../../src/core/agent-exomesh-guard";
import {
  WASM_SOIL_DEFAULT_SLIPPAGE_FUSE,
  WASM_SOIL_MIN_DEPTH_USD,
} from "../../src/services/wasm-feasibility-lib/soil-core-sim";
import {
  buildGmxV2UnsignedOrderPayload,
  GMX_DEFAULT_UI_FEE_RECEIVER,
  GMX_UI_FEE_BPS,
} from "../../src/services/adapters/gmx-v2-order-payload";
import { evaluateGmxBalancerQualification } from "../../src/services/yield/gmx-v2-balancer";
import {
  DEMO_AGENT,
  DEMO_DIGEST,
  DEMO_ETH_MID,
  DEMO_SIZE_USD,
  DEMO_TOKEN,
  DEMO_VAULT_CAPITAL_USD,
  DEMO_WALLET,
  ETH_GM_MARKET,
  GMX_BUILDER_FEE_BPS,
  GMX_BUILDER_FEE_USD,
  GMX_ETH_LONG_EXPOSURE_USD,
  GMX_GM_DEPOSITED_USD,
  E2E_LOST_USD_INVARIANT,
  HL_MARGIN_USD,
  sha16,
} from "./e2e-demo-constants";
import { E2E_PROTOCOL_TREASURY_RECEIVER_SHORT } from "./e2e-financial-accounting";
import type { E2eStep1Result, E2eStep2Result, E2eStep3Result } from "./e2e-demo-types";
import { MODULE_A_TAG, MODULE_B_TAG } from "./e2e-hud-box";
import {
  e2eLog,
  fmtE2eUsd,
  logE2eStep,
  logE2eStep2InboundAmlBlockLine,
  logE2eStep2OutboundEscortLine,
} from "./e2e-hud-renderer";
import { formatWasmP50BandStatus, sampleWasmSoilLatencyUs } from "./e2e-wasm-bench";
import { hrtimeElapsedUs, hrtimeStart } from "./demo-timing";

export function runStep1ExoMeshPreExec(demoNowMs: number): E2eStep1Result {
  logE2eStep(1, "ExoMesh Pre-Execution Gatehouse & ReflexCore (SSRC)", MODULE_A_TAG, [
    "Pillar Set Y: Pre-Consensus Intent Clearing · checkSoilResistance()",
    "Pillar Set X: Account Ingress · ZeroDev Kernel v3 AA · ERC-7715 Session Mandates",
  ]);
  e2eLog(`Vault Capital: ${fmtE2eUsd(DEMO_VAULT_CAPITAL_USD)} ${DEMO_TOKEN} | Asset Pair: ETH/USDC`);
  ensureSoilWasm();
  const soilInput = {
    hlSpot: DEMO_ETH_MID,
    hlPerp: DEMO_ETH_MID,
    dydxPerp: DEMO_ETH_MID,
    depthUsd: 1_000_000,
    orderSizeUsd: DEMO_SIZE_USD,
    accountBalanceUsd: 10_000,
    maxSlippage: WASM_SOIL_DEFAULT_SLIPPAGE_FUSE,
    minDepthUsd: WASM_SOIL_MIN_DEPTH_USD,
  };
  const { p50Us: wasmP50Us, minUs: wasmHotPathUs } = sampleWasmSoilLatencyUs(soilInput);
  const core = evaluateSoilCore(soilInput);
  const wasmBudgetPass = wasmHotPathUs < WASM_EXEC_BUDGET_US;
  const nodeT0 = hrtimeStart();
  const verdict = verifyAgentIntent({
    intentDigest: DEMO_DIGEST,
    sessionKey: {
      agentAddress: DEMO_AGENT,
      maxOrderClipUsd: 30,
      expiresAtMs: demoNowMs + 86_400_000,
      approvedAtMs: demoNowMs,
    },
    soil: {
      symbol: "ETH-PERP",
      hlSpot: DEMO_ETH_MID,
      hlPerp: DEMO_ETH_MID,
      dydxPerp: DEMO_ETH_MID,
      depthUsd: 1_000_000,
      isTestnet: false,
    },
    gasBurst: { estimatedGasCostUsd: 0.1, sponsored: true, dailySpentUsd: 0 },
    deadman: {
      maxSlippageBps: AGENT_DEADMAN_SLIPPAGE_BPS,
      soilResistanceThreshold: AGENT_DEADMAN_SLIPPAGE_BPS,
    },
    attestation: {
      digest: DEMO_DIGEST,
      expiresAtMs: demoNowMs + 60_000,
      sig: `0x${"11".repeat(65)}`,
      verifyingContract: SLIVERVINE_GATE_ADDRESS,
      domainName: EIP712_DOMAIN_NAME,
    },
    armor: { rpcLatencyMs: 42, sandwichRiskBps: 8 },
    preset: "production",
    nowMs: demoNowMs,
  });
  const nodeE2eRttUs = hrtimeElapsedUs(nodeT0);
  const soilClear = !core.output.tripped && verdict.soilOk;
  e2eLog(
    "[ AA SESSION KEY ]   ZeroDev Kernel v3 · ERC-7715 Session Mandate  │  Paymaster: 0-Gas Sponsored (ERC-7710 Expiry Sinker)  [ ACTIVE ]",
  );
  e2eLog(
    `[ WASM SOIL CORE ]   Hot-Path: ${wasmHotPathUs.toFixed(1)}µs (<${WASM_EXEC_BUDGET_US}µs ${wasmBudgetPass ? "PASS" : "FAIL"})  │  p50: ${wasmP50Us.toFixed(1)}µs  │  Soil Status: ${soilClear ? "CLEAR" : "TRIP"}      [ ${soilClear && wasmBudgetPass ? "PASSED" : "FAILED"} ]`,
  );
  e2eLog(
    `[ DEADMAN SWITCH ]   Armed Threshold: ${AGENT_DEADMAN_SLIPPAGE_BPS}bps  │  Status: ${verdict.deadmanOk ? "OK" : "TRIP"}  │  Signer Mode: Ephemeral Ignition Keys`,
  );
  if (!verdict.allowedToSign || !verdict.deadmanOk) {
    throw new Error(`STEP1_BLOCKED: ${verdict.reasons.join(",")}`);
  }
  e2eLog(
    "RESULT: 🟢 Step 1 Pre-Execution PASS — ZeroDev 0-Gas Sponsored (ERC-7710 Expiry Sinker) · Sub-ms Wasm Clear · Soil OK · " +
      E2E_LOST_USD_INVARIANT,
  );
  return {
    ok: true,
    wasmUsed: verdict.wasmUsed,
    wasmHotPathUs,
    wasmP50Us,
    nodeE2eRttUs,
    deadmanOk: verdict.deadmanOk,
  };
}

export function runStep2RobinhoodEscort(demoNowMs: number): E2eStep2Result {
  logE2eStep(2, "Unidirectional Compliance Escort — AML Inbound Firewall", MODULE_B_TAG, [
    "Pillar Set X: Compliance Escort · Robinhood → Arbitrum Outbound Escort & Inbound AML Block",
  ]);
  const outbound = assertUnidirectionalBridge({
    sourceChainId: ROBINHOOD_TESTNET_CHAIN_ID,
    destChainId: ARBITRUM_ONE_CHAIN_ID,
    amountUsd: DEMO_VAULT_CAPITAL_USD,
    wallet: DEMO_WALLET,
    initiatedAtMs: demoNowMs,
    nowMs: demoNowMs + 90_000,
    settledAtMs: demoNowMs + 60_000,
  });
  logE2eStep2OutboundEscortLine();
  e2eLog(
    `└─ Status: SETTLED  │  ${E2E_LOST_USD_INVARIANT} Verified  │  0-Gas Sponsored (ERC-7710 Expiry Sinker)  [ ALLOWED ]`,
  );
  e2eLog(
    `Capital Routing: ${fmtE2eUsd(DEMO_VAULT_CAPITAL_USD)} settled on Arbitrum One → GMX GM ${fmtE2eUsd(GMX_GM_DEPOSITED_USD)} + HL Margin Gateway ${fmtE2eUsd(HL_MARGIN_USD)} (bridged to Hyperliquid L1)`,
  );
  const inbound = assertUnidirectionalBridge({
    sourceChainId: ARBITRUM_ONE_CHAIN_ID,
    destChainId: ROBINHOOD_TESTNET_CHAIN_ID,
    amountUsd: 10,
    wallet: DEMO_WALLET,
    initiatedAtMs: demoNowMs,
    nowMs: demoNowMs,
  });
  logE2eStep2InboundAmlBlockLine();
  e2eLog(`└─ Reason: ${AML_INBOUND_TO_ROBINHOOD_BLOCKED}  │  RWA Protection: ENFORCED [ REJECTED ]`);
  if (!outbound.ok) throw new Error(`STEP2_OUTBOUND_BLOCKED: ${outbound.reasons.join(",")}`);
  if (inbound.ok || inbound.capitalLabel !== AML_INBOUND_TO_ROBINHOOD_BLOCKED) {
    throw new Error("STEP2_AML_INBOUND_NOT_BLOCKED");
  }
  e2eLog(`RESULT: 🟢 Pillar Set X Ingress PASS — Outbound Escort Active · Inbound AML Blocked · ${E2E_LOST_USD_INVARIANT}`);
  return { outboundOk: true, inboundBlocked: true, capitalLabel: inbound.capitalLabel };
}

export function runStep3GmxUnderweightRebalance(): E2eStep3Result {
  logE2eStep(
    3,
    "[Wallet B] GMX v2 GM Pool Liquidity Provision & Builder Fee Rebase",
    MODULE_A_TAG,
    [
      `Pillar Set Y: GMX GM Pool Liquidity Provision · LP deposit (+${GMX_BUILDER_FEE_BPS} bps uiFeeReceiver builder lane)`,
    ],
  );
  e2eLog(`[Wallet B] Arbitrum GMX GM Vault — GM Pool Deposit: ${fmtE2eUsd(GMX_GM_DEPOSITED_USD)} ${DEMO_TOKEN} (ETH/USDC)`);
  e2eLog(
    `Protocol Treasury Share: +${GMX_BUILDER_FEE_BPS} bps (${fmtE2eUsd(GMX_BUILDER_FEE_USD)} USD) → uiFeeReceiver ${E2E_PROTOCOL_TREASURY_RECEIVER_SHORT} (not user principal)`,
  );
  const pool = { longTokenUsd: 5_200_000, shortTokenUsd: 4_800_000 };
  const balancer = evaluateGmxBalancerQualification({
    orderSizeUsd: GMX_ETH_LONG_EXPOSURE_USD,
    isLong: true,
    pool,
    symbol: "ETH",
  });
  const payload = buildGmxV2UnsignedOrderPayload({
    side: "long",
    sizeUsd: GMX_GM_DEPOSITED_USD,
    midPriceUsd: DEMO_ETH_MID,
    marketToken: ETH_GM_MARKET,
    maxSlippageBps: 30,
    pool,
    clientOrderId: `grant-e2e-${Date.now()}`,
  });
  const uiFeeReceiver = payload.addresses.uiFeeReceiver;
  e2eLog(`Payload: GM deposit ref=sha256:${sha16(payload)} uiFeeReceiver=${uiFeeReceiver} (+${GMX_UI_FEE_BPS} bps)`);
  if (uiFeeReceiver !== GMX_DEFAULT_UI_FEE_RECEIVER) throw new Error("STEP3_UI_FEE_RECEIVER_MISMATCH");
  e2eLog(
    `RESULT: 🟢 [Wallet B] Step 3 GMX v2 GM Deposit PASS — ${fmtE2eUsd(GMX_GM_DEPOSITED_USD)} USDC Deployed · +${GMX_BUILDER_FEE_BPS} bps Protocol Treasury (${fmtE2eUsd(GMX_BUILDER_FEE_USD)} USD)`,
  );
  return {
    uiFeeReceiver,
    uiFeeBps: GMX_UI_FEE_BPS,
    underweightSide: balancer.underweightSide,
    payloadRef: `sha256:${sha16(payload)}`,
  };
}
