#!/usr/bin/env tsx
/**
 * Arbitrum One (42161) — GMX v2 GM Pool redeem via ExchangeRouter.multicall.
 * Dry-run default. Live: CONFIRM_GMX_GM_WITHDRAW=YES BROADCAST=1 MAINNET_PK=0x… [--amount=100 --gm-price=1.05]
 */
import { createPublicClient, getAddress, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { GMX_V2_EXCHANGE_ROUTER_ARBITRUM } from "../src/config/gmx-revenue";
import { GMX_ETH_USD_MARKET_TOKEN } from "../src/config/gmx-markets";
import { GMX_GM_ETH_USDC_MARKET } from "../src/services/adapters/gmx-gm-withdraw-router-encode";
import { isBypassSimulationEnabled } from "../src/services/adapters/gmx-micro-fill-execution-errors";
import { refreshArbitrumGasGuard } from "../src/services/risk/arbitrum-gas-guard";
import { refreshSequencerGuard } from "../src/services/risk/sequencer-guard";
import { shouldBypassOracleLagDeadlock, shouldBypassSoftConfirmationProbe } from "../src/core/soil-resistance-core";
import { loadMainnetEnv } from "./_shared/mainnet-env";
import {
  auditGmxGmWithdrawAllowanceRows,
  broadcastGmxGmWithdrawMulticall,
  GMX_GM_WITHDRAW_TOKEN_SPENDERS,
  writeGmxGmWithdrawDryRunFixture,
} from "./gmx-gm-withdraw-cli-broadcast";
import { buildGmxGmWithdrawMulticallCapped } from "./gmx-gm-withdraw-cli-build";
import {
  GMX_GM_WITHDRAW_CHAIN_ID,
  isGmxGmWithdrawArmed,
  isGmxGmWithdrawGasGuardBypassed,
  isGmxGmWithdrawStaleOracleAllowed,
  parseGmxGmWithdrawAmountUsd,
  parseGmxGmWithdrawExecutionFeeWei,
  resolveGmxGmWithdrawPk,
  resolveGmxGmWithdrawRpc,
  resolveGmxGmWithdrawTokenAmount,
  validateGmxGmWithdrawGuards,
} from "./gmx-gm-withdraw-cli-args";
import { printLiveHarnessBypassBanner } from "./_shared/live-harness-warning";
import { printVenuePreflightFail, runVenuePreflight } from "./_shared/venue-preflight-report";

async function main(): Promise<void> {
  try {
    loadMainnetEnv();
  } catch {
    /* optional */
  }
  const argv = process.argv.slice(2);
  const rpc = resolveGmxGmWithdrawRpc();
  const amountUsd = parseGmxGmWithdrawAmountUsd(argv);
  const gmTokenAmount = resolveGmxGmWithdrawTokenAmount(argv, amountUsd);
  const executionFeeWei = parseGmxGmWithdrawExecutionFeeWei(argv);
  const probeBypass = shouldBypassSoftConfirmationProbe();
  const staleOracleOk =
    isGmxGmWithdrawStaleOracleAllowed(argv) || shouldBypassOracleLagDeadlock() || probeBypass;
  if (staleOracleOk) process.env.ALLOW_STALE_ORACLE = "1";
  printLiveHarnessBypassBanner();

  const client = createPublicClient({ chain: arbitrum, transport: http(rpc) });
  if ((await client.getChainId()) !== GMX_GM_WITHDRAW_CHAIN_ID) {
    throw new Error(`refuse: expected chain ${GMX_GM_WITHDRAW_CHAIN_ID}`);
  }

  let gmSigner: `0x${string}` | undefined;
  try {
    gmSigner = privateKeyToAccount(resolveGmxGmWithdrawPk()).address;
  } catch {
    gmSigner = undefined;
  }
  const preflight = await runVenuePreflight({
    matrixId: "gmx-gm-withdraw",
    signer: gmSigner,
    amountUsd,
    rpc,
    client,
  });
  if (!preflight.ok) {
    printVenuePreflightFail(preflight);
    process.exit(1);
  }

  await Promise.all([
    refreshSequencerGuard(),
    refreshArbitrumGasGuard({ targetYieldUsd: amountUsd * 0.001 }),
  ]);
  const guardVerdict = validateGmxGmWithdrawGuards(staleOracleOk);
  if (!guardVerdict.ok) throw new Error(`GUARD_BLOCKED:${guardVerdict.reasons.join("|")}`);
  if (isBypassSimulationEnabled()) {
    console.warn("[gmx-gm-withdraw] BYPASS_SIMULATION=true — skipping eth_call preflight");
  }

  const market = getAddress(GMX_ETH_USD_MARKET_TOKEN);
  if (market !== GMX_GM_ETH_USDC_MARKET) throw new Error(`GMX_GM_MARKET_MISMATCH: ${market}`);
  const receiver = isGmxGmWithdrawArmed()
    ? privateKeyToAccount(resolveGmxGmWithdrawPk()).address
    : getAddress("0xbd65d785Dac74EBa9efFdB357b2dC52fCC26EC7F");
  const built = await buildGmxGmWithdrawMulticallCapped(
    client,
    receiver,
    market,
    gmTokenAmount,
    amountUsd,
    staleOracleOk,
    probeBypass,
    executionFeeWei,
  );
  const allowanceAudit = await auditGmxGmWithdrawAllowanceRows(
    client,
    receiver,
    market,
    built.marketTokenAmount,
  );

  console.log(
    JSON.stringify(
      {
        event: isGmxGmWithdrawArmed() ? "GMX_GM_WITHDRAW_LIVE" : "GMX_GM_WITHDRAW_DRY_RUN",
        network: "arbitrum-one",
        chainId: GMX_GM_WITHDRAW_CHAIN_ID,
        amountUsd,
        gmTokenAmount: built.marketTokenAmount.toString(),
        market,
        receiver,
        executionFee: built.executionFee.toString(),
        multicallLegs: built.calls.length,
        router: GMX_V2_EXCHANGE_ROUTER_ARBITRUM,
        gmTokenSpenders: GMX_GM_WITHDRAW_TOKEN_SPENDERS,
        gmAllowances: allowanceAudit.map((row) => ({
          spender: row.spender,
          allowance: row.allowance.toString(),
          sufficient: row.sufficient,
        })),
        dataLen: built.data.length,
        msgValue: built.value.toString(),
        bypass: {
          staleOracle: staleOracleOk,
          gasGuard: isGmxGmWithdrawGasGuardBypassed(),
          simulation: isBypassSimulationEnabled(),
        },
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  if (!isGmxGmWithdrawArmed()) {
    writeGmxGmWithdrawDryRunFixture(receiver, market, built);
    console.log(
      "[gmx-gm-withdraw] dry-run — set CONFIRM_GMX_GM_WITHDRAW=YES BROADCAST=1 MAINNET_PK=0x… [--amount=100 --gm-price=1.05]",
    );
    return;
  }

  await broadcastGmxGmWithdrawMulticall(rpc, market, built);
}

main().catch((err) => {
  console.error("[gmx-gm-withdraw] fatal", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
