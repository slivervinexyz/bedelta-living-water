/** GMX micro-fill live broadcast orchestration (armed path). */
import { createPublicClient, createWalletClient, encodeFunctionData, getAddress, http, parseAbi, toHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import type { SmartAccount } from "viem/account-abstraction";
import { buildKernelAccount } from "../src/adapters/arbitrum/zerodev-aa/zerodev-aa-kernel";
import { GMX_V2_EXCHANGE_ROUTER_ARBITRUM } from "../src/config/gmx-revenue";
import { computeGatedExecutorPayloadHash } from "../src/sdk/gated-executor-payload";
import { stripGmxOnChainMetadata } from "../src/services/adapters/gmx-create-order-encode";
import { estimateGmxMarketIncreaseExecutionFeeWei } from "../src/services/adapters/gmx-execution-fee-estimator";
import {
  applyMicroFillMinPositionSizing,
  applyMicroFillOrderPricing,
  bindGmxOrderReceiver,
  computeMicroFillAcceptablePrice,
  computeGmxAcceptablePriceFromOracleRaw,
  ensureGmxCollateralAllowance,
  GMX_MICRO_FILL_TOKEN_SPENDERS,
  fetchGmxIndexOracleTicker,
  GMX_COLLATERAL_SPENDER_ARBITRUM,
  GMX_USDC_ARBITRUM,
  MICRO_FILL_COLLATERAL_USD,
  MICRO_FILL_COLLATERAL_USDC,
  MICRO_FILL_LEVERAGE_X,
  MICRO_FILL_MIN_POSITION_USD,
  MICRO_FILL_SIZE_DELTA_USD_30,
  readGmxCollateralAllowance,
} from "../src/services/adapters/gmx-micro-fill-router-encode";
import {
  contextFromPayload,
  decodeGmxFailedTransaction,
  printGmxMicroFillError,
  runGmxMicroFillSimulationPreflight,
} from "../src/services/adapters/gmx-micro-fill-execution-errors";
import type { GmxV2UnsignedOrderPayload } from "../src/services/adapters/gmx-v2-adapter.types";
import { dispatchGmxMicroFillLive, resolveBufferedEip1559Fees, type KernelCall } from "./gmx-micro-fill-dispatch";
import { GMX_MICRO_FILL_GATE, requireGateSignerForGmxFill, resolveRegisteredGateSigner, signRiskAttestation } from "./gmx-micro-fill-gate";

const POLICY_GUARD = "0xc66f96611a737c4e58706d0955594456eab88959" as Hex;
const CHAIN_ID = 42161;
const policyAbi = parseAbi(["function validateAgentPolicy(bytes32 agentId, uint256 maxNotional, uint256 ttl) returns (bytes32)"]);
const gateAbi = parseAbi([
  "function verifyAndConsume((bytes32 payloadHash,address subject,uint8 verdict,uint16 riskBps,uint64 issuedAt,uint64 expiresAt,uint256 nonce) att, bytes[] signatures) returns (bytes32)",
]);
const usdcAbi = parseAbi(["function balanceOf(address) view returns (uint256)"]);

export type GmxMicroFillLiveInput = {
  rpc: string;
  pk: Hex;
  agentId: Hex;
  bindNonce: bigint;
  sizeUsd: number;
  side: "long" | "short";
  orderPayload: GmxV2UnsignedOrderPayload;
  longToken: Hex;
  midPriceUsd: number;
  forceEoa: boolean;
};

function arbiscan(tx: string): string { return `https://arbiscan.io/tx/${tx}`; }

async function readUsdcBalance(client: ReturnType<typeof createPublicClient>, owner: Hex): Promise<bigint> {
  return client.readContract({ address: getAddress(GMX_USDC_ARBITRUM), abi: usdcAbi, functionName: "balanceOf", args: [owner] });
}

export async function executeGmxMicroFillLive(input: GmxMicroFillLiveInput): Promise<void> {
  const client = createPublicClient({ chain: arbitrum, transport: http(input.rpc) });
  const kernel = await buildKernelAccount({ chainId: CHAIN_ID, chain: arbitrum, rpcUrl: input.rpc, ownerPrivateKey: input.pk });
  const eoa = privateKeyToAccount(input.pk).address;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const gateSignerPk = requireGateSignerForGmxFill(await resolveRegisteredGateSigner(client, input.pk));
  const useEoa = input.forceEoa || (await readUsdcBalance(client, eoa)) >= MICRO_FILL_COLLATERAL_USDC || !gateSignerPk;
  const dispatchOwner = useEoa ? eoa : kernel.address;
  let livePayload = applyMicroFillMinPositionSizing(bindGmxOrderReceiver(input.orderPayload, dispatchOwner));
  if (useEoa) {
    const eoaBal = await readUsdcBalance(client, eoa);
    if (eoaBal < MICRO_FILL_COLLATERAL_USDC) throw new Error(`GMX_USDC_INSUFFICIENT: EOA needs $${MICRO_FILL_COLLATERAL_USD} USDC, have=${eoaBal}`);
    console.log("[gmx-micro-fill] EOA dispatch path", { owner: eoa, usdc: eoaBal.toString(), forceEoa: input.forceEoa, gateSigner: gateSignerPk !== null });
  } else if ((await readUsdcBalance(client, kernel.address)) < MICRO_FILL_COLLATERAL_USDC) {
    throw new Error(`GMX_USDC_INSUFFICIENT: kernel needs $${MICRO_FILL_COLLATERAL_USDC} USDC`);
  }
  let acceptablePrice: bigint;
  try {
    const ticker = await fetchGmxIndexOracleTicker(input.longToken);
    acceptablePrice = computeGmxAcceptablePriceFromOracleRaw(
      BigInt(livePayload.isLong ? ticker.maxPrice : ticker.minPrice),
      livePayload.isLong,
    );
  } catch {
    acceptablePrice = computeMicroFillAcceptablePrice(input.midPriceUsd, livePayload.isLong);
  }
  livePayload = stripGmxOnChainMetadata(applyMicroFillOrderPricing(livePayload, acceptablePrice));
  const feeEstimate = await estimateGmxMarketIncreaseExecutionFeeWei({
    client,
    swapPathLength: livePayload.addresses.swapPath.length,
    callbackGasLimit: BigInt(livePayload.numbers.callbackGasLimit),
    gasPriceWei: (await resolveBufferedEip1559Fees(client)).maxFeePerGas,
  });
  livePayload = { ...livePayload, numbers: { ...livePayload.numbers, executionFee: feeEstimate.executionFeeWei } };
  console.log("[gmx-micro-fill] execution fee estimate", {
    executionFeeWei: feeEstimate.executionFeeWei,
    gasLimit: feeEstimate.gasLimit.toString(),
    gasPriceWei: feeEstimate.gasPriceWei.toString(),
  });
  console.log("[gmx-micro-fill] order pricing", {
    side: input.side,
    isLong: livePayload.isLong,
    oraclePriceUsd: input.midPriceUsd,
    sizeDeltaUsd: livePayload.numbers.sizeDeltaUsd,
    collateralUsdc: livePayload.numbers.initialCollateralDeltaAmount,
    leverageX: MICRO_FILL_LEVERAGE_X,
    acceptablePrice: livePayload.numbers.acceptablePrice,
    minOutputAmount: livePayload.numbers.minOutputAmount,
  });
  const collateralToken = getAddress(livePayload.addresses.initialCollateralToken as Hex);
  const requiredCollateral = BigInt(livePayload.numbers.initialCollateralDeltaAmount);
  const allowanceChecks = await Promise.all(
    GMX_MICRO_FILL_TOKEN_SPENDERS.map(async (spender) => ({
      spender,
      allowance: (await readGmxCollateralAllowance(client, dispatchOwner, collateralToken, spender)).toString(),
    })),
  );
  console.log("[gmx-micro-fill] USDC allowance preflight", {
    owner: dispatchOwner,
    dispatch: useEoa ? "eoa" : "kernel",
    spenders: allowanceChecks,
    required: requiredCollateral.toString(),
    sizeDeltaUsd30: MICRO_FILL_SIZE_DELTA_USD_30.toString(),
    needsApprove: allowanceChecks.some((row) => BigInt(row.allowance) < requiredCollateral),
  });
  await ensureGmxCollateralAllowance({
    client, owner: dispatchOwner, token: collateralToken, required: requiredCollateral,
    spenders: GMX_MICRO_FILL_TOKEN_SPENDERS,
    pk: useEoa ? input.pk : undefined, chain: arbitrum, rpc: input.rpc,
    resolveFees: () => resolveBufferedEip1559Fees(client),
  });
  const sim = await runGmxMicroFillSimulationPreflight({ client, payload: livePayload, from: dispatchOwner });
  if (sim.bypassed) console.warn("[gmx-micro-fill] simulation bypassed — proceeding to on-chain broadcast");
  else console.log("[gmx-micro-fill] router simulateContract OK", { from: dispatchOwner });

  const preCalls: KernelCall[] = [{
    to: POLICY_GUARD, value: 0n,
    data: encodeFunctionData({ abi: policyAbi, functionName: "validateAgentPolicy", args: [input.agentId, BigInt(Math.round(MICRO_FILL_MIN_POSITION_USD * 1e6)), now + 3600n] }),
  }];
  const att = {
    payloadHash: computeGatedExecutorPayloadHash({
      chainId: CHAIN_ID, executor: GMX_MICRO_FILL_GATE, initiator: dispatchOwner,
      target: GMX_V2_EXCHANGE_ROUTER_ARBITRUM, data: toHex(JSON.stringify(input.orderPayload)), nonce: input.bindNonce,
    }),
    subject: dispatchOwner, verdict: 1, riskBps: 800, issuedAt: now, expiresAt: now + 30n, nonce: input.bindNonce,
  };
  const gateWallet = createWalletClient({ account: privateKeyToAccount(gateSignerPk), chain: arbitrum, transport: http(input.rpc) });
  preCalls.push({
    to: GMX_MICRO_FILL_GATE, value: 0n,
    data: encodeFunctionData({ abi: gateAbi, functionName: "verifyAndConsume", args: [att, [await signRiskAttestation(gateWallet, att)]] }),
  });

  const projectId = process.env.ZERODEV_PROJECT_ID?.trim() ?? "";
  if (!projectId && !useEoa) throw new Error("ZERODEV_PROJECT_ID required");
  const { tx, mode } = await dispatchGmxMicroFillLive({
    pk: input.pk, chain: arbitrum, rpc: input.rpc, chainId: CHAIN_ID, client, kernel: kernel as SmartAccount,
    payload: livePayload, preCalls, projectId, forceEoa: useEoa, skipSimulation: true,
  });
  const receipt = await client.waitForTransactionReceipt({ hash: tx });
  console.log("[gmx-micro-fill] broadcast OK", {
    mode, owner: dispatchOwner, kernel: kernel.address, tx, status: receipt.status, side: input.side, sizeUsd: input.sizeUsd, url: arbiscan(tx),
  });
  if (receipt.status !== "success") {
    const diag = await decodeGmxFailedTransaction(client, tx, { primaryRpc: input.rpc });
    printGmxMicroFillError(new Error("Transaction mined with revert status=0"), contextFromPayload(livePayload, dispatchOwner, "on-chain broadcast revert", {
      dispatchMode: mode, txHash: tx, decodedOnChainRevert: diag?.summary,
    }));
    process.exit(1);
  }
}
