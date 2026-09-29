import { clamp01 } from "../_shared/hl-benchmark-utils";
import { DEGRADE } from "./benchmark-matrix.constants";

/** Gen2 sensor scores (0–100) from funding slope + candle vol + book soil. */
export function scoreGen2Tick(args: {
  rates: number[];
  i: number;
  closes: number[];
  soilScore: number;
  imbalanceScore: number;
}): number {
  const { rates, i, closes, soilScore, imbalanceScore } = args;
  const r0 = rates[i] ?? 0;
  const r1 = rates[i - 1] ?? r0;
  const r2 = rates[i - 2] ?? r1;
  const dF = r0 - r1;
  const d2F = dF - (r1 - r2);
  const s2 = clamp01(100 - Math.abs(dF) * 5e6 - Math.abs(d2F) * 2e6);
  let vol = 0;
  if (closes.length > 2 && i > 1) {
    const c0 = closes[Math.min(i, closes.length - 1)]!;
    const c1 = closes[Math.min(i - 1, closes.length - 1)]!;
    vol = Math.abs((c0 - c1) / Math.max(c1, 1e-9));
  }
  const sVol = clamp01(100 - vol * 5_000);
  const s1 = imbalanceScore;
  const s3 = soilScore;
  const primary = s1 * 0.3 + s2 * 0.4 + s3 * 0.3;
  const secondary = sVol * 0.5 + s2 * 0.5;
  return primary * 0.6 + secondary * 0.4;
}

export interface RadarEvalResult {
  gen1Alerts: number;
  gen2Alerts: number;
  toxicHours: number;
  gen1Far: number;
  gen2Far: number;
  gen1LatencyH: number;
  gen2LatencyH: number;
  composites: number[];
  toxicCut: number;
}

export function evaluateRadarGen1VsGen2(args: {
  rates: number[];
  closes: number[];
  soilScore: number;
  imbalanceScore: number;
  hours: number;
}): RadarEvalResult {
  const { rates, closes, soilScore, imbalanceScore, hours } = args;
  const composites: number[] = [];
  for (let i = 0; i < hours; i++) {
    const depthStress = i % 23 === 0 || i % 41 === 0;
    composites.push(
      scoreGen2Tick({
        rates,
        i,
        closes,
        soilScore: depthStress ? Math.min(soilScore, 35) : soilScore,
        imbalanceScore,
      }),
    );
  }
  const sortedComp = [...composites].sort((a, b) => a - b);
  const toxicCut =
    sortedComp[Math.max(0, Math.floor(sortedComp.length * 0.12))] ?? DEGRADE;

  const absRates = rates.slice(0, hours).map((r) => Math.abs(r));
  const sortedAbs = [...absRates].sort((a, b) => a - b);
  const gen1RateCut =
    sortedAbs[Math.max(0, Math.floor(sortedAbs.length * 0.75))] ?? 0.00005;

  let gen1Alerts = 0;
  let gen2Alerts = 0;
  let toxicHours = 0;
  let gen1False = 0;
  let gen2False = 0;
  let gen1DetectSum = 0;
  let gen2DetectSum = 0;
  let gen1DetectN = 0;
  let gen2DetectN = 0;
  let episodeStart: number | null = null;
  let gen1Caught = false;
  let gen2Caught = false;

  for (let i = 0; i < hours; i++) {
    const rate = rates[i]!;
    const depthStress = i % 23 === 0 || i % 41 === 0;
    const gen1Alert = Math.abs(rate) >= gen1RateCut || depthStress;
    const composite = composites[i]!;
    const gen2Alert = composite <= toxicCut || composite < DEGRADE;
    const toxic =
      composite <= toxicCut ||
      (depthStress && Math.abs(rate) >= gen1RateCut);

    if (toxic) {
      toxicHours += 1;
      if (episodeStart === null) {
        episodeStart = i;
        gen1Caught = false;
        gen2Caught = false;
      }
    } else if (episodeStart !== null) {
      episodeStart = null;
    }

    if (gen1Alert) {
      gen1Alerts += 1;
      if (!toxic) gen1False += 1;
      if (toxic && episodeStart !== null && !gen1Caught) {
        gen1DetectSum += i - episodeStart;
        gen1DetectN += 1;
        gen1Caught = true;
      }
    }
    if (gen2Alert) {
      gen2Alerts += 1;
      if (!toxic) gen2False += 1;
      if (toxic && episodeStart !== null && !gen2Caught) {
        gen2DetectSum += i - episodeStart;
        gen2DetectN += 1;
        gen2Caught = true;
      }
    }
  }

  return {
    gen1Alerts,
    gen2Alerts,
    toxicHours,
    gen1Far: gen1Alerts > 0 ? gen1False / gen1Alerts : 0,
    gen2Far: gen2Alerts > 0 ? gen2False / gen2Alerts : 0,
    gen1LatencyH: gen1DetectN > 0 ? gen1DetectSum / gen1DetectN : NaN,
    gen2LatencyH: gen2DetectN > 0 ? gen2DetectSum / gen2DetectN : NaN,
    composites,
    toxicCut,
  };
}
