/** EOA MarketDecrease dispatch — execution fee only (no USDC collateral leg). */
import { createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Chain } from "viem/chains";
import { createPublicClient } from "viem";
import { bindGmxOrderReceiver } from "../src/services/adapters/gmx-micro-fill-router-encode";
import { encodeGmxV2RouterDecreaseOrderMulticall } from "../src/services/adapters/gmx-micro-fill-decrease-multicall";
import {
  GmxMicroFillExecutionError,
  contextFromPayload,
} from "../src/services/adapters/gmx-micro-fill-execution-errors";
import type { GmxV2UnsignedOrderPayload } from "../src/services/adapters/gmx-v2-adapter.types";
import { sendGmxRouterTx } from "./gmx-micro-fill-gas";

export async function dispatchGmxDecreaseRouterViaEoa(input: {
  pk: Hex;
  chain: Chain;
  rpc: string;
  client: ReturnType<typeof createPublicClient>;
  payload: GmxV2UnsignedOrderPayload;
}): Promise<Hex> {
  const account = privateKeyToAccount(input.pk);
  const payload = bindGmxOrderReceiver(input.payload, account.address);
  const router = encodeGmxV2RouterDecreaseOrderMulticall(payload);
  const wallet = createWalletClient({ account, chain: input.chain, transport: http(input.rpc) });
  const ethBal = await input.client.getBalance({ address: account.address });
  if (ethBal < router.value) {
    throw new Error(`GMX_ETH_INSUFFICIENT: need ${router.value} wei execution fee, have ${ethBal}`);
  }
  try {
    return await sendGmxRouterTx({
      wallet,
      client: input.client,
      account,
      chain: input.chain,
      value: router.value,
      data: router.data,
    });
  } catch (err) {
    throw new GmxMicroFillExecutionError(
      err,
      contextFromPayload(payload, account.address, "EOA MarketDecrease sendTransaction", { dispatchMode: "eoa" }),
    );
  }
}
