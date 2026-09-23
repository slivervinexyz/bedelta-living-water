/** Group K — adversarial fail-closed boundary cases (v1.0 Santenmoku audit hardening). */
import { evaluateGatewayRules, type GatewayRulesResult } from "../../src/core/risk-engine";
import type { SoilResistanceInput } from "../../src/services/risk-control";
import {
  estimatePreliminaryImpact,
  gmxPriceImpactForSoil,
} from "../../src/services/yield/gmx-v2-price-impact";
import {
  resetProbes,
  setGasSurchargeRatio,
  setInvalidOracleTimestamp,
  setOracleFutureSkew,
} from "./santenmoku-stress-probes";

export interface GroupKCase {
  group: "K";
  expectTrip: boolean;
  setup: (now: number) => void;
  run: () => GatewayRulesResult;
}

export function buildGroupKCases(
  symbol: string,
  soil: () => SoilResistanceInput,
): GroupKCase[] {
  return [
    {
      group: "K",
      expectTrip: true,
      setup: (n) => {
        resetProbes(n);
        setInvalidOracleTimestamp(n);
      },
      run: () => evaluateGatewayRules({ symbol, soil: soil() }),
    },
    {
      group: "K",
      expectTrip: true,
      setup: (n) => {
        resetProbes(n);
        setOracleFutureSkew(n, 61_000);
      },
      run: () => evaluateGatewayRules({ symbol, soil: soil() }),
    },
    {
      group: "K",
      expectTrip: true,
      setup: (n) => resetProbes(n),
      run: () => {
        const impact = estimatePreliminaryImpact({
          orderSizeUsd: 0,
          isLong: true,
          pool: { longTokenUsd: 1_000_000, shortTokenUsd: 500_000 },
        });
        return evaluateGatewayRules({
          symbol,
          soil: { ...soil(), gmxPriceImpact: gmxPriceImpactForSoil(impact) },
        });
      },
    },
    {
      group: "K",
      expectTrip: true,
      setup: (n) => resetProbes(n),
      run: () =>
        evaluateGatewayRules({
          symbol,
          soil: {
            ...soil(),
            gmxPriceImpact: {
              priceImpactPenaltyBps: Number.NaN,
              priceImpactSubsidiesBps: 0,
              reducesImbalance: false,
            },
          },
        }),
    },
    {
      group: "K",
      expectTrip: true,
      setup: (n) => resetProbes(n),
      run: () =>
        evaluateGatewayRules({
          symbol,
          soil: {
            ...soil(),
            gmxPriceImpact: {
              priceImpactPenaltyBps: 0,
              priceImpactSubsidiesBps: 600,
              reducesImbalance: true,
              signedImpactBps: -600,
            },
          },
        }),
    },
    {
      group: "K",
      expectTrip: false,
      setup: (n) => {
        resetProbes(n);
        setGasSurchargeRatio(n, 0.2999);
      },
      run: () => evaluateGatewayRules({ symbol, soil: soil() }),
    },
    {
      group: "K",
      expectTrip: true,
      setup: (n) => {
        resetProbes(n);
        setGasSurchargeRatio(n, 0.3001);
      },
      run: () => evaluateGatewayRules({ symbol, soil: soil() }),
    },
  ];
}
