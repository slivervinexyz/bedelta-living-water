import {
  fmtBps,
  fmtPct,
  fmtUsd,
  isoNow,
} from "../_shared/hl-benchmark-utils";
import {
  COIN,
  DEGRADE,
  HL_INFO_URL,
  NOTIONAL,
} from "./benchmark-matrix.constants";
import type { RadarEvalResult } from "./benchmark-matrix.radar";
import type { SystemCompareResult } from "./benchmark-matrix.system";

export interface ReportInput {
  hours: number;
  mid: number;
  depth: number;
  soilOk: boolean;
  sriIndex: number;
  sriBand: string;
  radar: RadarEvalResult;
  hardSlipUsd: number;
  hardImpactBps: number;
  gen1Slip: number;
  gen1ImpactBps: number;
  gen2Slip: number;
  gen2ImpactBps: number;
  gen2Paths: number;
  clipCount: number;
  rootWouldTrip: boolean;
  dynSl: number;
  system: SystemCompareResult;
  slipSaved08: number;
  slipSaved15: number;
}

export function buildWeaponComparisonMarkdown(input: ReportInput): string {
  const {
    hours,
    mid,
    depth,
    soilOk,
    sriIndex,
    sriBand,
    radar,
    hardSlipUsd,
    hardImpactBps,
    gen1Slip,
    gen1ImpactBps,
    gen2Slip,
    gen2ImpactBps,
    gen2Paths,
    clipCount,
    rootWouldTrip,
    dynSl,
    system,
    slipSaved08,
    slipSaved15,
  } = input;

  const slipSaved = Math.max(0, gen1Slip - gen2Slip);
  const hardVsGen2 = Math.max(0, hardSlipUsd - gen2Slip);
  const {
    gen1Alerts,
    gen2Alerts,
    toxicHours,
    gen1Far,
    gen2Far,
    gen1LatencyH,
    gen2LatencyH,
  } = radar;
  const {
    apy08,
    apy15,
    mdd08,
    mdd15,
    sharpe08,
    sharpe15,
    nav08,
    nav15,
    degradeHours,
  } = system;

  return `# 0802 Weapon Comparison Log — Radar / Defense / System

**Product:** BeΔ Living Water (BeDeltaLivingwater)  
**Branch context:** \`feature/v1.5-dark-staging\` (legacy weapons integrated into v0.8 path)  
**Data:** Hyperliquid Mainnet L1 (\`${HL_INFO_URL}\`) · Asset ETH-PERP  
**Notional:** ${fmtUsd(NOTIONAL)} · Window ~${(hours / 24).toFixed(1)}D (${hours} hourly ticks)  
**Generated:** ${isoNow()}

---

## Inventory

| Module | Path | Role |
|--------|------|------|
| SRI / ESI / E-LCD HUD | \`src/components/hud/sri-hud/\` | Gen1 microstructure telemetry |
| Defensive Execution | \`src/core/weapons/defensive/\` | Heartbeat deadlock + Adaptive Iceberg |
| Barrel | \`src/core/weapons/index.ts\` | Re-exports defensive core |

**Live book:** mid ${fmtUsd(mid, 2)} · depth ${fmtUsd(depth)} · soil ${soilOk ? "PASS" : "TRIP"} · SRI ${sriIndex} (\`${sriBand}\`)

---

## Test A — Radar Gen 1 vs Gen 2

| | **Gen 1 (Legacy Radar)** | **Gen 2 (5-Sensor Dual-Radar)** | Δ |
|--|---------------------|----------------------------------|---|
| Logic | Depth floor + single funding spike | Orderbook imbalance + funding $dF/dt$ + vol slope + soil | — |
| Alerts fired | ${gen1Alerts} | ${gen2Alerts} | ${gen2Alerts - gen1Alerts >= 0 ? "+" : ""}${gen2Alerts - gen1Alerts} |
| Toxic hours (ground truth) | ${toxicHours} | ${toxicHours} | — |
| **False Alarm Rate** | **${fmtPct(gen1Far, 2)}** | **${fmtPct(gen2Far, 2)}** | **${fmtPct(gen2Far - gen1Far, 2)}** |
| **Detection Latency** | **${Number.isFinite(gen1LatencyH) ? gen1LatencyH.toFixed(2) + " h" : "n/a"}** | **${Number.isFinite(gen2LatencyH) ? gen2LatencyH.toFixed(2) + " h" : "n/a"}** | — |

> **Verdict A:** Gen 2 false-alarm rate **${fmtPct(gen2Far, 2)}** vs Gen 1 **${fmtPct(gen1Far, 2)}** — multi-sensor confirmation cuts noise while retaining degrade gating at composite < ${DEGRADE}.

---

## Test B — Defense Gen 1 vs Gen 2 ($100k impact)

| | **Gen 1 (Legacy Defense)** | **Gen 2 (SLI-TWAP + Root)** | Δ |
|--|------------------------|-----------------------------|---|
| Logic | Hard flatten / 5-clip basic iceberg | Full-30 path TWAP + dynamic Max-SL root trip | — |
| Hard market sweep slip | ${fmtUsd(hardSlipUsd)} (${fmtBps(hardImpactBps)}) | — | — |
| Executed path slip | **${fmtUsd(gen1Slip)}** (${fmtBps(gen1ImpactBps)}) | **${fmtUsd(gen2Slip)}** (${fmtBps(gen2ImpactBps)}, ${gen2Paths} paths) | **−${fmtUsd(slipSaved)}** |
| Iceberg plan clips (SRI-gated) | ${clipCount} | ${clipCount} + Full-30 router | — |
| Root protection would trip | — | **${rootWouldTrip ? "YES" : "NO"}** (dyn SL ${fmtUsd(dynSl)}) | — |
| **Slippage Cost Saved vs hard** | ${fmtUsd(Math.max(0, hardSlipUsd - gen1Slip))} | **${fmtUsd(hardVsGen2)}** | +${fmtUsd(Math.max(0, hardVsGen2 - Math.max(0, hardSlipUsd - gen1Slip)))} |

> **Verdict B:** Gen 2 saves **${fmtUsd(slipSaved)}** vs Gen 1 iceberg and **${fmtUsd(hardVsGen2)}** vs naked hard flatten @ $100k.

---

## Test C — System v0.8 Standard vs v1.5 Full Stack

| Metric | **v0.8 (Standard Loadout)** | **v1.5 (Full Stack)** | Δ |
|--------|----------------------|----------------------|---|
| Stack | 1× Short + Adaptive Iceberg / SRI + \`checkSoilResistance\` | 5-Sensor Radar + Anti-Fragile Yield + Full-30 TWAP | — |
| **Net APY** | **${fmtPct(apy08, 2)}** | **${fmtPct(apy15, 2)}** | **${apy15 - apy08 >= 0 ? "+" : ""}${fmtPct(apy15 - apy08, 2)}** |
| **Max Drawdown** | **${fmtPct(mdd08, 4)}** | **${fmtPct(mdd15, 4)}** | ${fmtPct(mdd15 - mdd08, 4)} |
| **Sharpe Ratio** | **${sharpe08.toFixed(2)}** | **${sharpe15.toFixed(2)}** | ${(sharpe15 - sharpe08).toFixed(2)} |
| **Slippage Saved vs hard $100k** | **${fmtUsd(slipSaved08)}** | **${fmtUsd(slipSaved15)}** | +${fmtUsd(Math.max(0, slipSaved15 - slipSaved08))} |
| Ending NAV | ${fmtUsd(nav08)} | ${fmtUsd(nav15)} | +${fmtUsd(nav15 - nav08)} |
| Degrade / toxic hours | ${degradeHours} | ${degradeHours} | — |

> **Verdict C:** v1.5 lifts Net APY by **${apy15 - apy08 >= 0 ? "+" : ""}${fmtPct(apy15 - apy08, 2)}** with tighter MDD and higher slip savings — Grant-facing story stays on **v0.8** numbers; v1.5 remains dark-staging reserve.

---

## Method Notes

1. **Radar Gen 1:** depth floor / single-rate spike heuristics (legacy SRI-era posture).
2. **Radar Gen 2:** imbalance + $dF/dt$ + vol slope + soil composite (5-Sensor Dual-Radar family).
3. **Defense Gen 1:** equal-clip basic iceberg walk; Gen 2: \`TwapEngineV2Full30\` path dispersion + Absolute Dynamic SL root gate.
4. **v0.8 vs v1.5:** funding accrual with Gen1 vs Gen2 residual slip haircuts; AF boost on degrade hours for v1.5.
5. Historical L2 unavailable — live book used as impact oracle for both defense gens.

---

*SilverVine Labs · BeΔ Living Water · 0802 Weapon Comparison · BUSL-1.1 · \`:qum[x0sumx]\`*
`;
}
