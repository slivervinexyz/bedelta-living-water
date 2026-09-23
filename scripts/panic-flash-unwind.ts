#!/usr/bin/env tsx
/**
 * Panic Flash-Unwind — Cancel-All + Reduce-Only Spot/Perp market close (<1000ms).
 *
 * Usage:
 *   pnpm panic:flash          # dry-run (plan + timed mock broadcast)
 *   pnpm panic:flash --live   # sign & broadcast with session key
 */

import { main } from "./panic-flash/run.js";

main().catch((err) => {
  console.error("[panic:flash] fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
