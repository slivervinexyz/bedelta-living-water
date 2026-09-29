#!/usr/bin/env python3
"""
Monte Carlo game-theory simulation — GMX/HL liquidity collapse vs Sanctuary soil guard.

Mirrors checkSoilResistance() thresholds from soil-resistance-types.ts:
  MIN_DEPTH_USD = 100_000, MAX_SLIPPAGE = 0.005 (50 bps fuse).

Scenario: 10_000 iterations — depth drops 80% in 1s + adversarial toxic/sandwich flow.
Stdlib only: math, random, json, pathlib.
"""
from __future__ import annotations

import json
import math
import random
from pathlib import Path

ITERATIONS = 10_000
MIN_DEPTH_USD = 100_000.0
MAX_SLIPPAGE = 0.005
DEPTH_COLLAPSE_FACTOR = 0.20  # 80% depth loss in 1 second
SANDWICH_SPREAD_BPS = 85.0  # adversarial toxic flow widens cross-venue basis
RNG_SEED = 42


def check_soil_resistance(
    hl_spot: float,
    hl_perp: float,
    dydx_perp: float,
    depth_usd: float,
) -> tuple[bool, list[str]]:
    """Fail-closed soil gate — mirrors TypeScript checkSoilResistance trip logic."""
    reasons: list[str] = []
    if hl_perp <= 0 or dydx_perp <= 0:
        reasons.append("INSUFFICIENT_DEPTH_DUAL_VENUE")
        cross = float("inf")
    else:
        cross = abs(dydx_perp - hl_perp) / hl_perp

    if depth_usd < MIN_DEPTH_USD:
        reasons.append(f"DEPTH_USD={depth_usd:.0f}<{MIN_DEPTH_USD:.0f}")

    if hl_perp > 0 and dydx_perp > 0 and cross > MAX_SLIPPAGE:
        reasons.append(
            f"CROSS_VENUE_SLIPPAGE={cross * 100:.4f}%>{MAX_SLIPPAGE * 100}%"
        )

    return len(reasons) > 0, reasons


def toxic_slippage_usd(order_usd: float, depth_usd: float, spread_bps: float) -> float:
    """LP toxic flow absorption — order impact scales inversely with post-shock depth."""
    if depth_usd <= 0 or order_usd <= 0:
        return order_usd
    impact = (order_usd / depth_usd) * (spread_bps / 10_000.0)
    return min(order_usd, order_usd * impact + order_usd * 0.001)


def impermanent_loss_usd(
    order_usd: float, depth_usd: float, collapse_severity: float
) -> float:
    """Simplified IL from sudden depth contraction (GMX/HL LP share)."""
    if depth_usd <= 0:
        return order_usd * collapse_severity
    pool_share = min(0.15, order_usd / max(depth_usd, 1.0))
    return order_usd * pool_share * collapse_severity * 0.35


def run_iteration(rng: random.Random) -> dict[str, float | bool]:
    mid = rng.uniform(2_800.0, 3_600.0)
    pre_depth = rng.uniform(180_000.0, 900_000.0)
    post_depth = pre_depth * DEPTH_COLLAPSE_FACTOR
    order_usd = rng.uniform(5_000.0, 250_000.0)

    hl_spot = mid
    hl_perp = mid * (1.0 + rng.uniform(-0.0008, 0.0008))
  # sandwich bot widens GMX reference vs HL perp after collapse
    sandwich_bps = rng.uniform(40.0, SANDWICH_SPREAD_BPS)
    dydx_perp = hl_perp * (1.0 + sandwich_bps / 10_000.0)

    pre_tripped, _ = check_soil_resistance(hl_spot, hl_perp, dydx_perp, pre_depth)
    post_tripped, _ = check_soil_resistance(hl_spot, hl_perp, dydx_perp, post_depth)

    collapse_severity = 1.0 - DEPTH_COLLAPSE_FACTOR
    il_base = impermanent_loss_usd(order_usd, pre_depth, collapse_severity)

    without_guard = not pre_tripped or not post_tripped
    toxic_without = (
        toxic_slippage_usd(order_usd, post_depth, sandwich_bps) if without_guard else 0.0
    )
    il_without = il_base if without_guard else il_base * 0.12

    with_guard = post_tripped
    toxic_with = 0.0 if with_guard else toxic_slippage_usd(order_usd, post_depth, sandwich_bps)
    il_with = il_base * 0.10 if with_guard else il_base * 0.55

    return {
        "toxic_attempt": True,
        "blocked_by_sanctuary": with_guard,
        "toxic_without_usd": toxic_without,
        "toxic_with_usd": toxic_with,
        "il_without_usd": il_without,
        "il_with_usd": il_with,
        "lp_saved_usd": max(0.0, (toxic_without + il_without) - (toxic_with + il_with)),
    }


def main() -> None:
    rng = random.Random(RNG_SEED)
    rows = [run_iteration(rng) for _ in range(ITERATIONS)]

    blocked = sum(1 for r in rows if r["blocked_by_sanctuary_guard"])
    toxic_flow_blocked_percent = 100.0 * blocked / ITERATIONS
    lp_capital_saved_usd = sum(float(r["lp_saved_usd"]) for r in rows)
    total_toxic_without = sum(float(r["toxic_without_usd"]) for r in rows)
    total_toxic_with = sum(float(r["toxic_with_usd"]) for r in rows)
    total_il_without = sum(float(r["il_without_usd"]) for r in rows)
    total_il_with = sum(float(r["il_with_usd"]) for r in rows)

    summary = {
        "simulation": "soil_game_theory_monte_carlo",
        "scenario": "GMX/HL depth -80% in 1s + adversarial sandwich/toxic flow",
        "iterations": ITERATIONS,
        "seed": RNG_SEED,
        "parameters": {
            "minDepthUsd": MIN_DEPTH_USD,
            "maxSlippage": MAX_SLIPPAGE,
            "depthCollapseFactor": DEPTH_COLLAPSE_FACTOR,
            "sandwichSpreadBpsMax": SANDWICH_SPREAD_BPS,
        },
        "toxicFlowBlockedPercent": f"{toxic_flow_blocked_percent:.2f}%",
        "toxicFlowBlockedCount": blocked,
        "lpCapitalSavedUsd": round(lp_capital_saved_usd, 2),
        "aggregate": {
            "toxicSlippageWithoutGuardUsd": round(total_toxic_without, 2),
            "toxicSlippageWithSanctuaryGuardUsd": round(total_toxic_with, 2),
            "impermanentLossWithoutGuardUsd": round(total_il_without, 2),
            "impermanentLossWithSanctuaryGuardUsd": round(total_il_with, 2),
            "netLpProtectionUsd": round(
                (total_toxic_without + total_il_without)
                - (total_toxic_with + total_il_with),
                2,
            ),
        },
        "checkSoilResistanceModel": "dynamic slippage fuse + MIN_DEPTH_USD fail-closed",
    }

    out_path = Path(__file__).resolve().parents[2] / "docs/audit/game_theory_simulation_results.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
