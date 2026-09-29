#!/usr/bin/env tsx
/** 3-Tier Historical Black Swan & Monte Carlo counterfactual backtest engine. */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  printBacktestSummary,
  runHistoricalBlackSwanBacktest,
  writeHistoricalBlackSwanSsot,
} from "./historical-blackswan/backtest-runner";

export {
  runHistoricalBlackSwanBacktest,
  writeHistoricalBlackSwanSsot,
  printBacktestSummary,
} from "./historical-blackswan/backtest-runner";
export type { HistoricalBlackSwanSsot } from "./historical-blackswan/backtest-types";

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return fileURLToPath(import.meta.url) === resolve(entry);
}

if (isDirectRun()) {
  const report = runHistoricalBlackSwanBacktest();
  printBacktestSummary(report);
  writeHistoricalBlackSwanSsot(report);
}
