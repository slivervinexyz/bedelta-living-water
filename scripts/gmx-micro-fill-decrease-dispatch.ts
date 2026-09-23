/** GMX MarketDecrease dispatch — ZeroDev Kernel UserOp with EOA fallback. */
import { createKernelAccountClient, createZeroDevPaymasterClient } from "@zerodev/sdk";
import { createPublicClient, type Hex } from "viem";
import { http as viemHttp } from "viem";
import type { Chain } from "viem/chains";
import type { SmartAccount } from "viem/account-abstraction";
import { buildZeroDevRpcUrl } from "../src/adapters/arbitrum/zerodev-aa/zerodev-aa-constants";
import { GMX_V2_EXCHANGE_ROUTER_ARBITRUM } from "../src/config/gmx-revenue";
import { encodeGmxV2RouterDecreaseOrderMulticall } from "../src/services/adapters/gmx-micro-fill-decrease-multicall";
import type { GmxV2UnsignedOrderPayload } from "../src/services/adapters/gmx-v2-adapter.types";
import { dispatchGmxDecreaseRouterViaEoa } from "./gmx-micro-fill-decrease-eoa";
import type { KernelCall } from "./gmx-micro-fill-dispatch";

function isBundlerBlocked(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("403") || msg.includes("allowlist") || msg.includes("Access denied");
}

export async function dispatchGmxDecreaseLive(input: {
  pk: Hex;
  chain: Chain;
  rpc: string;
  chainId: number;
  client: ReturnType<typeof createPublicClient>;
  kernel: { address: Hex; account: SmartAccount };
  payload: GmxV2UnsignedOrderPayload;
  projectId: string;
  forceEoa?: boolean;
}): Promise<{ tx: Hex; mode: "zerodev" | "eoa" }> {
  const router = encodeGmxV2RouterDecreaseOrderMulticall(input.payload);
  const routerCall: KernelCall = {
    to: GMX_V2_EXCHANGE_ROUTER_ARBITRUM,
    value: router.value,
    data: router.data,
  };

  if (input.forceEoa || !input.projectId.trim()) {
    const tx = await dispatchGmxDecreaseRouterViaEoa({
      pk: input.pk, chain: input.chain, rpc: input.rpc, client: input.client, payload: input.payload,
    });
    return { tx, mode: "eoa" };
  }

  try {
    const bundlerRpc = buildZeroDevRpcUrl(input.projectId, input.chainId);
    const paymaster = createZeroDevPaymasterClient({ chain: input.chain, transport: viemHttp(bundlerRpc) });
    const kernelClient = createKernelAccountClient({
      account: input.kernel.account,
      chain: input.chain,
      bundlerTransport: viemHttp(bundlerRpc),
      client: input.client,
      paymaster: { getPaymasterData: (userOperation) => paymaster.sponsorUserOperation({ userOperation }) },
    });
    const userOpHash = await kernelClient.sendUserOperation({ calls: [routerCall] });
    const receipt = await kernelClient.waitForUserOperationReceipt({ hash: userOpHash });
    if (!receipt.success) throw new Error("GMX MarketDecrease UserOp reverted");
    console.log("[gmx-micro-fill-decrease] ZeroDev UserOp OK", {
      userOpHash,
      tx: receipt.receipt.transactionHash,
    });
    return { tx: receipt.receipt.transactionHash, mode: "zerodev" };
  } catch (err) {
    if (!isBundlerBlocked(err)) {
      console.warn("[gmx-micro-fill-decrease] ZeroDev UserOp failed — falling back to EOA", {
        reason: err instanceof Error ? err.message : String(err),
      });
    } else {
      console.warn("[gmx-micro-fill-decrease] ZeroDev bundler blocked — falling back to EOA direct router dispatch");
    }
    const tx = await dispatchGmxDecreaseRouterViaEoa({
      pk: input.pk, chain: input.chain, rpc: input.rpc, client: input.client, payload: input.payload,
    });
    return { tx, mode: "eoa" };
  }
}
