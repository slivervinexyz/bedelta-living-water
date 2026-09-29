import { performance } from "node:perf_hooks";
import { buildSystemState } from "../src/core/state";
import {
  auditLiveBookSoilResistance,
  buildSoilInputFromLiveBook,
  type LiveBookSoilProbe,
} from "../src/services/check-soil-resistance";
import {
  PANIC_IMBALANCE_THRESHOLD,
  computeOrderbookImbalanceRatio,
  evalCounterAttackOpportunity,
  type CounterAttackInput,
} from "../src/services/counter-attack-matrix";
import {
  HL_SESSION_KEY_AGENT_NAME,
  buildSessionKeyEip712Stub,
  signAndExecuteOrder,
  stubSignSessionKeyPayload,
  type SigningResult,
} from "../src/services/session-key-adapter";
import {
  ACCOUNT_BALANCE_USD,
  ORDER_NOTIONAL_USD,
  type PairSimulation,
  type StressPair,
} from "./dry-run-sandbox.types";

export function logPhase(phase: string, detail: string): void {
  console.log(`[${phase}] ${detail}`);
}

export function buildCounterAttackInput(pair: StressPair): CounterAttackInput {
  const midPx = (pair.bestBid + pair.bestAsk) / 2;
  const spreadBps = ((pair.bestAsk - pair.bestBid) / midPx) * 10_000;

  return {
    symbol: pair.symbol,
    markPx: pair.markPx,
    soilAnchorPx: pair.bestBid,
    bestBid: pair.bestBid,
    bestAsk: pair.bestAsk,
    midPx,
    bidDepthUsd: pair.bidDepthUsd,
    askDepthUsd: pair.askDepthUsd,
    depthUsd: Math.min(pair.bidDepthUsd, pair.askDepthUsd),
    spreadBps,
    priceImpactBps: spreadBps,
    accountBalanceUsd: ACCOUNT_BALANCE_USD,
    orderNotionalUsd: ORDER_NOTIONAL_USD,
  };
}

function buildSoilProbe(input: CounterAttackInput): LiveBookSoilProbe {
  return {
    symbol: input.symbol,
    bestBid: input.bestBid,
    bestAsk: input.bestAsk,
    midPx: input.midPx,
    bidDepthUsd: input.bidDepthUsd,
    askDepthUsd: input.askDepthUsd,
    spreadBps: input.spreadBps ?? 0,
    priceImpactBps: input.priceImpactBps ?? 0,
    depthUsd: input.depthUsd ?? 0,
  };
}

export async function executeHotPath(
  pair: StressPair,
  systemState: ReturnType<typeof buildSystemState>,
): Promise<Omit<PairSimulation, "eip712Json">> {
  const t0 = performance.now();
  const input = buildCounterAttackInput(pair);
  const imbalance = computeOrderbookImbalanceRatio(
    input.askDepthUsd,
    input.bidDepthUsd,
  );

  const soilProbe = buildSoilProbe(input);
  const soilAudit = auditLiveBookSoilResistance(soilProbe);
  const soilInput = buildSoilInputFromLiveBook(soilProbe);
  const counter = evalCounterAttackOpportunity(input);

  let signing: SigningResult | null = null;

  if (counter.armed && counter.limitPx && counter.sz) {
    signing = await signAndExecuteOrder(
      {
        asset: pair.asset,
        isBuy: true,
        limitPx: counter.limitPx,
        sz: counter.sz,
        reduceOnly: false,
        orderType: { limit: { tif: "Alo" } },
      },
      {
        systemState,
        nonce: 1,
        contractTarget: "0x0000000000000000000000000000000000000000",
        hlAction: "order",
      },
    );
  }

  return {
    pair,
    imbalance,
    counter,
    soilOk: soilAudit.ok,
    soilReasons: soilAudit.reasons,
    soilDepthUsd: soilInput.depthUsd ?? 0,
    soilSpreadBps: soilAudit.spreadBps,
    signing,
    elapsedMs: performance.now() - t0,
  };
}

export function attachEip712Json(
  sim: Omit<PairSimulation, "eip712Json">,
): PairSimulation {
  if (!sim.counter.armed || !sim.counter.limitPx || !sim.counter.sz) {
    return { ...sim, eip712Json: null };
  }

  const eip712 = buildSessionKeyEip712Stub(
    {
      asset: sim.pair.asset,
      isBuy: true,
      limitPx: sim.counter.limitPx,
      sz: sim.counter.sz,
      reduceOnly: false,
      orderType: { limit: { tif: "Alo" } },
    },
    1,
    `0x${sim.pair.symbol}:dry-run`.padEnd(64, "0").slice(0, 64),
    true,
  );

  return {
    ...sim,
    eip712Json: JSON.stringify({
      domain: eip712.domain,
      order: eip712.message.action.orders[0],
      nonce: eip712.message.nonce,
    }),
  };
}

export function printSimulation(sim: PairSimulation): void {
  const { pair, counter, imbalance } = sim;

  logPhase(
    "PHASE 1 · PANIC DETECTION",
    `${pair.symbol} imbalance=${imbalance.toFixed(4)} threshold=${PANIC_IMBALANCE_THRESHOLD} ` +
      `${imbalance > PANIC_IMBALANCE_THRESHOLD ? "TRIP ✓" : "MISS ✗"}`,
  );

  logPhase(
    "PHASE 2 · SOIL ANCHOR",
    `checkSoilResistance(${pair.symbol}) anchor=${pair.bestBid} mark=${pair.markPx} ` +
      `${sim.soilOk ? "PASS ✓" : "TRIP ✗"} ` +
      `depth=$${sim.soilDepthUsd.toLocaleString()} slippage=${sim.soilSpreadBps.toFixed(2)}bps ` +
      `reasons=[${sim.soilReasons.join("|") || "none"}]`,
  );

  logPhase(
    "PHASE 3 · RISK GATE",
    `${pair.symbol} verdict=${counter.verdict} armed=${counter.armed} ` +
      `liveSlippage=${counter.liveSlippageBps.toFixed(2)}bps ` +
      `dynamicMaxSl=$${counter.dynamicMaxSlUsd.toFixed(0)} notional=$${counter.orderNotionalUsd.toFixed(0)}`,
  );

  if (!counter.armed || !sim.signing) {
    logPhase(
      "CHEMICAL EFFECT · INTERCEPT",
      `${pair.symbol} counter-attack blocked — ${counter.reasons.join("; ")}`,
    );
    return;
  }

  logPhase(
    "PHASE 4 · SESSION KEY",
    `${pair.symbol} Alo passive limit px=${counter.limitPx} sz=${counter.sz} ` +
      `agent=${HL_SESSION_KEY_AGENT_NAME} testnet=b hash=${sim.signing.signatureHash ?? "null"}`,
  );

  logPhase("CHEMICAL EFFECT · EIP-712 STUB", sim.eip712Json ?? "{}");
}

export async function warmupCrypto(): Promise<void> {
  await stubSignSessionKeyPayload(
    buildSessionKeyEip712Stub(
      {
        asset: 0,
        isBuy: true,
        limitPx: "1",
        sz: "1",
        reduceOnly: false,
        orderType: { limit: { tif: "Alo" } },
      },
      0,
      "0xwarmup",
      true,
    ),
  );
}
