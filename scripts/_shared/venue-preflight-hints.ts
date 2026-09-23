/** English hint builder for venue preflight failures. */
import { GMX_UI_FEE_RECEIVER } from "../../src/config/gmx-revenue";
import { getAddress, type Hex } from "viem";
import { isWalletBIsolationAddress } from "../../src/core/wallet-isolation-guard";
import type { VenueBalanceProbeResult } from "./venue-balance-preflight";

export interface VenuePreflightFailPayload {
  event: "VENUE_PREFLIGHT_FAIL";
  venue: string;
  matrixId: string;
  walletRole: string;
  wallet: string;
  required: { token: string; minUsd: number; gasEth: number };
  actual: Record<string, string>;
  hint: string;
  code?: string;
  wrongTokenDetected?: string;
  ssotRef: string;
  seeAlso: string;
}

function wrongTokenHint(row: VenueBalanceProbeResult): string | undefined {
  const { row: spec, actual, requiredMinUsd } = row;
  if (spec.primaryToken.symbol !== "USDai") return undefined;
  const usdc = Number(actual.USDC ?? 0);
  const usdai = Number(actual.USDai ?? 0);
  if (usdc >= requiredMinUsd && usdai < requiredMinUsd) return "USDC";
  return undefined;
}

function resolveFailCode(row: VenueBalanceProbeResult, signer?: string): string | undefined {
  const spec = row.row;
  if (signer && isWalletBIsolationAddress(signer) && spec.walletRole === "A") {
    return "WALLET_B_PERP_FORBIDDEN";
  }
  if (signer) {
    try {
      const expected = getAddress(spec.walletAddress as Hex);
      const got = getAddress(signer as Hex);
      if (expected !== got && spec.walletRole === "B") return "WALLET_B_REQUIRED_FOR_GM";
    } catch {
      /* ignore */
    }
  }
  if (wrongTokenHint(row) === "USDC") return "WRONG_TOKEN_USDC_FOR_PENDLE";
  if (row.shortfalls.some((s) => s.field === "hlPerpsEquityUsd")) return "HL_MARGIN_SHORTFALL";
  if (row.shortfalls.some((s) => s.field === "eth") && spec.id === "usdai-collateral") {
    return "ETH_GAS_ONLY_BH25";
  }
  return undefined;
}

function buildHint(row: VenueBalanceProbeResult, signer?: string): string {
  const spec = row.row;
  const wrong = wrongTokenHint(row);
  if (signer && isWalletBIsolationAddress(signer) && spec.walletRole === "A") {
    return `Wallet B / treasury (${GMX_UI_FEE_RECEIVER}) cannot sign GMX perp or Pendle actions. Use Wallet A (${spec.walletAddress}).`;
  }
  if (signer) {
    try {
      const expected = getAddress(spec.walletAddress as Hex);
      const got = getAddress(signer as Hex);
      if (expected !== got && spec.walletRole === "B") {
        return `GM vault actions require Wallet B principal (${expected}). Current signer is ${got}.`;
      }
    } catch {
      /* ignore */
    }
  }
  if (wrong === "USDC") {
    return "Pendle Fixed Yield on Arbitrum does not accept USDC. Fund Wallet A with USDai, or swap USDC→USDai first. Do not use Wallet B.";
  }
  if (row.shortfalls.some((s) => s.field === "eth") && spec.id === "usdai-collateral") {
    return `USD.ai collateral probe requires ETH gas on Wallet A only (BH-25). Fund at least ${spec.gasEthMin} ETH on Arbitrum One — USDai balance not required for this row.`;
  }
  if (row.shortfalls.some((s) => s.field === "eth")) {
    return `Insufficient ETH gas on Wallet ${spec.walletRole}. Fund at least ${spec.gasEthMin} ETH on Arbitrum One.`;
  }
  if (row.shortfalls.some((s) => s.field === "hlPerpsEquityUsd")) {
    return "Fund Hyperliquid perps margin (USDC) on Wallet A via app.hyperliquid.xyz.";
  }
  if (spec.primaryToken.symbol === "USDC") {
    return `Fund Wallet ${spec.walletRole} with at least $${row.requiredMinUsd} USDC on Arbitrum One plus ETH gas.`;
  }
  if (spec.primaryToken.symbol === "USDai" && row.requiredMinUsd > 0) {
    return `Fund Wallet ${spec.walletRole} with at least $${row.requiredMinUsd} USDai on Arbitrum One plus ETH gas.`;
  }
  return `Venue preflight failed for ${spec.id}. Run pnpm preflight:venues --venue=${spec.venue}.`;
}

export function buildVenuePreflightFailPayload(
  probe: VenueBalanceProbeResult,
  signer?: string,
): VenuePreflightFailPayload {
  const spec = probe.row;
  const actual: Record<string, string> = { eth: probe.actual.eth };
  if (probe.actual.USDC !== undefined) actual.USDC = probe.actual.USDC;
  if (probe.actual.USDai !== undefined) actual.USDai = probe.actual.USDai;
  if (probe.actual.hlPerpsEquityUsd !== undefined) actual.hlPerpsEquityUsd = probe.actual.hlPerpsEquityUsd;
  const wrong = wrongTokenHint(probe);
  return {
    event: "VENUE_PREFLIGHT_FAIL",
    venue: spec.venue,
    matrixId: spec.id,
    walletRole: spec.walletRole,
    wallet: probe.wallet,
    required: {
      token: spec.primaryToken.symbol,
      minUsd: probe.requiredMinUsd,
      gasEth: spec.gasEthMin,
    },
    actual,
    hint: buildHint(probe, signer),
    code: resolveFailCode(probe, signer),
    wrongTokenDetected: wrong,
    ssotRef: spec.ssotRef,
    seeAlso: `pnpm preflight:venues --venue=${spec.venue}`,
  };
}
