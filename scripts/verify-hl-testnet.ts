#!/usr/bin/env tsx
/**
 * HL Testnet Two-Phase Saga verification — Prepare → Commit or TTL Abort audit log.
 *
 * Dry-run by default. Set HL_TESTNET_PRIVATE_KEY for live testnet exchange posts.
 *
 * Usage:
 *   pnpm grant:hl-testnet
 *   HL_TESTNET_PRIVATE_KEY=0x... HL_LIVE=1 pnpm grant:hl-testnet
 */

import { createHash } from "node:crypto";
import { Wallet } from "ethers";
import type { PreTradeValidationInput } from "../src/adapters/hl/execution-types";
import { createHlIntentBridge } from "../src/adapters/hl/hl-intent-bridge";
import {
  executeHlSessionKeyOrder,
  type HlSessionKeyExecutorOptions,
} from "../src/adapters/hl/session-key-executor";
import {
  __clearIntentLedgerForTests,
  abortIntent,
  commitIntent,
  createCrossLegIntent,
  getIntent,
  prepareIntent,
  type IntentLeg,
  type PrepareLegFn,
} from "../src/core/intent-ledger";
import { buildSystemState } from "../src/core/state";
import { resolveHlTestnetPrivateKey, isFundedHlTestnetPrivateKey } from "../src/env/hl-testnet-key";

const HL_LEG = {
  venue: "HL" as const,
  side: "SHORT" as const,
  sizeUsd: 100,
  symbol: "ETH",
};

const POLY_LEG = {
  venue: "POLYMARKET" as const,
  side: "BUY" as const,
  sizeUsd: 25,
  symbol: "ETH",
};

const GRANT_ETH_LIMIT_PX = 3_500;
const GRANT_ACCOUNT_BALANCE_USD = 50_000;

interface AuditStep {
  intentId: string;
  phase: string;
  ok: boolean;
  reason?: string;
  dryRun: boolean;
  responseRef?: string;
}

function responseRef(payload: unknown): string {
  const raw = JSON.stringify(payload);
  return `sha256:${createHash("sha256").update(raw).digest("hex").slice(0, 16)}`;
}

/** Healthy pre-trade verification input for grant PREPARE — satisfies Pgate + soil gates. */
function buildGrantPreTradeInput(
  leg: IntentLeg,
  accountBalanceUsd: number,
): PreTradeValidationInput {
  const hlPerp = GRANT_ETH_LIMIT_PX;
  return {
    symbol: leg.symbol ?? "ETH",
    hlSpot: hlPerp * 0.9999,
    hlPerp,
    dydxPerp: hlPerp * 1.0001,
    depthUsd: 500_000,
    latencyMs: 50,
    expectedSlippage: 0.0005,
    accountBalanceUsd,
    orderSizeUsd: leg.sizeUsd,
    foolProof: {
      positionValueUsd: leg.sizeUsd,
      reduceOnly: false,
      profile: "institutional",
    },
  };
}

function createGrantPrepareLeg(
  executorOpts: HlSessionKeyExecutorOptions,
): PrepareLegFn {
  const accountBalanceUsd =
    executorOpts.systemState?.accountBalanceUsd ?? GRANT_ACCOUNT_BALANCE_USD;

  return async (leg, legIndex) => {
    if (leg.venue !== "HL") {
      if (leg.sizeUsd <= 0) {
        return { legIndex, ok: false, reason: "INVALID_LEG_SIZE" };
      }
      return { legIndex, ok: true, filledUsd: leg.sizeUsd };
    }

    const result = await executeHlSessionKeyOrder(leg, {
      ...executorOpts,
      limitPx: GRANT_ETH_LIMIT_PX,
      preTrade: buildGrantPreTradeInput(leg, accountBalanceUsd),
    });

    if (!result.ok) {
      return {
        legIndex,
        ok: false,
        reason: result.reason ?? "HL_PREPARE_FAILED",
      };
    }

    return {
      legIndex,
      ok: true,
      filledUsd: result.filledUsd ?? leg.sizeUsd,
    };
  };
}

