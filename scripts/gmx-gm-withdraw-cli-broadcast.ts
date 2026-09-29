/** Dry-run fixture + live broadcast for GMX GM withdraw multicall. */
import { mkdirSync, writeFileSync } from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  parseAbi,
  type Hex,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { GMX_V2_EXCHANGE_ROUTER_ARBITRUM } from "../src/config/gmx-revenue";
import {
  auditGmxGmWithdrawAllowances,
  ensureGmxGmWithdrawAllowance,
  GMX_GM_WITHDRAW_TOKEN_SPENDERS,
} from "../src/services/adapters/gmx-gm-withdraw-router-encode";
import { isBypassSimulationEnabled } from "../src/services/adapters/gmx-micro-fill-execution-errors";
import { resolveBufferedEip1559Fees } from "./gmx-micro-fill-dispatch";
import { resolveGmxGmWithdrawPk } from "./gmx-gm-withdraw-cli-args";

const routerAbi = parseAbi(["function multicall(bytes[] data) payable returns (bytes[])"]);
const FIXTURE_PATH = "contracts/test/fixtures/gmx-gm-withdraw-multicall.json";

export type GmxGmWithdrawBuilt = {
  calls: readonly Hex[];
  data: Hex;
  value: bigint;
  executionFee: bigint;
  marketTokenAmount: bigint;
};

export async function auditGmxGmWithdrawAllowanceRows(
  client: PublicClient,
  receiver: Hex,
  market: Hex,
  marketTokenAmount: bigint,
) {
  return auditGmxGmWithdrawAllowances({
    client,
    owner: receiver,
    token: market,
    gmTokenAmount: marketTokenAmount,
  });
}

export function writeGmxGmWithdrawDryRunFixture(receiver: Hex, market: Hex, built: GmxGmWithdrawBuilt): void {
  mkdirSync("contracts/test/fixtures", { recursive: true });
  writeFileSync(
    FIXTURE_PATH,
    `${JSON.stringify(
      {
        eoa: receiver,
        router: GMX_V2_EXCHANGE_ROUTER_ARBITRUM,
        market,
        multicallData: built.data,
        msgValue: built.value.toString(),
        calls: built.calls,
        executionFee: built.executionFee.toString(),
        marketTokenAmount: built.marketTokenAmount.toString(),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`[gmx-gm-withdraw] wrote ${FIXTURE_PATH}`);
}

export async function broadcastGmxGmWithdrawMulticall(
  rpc: string,
  market: Hex,
  built: GmxGmWithdrawBuilt,
): Promise<void> {
  const pk = resolveGmxGmWithdrawPk();
  const account = privateKeyToAccount(pk);
  const client = createPublicClient({ chain: arbitrum, transport: http(rpc) });
  const wallet = createWalletClient({ account, chain: arbitrum, transport: http(rpc) });

  const { approveTxs } = await ensureGmxGmWithdrawAllowance({
    client,
    owner: account.address,
    token: market,
    gmTokenAmount: built.marketTokenAmount,
    pk,
    chain: arbitrum,
    rpc,
    resolveFees: () => resolveBufferedEip1559Fees(client),
  });
  if (approveTxs.length > 0) {
    console.log("[gmx-gm-withdraw] allowance txs broadcast", approveTxs);
  }

  if (!isBypassSimulationEnabled()) {
    await client.simulateContract({
      address: getAddress(GMX_V2_EXCHANGE_ROUTER_ARBITRUM),
      abi: routerAbi,
      functionName: "multicall",
      args: [built.calls as Hex[]],
      value: built.value,
      account: account.address,
    });
  }

  const fees = await resolveBufferedEip1559Fees(client);
  const tx = await wallet.writeContract({
    address: getAddress(GMX_V2_EXCHANGE_ROUTER_ARBITRUM),
    abi: routerAbi,
    functionName: "multicall",
    args: [built.calls as Hex[]],
    value: built.value,
    maxFeePerGas: fees.maxFeePerGas,
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
    gas: 3_000_000n,
  });
  const receipt = await client.waitForTransactionReceipt({ hash: tx });
  console.log("[gmx-gm-withdraw] broadcast OK", {
    tx,
    status: receipt.status,
    block: receipt.blockNumber.toString(),
    arbiscan: `https://arbiscan.io/tx/${tx}`,
  });
}

export { GMX_GM_WITHDRAW_TOKEN_SPENDERS };
