/** On-chain / HL balance probes for venue preflight matrix rows. */
import { formatEther, getAddress, parseAbi, parseUnits, type Hex, type PublicClient } from "viem";
import { fetchHlMainnetPerpsMargin } from "../../src/adapters/hl/wallet/marginChecker";
import { GMX_USDC_ARBITRUM, USDC_DECIMALS } from "../../src/services/adapters/gmx-v2-order-payload-constants";
import {
  getVenueRequirement,
  VENUE_MIN_ETH_GAS,
  VENUE_USDAI_ARBITRUM,
  type VenueMatrixRow,
} from "../../src/core/venue-execution-matrix";

const erc20Abi = parseAbi(["function balanceOf(address) view returns (uint256)"]);

export interface VenueBalanceActual {
  eth: string;
  USDC?: string;
  USDai?: string;
  hlPerpsEquityUsd?: string;
}

export interface VenueBalanceShortfall {
  field: string;
  required: string;
  actual: string;
}

export interface VenueBalanceProbeResult {
  ok: boolean;
  row: VenueMatrixRow;
  wallet: `0x${string}`;
  requiredMinUsd: number;
  actual: VenueBalanceActual;
  shortfalls: VenueBalanceShortfall[];
  /** HL info API reachability — false = fail-open probe with WARN on PASS. */
  hlApiOk?: boolean;
}

async function readErc20Usd(
  client: PublicClient,
  token: `0x${string}`,
  wallet: `0x${string}`,
  decimals: number,
): Promise<string> {
  const raw = await client.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet],
  });
  const whole = Number(raw) / 10 ** decimals;
  return whole.toFixed(decimals === 6 ? 2 : 4);
}

export async function probeVenueBalances(
  client: PublicClient,
  matrixId: string,
  opts: { wallet?: `0x${string}`; amountUsd?: number; fetchFn?: typeof fetch } = {},
): Promise<VenueBalanceProbeResult | null> {
  const row = getVenueRequirement(matrixId);
  if (!row) return null;
  const wallet = getAddress((opts.wallet ?? row.walletAddress) as Hex);
  const minUsd = opts.amountUsd ?? row.primaryToken.minUsdDefault;
  const shortfalls: VenueBalanceShortfall[] = [];
  const actual: VenueBalanceActual = { eth: "0" };

  if (row.probeKind === "intent_only") {
    return { ok: true, row, wallet, requiredMinUsd: minUsd, actual, shortfalls };
  }

  if (row.probeKind === "hl_margin") {
    const snap = await fetchHlMainnetPerpsMargin(wallet, opts.fetchFn);
    actual.hlPerpsEquityUsd = snap.accountValueUsd.toFixed(2);
    if (snap.apiOk && snap.accountValueUsd < minUsd) {
      shortfalls.push({
        field: "hlPerpsEquityUsd",
        required: String(minUsd),
        actual: actual.hlPerpsEquityUsd,
      });
    }
    return {
      ok: shortfalls.length === 0,
      row,
      wallet,
      requiredMinUsd: minUsd,
      actual,
      shortfalls,
      hlApiOk: snap.apiOk,
    };
  }

  const ethWei = await client.getBalance({ address: wallet });
  actual.eth = formatEther(ethWei);
  if (Number(actual.eth) < row.gasEthMin) {
    shortfalls.push({
      field: "eth",
      required: String(row.gasEthMin),
      actual: actual.eth,
    });
  }

  const usdc = await readErc20Usd(client, GMX_USDC_ARBITRUM, wallet, USDC_DECIMALS);
  actual.USDC = usdc;
  const usdai = await readErc20Usd(client, VENUE_USDAI_ARBITRUM, wallet, 18);
  actual.USDai = usdai;

  const token = row.primaryToken;
  if (token.symbol === "USDC" && minUsd > 0) {
    if (Number(usdc) < minUsd) {
      shortfalls.push({ field: "USDC", required: String(minUsd), actual: usdc });
    }
  }
  if (token.symbol === "USDai" && minUsd > 0) {
    if (Number(usdai) < minUsd) {
      shortfalls.push({ field: "USDai", required: String(minUsd), actual: usdai });
    }
  }

  return { ok: shortfalls.length === 0, row, wallet, requiredMinUsd: minUsd, actual, shortfalls };
}

export function parseMinTokenUnits(symbol: string, amountUsd: number): bigint {
  if (symbol === "USDC") return parseUnits(amountUsd.toFixed(6), USDC_DECIMALS);
  return parseUnits(amountUsd.toFixed(6), 18);
}
