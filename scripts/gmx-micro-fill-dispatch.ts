/** Live GMX micro-fill dispatch — ZeroDev Kernel UserOp with EOA router fallback. */
import { createKernelAccountClient, createZeroDevPaymasterClient } from "@zerodev/sdk";
import { createPublicClient, getAddress, type Hex } from "viem";
import { http as viemHttp } from "viem";
import type { Chain } from "viem/chains";
import type { SmartAccount } from "viem/account-abstraction";
import { buildZeroDevRpcUrl } from "../src/adapters/arbitrum/zerodev-aa/zerodev-aa-constants";
import { GMX_V2_EXCHANGE_ROUTER_ARBITRUM } from "../src/config/gmx-revenue";
import { encodeGmxV2RouterCreateOrderMulticall } from "../src/services/adapters/gmx-micro-fill-router-encode";
import {
  GmxMicroFillExecutionError,
  contextFromPayload,
} from "../src/services/adapters/gmx-micro-fill-execution-errors";
import type { GmxV2UnsignedOrderPayload } from "../src/services/adapters/gmx-v2-adapter.types";
import { ensureCollateralAllowanceForOwner, ensureTokenAllowance, type KernelCall } from "./gmx-micro-fill-allowance";
import { dispatchGmxRouterViaEoa } from "./gmx-micro-fill-eoa-dispatch";

export { resolveBufferedEip1559Fees } from "./gmx-micro-fill-gas";
import { resolveBufferedEip1559Fees } from "./gmx-micro-fill-gas";
export { ensureTokenAllowance, type KernelCall } from "./gmx-micro-fill-allowance";
export { WETH_ARBITRUM } from "./gmx-micro-fill-eoa-dispatch";

/** BigInt-safe USD→WETH wei (avoids JS `* 1e18` precision loss above MAX_SAFE_INTEGER). */
export function usdToWethWei(sizeUsd: number, ethPriceUsd: number): bigint {
  if (!Number.isFinite(sizeUsd) || sizeUsd <= 0 || !Number.isFinite(ethPriceUsd) || ethPriceUsd <= 0) {
    throw new Error("usdToWethWei: invalid sizeUsd or ethPriceUsd");
  }
  const usdMicro = BigInt(Math.round(sizeUsd * 1_000_000));
  const priceMicro = BigInt(Math.round(ethPriceUsd * 1_000_000));
  return (usdMicro * 10n ** 18n) / priceMicro;
}

function isBundlerBlocked(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("403") || msg.includes("allowlist") || msg.includes("Access denied");
}

export async function dispatchGmxMicroFillLive(input: {
  pk: Hex;
  chain: Chain;
  rpc: string;
  chainId: number;
  client: ReturnType<typeof createPublicClient>;
  kernel: { address: Hex; account: SmartAccount };
  payload: GmxV2UnsignedOrderPayload;
  preCalls: KernelCall[];
  projectId: string;
  forceEoa?: boolean;
  skipSimulation?: boolean;
}): Promise<{ tx: Hex; mode: "zerodev" | "eoa" }> {
  const router = encodeGmxV2RouterCreateOrderMulticall(input.payload);
  const routerCall: KernelCall = {
    to: GMX_V2_EXCHANGE_ROUTER_ARBITRUM,
    value: router.value,
    data: router.data,
  };
  const collateralToken = getAddress(input.payload.addresses.initialCollateralToken as Hex);
  const approveCall = await ensureCollateralAllowanceForOwner({
    client: input.client,
    owner: input.kernel.address,
    token: collateralToken,
    required: router.collateral,
    chain: input.chain,
    rpc: input.rpc,
  });
  const calls = [...input.preCalls, ...(approveCall ? [approveCall] : []), routerCall];

  if (input.forceEoa || input.preCalls.length === 0) {
    const tx = await dispatchGmxRouterViaEoa({
      pk: input.pk,
      chain: input.chain,
      rpc: input.rpc,
      client: input.client,
      payload: input.payload,
      skipSimulation: input.skipSimulation,
      preCalls: input.preCalls,
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
    const userOpHash = await kernelClient.sendUserOperation({ calls });
    const receipt = await kernelClient.waitForUserOperationReceipt({ hash: userOpHash });
    if (!receipt.success) throw new Error("GMX micro-fill UserOp reverted");
    console.log("[gmx-micro-fill] ZeroDev UserOp OK", { tx: receipt.receipt.transactionHash });
    return { tx: receipt.receipt.transactionHash, mode: "zerodev" };
  } catch (err) {
    if (!isBundlerBlocked(err)) {
      throw new GmxMicroFillExecutionError(
        err,
        contextFromPayload(input.payload, input.kernel.address, "ZeroDev UserOp", { dispatchMode: "zerodev" }),
      );
    }
    console.warn("[gmx-micro-fill] ZeroDev bundler blocked — falling back to EOA direct router dispatch");
    const tx = await dispatchGmxRouterViaEoa({
      pk: input.pk,
      chain: input.chain,
      rpc: input.rpc,
      client: input.client,
      payload: input.payload,
      skipSimulation: input.skipSimulation,
      preCalls: input.preCalls,
    });
    return { tx, mode: "eoa" };
  }
}
