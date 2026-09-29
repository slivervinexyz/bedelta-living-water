/** Build GM withdraw multicall with on-chain GM balance cap. */
import { parseAbi, type Hex, type PublicClient } from "viem";
import {
  buildGmxGmWithdrawGmAmountPayload,
  buildGmxGmWithdrawRouterMulticall,
  stripGmxGmWithdrawOnChainMetadata,
} from "../src/services/adapters/gmx-gm-withdraw-router-encode";

const erc20BalAbi = parseAbi(["function balanceOf(address account) view returns (uint256)"]);

export async function buildGmxGmWithdrawMulticallCapped(
  client: PublicClient,
  receiver: Hex,
  market: Hex,
  gmTokenAmount: bigint,
  amountUsd: number,
  staleOracleOk: boolean,
  probeBypass: boolean,
  executionFeeWei?: string,
) {
  let payload = stripGmxGmWithdrawOnChainMetadata(
    buildGmxGmWithdrawGmAmountPayload({
      receiver,
      gmTokenAmount,
      sizeUsd: amountUsd,
      marketToken: market,
      executionFeeWei,
      skipFailClosedGuards: staleOracleOk || probeBypass,
      allowStaleOracle: staleOracleOk,
    }),
  );
  let built = buildGmxGmWithdrawRouterMulticall(payload, market);
  const gmBal = await client.readContract({
    address: market,
    abi: erc20BalAbi,
    functionName: "balanceOf",
    args: [receiver],
  });
  if (built.marketTokenAmount > gmBal) {
    console.warn(`[gmx-gm-withdraw] capping gmTokenAmount ${built.marketTokenAmount} → on-chain balance ${gmBal}`);
    payload = stripGmxGmWithdrawOnChainMetadata(
      buildGmxGmWithdrawGmAmountPayload({
        receiver,
        gmTokenAmount: gmBal,
        sizeUsd: amountUsd,
        marketToken: market,
        executionFeeWei,
        skipFailClosedGuards: staleOracleOk || probeBypass,
        allowStaleOracle: staleOracleOk,
      }),
    );
    built = buildGmxGmWithdrawRouterMulticall(payload, market);
  }
  return built;
}
