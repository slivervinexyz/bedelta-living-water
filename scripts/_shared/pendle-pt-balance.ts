/** ERC20 PT balance probe for Pendle dust exit harness. */
import { getAddress, parseAbi, type Hex, type PublicClient } from "viem";

const erc20Abi = parseAbi(["function balanceOf(address) view returns (uint256)"]);

export async function readPtBalance(
  client: PublicClient,
  ptAddress: `0x${string}`,
  wallet: `0x${string}`,
): Promise<bigint> {
  const raw = await client.readContract({
    address: getAddress(ptAddress as Hex),
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [getAddress(wallet as Hex)],
  });
  return raw;
}

export function assertPtBalanceNonZero(balance: bigint): void {
  if (balance <= 0n) {
    throw new Error("PENDLE_DUST_EXIT_NO_PT: No PT balance to redeem — run deposit first");
  }
}
