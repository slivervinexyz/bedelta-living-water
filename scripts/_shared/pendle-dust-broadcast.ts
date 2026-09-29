/** Shared approve + router broadcast for Pendle dust harness. */
import {
  createWalletClient,
  encodeFunctionData,
  http,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { arbitrum } from "viem/chains";
import type { PrivateKeyAccount } from "viem/accounts";
import type { PendleConvertTokenAmount } from "../../src/adapters/pendle/pendle-api-types";
import type { PendleDustConvertPlan } from "../pendle-dust-convert";

const ERC20_APPROVE_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
] as const;

export async function broadcastPendleDustPlan(opts: {
  plan: PendleDustConvertPlan;
  account: PrivateKeyAccount;
  publicClient: PublicClient;
  rpc: string;
}): Promise<`0x${string}`> {
  const wallet: WalletClient = createWalletClient({
    account: opts.account,
    chain: arbitrum,
    transport: http(opts.rpc),
  });
  for (const approval of opts.plan.approvals) {
    const approveData = encodeFunctionData({
      abi: ERC20_APPROVE_ABI,
      functionName: "approve",
      args: [opts.plan.router, BigInt(approval.amount)],
    });
    const approveHash = await wallet.sendTransaction({
      account: opts.account,
      chain: arbitrum,
      to: approval.token as Hex,
      data: approveData,
    });
    await opts.publicClient.waitForTransactionReceipt({ hash: approveHash });
  }
  await opts.publicClient.call({
    account: opts.account.address,
    to: opts.plan.router,
    data: opts.plan.data,
  });
  const hash = await wallet.sendTransaction({
    account: opts.account,
    chain: arbitrum,
    to: opts.plan.router,
    data: opts.plan.data,
  });
  await opts.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export type { PendleConvertTokenAmount };
