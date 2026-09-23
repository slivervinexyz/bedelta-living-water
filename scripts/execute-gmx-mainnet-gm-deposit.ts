#!/usr/bin/env tsx
/**
 * Arbitrum One (42161) — GMX v2 GM Pool USDC deposit via ExchangeRouter.multicall.
 * Dry-run default. Live: CONFIRM_GMX_GM_DEPOSIT=YES BROADCAST=1 MAINNET_PK=0x… [--amount=10]
 */
import { createPublicClient, createWalletClient, getAddress, http, parseAbi, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { GMX_V2_EXCHANGE_ROUTER_ARBITRUM } from "../src/config/gmx-revenue";
import { GMX_ETH_USD_MARKET_TOKEN } from "../src/config/gmx-markets";
import {
  buildGmxGmDepositRouterMulticall,
  buildGmxGmUsdcOnlyDepositPayload,
  GMX_GM_ETH_USDC_MARKET,
  stripGmxGmDepositOnChainMetadata,
} from "../src/services/adapters/gmx-gm-deposit-router-encode";
import {
  ensureGmxCollateralAllowance,
  GMX_USDC_ARBITRUM,
} from "../src/services/adapters/gmx-micro-fill-router-encode";
import { isBypassSimulationEnabled } from "../src/services/adapters/gmx-micro-fill-execution-errors";
import { refreshArbitrumGasGuard } from "../src/services/risk/arbitrum-gas-guard";
import { refreshSequencerGuard } from "../src/services/risk/sequencer-guard";
import { shouldBypassOracleLagDeadlock, shouldBypassSoftConfirmationProbe } from "../src/core/soil-resistance-core";
import { loadMainnetEnv, resolveMainnetPrivateKey } from "./_shared/mainnet-env";
import { resolveBufferedEip1559Fees } from "./gmx-micro-fill-dispatch";
import { printLiveHarnessBypassBanner } from "./_shared/live-harness-warning";
import { printVenuePreflightFail, runVenuePreflight } from "./_shared/venue-preflight-report";
import { validateGmxExecutionGuards } from "./gmx-v2-execution-cli";

const CHAIN_ID = 42161;
const DEFAULT_RPC = "https://arb1.arbitrum.io/rpc";
const DEFAULT_AMOUNT_USD = 10;
const routerAbi = parseAbi(["function multicall(bytes[] data) payable returns (bytes[])"]);

const truthy = (v: string | undefined): boolean => {
  const t = (v ?? "").trim().toLowerCase();
  return t === "1" || t === "true" || t === "yes";
};

function resolveRpc(): string { return (process.env.ARB_MAINNET_RPC_URL ?? DEFAULT_RPC).trim(); }
function armed(): boolean { return process.env.BROADCAST === "1" && process.env.CONFIRM_GMX_GM_DEPOSIT === "YES"; }
function bypassGasGuard(): boolean { return truthy(process.env.BYPASS_GAS_GUARD); }
function allowStaleOracle(argv: string[]): boolean {
  return argv.includes("--allow-stale-oracle") || truthy(process.env.ALLOW_STALE_ORACLE);
}
function parseAmountUsd(argv: string[]): number {
  const eq = argv.find((a) => a.startsWith("--amount="));
  const inline = eq ? eq.slice("--amount=".length) : argv[argv.indexOf("--amount") + 1];
  const raw = inline ?? process.env.GMX_GM_DEPOSIT_USD ?? String(DEFAULT_AMOUNT_USD);
  const amount = Number.parseFloat(raw);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error(`INVALID_AMOUNT_USD: ${raw}`);
  return amount;
}
function usdcFromUsd(amountUsd: number): bigint {
  return BigInt(Math.floor(amountUsd * 1_000_000));
}
function validateGuards(staleOracleOk: boolean): { ok: boolean; reasons: string[] } {
  if (bypassGasGuard()) {
    console.warn("[gmx-gm-deposit] BYPASS_GAS_GUARD=true — skipping Arbitrum gas guard");
    return { ok: true, reasons: [] };
  }
  return validateGmxExecutionGuards(staleOracleOk);
}

async function main(): Promise<void> {
  loadMainnetEnv();
  const argv = process.argv.slice(2);
  const rpc = resolveRpc();
  const amountUsd = parseAmountUsd(argv);
  const usdcAmount = usdcFromUsd(amountUsd);
  const probeBypass = shouldBypassSoftConfirmationProbe();
  const staleOracleOk = allowStaleOracle(argv) || shouldBypassOracleLagDeadlock() || probeBypass;
  if (staleOracleOk) process.env.ALLOW_STALE_ORACLE = "1";
  printLiveHarnessBypassBanner();

  const client = createPublicClient({ chain: arbitrum, transport: http(rpc) });
  if ((await client.getChainId()) !== CHAIN_ID) throw new Error(`refuse: expected chain ${CHAIN_ID}`);

  const gmSigner = armed() ? privateKeyToAccount(resolveMainnetPrivateKey()).address : undefined;
  const preflight = await runVenuePreflight({
    matrixId: "gmx-gm-deposit",
    signer: gmSigner,
    amountUsd,
    rpc,
    client,
  });
  if (!preflight.ok) {
    printVenuePreflightFail(preflight);
    process.exit(1);
  }

  await Promise.all([refreshSequencerGuard(), refreshArbitrumGasGuard({ targetYieldUsd: amountUsd * 0.001 })]);
  const guardVerdict = validateGuards(staleOracleOk);
  if (!guardVerdict.ok) throw new Error(`GUARD_BLOCKED:${guardVerdict.reasons.join("|")}`);
  if (isBypassSimulationEnabled()) {
    console.warn("[gmx-gm-deposit] BYPASS_SIMULATION=true — skipping eth_call preflight");
  }

  const market = getAddress(GMX_ETH_USD_MARKET_TOKEN);
  if (market !== GMX_GM_ETH_USDC_MARKET) throw new Error(`GMX_GM_MARKET_MISMATCH: ${market}`);
  const receiver = armed() ? privateKeyToAccount(resolveMainnetPrivateKey()).address : getAddress("0xbd65d785Dac74EBa9efFdB357b2dC52fCC26EC7F");
  const payload = stripGmxGmDepositOnChainMetadata(
    buildGmxGmUsdcOnlyDepositPayload({ receiver, usdcAmount, marketToken: market }),
  );
  const { calls, data, value, executionFee, shortTokenAmount } = buildGmxGmDepositRouterMulticall(payload, market);

  const summary = {
    event: armed() ? "GMX_GM_DEPOSIT_LIVE" : "GMX_GM_DEPOSIT_DRY_RUN",
    network: "arbitrum-one",
    chainId: CHAIN_ID,
    amountUsd,
    usdcAmount: usdcAmount.toString(),
    market,
    receiver,
    executionFee: executionFee.toString(),
    collateral: shortTokenAmount.toString(),
    multicallLegs: calls.length,
    router: GMX_V2_EXCHANGE_ROUTER_ARBITRUM,
    dataLen: data.length,
    msgValue: value.toString(),
    bypass: { staleOracle: staleOracleOk, gasGuard: bypassGasGuard(), simulation: isBypassSimulationEnabled() },
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify(summary, null, 2));

  if (!armed()) {
    console.log("[gmx-gm-deposit] dry-run — set CONFIRM_GMX_GM_DEPOSIT=YES BROADCAST=1 MAINNET_PK=0x… [--amount=10]");
    return;
  }

  const pk = resolveMainnetPrivateKey();
  const account = privateKeyToAccount(pk);
  const wallet = createWalletClient({ account, chain: arbitrum, transport: http(rpc) });
  await ensureGmxCollateralAllowance({
    client, owner: account.address, token: getAddress(GMX_USDC_ARBITRUM), required: usdcAmount, pk, chain: arbitrum, rpc,
    resolveFees: () => resolveBufferedEip1559Fees(client),
  });

  if (!isBypassSimulationEnabled()) {
    await client.simulateContract({
      address: getAddress(GMX_V2_EXCHANGE_ROUTER_ARBITRUM),
      abi: routerAbi,
      functionName: "multicall",
      args: [calls],
      value,
      account: account.address,
    });
  }

  const fees = await resolveBufferedEip1559Fees(client);
  const tx = await wallet.writeContract({
    address: getAddress(GMX_V2_EXCHANGE_ROUTER_ARBITRUM),
    abi: routerAbi,
    functionName: "multicall",
    args: [calls],
    value,
    maxFeePerGas: fees.maxFeePerGas,
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
    gas: 3_000_000n,
  });
  const receipt = await client.waitForTransactionReceipt({ hash: tx });
  console.log("[gmx-gm-deposit] broadcast OK", {
    tx,
    status: receipt.status,
    block: receipt.blockNumber.toString(),
    arbiscan: `https://arbiscan.io/tx/${tx}`,
  });
}

main().catch((err) => {
  console.error("[gmx-gm-deposit] fatal", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
