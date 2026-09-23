/** SEPSB corpus evaluator — maps fixtures to live guard lanes (no frozen Wasm edits). */
import { evaluateGatewayRules } from "../src/core/risk-engine";
import { FLAGS_CLEAR, FLAGS_IMBALANCE_TRIP, FLAGS_YIELD_SHOCK } from "../src/core/risk-flags";
import {
  evaluateGmxFlags,
  evaluateHlSessionFlags,
  evaluatePendleFlags,
} from "../src/core/risk-engine-flag-evaluators";
import { evaluateUsdAiFlags, evaluateVariationalFlags } from "../src/core/risk-engine-flag-alt";
import { PROTO_GMX, packProtocolLane } from "../src/core/risk-engine-protocol-slots";
import { evaluatePendleGmxCrossGuard } from "../src/guards/pendle-gmx-cross-guard";
import type { GMXPositionState, PTMarketState } from "../src/core/pendle-types";
import {
  __resetRetailGuardStateForTests,
  encodeApproveCalldata,
  encodePermit2ApproveCalldata,
  evaluateRetailApproveGate,
  evaluateRetailIntentGate,
  evaluateRetailRisk,
  evaluateRetailVenueAllowlist,
  UINT160_MAX,
  UINT256_MAX,
  type RetailGuardConfig,
} from "../src/sdk/exomesh-agentic-wallet-guard";
import type { SepsbCorpusCase, SepsbExpectedVerdict } from "./sepsb-benchmark-types";

const WALLET = "0x1111111111111111111111111111111111111111";
const GMX = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const UNISWAP = "0xcccccccccccccccccccccccccccccccccccccccc";
const USDC = "0xaf88d065e77c1c973b2696121c3f3f3f3f3f3f3f";
const MALICIOUS = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const TRUSTED = "0xdddddddddddddddddddddddddddddddddddddddd";
const PERMIT2 = "0x000000000022d473030f116ddee9f6b43ac78b6";
const NOW_MS = 1_700_000_000_000;
const NOW_SEC = Math.floor(NOW_MS / 1000);

export function baseRetailConfig(overrides: Partial<RetailGuardConfig> = {}): RetailGuardConfig {
  return {
    walletAddress: WALLET,
    allowedVenueMask: 0b111,
    allowedVenues: [GMX, UNISWAP, USDC, PERMIT2],
    allowedSpenders: [TRUSTED],
    contractVenueIndex: { [GMX]: 0, [UNISWAP]: 1, [USDC]: 2, [PERMIT2]: 3 },
    maxApprovalUsd: 10_000,
    approvalTokenPriceUsd: 1,
    approvalTokenDecimals: 18,
    soilQuote: { hlSpot: 3500, hlPerp: 3500, dydxPerp: 3498.25, depthUsd: 500_000, maxSlippage: 0.005, minDepthUsd: 100_000 },
    preferWasm: false,
    ...overrides,
  };
}

function verdict(blocked: boolean): SepsbExpectedVerdict {
  return blocked ? "block" : "allow";
}

function ptMarket(overrides: Partial<PTMarketState> = {}): PTMarketState {
  return {
    expiry: NOW_SEC + 365.25 * 86_400,
    impliedYield: 0.05,
    historicalYield24h: 0.05,
    ptPriceInAsset: 0.92,
    liquidityConstant: 10_000_000,
    dynamicFeeRate: 0.01,
    ...overrides,
  };
}

function gmxPos(overrides: Partial<GMXPositionState> = {}): GMXPositionState {
  return { collateralAmount: 100, collateralTokenPriceUsd: 3000, sizeNotionalUsd: 100_000, intent: "open", ...overrides };
}

