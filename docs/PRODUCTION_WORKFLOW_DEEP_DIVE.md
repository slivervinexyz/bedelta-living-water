# 🏛️ SliverVine Sanctuary — Production Workflow Deep Dive (Sanctuary SSOT)

**Document role:** **SliverVine Sanctuary** technical SSOT — authoritative English reference for the dual-wallet **Sanctuary Delta Pool** on Arbitrum One (`42161`).  
**Live MVP thesis:** **Near-Zero Drawdown, Maximum Sharpe Ratio via Active Microsecond Circuit Breaking** — GMX v2 GM Pool (ETH/USDC) Real Yield + **1× Hyperliquid perp short** hedge until **Δ_net ≡ 0**.  
<!-- SSOT:PRODUCTION_VERIFIED_COMMIT_START -->
**Verified commits: `572e5cd` (GMX on-chain invariant stack @ 572e5cd) · `0885225` (verified HEAD) · 254 test files | 1206 PASS clean (100%)**
<!-- SSOT:PRODUCTION_VERIFIED_COMMIT_END -->
**Related:** [VERIFICATION_MATRIX.md](./03_product_verifications/01_VERIFICATION_MATRIX.md) · [00_ARB_Buildathon/SUBMISSION.md](./00_ARB_Buildathon/SUBMISSION.md)

---

## Executive Summary

SliverVine ExoMesh is the **Pre-Consensus Intent Execution Calibration Layer for AI Agents**. The **SliverVine Sanctuary** (Sanctuary Delta Pool) is our live MVP proving that **active sub-ms circuit breaking** delivers GMX v2 Real Yield with **near-zero drawdown** and **maximum Sharpe Ratio**.

| Plane | Wallet | Venue | Responsibility |
|-------|--------|-------|----------------|
| **Hedge engine** | Wallet A `0xef0752…960d` | Hyperliquid L1 (primary) · GMX v2 (fallback) | Perp **short** hedge until **Δ_net ≡ 0** |
| **Yield vault** | Wallet B `0xbd65d7…EC7F` | Arbitrum One · GMX v2 GM | **Principal capital custody** · GM LP **deposit / withdraw only** |
| **Protocol Treasury** | `0xc9BddA…546f` (`uiFeeReceiver`) | Arbitrum One Treasury | **Protocol revenue collection** · +10 bps GMX v2 builder rebate (segregated from Wallet B principal) |

**Protocol revenue stream:** Every unsigned GMX v2 payload injects **+10 bps** (`GMX_UI_FEE_BPS`) directly to the dedicated Protocol Treasury (`0xc9BddA...546f`) as `uiFeeReceiver`, completely segregated from Wallet B principal capital (`0xbd65d7...EC7F`) — SSOT [gmx-revenue.ts](../src/config/gmx-revenue.ts) · [gmx-v2-order-payload.ts](../src/services/adapters/gmx-v2-order-payload.ts).

Cross-wallet sizing SSOT: [gmx-cross-wallet-hedge.ts](../src/services/gmx-cross-wallet-hedge.ts).  
Telemetry tags: `[WALLET_B_GMX_STATE]` · `[WALLET_A_HL_STATE]` · `[CROSS_VENUE_MATCH]` · `[COLD_START_GUARD]`.

---

## Section 1 — Wallet B: GM LP Yield Vault (Pure Deposit / Withdraw)

### 1.1 Scope boundary

Wallet B is **exclusively** the Arbitrum GM LP yield vault. It must **never** sign GMX perp `createOrder` payloads.

| Allowed | Forbidden |
|---------|-----------|
| GM Pool `createDeposit` multicall | GMX perp long/short `createOrder` |
| GM LP → Router `approve` | Hyperliquid session keys |
| GM Pool `createWithdrawal` multicall | Wallet A hedge keys on Wallet B |

