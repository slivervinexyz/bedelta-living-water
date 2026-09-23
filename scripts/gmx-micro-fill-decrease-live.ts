/** GMX micro-fill MarketDecrease live broadcast — ZeroDev AA or EOA dual-mode. */
import { createPublicClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { buildKernelAccount } from "../src/adapters/arbitrum/zerodev-aa/zerodev-aa-kernel";
import { stripGmxOnChainMetadata } from "../src/services/adapters/gmx-create-order-encode";
import { estimateGmxMarketDecreaseExecutionFeeWei } from "../src/services/adapters/gmx-execution-fee-estimator";
import {
  GMX_MARKET_DECREASE_EXECUTION_FEE_MIN_WEI,
  MICRO_FILL_DECREASE_SLIPPAGE_BPS,
} from "../src/services/adapters/gmx-micro-fill-constants";
import {
  applyMicroFillOrderPricing,
  bindGmxOrderReceiver,
  computeGmxDecreaseAcceptablePriceFromOracleRaw,
  computeMicroFillDecreaseAcceptablePrice,
  fetchGmxIndexOracleTicker,
} from "../src/services/adapters/gmx-micro-fill-router-encode";
import {
  decodeGmxFailedTransaction,
  printGmxMicroFillError,
  contextFromPayload,
} from "../src/services/adapters/gmx-micro-fill-execution-errors";
import type { GmxV2UnsignedOrderPayload } from "../src/services/adapters/gmx-v2-adapter.types";
import { GMX_ORDER_TYPE_INDEX } from "../src/services/adapters/gmx-v2-order-payload.types";
import { dispatchGmxDecreaseLive } from "./gmx-micro-fill-decrease-dispatch";
import { printLiveHarnessBypassBanner } from "./_shared/live-harness-warning";
import { resolveBufferedEip1559Fees } from "./gmx-micro-fill-gas";

const CHAIN_ID = 42161;

export type GmxMicroFillDecreaseLiveInput = {
  rpc: string;
  pk: Hex;
  orderPayload: GmxV2UnsignedOrderPayload;
  longToken: Hex;
  midPriceUsd: number;
  sizeUsd: number;
  projectId: string | null;
  forceEoa: boolean;
};

function arbiscan(tx: string): string { return `https://arbiscan.io/tx/${tx}`; }

export async function executeGmxMicroFillDecreaseLive(
  input: GmxMicroFillDecreaseLiveInput,
): Promise<{ tx: Hex; mode: "zerodev" | "eoa" }> {
  printLiveHarnessBypassBanner();
  const client = createPublicClient({ chain: arbitrum, transport: http(input.rpc) });
  const kernel = await buildKernelAccount({ chainId: CHAIN_ID, chain: arbitrum, rpcUrl: input.rpc, ownerPrivateKey: input.pk });
  const eoa = privateKeyToAccount(input.pk).address;
  const useEoa = input.forceEoa || !input.projectId;
  const dispatchOwner = useEoa ? eoa : kernel.address;
  let livePayload = bindGmxOrderReceiver(stripGmxOnChainMetadata(input.orderPayload), dispatchOwner);
  if (livePayload.orderType !== GMX_ORDER_TYPE_INDEX.MarketDecrease) {
    throw new Error("GMX_MICRO_FILL_DECREASE: orderType must be MarketDecrease");
  }
  let acceptablePrice: bigint;
  try {
    const ticker = await fetchGmxIndexOracleTicker(input.longToken);
    const oracleRaw = BigInt(livePayload.isLong ? ticker.minPrice : ticker.maxPrice);
    acceptablePrice = computeGmxDecreaseAcceptablePriceFromOracleRaw(
      oracleRaw,
      livePayload.isLong,
      MICRO_FILL_DECREASE_SLIPPAGE_BPS,
    );
  } catch {
    acceptablePrice = computeMicroFillDecreaseAcceptablePrice(
      input.midPriceUsd,
      livePayload.isLong,
    );
  }
  livePayload = applyMicroFillOrderPricing(livePayload, acceptablePrice);
  const feeEstimate = await estimateGmxMarketDecreaseExecutionFeeWei({
    client,
    swapPathLength: livePayload.addresses.swapPath.length,
    callbackGasLimit: BigInt(livePayload.numbers.callbackGasLimit),
    gasPriceWei: (await resolveBufferedEip1559Fees(client)).maxFeePerGas,
  });
  livePayload = { ...livePayload, numbers: { ...livePayload.numbers, executionFee: feeEstimate.executionFeeWei } };
  console.log("[gmx-micro-fill-decrease] order pricing", {
    dispatch: useEoa ? "eoa" : "zerodev",
    owner: dispatchOwner,
    kernel: kernel.address,
    isLong: livePayload.isLong,
    orderType: livePayload.orderType,
    sizeDeltaUsd: livePayload.numbers.sizeDeltaUsd,
    collateralDelta: livePayload.numbers.initialCollateralDeltaAmount,
    acceptablePrice: livePayload.numbers.acceptablePrice,
    decreaseSlippageBps: MICRO_FILL_DECREASE_SLIPPAGE_BPS,
    executionFeeWei: feeEstimate.executionFeeWei,
    executionFeeEth: `${Number(feeEstimate.executionFeeWei) / 1e18}`,
    keeperFloorWei: GMX_MARKET_DECREASE_EXECUTION_FEE_MIN_WEI.toString(),
    datastoreGasLimit: feeEstimate.gasLimit.toString(),
    gasPriceWei: feeEstimate.gasPriceWei.toString(),
  });
  const { tx, mode } = await dispatchGmxDecreaseLive({
    pk: input.pk,
    chain: arbitrum,
    rpc: input.rpc,
    chainId: CHAIN_ID,
    client,
    kernel,
    payload: livePayload,
    projectId: input.projectId ?? "",
    forceEoa: useEoa,
  });
  const receipt = await client.waitForTransactionReceipt({ hash: tx });
  console.log("[gmx-micro-fill-decrease] broadcast OK", {
    mode,
    owner: mode === "eoa" ? eoa : dispatchOwner,
    kernel: kernel.address,
    tx,
    status: receipt.status,
    block: receipt.blockNumber.toString(),
    sizeUsd: input.sizeUsd,
    url: arbiscan(tx),
  });
  if (receipt.status !== "success") {
    const diag = await decodeGmxFailedTransaction(client, tx, { primaryRpc: input.rpc });
    printGmxMicroFillError(new Error("Transaction mined with revert status=0"), contextFromPayload(livePayload, dispatchOwner, "on-chain broadcast revert", {
      dispatchMode: mode, txHash: tx, decodedOnChainRevert: diag?.summary,
    }));
    process.exit(1);
  }
  return { tx, mode };
}