export function evaluateSepsbCase(caseRow: SepsbCorpusCase): { actual: SepsbExpectedVerdict; detail?: string } {
  __resetRetailGuardStateForTests();
  const p = caseRow.payload;

  switch (caseRow.lane) {
    case "retail_approve": {
      const reject = evaluateRetailApproveGate(
        {
          kind: "approve",
          token: String(p.token ?? USDC),
          spender: String(p.spender ?? MALICIOUS).toLowerCase(),
          amountWei: BigInt(String(p.amountWei ?? UINT256_MAX)),
          infinite: Boolean(p.infinite),
        },
        baseRetailConfig(p.config as Partial<RetailGuardConfig> | undefined),
      );
      return { actual: verdict(reject !== null), detail: reject?.code };
    }
    case "retail_venue": {
      const reject = evaluateRetailVenueAllowlist(String(p.contract ?? MALICIOUS), baseRetailConfig());
      return { actual: verdict(reject !== null), detail: reject?.code };
    }
    case "retail_intent_strike": {
      const cfg = baseRetailConfig({ maxAttempts: Number(p.maxAttempts ?? 3) });
      const bit = Number(p.venueBit ?? 1);
      let blocked = false;
      for (let i = 0; i < Number(p.strikes ?? 4); i++) {
        const reject = evaluateRetailIntentGate(cfg, bit);
        if (reject) blocked = true;
      }
      return { actual: verdict(blocked), detail: blocked ? "MAX_ATTEMPTS_OR_DRIFT" : undefined };
    }
    case "retail_risk": {
      const method = String(p.method ?? "eth_sendTransaction");
      const params = (p.params as unknown[]).map((row) => {
        if (!row || typeof row !== "object") return row;
        const tx = { ...(row as Record<string, unknown>) };
        const preset = String(tx.dataPreset ?? "");
        if (preset === "permit2_phishing") tx.data = SEPSB_FIXTURE_ENCODERS.permit2Phishing();
        if (preset === "infinite_approve") tx.data = SEPSB_FIXTURE_ENCODERS.infiniteApprove();
        delete tx.dataPreset;
        return tx;
      });
      const reject = evaluateRetailRisk(baseRetailConfig(p.config as Partial<RetailGuardConfig> | undefined), method, params, {
        skipTransport: true,
        skipIntentGate: Boolean(p.skipIntentGate),
      });
      return { actual: verdict(reject !== null), detail: reject?.code };
    }
    case "gateway_soil": {
      const soil = p.soil as Record<string, unknown>;
      const result = evaluateGatewayRules({
        symbol: String(p.symbol ?? "ETH"),
        soil: {
          symbol: String(soil.symbol ?? "ETH"),
          hlSpot: Number(soil.hlSpot ?? 3500),
          hlPerp: Number(soil.hlPerp ?? 3500),
          dydxPerp: Number(soil.dydxPerp ?? 3498),
          depthUsd: Number(soil.depthUsd ?? 500_000),
          orderSizeUsd: Number(soil.orderSizeUsd ?? 500),
          accountBalanceUsd: Number(soil.accountBalanceUsd ?? 10_000),
          maxSlippage: Number(soil.maxSlippage ?? 0.005),
        },
      });
      return { actual: verdict(result.tripped), detail: result.reasons.join("|") || undefined };
    }
    case "gmx_flags": {
      const vec = new Float64Array(28);
      packProtocolLane(PROTO_GMX, Number(p.oiLong ?? 500), Number(p.oiShort ?? 400), Number(p.tvl ?? 2000), Number(p.collateral ?? 1.2), vec);
      const flags = evaluateGmxFlags(vec, PROTO_GMX, p.skewDeltaUsd !== undefined ? { skewDeltaUsd: Number(p.skewDeltaUsd), notionalUsd: Number(p.notionalUsd ?? 0), nowMs: NOW_MS } : undefined);
      const tripped = flags !== FLAGS_CLEAR && (flags & FLAGS_IMBALANCE_TRIP) !== 0;
      return { actual: verdict(tripped), detail: `flags=${flags}` };
    }
    case "pendle_flags": {
      const flags = evaluatePendleFlags(Number(p.yieldCurrent ?? 0.05), Number(p.yieldOracle ?? 0.05));
      const tripped = (flags & FLAGS_YIELD_SHOCK) !== 0;
      return { actual: verdict(tripped), detail: `flags=${flags}` };
    }
    case "pendle_gmx_cross": {
      const result = evaluatePendleGmxCrossGuard(ptMarket(p.ptMarket as Partial<PTMarketState> | undefined), gmxPos(p.gmxPos as Partial<GMXPositionState> | undefined), Number(p.assetUsdPrice ?? 3000));
      return { actual: verdict(!result.passed), detail: result.action };
    }
    case "usdai_flags": {
      const flags = evaluateUsdAiFlags({
        oracleAgeMs: Number(p.oracleAgeMs ?? 0),
        pegDriftBps: Number(p.pegDriftBps ?? 0),
        navDeviationBps: Number(p.navDeviationBps ?? 0),
        pegVelocityBpsPerSec: p.pegVelocityBpsPerSec !== undefined ? Number(p.pegVelocityBpsPerSec) : undefined,
      });
      return { actual: verdict(flags !== FLAGS_CLEAR), detail: `flags=${flags}` };
    }
    case "hyperliquid_flags": {
      const flags = evaluateHlSessionFlags(
        Boolean(p.sessionValid ?? true),
        Number(p.orderSize ?? 1),
        Number(p.maxSize ?? 100),
        Number(p.spreadBps ?? 10),
        Number(p.rpm ?? 30),
      );
      return { actual: verdict(flags !== FLAGS_CLEAR), detail: `flags=${flags}` };
    }
    case "variational_flags": {
      const nowMs = Number(p.nowMs ?? NOW_MS);
      const flags = evaluateVariationalFlags({
        quotePriceUsd: Number(p.quotePriceUsd ?? 3000),
        oracleMarkUsd: Number(p.oracleMarkUsd ?? 3000),
        quoteTimestampMs: Number(p.quoteTimestampMs ?? nowMs),
        nowMs,
        tradeSizeUsd: Number(p.tradeSizeUsd ?? 1000),
        olpDepthUsd: Number(p.olpDepthUsd ?? 100_000),
        longTailAsset: p.longTailAsset !== false,
      });
      return { actual: verdict(flags !== FLAGS_CLEAR), detail: `flags=${flags}` };
    }
    default:
      return { actual: "allow", detail: "UNKNOWN_LANE" };
  }
}

export const SEPSB_FIXTURE_ENCODERS = {
  infiniteApprove: () => encodeApproveCalldata(MALICIOUS, UINT256_MAX),
  permit2Phishing: () => encodePermit2ApproveCalldata(USDC, MALICIOUS, UINT160_MAX),
};