**Enforcement:** global `assertWalletBPerpIsolation()` in [wallet-isolation-guard.ts](../src/core/wallet-isolation-guard.ts) — throws `WALLET_B_PERP_FORBIDDEN` on all GMX `createOrder` builder paths.

### 1.2 Three-leg GM I/O multicall (verified live on 42161)

Production GM I/O uses GMX v2 `ExchangeRouter` multicall on Arbitrum One:

| Leg | Action | Live Tx | SSOT CLI |
|-----|--------|---------|----------|
| **1 — Deposit** | `sendWnt` → `sendTokens` → `createDeposit` | [0xe3155220…](https://arbiscan.io/tx/0xe3155220e464c375329838bb5ca8498226b8c8fa32c11929b7605070f7be4774) | `pnpm execute:gmx:gm-deposit` |
| **2 — Approve** | GM LP token → GMX v2 Router spender | [0x30ec0b7a…](https://arbiscan.io/tx/0x30ec0b7a9493f0c43edb257fd40f6d6f9258401e206357f3db7574b11071b00e) | Part of withdraw prep |
| **3 — Withdraw** | `sendWnt` → `sendTokens(GM)` → `createWithdrawal` | [0xfd3601dc…](https://arbiscan.io/tx/0xfd3601dce5c2407d371186d8a24829994547ec8810f4a20c3e798d2fb67ae410) | `pnpm execute:gmx:gm-withdraw` |

**Code SSOT:** [gmx-gm-deposit-multicall.ts](../src/services/adapters/gmx-gm-deposit-multicall.ts) · [gmx-gm-withdraw-multicall.ts](../src/services/adapters/gmx-gm-withdraw-multicall.ts)

### 1.3 Builder fee revenue model (+10 bps `uiFeeReceiver`)

| Field | SSOT |
|-------|------|
| **Fee rate** | `GMX_UI_FEE_BPS = 10` (+10 bps on GM pool flows) |
| **Treasury wallet** | Protocol Treasury `0xc9BddABD80982d2201376195DD9B85fb7951546f` (`uiFeeReceiver`) — **not** Wallet B principal |
| **Principal vault** | Wallet B `0xbd65d785Dac74EBa9efFdB357b2dC52fCC26EC7F` — GM LP custody only |
| **Injection point** | Unsigned GMX v2 payload builder — pre-broadcast, non-custodial |
| **Grant narrative** | $2,400 GM deposit → **+$2.40** protocol treasury rebate (not user principal) |

### 1.4 Pre-flight pipeline (every leg)

```
User intent
    → checkSoilResistance()          (Edge · p50 ~106µs · 0-Gas fail-closed)
    → GMX wire guards                (pool imbalance · oracle lag · depth)
    → ExchangeRouter multicall       (Wallet B broadcast)
    → emit [WALLET_B_GMX_STATE]      (cron / hedge telemetry)
```

GMX keeper settlement remains protocol-native two-stage semantics; **user-side I/O channel SSOT is closed** once deposit + withdraw multicalls are confirmed on-chain.

---

## Section 2 — Wallet A: Hedge Engine (HL Primary · GMX Fallback)

### 2.1 Primary path — Hyperliquid L1 perp short (0-Gas)

| Field | SSOT |
|-------|------|
| **Wallet** | `0xef0752df6387248B897F3A59A180af42D801960d` (`HL_WALLET_A_DEFAULT`) |
| **Execution** | `executeHlSessionKeyOrder` — EIP-712 session-key IOC **1× short** |
| **Sizing** | `computeDeltaNeutralHedgeOrder()` from live GMX Wallet B ETH delta |
| **Cron** | `runScheduledGmxHedgeCron` → `executeGmxCrossWalletHedge` |
| **CLI** | `pnpm tsx scripts/hedge-gmx.ts` (`--live` for broadcast) |

HL execution is **0-Gas on Arbitrum** (L1 orderbook app-chain). Legacy HL stubs are blocked when `IS_MAINNET=true`.

### 2.2 Fallback path — GMX v2 synthetic short (simulate only)

| Field | SSOT |
|-------|------|
| **Builder** | [gmx-v2-wallet-a-short-builder.ts](../src/services/adapters/gmx-v2-wallet-a-short-builder.ts) |
| **CLI** | `pnpm execute:gmx:wallet-a-short-fallback` |
| **Collateral** | USDC on Arbitrum · Wallet A balance probe |
| **Live status** | **Simulate only** — Wallet A USDC = 0 on mainnet · **no live fill claims permitted** |
| **Telemetry** | `[GMX_SHORT_HEDGE]` prefix in builder + CLI |

`auditGmxWalletAShortWire` **fail-closed** rejects Wallet B as the signing wallet. Fallback does **not** replace the HL session-key pipeline; it is a contingency wire-audit path when HL is unavailable.

### 2.3 Cross-venue match invariant

$$
\Delta_{\text{net}} = \Delta_{\text{GMX\_GM}} + \Delta_{\text{HL\_Short}} \equiv 0
$$

[dual-wallet-structured-log.ts](../src/services/gmx-cross-wallet-hedge-lib/dual-wallet-structured-log.ts) emits:

```text
[WALLET_B_GMX_STATE] walletB: 0xc9Bd...546f | ethDeltaSize: X.XXXX ETH | gmLiquidityUsd: $X.XX
[WALLET_A_HL_STATE] walletA: 0xef07...960d | existingShortEth: X.XXXX ETH
[CROSS_VENUE_MATCH] uncoveredDeltaEth: X.XXXX ETH | requiredHedgeAction: SHORT|COVER|SKIP
```

---

## Section 3 — Dual-Wallet Cold-Start & Capital Model

### 3.1 Seed pre-funding / margin cushion (Wallet A)

**Design principle:** Hyperliquid margin must be **pre-funded** before Wallet B deploys incremental GM long delta. The system does **not** rely on synchronous in-flight cross-chain bridges at hedge time — bridge latency would open an unhedged window and risk liquidation.

| Layer | Mechanism | SSOT |
|-------|-----------|------|
| **HL margin cushion** | Pre-seed Wallet A with USDC margin on Hyperliquid L1 | Grant narrative: **$100 HL margin** backs ~$1,200 notional short |
| **5% cross-MMR buffer** | `DEFAULT_CROSS_MMR = 0.05` — liquidation distance floor | [margin-buffer.test.ts](../tests/risk-control/margin-buffer.test.ts) |
| **5–10% NAV buffer** | `evaluateBufferHealth()` — pre-hedged liquidity target | [buffer-engine.ts](../src/core/buffer-engine.ts) · `DEFAULT_BUFFER_MIN_PCT = 0.05` · `DEFAULT_BUFFER_MAX_PCT = 0.10` |

**Cold-start sequence:**

```
1. Seed Wallet A HL margin (manual / treasury ops — Seed Margin Cushion)
2. Verify [WALLET_A_HL_STATE] shows free buffer > 5% cross-MMR
3. Wallet B GM deposit (3-leg multicall)
4. Cron reads GMX delta → HL short until [CROSS_VENUE_MATCH] action = SKIP
```

### 3.2 `INSUFFICIENT_WALLETA_HEDGE_MARGIN` — JIT Margin Fail-Closed Guard

When Wallet A HL margin is **below the JIT rebalance threshold**, the hedge engine **fail-closed** before any HL IOC broadcast:

| Field | SSOT |
|-------|------|
| **Error code** | `INSUFFICIENT_WALLETA_HEDGE_MARGIN` |
| **Module** | [cross-wallet-cold-start-guard.ts](../src/services/cross-wallet-cold-start-guard.ts) |
| **Trigger** | `assertWalletAMarginSufficiency()` — Wallet A `perpsMarginUsd` < `computeJitRebalanceRequiredMarginUsd(orderUsd)` |
| **Margin formula** | `requiredMarginUsd = orderUsd × DEFAULT_CROSS_MMR (0.05)` |
| **Telemetry** | `[COLD_START_GUARD] { walletABalanceUsd, requiredMarginUsd, status: "FAIL_CLOSED_PENDING_BRIDGE" }` |
| **Cron behavior** | `executeGmxCrossWalletHedge` catches guard · logs skip · **no unhedged GM delta added** |

**Rationale:** ExoMesh never opens an HL short without settled margin cushion. Operators must **re-seed Wallet A** before scaling Wallet B GM deposits — preventing naked delta exposure during cold-start or bridge-pending windows.

### 3.3 In-flight JIT bridge / pending settlement buffer

| Condition | System behavior |
|-----------|-----------------|
| Wallet A USDC = 0 (GMX fallback) | `execute:gmx:wallet-a-short-fallback` → **simulate only** · no broadcast |
| HL session PK missing | `runScheduledGmxHedgeCron` → `CRON_SKIP: CIRCUIT_TRIP` · no hedge broadcast |
| `INSUFFICIENT_WALLETA_HEDGE_MARGIN` | Hedge skipped · `[COLD_START_GUARD]` emitted · GM deposit may proceed but delta remains uncovered until margin seeded |
| Soil trip on hedge probe | Flash unwind plan + `CRON_FLASH_UNWIND` · signing channel severed |
| Bridge capital in-flight | `lostUsd ≡ 0` on `IN_FLIGHT_BRIDGE_CAPITAL` until `SETTLED` (Pillar Set X · Component 2 escort SSOT) |

### 3.4 Cron drift rebalance (`CRON_DRIFT_MIN_USD = 10`)

[scheduled-gmx-hedge-drift.ts](../src/scheduled-gmx-hedge-lib/scheduled-gmx-hedge-drift.ts):

| Constant | Value | Role |
|----------|-------|------|
| `CRON_DRIFT_MIN_USD` | **$10** | Minimum USD drift before hedge or unwind action |
| `CRON_SKIP_BALANCED` | log tag | Drift ≤ $10 on both sides → no action |
| `CRON_UNWIND_OVERHEDGE` | log tag | HL short > GMX long delta → reduce-only cover |
| `CRON_FLASH_UNWIND` | log tag | Soil trip → escalation ladder flash unwind |
| `CRON_SKIP_CIRCUIT` | log tag | Fatal probe error → fail-closed skip |

**Rebalance decision tree:**

```text
fetch GMX Wallet B ETH delta (USD)
fetch HL Wallet A ETH short (USD)
    │
    ├─ soil.tripped? ──YES──► CRON_FLASH_UNWIND + severSigningChannel()
    │
    ├─ overhedgeUsd > $10? ──YES──► executeGmxCrossWalletUnwind (reduce-only HL cover)
    │
    ├─ driftUsd > $10? ──YES──► executeGmxCrossWalletHedge (HL IOC short)
    │
    └─ else ──► CRON_SKIP_BALANCED (within ±$10 deadband)
```

Micro-deposits below the **$10 aggregate drift threshold** are **batched implicitly** by the cron deadband.

### 3.5 Unwind & emergency freeze

| Trigger | Wallet A (HL) | Wallet B (GM) | Global |
|---------|---------------|---------------|--------|
| **Soil trip** (`checkSoilResistance`) | No new shorts · flash unwind dispatch | `emitGmxDecreaseSignal()` unsigned delever signal | `severSigningChannel()` · `CRON_FLASH_UNWIND` |
| **R20 / FLAGS trip** | Session-key pipeline severed | GM I/O blocked at Edge pre-flight | `applyAutoSeveranceOnFlags()` |
| **Over-hedge** | Reduce-only HL cover via `executeGmxCrossWalletUnwind` | No new deposit until balanced | `[CROSS_VENUE_MATCH] action=COVER` |
| **Wallet A margin exhausted** | `INSUFFICIENT_WALLETA_HEDGE_MARGIN` · hedge skipped | **Freeze further unhedged GM deposits** at policy layer | `[COLD_START_GUARD]` FAIL_CLOSED |

**Emergency freeze semantics:** When Wallet A trips (margin buffer below 5% cross-MMR or soil severance), ExoMesh enters **read-only observer mode** — `tradeAllowed: false` until soil, sequencer, and `rootProtection` gates clear.

### 3.6 On-chain settlement plane (ExoMesh redeploy · Live Mainnet 42161)

| Contract | Address | Role |
|----------|---------|------|
| **SliverVineGate** (ExoMesh) | [0x71D7d26f98110c5DE3df0fCbddCf2A3A2BC6e2f1](https://arbiscan.io/address/0x71d7d26f98110c5de3df0fcbddcf2a3a2bc6e2f1) | EIP-712 consume-once anchor · native `setPolicyGuard` |
| **SliverVineAgentPolicyGuardV2** | [0x5df192f9454fd02a89e768632cb5da0762a774bc](https://arbiscan.io/address/0x5df192f9454fd02a89e768632cb5da0762a774bc) | GMX wire invariants · **Stylus wired** |
| **GmxSoilMatrixSwitch** | [0xd840ad013d3be8a363d537a80d5ea8700f7a34c4](https://arbiscan.io/address/0xd840ad013d3be8a363d537a80d5ea8700f7a34c4) | Single-SLOAD defense bitmap |
| **SliverVineRiskOracleV2** | [0xc7f577ac7e1270e6e99e1b700301c25e98df2456](https://arbiscan.io/address/0xc7f577ac7e1270e6e99e1b700301c25e98df2456) | `defenseState` bitmap · 300s SLO window |
| **SliverVineSoilCoprocessor** (Stylus) | [0xc23587d6573dd134f95b02b0202ffbf84686625e](https://arbiscan.io/address/0xc23587d6573dd134f95b02b0202ffbf84686625e) | On-chain soil coprocessor |

---

## Verification Commands

```bash
# Unit tests — cold-start guard + dual-wallet telemetry
pnpm exec vitest run tests/services/cross-wallet-cold-start-guard.test.ts
pnpm exec vitest run tests/core/wallet-isolation-guard.test.ts
pnpm exec vitest run tests/services/dual-wallet-telemetry.test.ts
pnpm exec vitest run tests/services/scheduled-gmx-hedge.test.ts

# Tier 1 — Mainnet native GM deposit demonstrations
pnpm execute:gmx:gm-deposit         # Wallet B live deposit (CONFIRM_GMX_GM_DEPOSIT=YES)
pnpm execute:gmx:gm-withdraw        # Wallet B live withdraw

# Hedge engine
pnpm execute:gmx:wallet-a-short-fallback   # Wallet A GMX fallback (simulate only)
pnpm tsx scripts/hedge-gmx.ts              # Cross-wallet hedge dry-run

# Macro lifecycle HUD
pnpm demo:delta-neutral                       # 4-step Happy Path (Robinhood escort narrative)
pnpm demo:delta-neutral -- --unwind           # + Step 5 R20 exercise
```

---

## Related Documents

| Document | Role |
|----------|------|
| [VERIFICATION_MATRIX.md](./03_product_verifications/01_VERIFICATION_MATRIX.md) | CLI Tier 0–5 verification hub · on-chain settlement contracts |
| [00_ARB_Buildathon/SUBMISSION.md](./00_ARB_Buildathon/SUBMISSION.md) | Grant submission SSOT |
| [01_architecture_and_standards/01_core_specs/01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md](./01_architecture_and_standards/01_core_specs/01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md) | Topology · Δ-neutral loop |

---

<!-- SSOT:PRODUCTION_VERIFIED_FOOTER_START -->
*SilverVine Labs · Sanctuary SSOT · HEAD `0885225` · 254 test files | 1206 PASS clean*
<!-- SSOT:PRODUCTION_VERIFIED_FOOTER_END -->
