#!/usr/bin/env tsx
/**
 * Arbitrum One (42161) — USD.ai collateral funding probe (Wallet A).
 * Dry-run default. Optional dust: CONFIRM_USDAI_PROBE=YES BROADCAST=1 WALLET_A_PRIVATE_KEY=0x…
 */
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  parseUnits,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { evaluateUsdAiCollateralGuard, USDAI_ARBITRUM_CHAIN_ID } from "../src/adapters/usdai/usdai-adapter";
import { VENUE_USDAI_ARBITRUM } from "../src/core/venue-execution-matrix";
import { loadMainnetEnv, resolveMainnetPrivateKey } from "./_shared/mainnet-env";
import { printLiveHarnessBypassBanner } from "./_shared/live-harness-warning";
import { printVenuePreflightFail, runVenuePreflight } from "./_shared/venue-preflight-report";

const CHAIN_ID = 42161;
const DEFAULT_RPC = "https://arb1.arbitrum.io/rpc";
const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
] as const;

function armed(): boolean {
  return process.env.BROADCAST === "1" && process.env.CONFIRM_USDAI_PROBE === "YES";
}

async function main(): Promise<void> {
  loadMainnetEnv();
  printLiveHarnessBypassBanner();
  const rpc = (process.env.ARB_MAINNET_RPC_URL ?? DEFAULT_RPC).trim();
  const pk = resolveMainnetPrivateKey();
  const account = privateKeyToAccount(pk);
  const publicClient = createPublicClient({ chain: arbitrum, transport: http(rpc) });
  if ((await publicClient.getChainId()) !== CHAIN_ID) throw new Error(`refuse: expected chain ${CHAIN_ID}`);

  const preflight = await runVenuePreflight({
    matrixId: "usdai-collateral",
    signer: account.address,
    rpc,
    client: publicClient,
  });
  if (!preflight.ok) {
    printVenuePreflightFail(preflight);
    process.exit(1);
  }

  const nowMs = Date.now();
  const guard = evaluateUsdAiCollateralGuard({
    chainId: USDAI_ARBITRUM_CHAIN_ID,
    collateralSymbol: "sUSDai",
    susdaiPriceUsd: 1,
    navUsd: 102_500,
    gpuMarkUsd: 102_500,
    liquidityDepthUsd: 2_500_000,
    amountUsd: 1,
    oracleTimestampMs: nowMs - 180_000,
    nowMs,
    at: new Date(nowMs),
  });
  if (!guard.ok) throw new Error(`SOIL_BLOCKED:${guard.reasons.join("|")}`);

  const dustWei = parseUnits("0.000001", 18);
  const transferData = encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: "transfer",
    args: [account.address, dustWei],
  });

  await publicClient.call({ account: account.address, to: VENUE_USDAI_ARBITRUM, data: transferData });

  console.log(
    JSON.stringify(
      {
        event: "USDAI_PROBE_PREFLIGHT_OK",
        wallet: account.address,
        guardStatus: guard.status,
        token: VENUE_USDAI_ARBITRUM,
        dryRun: !armed(),
        note: "execution harness — not soil on-chain demo",
      },
      null,
      2,
    ),
  );

  if (!armed()) {
    console.log("[usdai-probe] dry-run — set CONFIRM_USDAI_PROBE=YES BROADCAST=1 for dust self-transfer");
    return;
  }

  const wallet = createWalletClient({ account, chain: arbitrum, transport: http(rpc) });
  const hash = await wallet.sendTransaction({ to: VENUE_USDAI_ARBITRUM, data: transferData });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(JSON.stringify({ event: "USDAI_PROBE_BROADCAST_OK", hash, status: receipt.status }, null, 2));
}

main().catch((err) => {
  console.error("[usdai-probe] fatal", err instanceof Error ? err.message : err);
  process.exit(1);
});
