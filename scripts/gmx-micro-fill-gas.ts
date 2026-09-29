/** EIP-1559 fee buffer + router tx send with gas retry. */
import { createPublicClient, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Chain } from "viem/chains";
import { createWalletClient } from "viem";
import { GMX_V2_EXCHANGE_ROUTER_ARBITRUM } from "../src/config/gmx-revenue";

const GAS_BUFFER_NUM = 150n;
const GAS_BUFFER_DEN = 100n;

function isGasFeeError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("-32000") ||
    msg.includes("base fee") ||
    msg.includes("baseFee") ||
    msg.includes("max fee per gas") ||
    msg.includes("maxFeePerGas") ||
    msg.includes("underpriced")
  );
}

export async function resolveBufferedEip1559Fees(
  client: ReturnType<typeof createPublicClient>,
): Promise<{ maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }> {
  const [block, fees] = await Promise.all([
    client.getBlock({ blockTag: "latest" }),
    client.estimateFeesPerGas(),
  ]);
  const baseFee = block.baseFeePerGas ?? fees.maxFeePerGas ?? 1n;
  const priority = fees.maxPriorityFeePerGas ?? 1n;
  const bufferedBase = (baseFee * GAS_BUFFER_NUM) / GAS_BUFFER_DEN;
  const rpcMax = fees.maxFeePerGas ?? bufferedBase;
  const maxFeePerGas =
    bufferedBase > rpcMax ? bufferedBase + priority : (rpcMax * GAS_BUFFER_NUM) / GAS_BUFFER_DEN;
  return { maxFeePerGas, maxPriorityFeePerGas: priority > 0n ? priority : 1n };
}

export async function sendGmxRouterTx(input: {
  wallet: ReturnType<typeof createWalletClient>;
  client: ReturnType<typeof createPublicClient>;
  account: ReturnType<typeof privateKeyToAccount>;
  chain: Chain;
  value: bigint;
  data: Hex;
}): Promise<Hex> {
  const fees = await resolveBufferedEip1559Fees(input.client);
  try {
    return await input.wallet.sendTransaction({
      chain: input.chain,
      to: GMX_V2_EXCHANGE_ROUTER_ARBITRUM,
      value: input.value,
      data: input.data,
      maxFeePerGas: fees.maxFeePerGas,
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      gas: 3_000_000n,
    });
  } catch (err) {
    if (!isGasFeeError(err)) throw err;
    console.warn("[gmx-micro-fill] gas fee rejected — retrying with refreshed baseFee buffer");
    const retryFees = await resolveBufferedEip1559Fees(input.client);
    const nonce = await input.client.getTransactionCount({ address: input.account.address });
    const serialized = await input.account.signTransaction({
      chainId: input.chain.id,
      type: "eip1559",
      nonce,
      maxFeePerGas: (retryFees.maxFeePerGas * GAS_BUFFER_NUM) / GAS_BUFFER_DEN,
      maxPriorityFeePerGas: retryFees.maxPriorityFeePerGas,
      gas: 3_000_000n,
      to: GMX_V2_EXCHANGE_ROUTER_ARBITRUM,
      value: input.value,
      data: input.data,
    });
    return input.client.sendRawTransaction({ serializedTransaction: serialized });
  }
}
