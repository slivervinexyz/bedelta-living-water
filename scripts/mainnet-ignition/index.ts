#!/usr/bin/env tsx
/**
 * Mainnet Ignition orchestrator — Unified Account, dual Spot+Perp DN clip.
 */

import { HL_EXCHANGE_URL } from "../../src/config/constants";
import { HL_WS_URL } from "../../src/adapters/hl/websocket/types";
import { MAINNET_EXECUTION_LOG_PATH } from "../../src/services/logging/execution-logger";
import { getHypeStakingDiscount } from "../../src/services/yield/fee-schedule";
import { probeNativeUsdcEarnApy } from "../../src/services/hyperliquid/earn-probe";
import {
  loadEnvProduction,
  mask,
  requireEnv,
} from "../_shared/mainnet-env";
import { HL_INFO_URL, LIVE } from "./ignition.constants";
import { runStage1Probe } from "./ignition.stage1";
import { runStage2MicroClip } from "./ignition.stage2";

async function main(): Promise<void> {
  console.log("");
  console.log("═══ MAINNET IGNITION ═══");
  console.log(`Mode: ${LIVE ? "LIVE" : "DRY_RUN"}`);
  console.log(`API:  ${HL_INFO_URL}`);
  console.log(`WS:   ${HL_WS_URL}`);
  console.log(`XCHG: ${HL_EXCHANGE_URL}`);
  console.log(`Log:  ${MAINNET_EXECUTION_LOG_PATH}`);

  loadEnvProduction();
  const sessionPk = requireEnv("HYPERLIQUID_MAINNET_SESSION_PK");
  const userAddress = requireEnv("HYPERLIQUID_MAINNET_USER_ADDRESS");
  const stakedHypeAmount = Math.max(
    0,
    parseFloat(process.env.STAKED_HYPE_AMOUNT ?? "0") || 0,
  );
  const stakedHypeDiscount = getHypeStakingDiscount(stakedHypeAmount);
  console.log(`Session PK: ${mask(sessionPk)}`);
  console.log(`Master:     ${mask(userAddress)}`);
  console.log(
    `HYPE stake: ${stakedHypeAmount} → discount=${(stakedHypeDiscount * 100).toFixed(0)}%`,
  );

  const earn = await probeNativeUsdcEarnApy();
  console.log(
    `Native Earn: ${(earn.nativeUsdcEarnApy * 100).toFixed(2)}% APY (${earn.source})  hurdle=${(earn.HURDLE_RATE_APY * 100).toFixed(2)}%`,
  );
  console.log("");

  const stage1 = await runStage1Probe({
    userAddress,
    stakedHypeAmount,
    stakedHypeDiscount,
    earn,
  });
  if (!stage1) return;

  await runStage2MicroClip(stage1, sessionPk, userAddress);
}

main().catch((err) => {
  console.error("[ignition] fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
