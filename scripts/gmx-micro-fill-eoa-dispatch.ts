/** EOA direct router dispatch — WETH wrap + collateral allowance + simulate. */
import { createWalletClient, getAddress, http, parseAbi, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Chain } from "viem/chains";
import { createPublicClient } from "viem";
import {
  bindGmxOrderReceiver,
  encodeGmxV2RouterCreateOrderMulticall,
} from "../src/services/adapters/gmx-micro-fill-router-encode";
import {
  GmxMicroFillExecutionError,
  contextFromPayload,
  runGmxMicroFillSimulationPreflight,
} from "../src/services/adapters/gmx-micro-fill-execution-errors";
import type { GmxV2UnsignedOrderPayload } from "../src/services/adapters/gmx-v2-adapter.types";
import { ensureCollateralAllowanceForOwner, type KernelCall } from "./gmx-micro-fill-allowance";
import { sendGmxRouterTx } from "./gmx-micro-fill-gas";

export const WETH_ARBITRUM = getAddress("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1");

const erc20Abi = parseAbi(["function balanceOf(address owner) view returns (uint256)"]);
const wethAbi = parseAbi(["function deposit() payable"]);

export async function dispatchGmxRouterViaEoa(input: {
  pk: Hex;
  chain: Chain;
  rpc: string;
  client: ReturnType<typeof createPublicClient>;
  payload: GmxV2UnsignedOrderPayload;
  skipSimulation?: boolean;
  preCalls?: KernelCall[];
}): Promise<Hex> {
  const account = privateKeyToAccount(input.pk);
  const payload = bindGmxOrderReceiver(input.payload, account.address);
  const router = encodeGmxV2RouterCreateOrderMulticall(payload);
  const collateralToken = getAddress(payload.addresses.initialCollateralToken as Hex);
  const wallet = createWalletClient({ account, chain: input.chain, transport: http(input.rpc) });

  for (const call of input.preCalls ?? []) {
    const hash = await wallet.sendTransaction({ to: call.to, data: call.data, value: call.value });
    const rcpt = await input.client.waitForTransactionReceipt({ hash });
    if (rcpt.status !== "success") throw new Error(`GATE_CONSUME_FAILED: ${hash}`);
    console.log("[gmx-micro-fill] Gate/policy pre-call OK", { to: call.to, tx: hash });
  }

  if (collateralToken === WETH_ARBITRUM) {
    const wethBal = await input.client.readContract({
      address: WETH_ARBITRUM,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account.address],
    });
    if (wethBal < router.collateral) {
      const wrapValue = router.collateral - wethBal;
      const ethBal = await input.client.getBalance({ address: account.address });
      if (ethBal < wrapValue + router.executionFee) {
        throw new Error(`GMX_WETH_INSUFFICIENT:need=${wrapValue + router.executionFee} have=${ethBal}`);
      }
      const wrapTx = await wallet.writeContract({
        address: WETH_ARBITRUM,
        abi: wethAbi,
        functionName: "deposit",
        value: wrapValue,
      });
      const wrapRcpt = await input.client.waitForTransactionReceipt({ hash: wrapTx });
      console.log("[gmx-micro-fill] WETH wrap OK", {
        tx: wrapTx,
        status: wrapRcpt.status,
        url: `https://arbiscan.io/tx/${wrapTx}`,
      });
    }
  } else {
    const tokenBal = await input.client.readContract({
      address: collateralToken,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account.address],
    });
    if (tokenBal < router.collateral) {
      throw new Error(`GMX_COLLATERAL_INSUFFICIENT:${tokenBal}<${router.collateral}`);
    }
  }

  await ensureCollateralAllowanceForOwner({
    client: input.client,
    owner: account.address,
    token: collateralToken,
    required: router.collateral,
    pk: input.pk,
    chain: input.chain,
    rpc: input.rpc,
  });

  if (!input.skipSimulation) {
    const sim = await runGmxMicroFillSimulationPreflight({
      client: input.client,
      payload,
      from: account.address,
    });
    if (sim.bypassed) {
      console.warn("[gmx-micro-fill] EOA path — simulation bypassed, sending router tx");
    }
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
      contextFromPayload(payload, account.address, "EOA sendTransaction", { dispatchMode: "eoa" }),
    );
  }
}
