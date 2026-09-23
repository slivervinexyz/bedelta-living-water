import { AntiFragileYieldService } from "../../src/services/anti-fragile-yield";
import type { FundingPoint } from "../_shared/hl-benchmark-utils";
import { maxDrawdown, sharpeDaily } from "../_shared/hl-benchmark-utils";
import { NOTIONAL } from "./benchmark-matrix.constants";

export interface SystemCompareResult {
  fund08: number;
  fund15: number;
  apy08: number;
  apy15: number;
  mdd08: number;
  mdd15: number;
  sharpe08: number;
  sharpe15: number;
  nav08: number;
  nav15: number;
  degradeHours: number;
}

export function compareSystemV08VsV15(args: {
  hours: number;
  rates: number[];
  funding: FundingPoint[];
  start: number;
  composites: number[];
  toxicCut: number;
  gen1Slip: number;
  gen2Slip: number;
}): SystemCompareResult {
  const {
    hours,
    rates,
    funding,
    start,
    composites,
    toxicCut,
    gen1Slip,
    gen2Slip,
  } = args;

  let fund08 = 0;
  let fund15 = 0;
  const eq08: number[] = [];
  const eq15: number[] = [];
  const day08 = new Map<string, number>();
  const day15 = new Map<string, number>();
  let nav08 = NOTIONAL;
  let nav15 = NOTIONAL;
  const af = new AntiFragileYieldService(true);
  let degradeHours = 0;

  for (let i = 0; i < hours; i++) {
    const rate = rates[i]!;
    const t = funding[i]?.time ?? start + i * 3_600_000;
    const base = NOTIONAL * rate;
    const composite = composites[i]!;
    const stress = composite <= toxicCut;
    if (stress) degradeHours += 1;

    const pnl08 = base - (stress ? gen1Slip * 0.015 : gen1Slip * 0.001);
    fund08 += pnl08;
    nav08 += pnl08;
    eq08.push(nav08);
    const d = new Date(t).toISOString().slice(0, 10);
    day08.set(d, (day08.get(d) ?? 0) + pnl08);

    const afH = af.evaluateHourlyHlFunding({
      notionalUsd: NOTIONAL,
      hourlyFundingRate: rate,
      blackSwanActive: stress,
    });
    const pnl15 =
      (stress && rate > 0 ? afH.subsidyUsd : base) -
      (stress ? gen2Slip * 0.008 : gen2Slip * 0.0004);
    fund15 += pnl15;
    nav15 += pnl15;
    eq15.push(nav15);
    day15.set(d, (day15.get(d) ?? 0) + pnl15);
  }

  const ann = (365 * 24) / Math.max(hours, 1);
  return {
    fund08,
    fund15,
    apy08: (fund08 / NOTIONAL) * ann,
    apy15: (fund15 / NOTIONAL) * ann,
    mdd08: maxDrawdown(eq08),
    mdd15: maxDrawdown(eq15),
    sharpe08: sharpeDaily([...day08.values()], NOTIONAL),
    sharpe15: sharpeDaily([...day15.values()], NOTIONAL),
    nav08,
    nav15,
    degradeHours,
  };
}
