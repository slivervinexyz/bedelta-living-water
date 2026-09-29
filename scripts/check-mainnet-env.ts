#!/usr/bin/env tsx
/**
 * Pre-flight mainnet env verification — loads `.env.production` (never prints secrets).
 * Also validates sole Worker SSOT (`wrangler.toml`) + hourly funding cron.
 *
 * Usage: pnpm check:mainnet
 */

import { loadEnvProduction } from "./_shared/mainnet-env";
import { probeNativeUsdcEarnApy } from "../src/services/hyperliquid/earn-probe";
import { FRICTION_BUFFER_APY } from "../src/services/yield/rebalance-rules";
import type { CheckRow } from "./check-mainnet-env.types";
import {
  checkRiskEnvelope,
  checkSessionPk,
  checkUserAddress,
  checkWorkerSsot,
  printReport,
} from "./check-mainnet-env.utils";

function main(): void {
  const rows: CheckRow[] = [];
  let exitCode = 0;

  try {
    loadEnvProduction();
    rows.push({
      check: ".env.production",
      status: "PASS",
      detail: "loaded (local secrets SSOT · gitignored)",
    });
  } catch (err) {
    rows.push({
      check: ".env.production",
      status: "FAIL",
      detail: err instanceof Error ? err.message : String(err),
    });
    printReport(rows);
    process.exit(1);
  }

  const pk = (process.env.HYPERLIQUID_MAINNET_SESSION_PK ?? "").trim();
  const addr = (process.env.HYPERLIQUID_MAINNET_USER_ADDRESS ?? "").trim();
  const isMainnet = (process.env.IS_MAINNET ?? "").trim().toLowerCase();

  if (!checkSessionPk(rows, pk)) exitCode = 1;
  if (!checkUserAddress(rows, addr)) exitCode = 1;

  if (isMainnet === "true") {
    rows.push({ check: "IS_MAINNET", status: "PASS", detail: "true" });
  } else {
    rows.push({
      check: "IS_MAINNET",
      status: "FAIL",
      detail: `expected "true", got "${isMainnet || "(empty)"}"`,
    });
    exitCode = 1;
  }

  if (!checkRiskEnvelope(rows)) exitCode = 1;

  const ssotFails = checkWorkerSsot(rows);
  if (ssotFails > 0) exitCode = 1;

  const tgToken = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  const tgChat = (process.env.TELEGRAM_CHAT_ID ?? "").trim();
  if (tgToken && tgChat) {
    rows.push({
      check: "Telegram fail-closed",
      status: "PASS",
      detail: "credentials present in .env.production",
    });
  } else {
    rows.push({
      check: "Telegram fail-closed",
      status: "WARN",
      detail:
        "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID unset — alerts skip until wrangler secret put",
    });
  }

  void (async () => {
    try {
      const earn = await probeNativeUsdcEarnApy();
      const ok =
        earn.HURDLE_RATE_APY > 0 &&
        earn.HURDLE_RATE_APY === earn.nativeUsdcEarnApy;
      rows.push({
        check: "Native Earn Hurdle",
        status: ok ? "PASS" : "FAIL",
        detail: `APY=${(earn.nativeUsdcEarnApy * 100).toFixed(2)}% · buffer=${(FRICTION_BUFFER_APY * 100).toFixed(1)}% · ${earn.source}`,
      });
      if (!ok) exitCode = 1;
    } catch (err) {
      rows.push({
        check: "Native Earn Hurdle",
        status: "FAIL",
        detail: err instanceof Error ? err.message : String(err),
      });
      exitCode = 1;
    }
    printReport(rows);
    process.exit(exitCode);
  })();
}

main();