async function main(): Promise<void> {
  const privateKey = resolveHlTestnetPrivateKey();
  const wantsLive =
    process.env.HL_LIVE === "1" || process.env.HL_LIVE === "true";
  const hasFundedKey = isFundedHlTestnetPrivateKey(privateKey);
  /** Live POST only when HL_LIVE + a non-default funded testnet key is supplied. */
  const livePost = wantsLive && hasFundedKey;
  const dryRun = !livePost;
  const runCommitDemo = process.env.HL_VERIFY_TTL !== "0";

  __clearIntentLedgerForTests();

  const executorOpts: HlSessionKeyExecutorOptions = {
    signer: new Wallet(privateKey),
    dryRun,
    isTestnet: true,
    systemState: buildSystemState({
      accountBalanceUsd: GRANT_ACCOUNT_BALANCE_USD,
      currentCri: 100,
      skipHardlockAssert: true,
    }),
  };

  const bridge = createHlIntentBridge(executorOpts);
  const prepareLeg = createGrantPrepareLeg(executorOpts);

  const auditLog: AuditStep[] = [];
  const intentId = `hl-testnet-${Date.now()}`;

  createCrossLegIntent({
    id: intentId,
    legs: [HL_LEG, POLY_LEG],
    ttlMs: 30_000,
    now: Date.now(),
  });

  auditLog.push({
    step: "CREATE",
    intentId,
    phase: "PENDING",
    ok: true,
    dryRun,
  });

  const prepared = await prepareIntent(intentId, {
    prepareLeg,
    flattenLeg: bridge.flattenLeg,
  });

  auditLog.push({
    step: "PREPARE",
    intentId,
    phase: prepared.intent.phase,
    ok: prepared.ok,
    reason: prepared.reason,
    dryRun,
    responseRef: responseRef({
      legResults: prepared.intent.legResults,
      flattenLog: bridge.hlFlattenLog,
    }),
  });

  if (runCommitDemo && prepared.ok && prepared.intent.phase === "PREPARED") {
    const committed = await commitIntent(intentId, {
      commitLeg: bridge.commitLeg,
      flattenLeg: bridge.flattenLeg,
    });

    auditLog.push({
      step: "COMMIT",
      intentId,
      phase: committed.intent.phase,
      ok: committed.ok,
      reason: committed.reason,
      dryRun,
      responseRef: responseRef({
        flattenActions: committed.intent.flattenActions,
        flattenLog: bridge.hlFlattenLog,
      }),
    });
  }

  const abortId = `hl-testnet-abort-${Date.now()}`;
  createCrossLegIntent({ id: abortId, legs: [HL_LEG, POLY_LEG] });

  const abortPrepared = await prepareIntent(abortId, {
    prepareLeg,
    flattenLeg: bridge.flattenLeg,
  });

  if (abortPrepared.ok && abortPrepared.intent.phase === "PREPARED") {
    const aborted = await abortIntent(abortId, "GRANT_VERIFY_OPERATOR_ABORT", {
      flattenLeg: bridge.flattenLeg,
    });

    auditLog.push({
      step: "ABORT",
      intentId: abortId,
      phase: aborted.intent.phase,
      ok: aborted.ok,
      reason: aborted.reason,
      dryRun,
      responseRef: responseRef({ flattenActions: aborted.intent.flattenActions }),
    });
  } else {
    const snapshot = getIntent(abortId);
    auditLog.push({
      step: "ABORT",
      intentId: abortId,
      phase: snapshot?.phase ?? abortPrepared.intent.phase,
      ok: false,
      reason:
        abortPrepared.reason ??
        `SKIP_ABORT_NOT_PREPARED:${snapshot?.phase ?? abortPrepared.intent.phase}`,
      dryRun,
      responseRef: responseRef({
        legResults: abortPrepared.intent.legResults,
        flattenLog: bridge.hlFlattenLog,
      }),
    });
  }

  const report = {
    event: "HL_TESTNET_SAGA_VERIFY",
    network: "hyperliquid-testnet",
    dryRun,
    livePost,
    liveHint: livePost
      ? "Live mode — check Hyperliquid testnet explorer for wallet activity"
      : wantsLive && !hasFundedKey
        ? "HL_LIVE set without HL_TESTNET_PRIVATE_KEY — preTrade pipeline dry-run only"
        : "Set HL_TESTNET_PRIVATE_KEY + HL_LIVE=1 for live exchange posts",
    auditLog,
    timestamp: new Date().toISOString(),
  };

  console.log(JSON.stringify(report, null, 2));

  const failed = auditLog.some((s) => !s.ok);
  if (failed) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[grant:hl-testnet] failed", err);
  process.exitCode = 1;
});
