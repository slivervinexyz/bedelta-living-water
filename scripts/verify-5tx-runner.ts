#!/usr/bin/env tsx
/**
 * Grant reviewer CLI — offline 5-TX chain proof verification (no secret keys).
 *
 * Usage:
 *   pnpm run verify:grant
 */

import {
  HL_TESTNET_EXPLORER_TX_BASE,
  VERIFIED_5TX_ORDER_COUNT,
  computeVerified5TxSha256Anchor,
  formatSoilTensileBadge,
  formatVerificationAnchor,
  loadVerified5TxResults,
  type Verified5TxResults,
} from "../src/data/verified-5tx";

const TX_HASH_RE = /^0x[0-9a-f]{64}$/i;

function assertChainProof(results: Verified5TxResults): void {
  if (results.network !== "hyperliquid-testnet") {
    throw new Error(`Unexpected network: ${results.network}`);
  }
  if (results.fills.length !== VERIFIED_5TX_ORDER_COUNT) {
    throw new Error(
      `Expected ${VERIFIED_5TX_ORDER_COUNT} fills, got ${results.fills.length}`,
    );
  }
  if (results.soilAudit?.ok !== true) {
    throw new Error("Soil audit must pass for grant proof");
  }

  for (const fill of results.fills) {
    if (!TX_HASH_RE.test(fill.txHash)) {
      throw new Error(`Invalid tx hash at index ${fill.index}: ${fill.txHash}`);
    }
    const expectedUrl = `${HL_TESTNET_EXPLORER_TX_BASE}${fill.txHash}`;
    if (fill.explorerUrl !== expectedUrl) {
      throw new Error(`Explorer URL mismatch at index ${fill.index}`);
    }
    if (fill.dryRun) {
      throw new Error(`Fill ${fill.index} is dry-run — grant proof requires live fills`);
    }
  }

  if (results.aggregate.sampleCount !== VERIFIED_5TX_ORDER_COUNT) {
    throw new Error("Aggregate sample count mismatch");
  }
}

function main(): void {
  const results = loadVerified5TxResults();
  assertChainProof(results);

  const anchor = computeVerified5TxSha256Anchor(results.fills);
  const soilBoostApplied = results.soilAudit?.soilBoostApplied === true;

  const report = {
    event: results.event,
    network: results.network,
    dryRun: results.dryRun,
    livePost: results.livePost,
    wallet: results.wallet,
    timestamp: results.timestamp,
    soilAudit: results.soilAudit,
    aggregate: results.aggregate,
    fills: results.fills.map((fill) => ({
      index: fill.index,
      side: fill.side,
      txHash: fill.txHash,
      explorerUrl: fill.explorerUrl,
      soilPassed: fill.soilPassed,
      savedUsd: fill.savedUsd,
    })),
    sha256Anchor: anchor,
    verificationAnchor: formatVerificationAnchor(results),
    soilTensile: formatSoilTensileBadge(results),
  };

  console.log(JSON.stringify(report, null, 2));
  console.error(
    `\n[AUDIT] Soil Resistance PASS (Testnet Liquidity Refill Applied: ${soilBoostApplied})`,
  );
  if (soilBoostApplied && results.soilAudit?.originalDepthUsd != null) {
    console.error(
      `[AUDIT] Original depthUsd: ${results.soilAudit.originalDepthUsd} → boosted for testnet gate`,
    );
  }
  console.error("\n[verify:grant] PASS — no secret keys required");
}

try {
  main();
} catch (err) {
  console.error("[verify:grant] failed", err);
  process.exitCode = 1;
}
