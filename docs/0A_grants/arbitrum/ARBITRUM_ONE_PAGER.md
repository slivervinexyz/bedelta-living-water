# SliverVine Protocol (BeDelta Living Water v1.0 / BeΔ): Sub-ms 0-Gas Pre-Broadcast ExoMesh Intent Firewall & Risk Navigator for AI Agents on Arbitrum

**Document:** Arbitrum Technical One-Pager
**Official Name:** SliverVine Protocol (BeDelta Living Water v1.0 / BeΔ)
**GMX v2 Pre-Execution Security Gateway & Underweight Router on Arbitrum One.**
**Identity:** SliverVine Protocol (BeDelta Living Water v1.0 / BeΔ) is a Sub-ms 0-Gas Pre-Broadcast ExoMesh Intent Firewall & Risk Navigator for AI Agents on Arbitrum.


| | |
| -------------- | ----------------------------------------------------------------------------------------------- |
| Entity | SilverVine Labs · `grants@silvervinelabs.com` |
| Official Site | [silvervinelabs.com](https://silvervinelabs.com) — Defense Matrix portal |
| Repo | [SilverVineLabs/bedelta-living-water](https://github.com/SilverVineLabs/bedelta-living-water) |
| Live DApp | [bedeltawater.slivervine.xyz](https://bedeltawater.slivervine.xyz) |
| Regression bar | **254 test files · 1206 PASS clean (100%)** · `tsc --noEmit` clean |
| License | BUSL-1.1 → Apache-2.0 at M2 / $10M TVL or 24 months |
| Spec SSOT | [docs/01_architecture_and_standards/README.md](../../01_architecture_and_standards/README.md) |


---



## What It Does

Before any GMX DataStore broadcast, the ExoMesh edge evaluates sequencer health, oracle lag, soil resistance (including **Pendle Institutional Shield** — Component of Pillar Set Y · sync oracle · `PENDLE_ORACLE_STALE` fail-closed · **USDai** funding wedge for PT Fixed Yield — not USDC), and pool skew — then routes qualified flow to GM pool **underweight sides**, reducing imbalance. Hyperliquid session-key hedging is the Emergency Liquidity Sponge fallback.

**Triangle Liquidity Loop:** `Robinhood Chain (Pillar Set X · Component 2 Reference Escort Adapter)` ↔ `Arbitrum One (GMX GM Yield Base)` ↔ `Hyperliquid (1× Short Hedge)`.

**Arbitrum Native Execution Premium:** Direct Arbitrum One liquidity providers earn an estimated **+15 ~ 30 bps** execution premium vs bridged / multi-hop routes (Stylus-aligned ingress · lower cross-venue friction · underweight rebate capture).

## Robinhood Chain Status


| Network | Chain ID | Status |
| ----------------- | --------- | ---------------------------------------------------------------------------- |
| Robinhood Testnet | **46630** | **ACTIVE / TESTED** |
| Robinhood Mainnet | **4663** | **LIVE-VERIFIED** (native Tier2 · [0x02ced821…951d](https://explorer.chain.robinhood.com/tx/0x02ced8215cb1a9f6ec1b82dd39e01536991f278967d63c63dc29bde2ef6d951d) · 2026-09-21) |




## Live Proof

- **1 live mainnet order:** 0.2223 ETH Short, OID `513344575969` (hyperliquid-mainnet) — machine-readable via `provenanceVerified` in `GET /api/grant-audit`.
- **5-TX verified testnet suite:** HL testnet fills bundled at `src/data/verified_5tx_results.json`.
- **Arbiscan Sepolia anchor:** dual-leg proof bundle (`sepoliaDualLegProof`); simulated legs explicitly marked `simulated: true`.



## Defense Posture


| Guard | Threshold |
| -------------------------- | ------------------------------------------------- |
| Chainlink Sequencer Uptime | 600s grace · fail-closed |
| Canonical Oracle Lag | <30s (30,000ms) vs L2 block headers · fail-closed |
| Dynamic Max SL | Dynamic Account Risk Ceiling (V0.8 Baseline: Equity-Weighted SL; V1.0 Mainnet: Dynamic Adaptive Engine) |
| CrossVenueNetSlippage | >0.5% → soil trip + TWAP |
| NTP / Pgate latency | <200ms drift / RTT fuse |
| Emergency Margin Buffer | 5% |
| Daily Loss Breaker | 1.5% MDD · Root lockout |
| Decision SLO | 500ms · fail-closed |
| Cron Auto-Rebalancer | 5-min · $10 drift gate · circuit breaker |




## Why GMX Benefits

1. Sticky GM TVL — time-weighted retained positions.
2. Imbalance healing — underweight-side routing reduces pool skew · positive skew rebate capture.
3. Builder fee alignment — +10 bps `uiFeeReceiver` + up to **25%** referral rebate on every routed unsigned payload.
4. Native LP premium — **+15 ~ 30 bps** for direct Arbitrum One providers.
5. Audit transparency — provenance badges, open-source guard SSOT, redacted public API.



## Verify (60s)

```bash
pnpm install && pnpm test && npx tsc --noEmit
curl -s "https://bedeltawater.slivervine.xyz/api/grant-audit" | jq .provenanceVerified
```

