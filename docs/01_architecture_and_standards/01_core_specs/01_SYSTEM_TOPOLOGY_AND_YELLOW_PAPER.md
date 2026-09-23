# SliverVine ExoMesh — System Topology & Yellow Paper

> **Document:** System topology · BeΔ philosophy · GMX/HL triangle loop · settlement bounds · **Vitest SSOT:** **254 test files | 1206 PASS clean (100%)** · Security-tier `5/0/0 PASS` · **Wasm Core:** ABI **v2** · 28-protocol-slot FFI · `<28kb` Cloudflare budget · `<60µs` warm execution · **p50 ~106 µs**
> **Architecture index:** [README.md](../README.md) · **Ingress & Pillars:** [§Ingress & Three-Pillar Architecture](#ingress-and-three-pillar-architecture) · **Defense Matrix:** [02_DEFENSE_MATRIX_AND_SSRC_CORE.md](./02_DEFENSE_MATRIX_AND_SSRC_CORE.md) · **Standards:** [01_EIP_COMPLIANCE_AND_COMPETITIVE_MATRIX.md](../02_eip_standards/01_EIP_COMPLIANCE_AND_COMPETITIVE_MATRIX.md) · **Risk framework:** [03_RISK_MITIGATION_AND_DISCLAIMER_FRAMEWORK.md](./04_RISK_MITIGATION_AND_DISCLAIMER_FRAMEWORK.md)

**Philosophy — BeΔ (BeDelta Living Water v1.0):** **Be** is inspired by Bruce Lee's *"Be Water, My Friend"* — fluid, adaptive intent routing and friction-free multi-chain execution. **Δ (Delta)** denotes **market delta-neutrality** and risk-neutral execution — neutralizing directional exposure. **SliverVine** = fragmented intent protection & steel trading execution · **SliverVine ExoMesh** = the pre-consensus execution safety primitive (Module A).  
**Entity:** SilverVine Labs · **Protocol brand:** SliverVine Protocol · **Escrow module:** SliverVine Sanctuary (Module B)  
**Judge primary path:** `npx vitest run tests/sdk/retail-guard-provider.test.ts` · `pnpm demo:gmx -- --trip` · `pnpm demo:delta-neutral`  
**Audit provenance archive:** [Historical Audit Telemetry Snapshot & Provenance Archive](https://bedeltawater.slivervine.xyz/api/grant-audit) — static SHA-256 Buildathon checkpoint (not a live dynamic oracle) · [bedeltawater.slivervine.xyz](https://bedeltawater.slivervine.xyz)  
**Repo:** [SilverVineLabs/bedelta-living-water](https://github.com/SilverVineLabs/bedelta-living-water)

### Core On-Chain & Deployment Anchors

| Anchor | Chain ID | Value |
|--------|----------|-------|
| **SliverVineGate (Arbitrum One · ExoMesh)** | `42161` | [0x71D7d26f98110c5DE3df0fCbddCf2A3A2BC6e2f1](https://arbiscan.io/address/0x71d7d26f98110c5de3df0fcbddcf2a3a2bc6e2f1) |
| **SliverVineAgentPolicyGuardV2 (Arbitrum One)** | `42161` | [0x5df192f9454fd02a89e768632cb5da0762a774bc](https://arbiscan.io/address/0x5df192f9454fd02a89e768632cb5da0762a774bc) · Stylus wired |
| **SliverVineSoilCoprocessor (Stylus · Arbitrum One)** | `42161` | [0xc23587d6573dd134f95b02b0202ffbf84686625e](https://arbiscan.io/address/0xc23587d6573dd134f95b02b0202ffbf84686625e) · Engine A · mainnet only |
| **ZeroDev Smart Route UserOp (Arbitrum One)** | `42161` | [0xe12714a7b26d8983c32e471180e640dfb2ff000b4e1530a34cee02169f11e816](https://arbiscan.io/tx/0xe12714a7b26d8983c32e471180e640dfb2ff000b4e1530a34cee02169f11e816) · [execute-smart-route-live-demo.ts](../../../scripts/execute-smart-route-live-demo.ts) |
| **SliverVineGate (Arbitrum Sepolia · ExoMesh)** | `421614` | [0xc66F96611a737c4e58706D0955594456eAb88959](https://sepolia.arbiscan.io/address/0xc66f96611a737c4e58706d0955594456eab88959) |
| **Mainnet Ignition Tx** | `42161` | [0x54c153e9a41f704b5eb0ae554eac593d1110d62bd826ff094e72f2bd60c1b0c6](https://arbiscan.io/tx/0x54c153e9a41f704b5eb0ae554eac593d1110d62bd826ff094e72f2bd60c1b0c6) |
| **SliverVineRiskOracle (Sepolia)** | `421614` | [0x6CA7eA722F139F3C23280ebc973caff3B17d8fEa](https://sepolia.arbiscan.io/address/0x6ca7ea722f139f3c23280ebc973caff3b17d8fea) |
| **IngressSafetySwitch (Sepolia)** | `421614` | [0xc1Eb1624A3A93e969De57466b1CDbD0e0189D192](https://sepolia.arbiscan.io/address/0xc1eb1624a3a93e969de57466b1cdbd0e0189d192) |
| **Wasm hot path** | Edge | [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) **< 28 KiB** · ABI **v2** · 28-slot protocol vector · Worker bundle **111.19 KiB raw | 40.5 KiB gzip** · p50 ~106 µs |

### Core Sinking SSOT ([src/core/](../../../src/core))

Five pure invariant modules are the TypeScript SSOT; legacy import paths under [src/adapters/](../../../src/adapters) and [src/services/](../../../src/services) remain **100% backward compatible** via thin-shell re-exports.

| Module | Responsibility |
|--------|----------------|
| [risk-engine-usdai.ts](../../../src/core/risk-engine-usdai.ts) | USD.ai clock · oracle · depth · `PROTO_USDAI` lane |
| [soil-resistance-core.ts](../../../src/core/soil-resistance-core.ts) | Soil lane math · HKT time gates · jitter · orderbook gap |
| [session-key-guard-core.ts](../../../src/core/session-key-guard-core.ts) | Session key validity · notional math |
| [delta-neutral-calculator.ts](../../../src/core/delta-neutral-calculator.ts) | 0-Δ cross-wallet hedge sizing |
| [funding-regime-core.ts](../../../src/core/funding-regime-core.ts) | Funding regime classification · leverage scaling |

**Solidity ingress:** [SliverVineRiskOracle.sol](../../../contracts/SliverVineRiskOracle.sol) · [IngressSafetySwitch.sol](../../../contracts/IngressSafetySwitch.sol) — **Custom Errors** (`revert CustomError()`) for bytecode-efficient fail-closed; `ERR_*` bytes32 event constants preserved for Dune/telemetry.

### System Architecture — Layer Import Boundaries

ExoMesh enforces a **machine-verified single-direction gateway boundary** inside [src/core/](../../../src/core) — pure invariant modules must not penetrate orchestration layers (`services/` · `adapters/` · `routes/` · `workers/`). Gateway files ([state.ts](../../../src/core/state.ts) · [risk.ts](../../../src/core/risk.ts) · [agent-exomesh-guard.ts](../../../src/core/agent-exomesh-guard.ts)) remain **zero-layer penetration** surfaces; only **five documented orchestration sinks** may import `services/`:

| Allowlisted orchestration sink | Role |
|-------------------------------|------|
| [risk-engine-soil.ts](../../../src/core/risk-engine-soil.ts) | Soil fuse orchestration bridge |
| [risk-engine-policy.ts](../../../src/core/risk-engine-policy.ts) | Policy matrix orchestration |
| [risk-engine-lib/risk-engine-types.ts](../../../src/core/risk-engine-lib/risk-engine-types.ts) | Shared risk-engine type sink |
| [intent-ledger/flatten-hardlock.ts](../../../src/core/intent-ledger/flatten-hardlock.ts) | Intent ledger flatten orchestration |
| [black-swan-guard-lib/black-swan-guard-flatten.ts](../../../src/core/black-swan-guard-lib/black-swan-guard-flatten.ts) | Black-swan guard flatten orchestration |

**Verification protocol** — static import scan across all `src/core/**/*.ts`:

```bash
# Verify Zero-Layer Penetration & Gateway Allowlist Boundaries (3/3 PASS)
npx vitest run tests/core/core-import-boundary.test.ts
```

**SSOT:** [core-import-boundary.ts](../../../src/core/core-import-boundary.ts) · [core-import-boundary.test.ts](../../../tests/core/core-import-boundary.test.ts).

> **Note:** Initial mainnet deployment utilizes Bootstrap Ignition Keys (`0x1111…`/`0x2222…`) for public verification without exposing production HSM keys. Key rotation to production multisig is executed via native governance functions.

This document is **invariant-first** (Yellow Paper style): topology, thresholds, and fail-closed semantics. Commercial posture is **technical-only** for v1.0 — see grant appendix.

## 0. Unified Institutional Pre-Execution Pipeline

v1.0 · BeDelta Living Water v1.0 (SSRC) is a **unified sub-millisecond pre-execution gateway**. **Center of gravity = Arbitrum One** with the **5-Core Venue Matrix** — GMX v2 · Pendle · USD.ai · Variational Omni RFQ on Arbitrum One, plus **Hyperliquid** as an **Independent L1 High-Frequency Orderbook AppChain** cross-chain session-key hedge leg. Pruned venue adapters → [verification matrix § v1.1 Pruned Scope](../../03_product_verifications/01_VERIFICATION_MATRIX.md). Pillar Set Y ReflexCore (SSRC) is the technical moat. Permissioned chains (e.g. Robinhood Chain) are **supported ingress examples**, not the product identity.

**Primary Execution Boundary — 5-Core Venue Matrix:** GMX v2 · Pendle · USD.ai · Variational (Arbitrum One) + Hyperliquid L1 Session Key Adapter (cross-chain hedge).

```text
[ Optional Permissioned Ingress (e.g. Robinhood Chain 46630 / 4663) ]
 │
 ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 1. THE GATEHOUSE (Auth) — Opt-In ZeroDev Kernel v3 AA │
 │ Scopes agent permissions & eliminates credential drift│
 └──────────────────────┬──────────────────────────────────┘
 │
 ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 2. PILLAR 2: COMPLIANCE INGRESS FIREWALL │
 │ Venue-agnostic unidirectional AML escort & accounting│
 │ Robinhood Chain = inaugural reference adapter │
 │ · ZeroDev Smart Route Calldata Binding (Reference Harness — Demo Spec) │
 └──────────────────────┬──────────────────────────────────┘
 │
 ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 3. THE SHIELD (CORE MOAT — PRIMARY TECH) — Sub-ms Wasm │
 │ checkSoilResistance() & Wasm engine at p50 ~106 μs │
 └──────────────────────┬──────────────────────────────────┘
 │
 ▼
[ PRIMARY: Arbitrum One GMX v2 ETH/USDC GM + Hyperliquid 1× Short ]
```

| Pillar | Role | SSOT / Mechanism | Dedicated specification |
|--------|------|------------------|-------------------------|
| **[Pillar Set X · Component 1 — The Gatehouse (Auth)]** | **Opt-In** ZeroDev scoped session keys · EIP-712 intent scopes | Kernel v3 · `ORDER_EXECUTE` bounds · Paymaster ($0.50/op · $10/day) · R06 / R07 · `USE_ZERODEV_AA` default-off | [Ingress & Three-Pillar Architecture](#ingress-and-three-pillar-architecture) |
| **[Pillar Set X · Component 2 — Compliance Ingress Firewall]** | Venue-agnostic unidirectional AML escort · honest `IN_FLIGHT_BRIDGE_CAPITAL` / `lostUsd ≡ 0` | [src/adapters/across-ingress-bridge.ts](../../../src/adapters/across-ingress-bridge.ts) · [IngressSafetySwitch.sol](../../../contracts/IngressSafetySwitch.sol) · Robinhood / Across = **optional reference adapters** · Unit-Verified Vitest **6/6** | [Ingress & Three-Pillar Architecture](#ingress-and-three-pillar-architecture) |
| **[Pillar Set Y — Shield (CORE MOAT)]** | Sub-ms Wasm pre-execution armor — **primary technical moat** | `checkSoilResistance()` p50 ~106 μs · Wasm warm &lt;60µs · R01–R20 | [02_DEFENSE_MATRIX_AND_SSRC_CORE.md](./02_DEFENSE_MATRIX_AND_SSRC_CORE.md) |

> **Hybrid Pillar Sets X & Y routing:** Pillar Set X (Gatehouse) and Pillar Set X (optional ingress) are summarized inline below; **exhaustive audit-grade specifications** live in the dedicated Pillar Set X & Y component specification documents above. This file retains cross-pillar topology, settlement bounds, and integration anchors.

> *While single components like `checkSoilResistance()` formulas are kept standard and open for transparent FFI `@slivervine/exomesh-agentic-wallet-guard` adoption across Arbitrum, our core moat lies in the production integration complexity—stitching Rust `#![no_std]` Wasm, Edge Worker execution, and EIP-712 Gate into a sub-ms, fail-closed system.*

## ⚔️ Competitive Matrix — Pre-Execution vs. Post-Execution Risk

| Feature / Dimension | Legacy Providers (Gauntlet / Chaos Labs) | SliverVine ExoMesh Gate (Pillar Set Y) |
| :--- | :--- | :--- |
| **Execution Phase** | Post-execution dashboards & multi-day governance parameter updates | **Pre-execution inline interception** (Sub-ms BEFORE mempool broadcast) |
| **Latency / Hot-Path** | Minutes to Days (Off-chain simulations + DAO votes) | **p50 ~106 µs** (Rust `#![no_std]` Wasm engine on Edge) |
| **Protection Level** | Global protocol parameter tuning (LTV, Collateral factors) | **Granular tx-level & LP soil protection** (MEV, RPC jitter, Oracle lag) |
| **Deployment Model** | Advisory / SaaS Analytics | **Inline Edge Gate & Open-Source Wasm SDK** (`@slivervine/exomesh-agentic-wallet-guard`) |

## 1. Core Product Identity

**SliverVine ExoMesh (BeDelta Living Water v1.0 / BeΔ) is a Pre-Consensus Intent Firewall & Execution Safety Primitive for AI Agents on Arbitrum.**

**Primary execution envelope:** **Delta-Neutral GM** on Arbitrum One — GMX v2 **ETH/USDC** GM pool + Hyperliquid **1× short hedge** (Independent L1 HF Orderbook AppChain · session-key adapter), guarded by Pillar Set Y ReflexCore (SSRC) (`checkSoilResistance()`).

<a id="10-exomesh-pre-consensus-shield-5-core-venue-matrix"></a>

### 1.0 ExoMesh Pre-Consensus Shield & 5-Core Venue Matrix

SliverVine ExoMesh is the **pre-consensus intent firewall** — deterministic soil evaluation **before** EIP-712 signing, Arbitrum Sequencer ingress, or RFQ acceptance. Hot paths use **zero-allocation numeric slabs** aligned with `soil_core.wasm` FFI ([wasm-soil-ffi.ts](../../../src/core/wasm-soil-ffi.ts) · [pkg/soil_core.wasm](../../../pkg/soil_core.wasm)).

#### 5-Core Venue Matrix (Arbitrum One + HL L1)

| Venue | Role | Hot-path guard | Demo |
|-------|------|----------------|------|
| **GMX v2** | Arbitrum-native perp / GM | [gmx-v2-order-payload-guards.ts](../../../src/services/adapters/gmx-v2-order-payload-guards.ts) | `pnpm demo:gmx -- --trip` |
| **Pendle** | PT/YT safety sentinel · **USDai** funding (not USDC) · redeem → **sUSDai** | [pendle-gmx-cross-guard.ts](../../../src/guards/pendle-gmx-cross-guard.ts) | `pnpm demo:pendle -- --trip` · `pnpm preflight:venues --venue=pendle` |
| **USD.ai** | sUSDai collateral fuse | [usdai-adapter.ts](../../../src/adapters/usdai/usdai-adapter.ts) | `pnpm demo:usdai -- --trip` |
| **Hyperliquid** | L1 session-key hedge | [hyperliquid-session-guard.ts](../../../src/adapters/hl/hyperliquid-session-guard.ts) | `pnpm demo:hl -- --trip` |
| **Variational** | RFQ + TradFi swap lane | [variational-rfq-adapter.ts](../../../src/adapters/variational-rfq-adapter.ts) · [variational-instrument-guard.zero.ts](../../../src/guards/variational-instrument-guard.zero.ts) | `pnpm demo:variational -- --trip` |

#### Variational RFQ & Swap Guard

- **Variational RFQ & Swap Guard**:
  - *Zero-Allocation Hot-Path*: Sub-microsecond numeric soil check (`evaluateSwapPerpSoilZero`) — pre-allocated `SoilResultSlot` mutation only; no `new` / string materialization on reflex path ([variational-instrument-guard.zero.ts](../../../src/guards/variational-instrument-guard.zero.ts)).
  - *Instrument Awareness*: Distinguishes **TradFi Total Return Swaps** (flat carry, market open hours, dividend pass-through) vs **Crypto Perps** (variable funding rate volatility).
  - *Defensive Limits*: Fail-closed on closed swap market hours, carry **>8%**, quote age **>500ms**, or OLP exposure **>15%**. Perp funding volatility **>80 bps** fail-closed with **SWAP** instrument hint.
  - *Cold Path*: Adapter-layer `validateVariationalRFQIntent()` delegates to core bitmask Bits 12–13 ([variational-rfq-adapter.ts](../../../src/adapters/variational-rfq-adapter.ts)).

```text
FlatQuoteInput (numeric slab)
        │
        ▼
evaluateSwapPerpSoilZero(q, out)   ← zero-allocation hot path
        │
        ├── SWAP: marketOpen · carryBps · quoteAge · OLP util
        └── PERP: fundingVolBps · quoteAge · OLP util → hint SWAP
        │
        ▼
SoilResultSlot { action, reason, flags, hintInstrument }
        │
        └── reasonToString()  ← cold path / HUD only
```

#### Physical Latency SSOT (do not conflate)

| Layer | Budget | Artifact |
|-------|--------|----------|
| SSRC Wasm reflex | **p50 ~15µs** | `soil_core.wasm` |
| ExoMesh packed lane | **p50 ~106µs** | `checkSoilResistance()` |
| LLM Cerebrum loop | **~1–10s** | out of scope |

> **Scope boundary:** ExoMesh pre-consensus shield is **not** Sanctuary async vault escort — see [Ingress & Three-Pillar Architecture](#ingress-and-three-pillar-architecture).

### 1.1 Tailor-Made Mathematical Invariants (Protocol Physical Boundaries)

| Protocol | Venue | Physical Boundary Check | Code Module |
|----------|-------|-------------------------|-------------|
| **GMX v2** | Arbitrum One | Pool Imbalance Ratio: \|OI_long − OI_short\| / PoolTVL > **0.35** · Collateral Reserve < **105%** | [gmx-v2-invariants.ts](../../../src/adapters/gmx/gmx-v2-invariants.ts) · [gmx-v2-order-payload-guards.ts](../../../src/services/adapters/gmx-v2-order-payload-guards.ts) |
| **Pendle** | Arbitrum One | Discounted Implied Yield Shock: \|Yield_current − Yield_oracle\| > **150 bps** | [pendle-pool-factory-adapter.ts](../../../src/adapters/pendle/pendle-pool-factory-adapter.ts) |
| **USD.ai** | Arbitrum One | sUSDai peg drift > **30 bps** · GPU oracle age > **2h** · liquidity depth < **$100k** | [usdai-adapter.ts](../../../src/adapters/usdai/usdai-adapter.ts) · `USD_AI_DEPEG_ORACLE_TRIP` soil fuse |
| **Variational** | Arbitrum One | RFQ quote stale > **500ms** · OLP depth > **15%** · oracle drift > **30 bps** · TRS carry > **8%** · perp funding vol > **80 bps** | [variational-rfq-adapter.ts](../../../src/adapters/variational-rfq-adapter.ts) · [variational-instrument-guard.zero.ts](../../../src/guards/variational-instrument-guard.zero.ts) |
| **Hyperliquid** | Independent L1 HF Orderbook AppChain | Session Key **MaxSizePerOrder** · **Rate Limit** (120/min) · Orderbook Spread > **20 bps** | [hyperliquid-session-guard.ts](../../../src/adapters/hl/hyperliquid-session-guard.ts) |
| **RESERVED_ABI_V2** | Wasm ABI v2 holes | Pruned venue adapters — protocol bits **4–6** frozen | [§ v1.1 Pruned Scope](../../03_product_verifications/01_VERIFICATION_MATRIX.md) · [risk-flags.ts](../../../src/core/risk-flags.ts) |

| Component | Venue | Role |
|-----------|-------|------|
| **Yield base (PRIMARY)** | Arbitrum One · GMX v2 ETH/USDC GM | Underweight-side GM LP · builder `uiFeeReceiver` (**+10 bps**) · ExoMesh pre-execution gate |
| **Hedge** | Hyperliquid (Independent L1 HF Orderbook AppChain) | Session-key **1× short** Emergency Liquidity Sponge · `evaluateHyperliquidSessionGuard()` · nonce-healed signing |
| **Ingress (optional)** | Robinhood Chain | **Pillar Set X Reference Escort Adapter** — not product identity |

**Robinhood Chain role:** **Pillar Set X Reference Escort Adapter** only — regulated treasuries may escort outbound (`46630`/`4663` → `42161`). Inbound AML is blocked by default. Product identity remains **SliverVine Protocol on Arbitrum One (`42161`)**. **Audit:** [Ingress & Three-Pillar Architecture](#ingress-and-three-pillar-architecture).

### 1.2 Engineering Restraint (Blue-Chip Scope)

v1.0 is intentionally restricted to **ETH/USDC** so oracle reliability holds during Sequencer desync: one blue-chip pair removes multi-asset de-peg and FX-slippage surfaces while the Tri-Sensor Matrix (base-fee velocity, RPC jitter, phase-shift) remains authoritative.

### 1.3 Large-Scale Capital Protection

`checkSoilResistance()` (p50 ~106 μs) short-circuits any broadcast when local GM market depth cannot absorb a large institutional order without severe price impact (**>10 bps**). Fail-closed before L2 submission — depth / cross-spread / slippage fuse (R01).

### 1.4 Cross-Isolate `protocolMask` KV Synchronization

Multi-Worker Cloudflare Edge isolates do not share in-memory state. When one isolate trips a protocol lane (e.g. USD.ai de-peg), sibling isolates must inherit the same bitmask without blocking the **p50 ~15µs** hot path.

| Concern | SSOT | Hot-path behavior |
|---------|------|-------------------|
| **KV namespace** | `env.SLIVERVINE_KV` (fallback `SYSTEM_STATE_KV`) | Bound per request in [worker-fetch.ts](../../../src/worker-fetch.ts) |
| **KV key** | `soil:protocol_mask` (`KV_KEYS.PROTOCOL_MASK`) | JSON record `{ version: 1, mask, savedAt }` |
| **Read path** | [protocol-mask.ts](../../../src/services/kv-lib/protocol-mask.ts) · `readProtocolMaskSync()` | Module-level cache — **zero await** inside `checkSoilResistance()` |
| **Prefetch** | `ctx.waitUntil(prefetchProtocolMaskKv(kv))` | Non-blocking KV `get` warms cache at request ingress |
| **Write path** | `scheduleProtocolMaskKvWrite()` | Fire-and-forget `kv.put()` after local OR merge; cache updated synchronously |

**Invariant:** `checkSoilResistance()` merges `scratch.protocolMask |= readProtocolMaskSync()` before external flag collection, then persists any delta via `scheduleProtocolMaskKvWrite()` — preserving microsecond Edge latency while closing the cross-isolate residual risk.

### 1.5 Wasm FFI ABI v2 — 28-Protocol-Slot Alignment

TypeScript `PROTO_VECT_LEN = 28` (7 lanes × 4 slots) is now mirrored in [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) via **`soil_core_abi_version() = 2`**.

| Field | Offset (f64 index) | Semantics |
|-------|-------------------|-----------|
| **Protocol lanes** | `0 … 27` | Active: GMX · Pendle · USD.ai · Variational · Hyperliquid · **RESERVED_ABI_V2** holes (bits 4–6 · slots 8–19) for pruned venues |
| **`protocolMask`** | **27** | Aggregated bitmask; non-zero ⇒ `TRIP_PROTOCOL` (bit 8) |
| **Soil math input** | `28 … 35` | Legacy 8×f64 slippage / depth fuse (`hlSpot` … `minDepthUsd`) |
| **Output** | `out_ptr` + 6×f64 | `crossVenue` · `spotPerp` · `tripped` · `soilRiskUsd` · `cappedMaxSlUsd` · `tripFlags` |

**Wire modules:** [soil-core-sim.ts](../../../src/services/wasm-feasibility-lib/soil-core-sim.ts) (`WASM_SOIL_INPUT_BYTES = 288`) · [soil-wasm.ts](../../../src/sdk/soil-wasm.ts) (`WASM_ABI_VERSION = 2`) · [soil_core.rs](../../../src/wasm/soil_core.rs) (`#![no_std]`).

### 1.6 Sequencer Defense Plane A/B Model

SliverVine ExoMesh is **not** “Edge-only” or “on-chain-only” — it is a **dual-layer** stack that answers the Nitro reviewer question: *TS Gateway latency ≠ Nitro opcode latency; both layers protect different phases.*

| Plane | Runtime | Role | Latency / Gas | SSOT |
|-------|---------|------|---------------|------|
| **Plane A — Edge Pre-Consensus** | Cloudflare Worker · [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) · TS `checkSoilResistance()` | **Zero-gas** pre-broadcast intercept · sever signing before Sequencer / Bundler / mempool | **p50 ~106 µs** · **0 gas** on blocked paths | [worker-fetch.ts](../../../src/worker-fetch.ts) · [soil-wasm.ts](../../../src/services/soil-wasm.ts) |
| **Plane B — On-Chain Sequencer Execution** | Arbitrum **Nitro Stylus** native Wasm · [SliverVineRiskOracle.sol](../../../contracts/SliverVineRiskOracle.sol) | On-chain fail-closed reinforcement inside Nitro VM block execution · auditable parity with Edge soil fuse | **~313 gas** modeled (`check_soil_resistance_stylus`) vs **~34,540 gas** naive EVM equivalent (**~110×**) · sub-ms Nitro runtime | [stylus_core.rs](../../../contracts/stylus-probe/src/stylus_core.rs) · [SliverVineRiskOracle.sol](../../../contracts/SliverVineRiskOracle.sol) |

```text
Agent Intent
    │
    ▼
[Plane A] Edge Gateway + Wasm  (~106µs · 0 gas) ──FAIL──► severSigningChannel()
    │ PASS
    ▼
[Plane B] Nitro Sequencer block
    ├── Stylus SliverVineSoilCoprocessor  (native Wasm opcode · ~313 gas)
    └── SliverVineRiskOracle STATUS_SHUTDOWN flush
    │ PASS
    ▼
EIP-712 SliverVineGate attestation → GMX / HL execution
```

**Benchmark harness:** `pnpm tsx scripts/benchmark-stylus-opcode.ts` — Cargo `stylus_core` release tests + opcode-weighted Gas table vs EVM-equivalent storage path.

---


---

<a id="ingress-and-three-pillar-architecture"></a>

## Ingress & Three-Pillar Architecture

### 0.1 Bytecode Predicate Verification (v1.0) & ERC-7715 (⏳ Post-Grant Design Spec)

SliverVine does not interpret natural-language LLM prompts. ExoMesh (via ReflexCore / SSRC) enforces **Asymmetric Predicate Bytecode Hard Assertions** against ERC-4337 UserOp calldata inside the sub-ms Wasm core (p50 ~106 μs) — **powered 100% by [pkg/soil_core.wasm](../../../pkg/soil_core.wasm)**, independent of Account Abstraction. ZeroDev Kernel v3 is an **opt-in Pillar Set X delivery adapter** for scoped session keys when institutions enable AA (`USE_ZERODEV_AA`); it does **not** provide or power sub-ms latency.

> **[ERC-8196](https://eips.ethereum.org/EIPS/eip-8196) (AI Agent Wallet Policy):** Aligned with the **Finalized ERC-8196 Standard** ([ERC-8196](https://eips.ethereum.org/EIPS/eip-8196) · Ethereum Standard · co-authored by Virtuals Protocol).

> **ERC-7715 (Advanced Wallet Permissions):** ⏳ **Planned / Post-Grant Design Spec** — evolution target for Gatehouse permission surfaces; **not shipped in v1.0**. Adapter swap path is documented for future ZeroDev / Offchain Labs integration without Shield or Wasm rewrite.

| Invariant | Mechanism | Status |
|-----------|-----------|--------|
| **Receiver Invariant** | Decode GMX v2 parameters from UserOp bytecode; assert `sender ≡ receiver` before any L2 broadcast. | ✅ v1.0 Delivered (Sepolia verified) |
| **Parameter Invariant** | Bound-check `acceptablePrice` (and related execution params) against oracle-lag sensors; fail-closed on drift. | ✅ v1.0 Delivered (Sepolia verified) |
| **Unidirectional Outbound Escort** | Pillar Set X enforces venue-agnostic outbound-only escort into Arbitrum `42161`; inbound AML contamination is blocked at the Compliance Ingress Firewall. Robinhood Chain (`46630`/`4663`) is the inaugural reference adapter. | ✅ v1.0 Delivered (Sepolia verified) |

<a id="02-v10-delivered-scope-vs-post-grant-roadmap"></a>

### 0.2 v1.0 Delivered Scope vs Post-Grant Roadmap

| Horizon | Status | Scope |
|---------|--------|-------|
| **v1.0 Delivered (Sepolia + Arbitrum One)** | ✅ Code-Verified Live | **SliverVine ExoMesh** — Pre-Consensus Intent Firewall · GMX v2 ETH/USDC GM + HL 1× short · Wasm `checkSoilResistance()` p50 ~106µs · **Pendle Institutional Shield** · **Stabilizer Sepolia Sandbox** (`421614`) · [ERC-8196](https://eips.ethereum.org/EIPS/eip-8196) (Final) **PolicyGuardV2** [0x5df192…774bc](https://arbiscan.io/address/0x5df192f9454fd02a89e768632cb5da0762a774bc) · ZeroDev Smart Route UserOp [0xe12714a7…](https://arbiscan.io/tx/0xe12714a7b26d8983c32e471180e640dfb2ff000b4e1530a34cee02169f11e816) · ExoMesh Gate One `0x71D7…` · Sepolia `0xc66F…` · Dune + SHA-256 `GET /api/grant-audit` · **254 test files | 1206 PASS clean (100%)** |
| **v1.0 Active Target** | ✅ Mainnet Ignition Delivered | Single blue-chip anchor: **GMX v2 ETH/USDC GM Pool** + Hyperliquid **1× short** hedge · Gate live on **42161** |
| **v1.0 Partial — HL Orderbook Gap Guard** | ✅ Code-Verified | `evaluateHlOrderbookGapGuard()` in [hl-orderbook-gap-guard.ts](../../../src/services/risk-control-lib/hl-orderbook-gap-guard.ts) · wired via [soil-resistance.ts](../../../src/services/risk-control-lib/soil-resistance.ts) — gap-window leverage scale-down + 2× depth floor |
| **v1.0 Live — Pendle Institutional Shield** | ✅ Code-Verified Live | **Pillar Set Y Core** — [pendle-market-oracle-adapter.ts](../../../src/adapters/pendle/pendle-market-oracle-adapter.ts) (sync cache · TTL 60s) · [pendle-pt-registry.ts](../../../src/adapters/pendle/pendle-pt-registry.ts) (`hydrateFromOracle`) · [pendle-gmx-cross-guard.ts](../../../src/guards/pendle-gmx-cross-guard.ts) · `pendleOracle` / `pendleCrossGuard` → `checkSoilResistance()` · **USD.AI markets** (PT-sUSDai / PT-USDai) · live dust harness USDai→sUSDai · **254 test files | 1206 PASS clean (100%)** |
| **V1.5 Roadmap Spec** | ⏳ Planned | **Fleet Policy + Policy Studio + block certificate** — one canonical [ERC-8196](https://eips.ethereum.org/EIPS/eip-8196) policy hash binds a fleet; humans compile structured mandate params (venues · notional · TTL · slippage); **NL is compiler-only, never the enforcement judge**; blocked intents emit a deterministic certificate (flags · policy hash · digest) for audit / PEV. EIP-7702 / Kernel v4 / Stage ⑦ = **onboarding plumbing**. Venue/yield extensions (incl. BTC/USDC isomorphic GM config-only) stay appendix. **V2.0 is not a public SKU.** |

> **Kernel vs Policy (public summary):** SliverVine enforces a strict boundary between **immutable security kernels** and **evolving safety policies**: (1) **Immutable kernel (v1.0 freeze):** `pkg/soil_core.wasm` reflex and EIP-1193 hot-path signing are v1.0 codebase-frozen — LLMs and agents **never** modify the enforcement kernel. (2) **V1.5 deterministic policy compiler:** Post-grant upgrades are JSON-schema parameter diffs only; natural language is **compiler-only**, never the enforcement judge. (3) **8 CAN regression gate:** Every policy rollout must pass the FW-01–14 demo-ready adversarial matrix (`pnpm demo:FW-xx`) before ERC-8196 fleet hash pin deploy.

**ZeroDev AA v1.0 active scope (Opt-In Pillar Set X):** **Native Integration** with **ZeroDev Kernel v3 (ERC-7579)** + **Ultra-Relay Intent Network** — Stage ① Sign-in · ③ Gas ($0.50/op · $10/day) · ④ Scoped Session Keys (TYPE 1 validator **spec**) · ⑤ Execution — **v1.0 shipped:** `SliverVineRiskOracle` Sepolia deploy + **pre-UserOp oracle read** (`risk-oracle-gate.ts`) · `pnpm test:zerodev` = mock dry-run harness. **Post-grant (not freeze wedge):** ERC-7579 TYPE-4 `installModule` on Kernel (`hookInstalled: false` in [zerodev-aa-kernel.ts](../../../src/adapters/arbitrum/zerodev-aa/zerodev-aa-kernel.ts) today). **v0.95 SSOT (`5829e9a`):** HL session-key consume-once nonce + `expiresAt` replay guard · USD.ai `[CLOCK_SSOT_VERIFIED]`. Stage ② Smart Routing = **Reference Harness & Spec** (Vitest). Stages ⑥ Recover · ⑦ Compose = **⏳ Post-Grant onboarding plumbing (V1.5)** — not product identity. Pillar Set Y ReflexCore (SSRC) and Pillar Set X Arbitrum Native Ingress operate **100% independently** of ZeroDev.

#### 2.4.6 v0.95 SSOT — ZeroDev AA Security Audit Closure

| Item | Resolution | Code / doc anchor |
|------|------------|-------------------|
| Proprietary vs official ZeroDev plugin | **Resolved in v0.95 SSOT** — ExoMesh-owned adapter; ERC-7579 typings in [zerodev-aa-types.ts](../../../src/adapters/arbitrum/zerodev-aa/zerodev-aa-types.ts) | [src/adapters/arbitrum/zerodev-aa/](../../../src/adapters/arbitrum/zerodev-aa) |
| Session key replay (58.72 KiB Worker path) | **Resolved in v0.95 SSOT** — `auditSessionKeyNonceState` + `verifySessionKeyValidity` before broadcast | [execute-order.ts](../../../src/adapters/hl/session-key-executor/execute-order.ts) · commit `5829e9a` |
| `SliverVineRiskOracle` hook classification | **Target:** ERC-7579 TYPE-4 Pre-Execution Hook. **v1.0:** oracle contract + off-chain pre-UserOp read — **hook module not installed** on Kernel. | [SliverVineRiskOracle.sol](../../../contracts/SliverVineRiskOracle.sol) · [risk-oracle-gate.ts](../../../src/services/aa-adapter/risk-oracle-gate.ts) · V1.5 Track A (post-grant pilot — not v1.0 freeze) |

**Demo:** `pnpm demo` — 12 Dual Pillar Set X & Y ANSI scenarios (GMX · HL · Pendle · p50 ~106µs) · `pnpm demo:delta-neutral` — **4-step Happy Path** grant E2E (Intent+Deadman → Robinhood escort → GMX underweight → HL Session hedge) · optional `--unwind` (Step 5 R20) · `--trip` (Step 1 intercept).

<a id="03-c-end-b-end-integration-v11-ssot"></a>

### 0.3 C-End & B-End Integration (v1.1 SSOT)

| Surface | Status | Module SSOT | Entry point | Verify |
|---------|--------|-------------|-------------|--------|
| **ExoMesh Agentic Guard (EIP-1193/5792/6963+)** | ✅ V1.0 Live | [provider.ts](../../../src/sdk/exomesh-agentic-wallet-guard/provider.ts) | `withRetailGuardProvider()` | `npx vitest run tests/sdk/retail-guard-provider.test.ts` **35/35** |
| **B2B Agent Decorator (optional)** | ✅ V1.0 Live | [decorator.ts](../../../src/sdk/decorator.ts) | `withExoMeshShield()` · `verifyAgentIntent()` | `pnpm demo:agent` · not judge-primary |
| **5-Core Venue Guards** | ✅ V1.0 Live | [src/adapters/{gmx,pendle,usdai,hl,variational*}](../../../src/adapters/) | Per-venue evaluators | `pnpm demo:{gmx,pendle,usdai,hl,variational}` |
| **Stabilizer Protocol** | ✅ V1.0 Live (Sepolia) | [exomesh-agentic-wallet-guard](../../../src/sdk/exomesh-agentic-wallet-guard/) | `evaluateStabilizerSwapGuard()` | `pnpm demo:stabilizer` |
| **Deprecated v1.0 harnesses** | 🗑️ Pruned v1.1 | — | Replaced by ExoMesh Agentic Guard + B2B decorator | [Verification matrix § v1.1 Pruned Scope](../../03_product_verifications/01_VERIFICATION_MATRIX.md) |

**Regression bar: 254 test files | 1206 PASS clean (100%)**

### Core Sinking SSOT ([src/core/](../../../src/core))

Pure risk invariants are sunk into five core modules; [src/adapters/](../../../src/adapters) and [src/services/](../../../src/services) preserve legacy import paths via thin-shell re-exports. See [architecture/README.md](../README.md) for the module table · [02_DEFENSE_MATRIX_AND_SSRC_CORE.md](./02_DEFENSE_MATRIX_AND_SSRC_CORE.md) for USD.ai / soil integration.

**PEV (Prevented Exploit Volume) — Dune Analytics Telemetry Metric:**

| Field | Definition |
|-------|------------|
| **Metric** | **PEV** — nominal USD volume of toxic intents blocked pre-broadcast (0-Gas fail-closed severance) |
| **Event sources** | `RiskTripBlocked` on-chain events · soil-trip `SOIL_RESISTANCE_TRIP` logs · `GET /api/grant-audit` `duneTelemetry` JSON |
| **Indexer SSOT** | [DUNE_DASHBOARD_SPECIFICATION.md](../03_telemetry_and_mo/03_DUNE_DASHBOARD_SPECIFICATION.md) — Sepolia event streaming verified; production DuneSQL targets **ChainID `42161`** |

### 0.4 Stabilizer Sepolia — Universal Testnet Sandbox & Cross-Pass Layer (V1.0 Live)

**Arbitrum Sepolia (`421614`) is the Universal Testnet Sandbox & Cross-Pass Interoperability Layer** for AI agent development. ExoMesh applies the **same `checkSoilResistance()` bytecode and risk gates** on Sepolia as on Arbitrum One (`42161`) — enabling auditors and integrators to validate fail-closed behavior on **live testnet contracts** without mainnet gas or capital friction.

| Cross-pass leg | Sepolia role | Adapter / demo SSOT | Shared gate |
|----------------|--------------|---------------------|-------------|
| **Stabilizer** | 1:1 zero-slippage USDZ / USDC / USDT / USDS rebalance | [exomesh-agentic-wallet-guard](../../../src/sdk/exomesh-agentic-wallet-guard/) · `pnpm demo:stabilizer` | `evaluateStabilizerSwapGuard()` → `checkSoilResistance()` |
| **GMX v2** | Sepolia shadow-margin · price-impact pre-flight | [gmx-v2-agent-flow.demo.test.ts](../../../tests/demo/gmx-v2-agent-flow.demo.test.ts) · [gmx-v2-order-payload-guards.ts](../../../src/services/adapters/gmx-v2-order-payload-guards.ts) | `gmxPriceImpact` · depth soil probes |
| **Pendle** | Testnet Guarded Pool Factory · oracle TTL fuse | [pendle-pool-factory-adapter.ts](../../../src/adapters/pendle/pendle-pool-factory-adapter.ts) · [pendle-ai-agent-flow.demo.test.ts](../../../tests/demo/pendle-ai-agent-flow.demo.test.ts) | `pendlePoolFactory` · `pendleOracle` soil probes |

```text
Agent Cross-Pass Route (Sepolia 421614)
  Stabilizer 1:1 stablecoin leg
       │ checkSoilResistance()
       ▼
  GMX v2 shadow-margin / GM intent
       │ checkSoilResistance()
       ▼
  Pendle guarded pool / PT intent
       │ checkSoilResistance()
       ▼
  FAIL_CLOSED (0-Gas)  or  ALLOW → Mainnet-identical bytecode path
```

**Verification bar: 254 test files | 1206 PASS clean (100%)**

### 2.2 Traditional Bridge vs SliverVine Pillar Set X Compliance Escort

```text
Traditional Omnichain Bridge (bidirectional · loss opaque)
┌──────────────┐   relayer / LP / messaging   ┌──────────────┐
│  Source L2   │ ───────────────────────────► │  Dest L2     │
│  (any chain) │ ◄─────────────────────────── │  (any chain) │
└──────────────┘   timeout → stuck / social   └──────────────┘
                   recovery · lostUsd > 0 risk

SliverVine Pillar Set X Compliance Escort (unidirectional · fail-closed)
┌─────────────────────┐  Across reference   ┌─────────────────────┐
│ Robinhood Chain     │  escort state mach. │ Arbitrum One 42161  │
│ 46630 / 4663 USDG   │ ──────────────────► │ GMX v2 · Pendle PT  │
│ institutional treas.│ IN_FLIGHT → SETTLED │ deployable NAV only │
└─────────────────────┘                     └─────────────────────┘
         ▲
         └── inbound 42161→46630/4663 AML BLOCKED · lostUsd ≡ 0
```

| Dimension | Traditional Bridge | SliverVine Pillar Set X Escort |
|-----------|-------------------|----------------------------|
| **Ingress direction** | Bidirectional pools · any-chain routing | **Unidirectional outbound-only** — Robinhood `46630`/`4663` → Arbitrum `42161` |
| **In-flight timeout shield** | Capital may appear lost · manual recovery | **>3600s** Across timeout → `BRIDGE_TIMEOUT_FAIL_CLOSED` · **0-Gas severance** |
| **Pending-capital accounting** | Ambiguous pending / LP share semantics | `IN_FLIGHT_BRIDGE_CAPITAL` → `SETTLED` · deployable ⇔ settled ∧ route allowed |
| **Loss invariant** | External insurance / social layer | **`lostUsd ≡ 0`** — state machine SSOT · Vitest **6/6** · `pnpm demo:ingress` |

**CLI:** `pnpm demo:ingress` — multi-route HUD (Route A RH→42161 · Route B HL L1 probe · Route C Arb→Base) · `pnpm demo:ingress -- --trip` — timeout fail-closed + `lostUsd ≡ 0` check · ERC-7540+: `pnpm demo:sanctuary`.

### 2.3 ZeroDev Smart Route Calldata Binding (Pillar Set X Reference Harness — Demo Spec)

> **Status:** **Reference Harness & Spec** — Dry-run verified via Vitest ([tests/adapters/gmx-smart-route-payload-binding.test.ts](../../../tests/adapters/gmx-smart-route-payload-binding.test.ts)). This serves as an evaluator-reproducible reference adapter. Production execution baseline defaults to **Arbitrum One Native Ingress**.

**Pillar Set X context:** This section documents a **reference harness surface** of the Compliance Ingress Firewall — ZeroDev Kernel UserOp calldata binding from permissioned ingress (Robinhood `46630`/`4663` **USDG** as inaugural reference adapter) to Arbitrum GMX execution. **`GMX_V2_EXCHANGE_ROUTER_ARBITRUM`** (`ZERODEV_SMART_ROUTE_TARGETS` · [gmx-revenue.ts](../../../src/config/gmx-revenue.ts)) → **`GM_ETH_USDC`** pool — single-click cross-chain deposit/swap calldata spec, no hot-wallet custody.

**Payload binding (calldata-level, Gate struct unchanged):** `buildGmxSmartRoutePayloadBinding()` encodes smart-route calldata → `computeGatedExecutorPayloadHash()` mirrors on-chain `GatedExecutor.payloadHash(initiator, target, keccak256(data), nonce)`. The digest fills the existing `RiskAttestation.payloadHash` field — **[SliverVineGate.sol/](../../../SliverVineGate/out/SliverVineGate.sol) `ATTESTATION_TYPEHASH` and struct layout are not modified**.

Anchors: [gmx-smart-route-payload-binding.ts](../../../src/services/adapters/gmx-smart-route-payload-binding.ts) · [gated-executor-payload.ts](../../../src/sdk/gated-executor-payload.ts) · [treasury-escort-router.ts](../../../src/adapters/robinhood/treasury-escort-router.ts) · [GatedExecutor.sol](../../../SliverVineGate/src/GatedExecutor.sol).

### 2.4 Pillar Set X — Opt-In ZeroDev Account Abstraction (Integration Summary)

> **Full Pillar Set X specification:** [Ingress & Three-Pillar Architecture](#ingress-and-three-pillar-architecture) — ZeroDev Kernel v3 session keys, EIP-7702 comparative analysis, `sessionOk` / `allowedToSign` dry-run scope (`pnpm run demo:delta-neutral`), and `pnpm test:zerodev` harness. This section retains integration anchors only.

> **Status:** v1.0 production SSOT = **Kernel v3** (`ZERODEV_KERNEL_VERSION` v0.3.1 · EntryPoint v0.7); **Kernel v4** = post-grant V1.5 alignment path (Gatehouse adapter upgrade only — **no rewrite** of Shield / Wasm / EIP-712 Gate).

> **Boundary:** ZeroDev Kernel v3 is an **opt-in Pillar Set X AA layer** (`USE_ZERODEV_AA` default-off). ZeroDev infrastructure failure, bundler outage, or Paymaster exhaustion **never** impairs the **ReflexCore (SSRC) Edge path** (`checkSoilResistance()` · p50 ~106 µs) or **Arbitrum Native Ingress** — institutions fall back to EOA / native signing paths with identical pre-broadcast protection.

#### 2.4.1 Role of ZeroDev: Scoped Session Keys & Gas Sponsorship (Pillar Set X Opt-In AA Layer)

SliverVine Protocol separates **pre-broadcast risk enforcement** from **account delivery**. ZeroDev Kernel v3 is an **opt-in Pillar Set X layer** — institutions may enable scoped session keys and Paymaster gas sponsorship; the protocol does **not** require ZeroDev for core ExoMesh protection or bridge accounting.

| Layer | Role | SSOT | Dependency on ZeroDev |
|-------|------|------|------------------------|
| **Pre-Broadcast Risk Core (p50 ~106 µs)** | Sub-ms soil fuse · R01–R20 · fail-closed severance | [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) · `checkSoilResistance()` on Cloudflare Edge | **None** — runs 100% independently of AA |
| **ZeroDev Kernel v3 (Pillar Set X)** | Opt-in smart-account delivery plane · scoped **30s** session keys · Paymaster sponsorship | [src/adapters/arbitrum/zerodev-aa/](../../../src/adapters/arbitrum/zerodev-aa) · `pnpm test:zerodev` | **Opt-in** — `USE_ZERODEV_AA` default-off |
| **Baseline ingress (no AA)** | Direct Arbitrum Native Ingress · Across bridge escort | [src/adapters/across-ingress-bridge.ts](../../../src/adapters/across-ingress-bridge.ts) · native GMX/HL adapters · Unit-Verified Vitest **6/6** | **Independent** — `lostUsd ≡ 0` guaranteed by bridge state machine, not AA |

**Separation of powers:**

- **Pre-Broadcast Risk Core (p50 ~106 µs):** Powered 100% independently by SliverVine Edge Wasm ([pkg/soil_core.wasm](../../../pkg/soil_core.wasm)). Every intent — EOA, Kernel UserOp, or bridge escort — is evaluated by `checkSoilResistance()` **before** any broadcast path.
- **ZeroDev Kernel v3 (Pillar Set X):** Serves as an **Opt-In Smart Account Delivery Plane** for scoped 30s session keys and Paymaster gas sponsorship. ExoMesh never holds user keys or principal — capital remains in the Kernel `sender` smart account when AA is enabled (R06–R07 · ERC-7579).
- **Baseline Fallback:** Direct **Arbitrum One Native Ingress** and **Across Bridge** adapters operate smoothly with or without ZeroDev enabled. The `lostUsd ≡ 0` invariant is guaranteed by the bridge state machine and escort accounting — **not** by Account Abstraction.

When ZeroDev **is** enabled, it provides three delivery-plane capabilities SliverVine does not replicate in-house:

| Capability | Without ZeroDev (baseline) | With Opt-In ZeroDev integration |
|------------|--------------------------|-----------------------------------|
| **Scoped Session Keys** | EOA or institutional multisig signing | Kernel modular `ORDER_EXECUTE` · R06/R07 notional cap · 30s TTL auto-expiry |
| **Paymaster sponsorship** | Institutions prefund Arbitrum gas | `zerodev.sponsorUserOperation` · per-op ≤ $0.50 · daily $10 circuit breaker |
| **Bundler standard path** | Direct `eth_sendRawTransaction` or venue-native signing | EntryPoint v0.7 + **EIP-7562** compliant UserOp · fail-closed · no blind retry |

**Execution pipeline (opt-in AA path only):**

```text
UserOp draft → verifyAgentIntent() [ExoMesh Edge gate · p50 ~106µs · Wasm — independent of AA]
 → evaluateStaticBreakerMatrix() [soil + gas ledger]
 → Paymaster sign → Bundler → EntryPoint → Kernel validateUserOp
```

ExoMesh decides **before broadcast** on every path; ZeroDev handles **non-custodial account delivery only** when explicitly opted in. If ZeroDev is unavailable, institutions route through **Arbitrum Native Ingress** or **Across Bridge** escort — ReflexCore (SSRC) and `lostUsd ≡ 0` invariants remain fully operational.

#### 2.4.2 Kernel v3 / v4 Session Keys (ERC-7579 Modular Permissions)

> **Scope:** Kernel v3 session keys are the v1.0 delivered AA surface. Kernel v4 alignment is **post-grant (V1.5)** — adapter swap only; Shield / Wasm / Gate are unchanged.

| Dimension | Kernel v3 (v1.0 delivered) | Kernel v4 (V1.5 alignment) |
|-----------|------------------------------|------------------------------|
| **Module standard** | ERC-7579 modular session keys | v4 unified permission surface · ZeroDev "One Stack" |
| **Permission scope** | `ORDER_EXECUTE` · whitelisted `callData` target/selector | Same R06 semantics · extended Smart Routing cross-chain session scope |
| **Notional cap** | `SESSION_KEY_NOTIONAL_CAP_USD` = **$5,000** (R07) | Config-driven · invariant formulas unchanged |
| **TTL / re-auth** | Session TTL + R14 EIP-712 5-min re-auth | v4 Authorize stage native alignment · adapter swap only |
| **Signature path** | Kernel `isValidSignature` → ERC-1271 `0x1626ba7e` | Dual plane: Kernel ERC-1271 ∥ Gate ECDSA m-of-n |
| **Code anchors** | [src/adapters/arbitrum/zerodev-aa/](../../../src/adapters/arbitrum/zerodev-aa) · `hl-session/permissions.ts` | ⏳ Post-Grant (V1.5) adapter swap · **Shield / Wasm zero rewrite** |

**Migration rule:** Kernel v3 → v4 replaces Gatehouse adapters only ([zerodev-aa-userop.ts](../../../src/adapters/arbitrum/zerodev-aa/zerodev-aa-userop.ts) · [zerodev-aa-gate.ts](../../../src/adapters/arbitrum/zerodev-aa/zerodev-aa-gate.ts)); `checkSoilResistance()`, [pkg/soil_core.wasm](../../../pkg/soil_core.wasm), and [SliverVineGate.sol/](../../../SliverVineGate/out/SliverVineGate.sol) **do not change** with Kernel major version.

#### 2.4.3 Paymaster Gas Sponsorship (Sponsorship & Circuit Breakers)

> **Scope:** Paymaster sponsorship is **opt-in** (Pillar Set X). Daily cap exhaustion falls back to `sponsored: false` — UserOp drafting continues on self-funded gas; **ReflexCore (SSRC) Edge path and Arbitrum Native Ingress are unaffected**.

| Parameter | Value | SSOT |
|-----------|-------|------|
| Per-UserOp sponsorship cap | **$0.50 USD** | `MAX_GAS_COST_PER_USEROP_USD` |
| 24h rolling sponsorship budget | **$10 USD** | `DAILY_SPONSORSHIP_LIMIT_USD` |
| Trip code | `ZERODEV_GAS_LIMIT_EXCEEDED_TRIP` | [zerodev-aa-static-breaker.ts](../../../src/adapters/arbitrum/zerodev-aa/zerodev-aa-static-breaker.ts) |
| Paymaster middleware | `zerodev.sponsorUserOperation` | [zerodev-aa-userop.ts](../../../src/adapters/arbitrum/zerodev-aa/zerodev-aa-userop.ts) |
| Persistence (optional) | KV `zerodev:aa:gas:ledger` · TTL 86,400s | [zerodev-aa-gas-ledger.ts](../../../src/adapters/arbitrum/zerodev-aa/zerodev-aa-gas-ledger.ts) |

Sponsorship and soil fuse are **serially evaluated**: `evaluateStaticBreakerMatrix()` runs `checkSoilResistance()` first, then `evaluateSponsoredGasLimits()` — on soil trip, **both sponsorship and broadcast are denied**, preventing "paid but should-be-blocked" UserOps from reaching the bundler.

#### 2.4.4 EIP-7562 Zero-Bundler-Rejection Invariant

> **Scope:** Applies only when ZeroDev AA is **opted in**. Bundler timeout or rejection triggers fail-closed on the UserOp path — institutions may bypass AA entirely via Arbitrum Native Ingress without losing Shield protection.

**Zero-Bundler-Rejection Invariant:** ExoMesh-gated UserOps MUST NOT trigger EIP-7562 opcode/storage violations during the validation phase; bundler rejection is a **protocol fault**, not a retry signal.

| Rule | Enforcement |
|------|-------------|
| Validation-phase storage reads | Session-key modules restrict `callData` to whitelisted target/selector — no forbidden cross-contract reads |
| Edge pre-screen | Static breaker + `checkSoilResistance()` before `sendUserOperation()` |
| Fail-closed | Bundler unreachable · missing EP v0.7 · timeout → `BUNDLER_TIMEOUT_FAIL_CLOSED` (`ZERODEV_BUNDLER_FAIL_CLOSED_TIMEOUT_MS` = 3,000 ms) |
| Probe | `supportsEntryPoint07` · [zerodev-aa-bundler.ts](../../../src/adapters/arbitrum/zerodev-aa/zerodev-aa-bundler.ts) smoke probe |

This invariant ensures institutional UserOps are **predictably deliverable** on Arbitrum bundler infrastructure — not silently dropped for storage violations — consistent with the 106 µs Shield fail-closed philosophy.

#### 2.4.5 ZeroDev v4 "Seven Stages, One Stack" Alignment Roadmap (Post-Grant Spec)

ZeroDev v4 converges the smart-wallet lifecycle into **seven stages, one stack**. SliverVine Protocol v1.0 delivers stages **①–⑤** (with ② as reference harness only); stages **⑥–⑦** are explicitly **post-grant roadmap** — not claimed as v1.0 scope.

| Stage | ZeroDev v4 semantics | SliverVine ExoMesh integration anchor | Status |
|-------|---------------------|-------------------------|--------|
| **① Sign in** | Identity · Kernel account resolution | ZeroDev login → `sender` Kernel address · no hot-wallet seed | ✅ v1.0 Delivered (Sepolia verified) |
| **② Fund** | Cross-chain deposit · Smart Routing | `ZERODEV_SMART_ROUTE_TARGETS` · USDG → GMX ExchangeRouter (§2.3 reference harness) | 📋 Reference Harness (Vitest dry-run verified) |
| **③ Gas** | Paymaster sponsorship | `zerodev-aa-gas-ledger` · per-op / daily caps (§2.4.3) | ✅ v1.0 Delivered (Sepolia verified) |
| **④ Authorize** | Session key scope | ERC-7579 `ORDER_EXECUTE` · R06/R07 · R14 re-auth | ✅ v1.0 Delivered (Sepolia verified) |
| **⑤ Execute** | UserOp broadcast · on-chain execution | `verifyAgentIntent()` → Shield → Bundler → GMX/HL venue | ✅ v1.0 Delivered (Sepolia verified) |
| **⑥ Recover** | Account recovery · social recovery | — | ⏳ Post-Grant Roadmap (V1.5) — *Out of scope for v1.0 (handled by upstream Kernel/EOA owner)* |
| **⑦ Compose** | Multi-step intent composition | 2PC intent ledger · [intent-ledger.ts](../../../src/core/intent-ledger.ts) (partial internal coverage) | ⏳ Post-Grant Roadmap (V1.5) — *Off-chain 2PC intent ledger (partial internal coverage)* |

```text
Sign in ──► Fund ──► Gas ──► Authorize ──► Execute (v1.0 Core Active Scope)
 │          │        │          │              │
 Kernel   Smart    Paymaster  Session Keys   Shield 106µs
 Account  Route    Ledger     R06/R07        + Venue
 (Ref)    (Ref)                              dispatch
```

**v1.0 active scope:** Stages ①③④⑤ are Sepolia-verified AA delivery paths. Stage ② is a Vitest reference harness only. Stages ⑥⑦ are **not** v1.0 deliverables — recovery is upstream Kernel/EOA owner responsibility; multi-step Compose is **V1.5 onboarding plumbing**, not product identity.

**One Stack semantics (post-grant alignment):** When Kernel v4 ships, stages ①–⑤ will share one Kernel account, `sender` identity, and ExoMesh `AllowedToSign` predicate — institutions need not switch wallets between permissioned ingress and Arbitrum One. **Shield / Wasm / Gate invariants are unchanged** across Kernel major versions.

### 2.5 Strategic Blue-Chip Ecosystem & Settlement Roadmap (V1.0 Core + V1.5)

> **Scope honesty:** v1.0 active execution and fee capture remain **GMX v2 ETH/USDC GM + Hyperliquid 1× short** on Arbitrum One (§2 triangle). **Pendle Institutional Shield** and **Variational Omni RFQ** are **v1.0 Live Pillar Set Y** pre-execution firewalls. **Stabilizer Sepolia Cross-Pass Sandbox** is **v1.0 Live** on `421614`. **V1.5 product identity is Fleet Policy + Policy Studio + block certificate** — pruned venue adapters → [verification matrix § SSOT](../../03_product_verifications/01_VERIFICATION_MATRIX.md).

| Partner / Venue | Strategic role | ExoMesh integration | Horizon | Status |
|-----------------|----------------|---------------------|---------|--------|
| **Pendle Finance** (Yield & Rate Hedging) | PT/YT safety sentinel for AI agents in yield-tokenization markets — **not a yield competitor** · Arbitrum Fixed Yield funding: **USDai** in · **sUSDai** redeem out (**not USDC**) | `checkSoilResistance()` · `pendleOracle` / `pendleCrossGuard` soil probes · [pendle-market-oracle-adapter.ts](../../../src/adapters/pendle/pendle-market-oracle-adapter.ts) (sync cache · TTL 60s · `PENDLE_ORACLE_STALE`) · `evaluatePendleGmxCrossGuard()` · `evaluatePendlePtExpiryRisk()` · [pendle-gmx-cross-guard.ts](../../../src/guards/pendle-gmx-cross-guard.ts) · [pendle-pt-registry.ts](../../../src/adapters/pendle/pendle-pt-registry.ts) · `pnpm preflight:venues --venue=pendle` · live harness [0x22d7…](https://arbiscan.io/tx/0x22d7c93994ae930d95c159ee9087c7c49e3462d95a41ddd17b70c94877cd82b4) | **V1.0** | ✅ Live · Pillar Set Y · **254 test files | 1206 PASS clean (100%)** |
| **USD.ai** (AI-Compute RWA Yield Collateral) | Yield-bearing sUSDai collateral tier for AI agent treasury — GPU oracle · peg drift · NAV vs mark · depth fuse | [usdai-adapter.ts](../../../src/adapters/usdai/usdai-adapter.ts) · `evaluateUsdAiCollateralGuard()` · `usdai` → `collectExternalSoilFlags()` · `USD_AI_DEPEG_ORACLE_TRIP` | **V1.0** | ✅ Live · Pillar Set Y · `pnpm demo:usdai` |
| **Stabilizer** (Sepolia Cross-Pass Sandbox) | Universal testnet sandbox for AI agent stablecoin rebalance · cross-pass routing to GMX v2 + Pendle on `421614` | [exomesh-agentic-wallet-guard](../../../src/sdk/exomesh-agentic-wallet-guard/) · `evaluateStabilizerSwapGuard()` · identical `checkSoilResistance()` gate as `42161` | **V1.0** | ✅ Live · Sepolia `421614` · `pnpm demo:stabilizer` |
| **Variational** (Omni RFQ) | Protocol-agnostic RFQ firewall · stale quote · OLP depth · oracle drift · **TradFi TRS vs perp instrument lanes** | [variational-rfq-adapter.ts](../../../src/adapters/variational-rfq-adapter.ts) · [variational-instrument-guard.zero.ts](../../../src/guards/variational-instrument-guard.zero.ts) · `evaluateSwapPerpSoilZero` · Bits 12–13 | **V1.0** | ✅ Live · `pnpm demo:variational` |

- **Variational RFQ & Swap Guard**:
  - *Zero-Allocation Hot-Path*: Sub-microsecond numeric soil check (`evaluateSwapPerpSoilZero`).
  - *Instrument Awareness*: Distinguishes TradFi Total Return Swaps (flat carry, market open hours, dividend pass-through) vs Crypto Perps (variable funding rate volatility).
  - *Defensive Limits*: Fail-closed on closed swap market hours, carry >8%, quote age >500ms, or OLP exposure >15%.

```text
v1.0 Active Triangle (42161)
  GMX v2 GM Yield ──1× Δ-neutral──► Hyperliquid Short
         │
         ├──► V1.0: Pendle Institutional Shield (Pillar Set Y · sync oracle · soil fuse)
         ├──► V1.0: USD.ai AI-Compute Yield Collateral (Pillar Set Y · `USD_AI_DEPEG_ORACLE_TRIP`)
         └──► V1.0: Stabilizer Sepolia Cross-Pass Sandbox (421614 · Stabilizer→GMX→Pendle)
         └──► V1.0: Variational Omni RFQ (Pillar Set Y · stale quote / OLP fuse)
```

## 6. ERC-7579 Pre-Execution Hook Alignment — AI Agent Reflex Architecture

> **Design thesis:** ERC-7579 modular smart accounts provide **permission scope**; SliverVine Protocol provides **reflex speed**. Together they form the pre-execution hook stack that AI agents and institutional vaults require to avoid MEV/LVR traps without surrendering custody.

### 6.1 Two-Plane Hook Stack

| Plane | Component | Latency | v1.0 shipped | Post-grant |
|-------|-----------|---------|--------------|------------|
| **① Validator (TYPE 1)** | ZeroDev Kernel v3 session module | **&lt;1 ms** | **Spec + adapter**; sudo validator only in `buildKernelAccount` | Scoped `ORDER_EXECUTE` module `installModule` |
| **①b Pre-Exec Hook (TYPE 4)** | `SliverVineRiskOracle` | on-chain target | **Oracle deployed** (Sepolia); **pre-UserOp read** off-chain | `installModule` TYPE-4 — bypass-proof on-chain revert |
| **② Reflex Hook (Wasm + Stylus)** | Edge `checkSoilResistance()` ∥ Stylus coprocessor | **p50 ~106 µs** | ✅ Pre-UserOp fail-closed | On-chain parity reinforcement |

> **Honesty:** TYPE-4 on-chain hook execution is **V1.5 Track A** (post-grant pilot — not v1.0 freeze). v1.0 wedge = pre-broadcast / pre-UserOp only.

```text
AI Agent Intent (seconds)
 │
 ▼
┌───────────────────────────────────────────────────────────┐
│ ERC-7579 Validator (ZeroDev Kernel v3) │
│ · Session key scope · clip · TTL · callData whitelist │
└─────────────────────────┬─────────────────────────────────┘
 │ UserOp draft passes structural auth
 ▼
┌───────────────────────────────────────────────────────────┐
│ SliverVine ExoMesh Pre-Execution Reflex Hook (106µs Cerebellum) │
│ Edge: verifyAgentIntent() → evaluateSoilCore() │
│ → checkSoilResistance() [pkg/soil_core.wasm] │
│ On-chain: SliverVineSoilCoprocessor.evaluate_soil_…() │
│ [contracts/stylus-probe/src/lib.rs] │
└─────────────────────────┬─────────────────────────────────┘
 │ AllowedToSign = true
 ▼
 Paymaster → Bundler → EntryPoint → GMX / HL
```

### 6.2 ZeroDev Kernel v3 Validator Module (Pillar Set X)

| Hook point | ERC-7579 module role | SliverVine ExoMesh invariant |
|------------|---------------------|----------------|
| **`validateUserOp`** | Session module verifies scoped signature + callData shape | Whitelisted GMX ExchangeRouter · HL adapter selectors only |
| **`isValidSignature` (ERC-1271)** | Kernel returns `0x1626ba7e` on scoped intent digest | Dual plane: Kernel ERC-1271 ∥ Gate ECDSA m-of-n attestation |
| **Session TTL** | Module-enforced expiry | `DEFAULT_TTL_MS` · heartbeat · deadman switch (`agent-exomesh-guard`) |
| **Notional cap (R07)** | `SESSION_KEY_NOTIONAL_CAP_USD` = **$5,000** | Physical severance on breach — no partial fill escape |

**Code anchors:** [src/adapters/arbitrum/zerodev-aa/](../../../src/adapters/arbitrum/zerodev-aa) · [src/core/agent-exomesh-guard.ts](../../../src/core/agent-exomesh-guard.ts) · [src/sdk/agent-intent.ts](../../../src/sdk/agent-intent.ts) · §2.4.2 Kernel v3 / v4 Session Keys.

### 6.3 Stylus ReflexCore (SSRC) On-Chain Hook (Pillar Set Y Reinforcement)

| Property | Edge Wasm ([pkg/soil_core.wasm](../../../pkg/soil_core.wasm)) | Stylus Coprocessor ([contracts/stylus-probe/src/lib.rs](../../../contracts/stylus-probe/src/lib.rs)) |
|----------|----------------------------------|----------------------------------------------------------|
| **Entry** | `evaluateSoilCore()` via `@slivervine/exomesh-agentic-wallet-guard` | `evaluate_soil_coprocessor(spread_bps, depth_usd, slippage_bps)` |
| **Math** | TS fallback + Wasm hot path | u128 fixed-point score · quadratic spread/slippage penalty |
| **Fail-closed** | `depthUsd < minDepthUsd` → trip | `depth_usd < 10_000` → `(false, u64::MAX)` |
| **Status** | ✅ v1.0 Delivered (Sepolia verified) · p50 ~106 µs | ✅ **Code-Verified Coprocessor** · `cargo test` **9/9 PASS** · Stylus SDK **0.10.7** · on-chain deploy **pending** |

**Alignment rule:** Edge remains the **pre-broadcast SSOT** (fastest path). Stylus coprocessor provides **on-chain auditable parity** for grant diligence and future ERC-7579 executor-module co-location on ArbOS — never a weaker substitute for Edge fail-closed gates.

### 6.4 AllowedToSign Predicate (Reflex Contract)

Production decision formula shared by SDK, Worker, and grant-audit telemetry:

```text
allowedToSign =
 injectionOk ∧ digestOk ∧ soilOk ∧ sessionOk ∧ gasOk
 ∧ deadmanOk ∧ armorOk ∧ attOk ∧ wasmOk
```

| Gate | Module | ERC-7579 / Hook role |
|------|--------|---------------------|
| `sessionOk` | [session-key-gates.ts](../../../src/services/session-key-adapter-lib/session-key-gates.ts) | ERC-7579 module clip enforcement |
| `soilOk` | `checkSoilResistance()` · Wasm · Stylus | **Pre-execution reflex hook** |
| `attOk` | [SliverVineGate.sol/](../../../SliverVineGate/out/SliverVineGate.sol) | Consume-once EIP-712 attestation |
| `deadmanOk` | [agent-exomesh-guard.ts](../../../src/core/agent-exomesh-guard.ts) | Cross-venue slippage severance |

### 6.5 AI Agent Integration Surface

> *"These framework adapters provide modular integration specifications for pre-execution risk checks via `@slivervine/exomesh-agentic-wallet-guard` and REST APIs. In v1.0, active execution and liquidity routing are strictly bound to Arbitrum One GMX v2 GM + HL delta-neutral execution via the public open gateway."*

| Consumer | Integration | Reflex hook |
|----------|-------------|-------------|
| **Wallet / dApp (C-End)** | `@slivervine/exomesh-agentic-wallet-guard` · `withRetailGuardProvider()` · [§0.3](#03-c-end-b-end-integration-v11-ssot) | EIP-1193 pre-consensus intercept · 0-Gas on reject |
| **B2B agents (optional)** | `@slivervine/exomesh-agentic-wallet-guard` · `verifyAgentIntent()` · `withExoMeshShield` — server-side hook · not judge-primary | Apache-2.0 · sub-ms soil gate |
| **5-Core venues** | GMX · Pendle · USD.ai · Variational · HL guards · [§0.3](#03-c-end-b-end-integration-v11-ssot) | Per-venue `checkSoilResistance()` |
| **Stabilizer** | ✅ V1.0 Live (Sepolia) — [exomesh-agentic-wallet-guard](../../../src/sdk/exomesh-agentic-wallet-guard/) · [§0.4](#04-stabilizer-sepolia-universal-testnet-sandbox-cross-pass-layer-v10-live) | `evaluateStabilizerSwapGuard()` |
| **CrewAI / AutoGen (enterprise)** | ⏳ Ecosystem **adapter spec only** (not V1.5 product identity) — `SlivervineCrewAIGuardTool` · AutoGen `sanctuary_soil_guard` · legacy spec removed from repo (chaos sandbox audit retired) · [§6.9](#69-strategic-blue-chip-ecosystem-settlement-integrations-v10-core-v15) | `checkSoilResistance()` · Pillar Set X AML escort boundary |
| **Institutional vaults** | ZeroDev Kernel + ExoMesh Worker BUSL payload path | ERC-7579 session + 106µs ExoMesh reflex |
| **Grant audit / Dune / PEV** | `GET /api/grant-audit` · **PEV (Prevented Exploit Volume)** · [Dune dashboard](https://dune.com/silvervinelabs/slivervine-protocol) · production DuneSQL feed + chart ([DUNE_DASHBOARD_SPECIFICATION.md](../03_telemetry_and_mo/03_DUNE_DASHBOARD_SPECIFICATION.md)) | Pillar Set X ingress · Pillar Set Y intercepts · 10 bps builder revenue |

**Migration safety:** Kernel v3 → v4 adapter swap (Gatehouse only) — **Shield, Wasm, Stylus coprocessor, and EIP-712 Gate require zero rewrite** (§2.4.2 migration rule).

### 6.6 Architectural Trade-off: Sub-Millisecond AI Agent Rejection Proof vs. EIP-712

> **Sub-ms M2M Rejection Standard** — machine-to-machine agent swarm paths use deterministic session proofs; EIP-712 ECDSA is reserved for human-initiated chain settlement.

| Dimension | EIP-712 ECDSA (Settlement Plane) | HMAC-SHA256 Session Proof (M2M Reflex Plane) |
|-----------|----------------------------------|-----------------------------------------------|
| **Latency budget** | **1.2 ms – 3.5 ms** per sign (secp256k1 + wallet IPC) | **&lt; 12 µs** (`agent-exomesh-guard` Edge budget) |
| **Use case** | `SliverVineGate.verifyAndConsume()` · human wallet · on-chain attestation anchor | AI trading swarms · sub-ms reject proofs · Agent Memory audit trail |
| **Non-repudiation** | On-chain verifiable ECDSA · consume-once digest | Cryptographically verifiable session proof bound to ExoMesh session entropy |
| **DoS vector** | High-frequency agent reject storms stall on signing latency | **~200× latency reduction** vs ECDSA — swarm-safe fail-closed |

**Core thesis:** EIP-712 ECDSA signing introduces **1.2 ms – 3.5 ms** latency overhead, creating a **Denial-of-Service vector** for sub-millisecond AI trading swarms that must reject toxic intents faster than mempool races.

**SliverVine solution:** `agent-exomesh-guard` ([src/core/agent-exomesh-guard.ts](../../../src/core/agent-exomesh-guard.ts)) utilizes **deterministic HMAC-SHA256 Session Proofs** (&lt; **12 µs** execution budget) for M2M rejection, achieving **~200× latency reduction** while maintaining cryptographically verifiable non-repudiation on the Edge audit plane.

**Formal split:**

| Plane | Standard | SSOT module |
|-------|----------|-------------|
| **M2M Reflex (reject / deadman)** | Sub-ms M2M Rejection Standard — HMAC-SHA256 session proof | `evaluateAgentExoMeshGuard()` · `guardAgentUserOp()` |
| **Human / On-chain settlement** | EIP-712 `SliverVineExoMesh` v1 · m-of-n Gate attestation | [SliverVineGate.sol/](../../../SliverVineGate/out/SliverVineGate.sol) · `evaluateAttestation()` (SDK) |

**G11 UI fingerprint:** Demo HUD badge `GateDomainFingerprintBadge` calls `verifyGateDomainSeparator()` ([src/services/gate-domain-fingerprint.ts](../../../src/services/gate-domain-fingerprint.ts)) to compare on-chain `domainSeparator()` against local EIP-712 recompute — detecting hijacked frontends that point at a forged Gate contract.

**License SSOT (G8):** First-party contracts (`SliverVineGate`, `GatedExecutor`, `SliverVineAgentPolicyGuard`, `SliverVineRiskOracle`, `IngressSafetySwitch`, Stylus coprocessor) = **BUSL-1.1** · `@slivervine/exomesh-agentic-wallet-guard` = **Apache-2.0**.

### 6.7 Architectural Benchmark: SliverVine High-Performance Innovations vs. Legacy Web3 Standards

> **Audit scope:** `src/` · `contracts/` · `SliverVineGate/` — proprietary designs that intentionally depart from conventional ERC/EIP patterns to achieve sub-millisecond HFT reflexes and AI-agent swarm protection.
> **SSOT modules:** [agent-exomesh-guard.ts](../../../src/core/agent-exomesh-guard.ts) · [session-key-gates.ts](../../../src/services/session-key-adapter-lib/session-key-gates.ts) · [src/services/root-protection-lib/circuit-breaker-sever.ts](../../../src/services/root-protection-lib/circuit-breaker-sever.ts) · `soil_core.wasm` / `SliverVineSoilCoprocessor`.

| Dimension | Legacy Web3 Standard (ERC/EIP) | SliverVine Engineered Standard | Latency / Gas Improvement | Architectural Reason |
|-----------|-------------------------------|--------------------------------|---------------------------|----------------------|
| **AI Agent Rejection Proof** | [EIP-712](https://eips.ethereum.org/EIPS/eip-712) typed-data ECDSA (secp256k1 + wallet IPC) | **Sub-ms M2M Rejection Standard** — `agent-exomesh-guard` deterministic **HMAC-SHA256 Session Proof** (`evaluateAgentExoMeshGuard()` · `guardAgentUserOp()`) | **~200×** — **&lt; 12 µs** vs **1.2 – 3.5 ms** (ECDSA) | High-frequency agent reject storms must not block on signing latency; EIP-712 reserved for human / on-chain settlement (`SliverVineGate.verifyAndConsume`) |
| **Session Authorization Gate** | [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337) UserOp → Bundler → EntryPoint validation (network RTT + mempool queue) | **SystemState single-flight** — `assertSessionKeyExecutionGates()` · `assertSigningChannelOpen()` ([session-key-gates.ts](../../../src/services/session-key-adapter-lib/session-key-gates.ts) · `hl/auth/signing-gate.ts`) | **~10³–10⁴×** — in-process **&lt; 1 ms** vs **50 – 500 ms+** bundler round-trip | Structural session scope (R06/R07 clip) enforced **before** HL signature leaves Edge; bundler only delivers already-shielded intents |
| **Circuit Breaker / Kill Switch** | OpenZeppelin `Pausable` · on-chain `pause()` (≥ **1 block** · Arbitrum ~250 ms · mainnet ~12 s) | **Edge physical sever** — `severCircuitBreakerPipeline()` R17/R20 ([src/services/root-protection-lib/circuit-breaker-sever.ts](../../../src/services/root-protection-lib/circuit-breaker-sever.ts)) · `severSigningChannel()` · EIP-712 pipe severed in-process | **~10⁵×** — **&lt; 1 ms** Edge sever vs **≥ 250 ms** on-chain pause | Toxic-fill window closes **before** mempool exposure; `SliverVineGate.halt()` is settlement-plane backup, not hot-path reflex |
| **Risk Oracle Flush** | `Ownable` / `Pausable` admin toggle (mutable · governance delay) | **Irreversible flush** — `SliverVineRiskOracle.applySignedReport(STATUS_SHUTDOWN)` → `isSystemFlushed = true` (one-way poison pill) | Same block on trigger; **zero** post-flush un-pause path | Compliance ingress (`IngressSafetySwitch`) fail-closed without independent admin surface |
| **Soil / Slippage Compute** | EVM Solidity storage reads + oracle `SLOAD` loops (gas-heavy · block-bound) | **Wasm hot path** [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) (`#![no_std]`) + **Stylus coprocessor** `evaluate_soil_coprocessor()` (stateless u128 fixed-point) | **~10²×** latency — Edge **p50 ~106 µs** · Wasm warm **&lt; 60 µs** vs multi-ms EVM path; Stylus **stateless** (no storage reads) | Pre-broadcast math must run at HFT reflex speed; on-chain coprocessor = auditable parity, not hot-path substitute |
| **Gate Attestation Model** | Replayable signatures · mutable proxy upgrades | **Consume-once EIP-712** — `consumed[digest]` burned before external call (`SliverVineGate` · `GatedExecutor`) · immutable gate (no proxy) | `verifyAndConsume` **~25.8k – 28k gas** · attestation TTL **≤ 30 s** | One ALLOW cannot be redirected to arbitrary calldata; asymmetric authority (halt immediate · unhalt timelocked) |
| **AA Bundler Compliance** | Blind UserOp retry on bundler rejection | **[EIP-7562](https://eips.ethereum.org/EIPS/eip-7562) Zero-Bundler-Rejection Invariant** — `evaluateStaticBreakerMatrix()` pre-screen ([zerodev-aa-static-breaker.ts](../../../src/adapters/arbitrum/zerodev-aa/zerodev-aa-static-breaker.ts)) | Eliminates wasted bundler RTT on toxic UserOps | Soil trip **denies sponsorship + broadcast** serially — no "paid but should-be-blocked" UserOps |
| **RPC / Scraper Defense** | Public RPC endpoint lists · no decoy layer | **Honeypot trap hosts** — `evaluateRpcDefenseGate()` · **99% synthetic slippage** ([rpc-fetch-gate-eval.ts](../../../src/services/defense/rpc-fetch-gate-lib/rpc-fetch-gate-eval.ts)) | Unauthenticated scrapers fail-closed at **&lt; 1 ms** (no real venue RTT) | Anti-copycat: forked frontends hitting trap hosts receive decoy telemetry, not production state |
| **Frontend Trust Anchor** | Client-trusted `verifyingContract` string | **G11 domain fingerprint** — `verifyGateDomainSeparator()` on-chain `domainSeparator()` vs local EIP-712 recompute | One RPC `eth_call` · HUD badge `GateDomainFingerprintBadge` | Detects hijacked frontends pointing at forged Gate contracts |
| **Pre-Execution vs Post-Execution** | Gauntlet / Chaos Labs parameter dashboards (minutes → days) | **Interceptor Moat** — `checkSoilResistance()` inline before broadcast | **p50 ~106 µs** vs minutes–days governance loop | MEV / LVR damage is prevented, not rebalanced after fill |

**Code anchors (audit trail):**

| Pillar | Legacy pattern avoided | SliverVine SSOT |
|--------|------------------------|-----------------|
| AI Security | EIP-712 on every reject | [src/core/agent-exomesh-guard.ts](../../../src/core/agent-exomesh-guard.ts) |
| Session Gate | ERC-4337 bundler as first gate | [src/services/session-key-adapter-lib/session-key-gates.ts](../../../src/services/session-key-adapter-lib/session-key-gates.ts) · [src/adapters/hl/auth/signing-gate.ts](../../../src/adapters/hl/auth/signing-gate.ts) |
| Circuit Breaker | On-chain `Pausable` | [src/services/root-protection-lib/circuit-breaker-sever.ts](../../../src/services/root-protection-lib/circuit-breaker-sever.ts) · [src/services/risk-control-lib/root-protection.ts](../../../src/services/risk-control-lib/root-protection.ts) |
| Compute Parity | EVM storage-heavy soil math | [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) · [contracts/stylus-probe/src/lib.rs](../../../contracts/stylus-probe/src/lib.rs) · [src/services/risk-control-lib/soil-resistance.ts](../../../src/services/risk-control-lib/soil-resistance.ts) |

### 6.8 Competitive Positioning — Four-Dimensional ASCII Matrices (SliverVine Protocol)

**Entity:** SilverVine Labs · **Protocol:** SliverVine Protocol (BeΔ) · ExoMesh (Module A) · Sanctuary (Module B)  
**[ERC-8196](https://eips.ethereum.org/EIPS/eip-8196):** Finalized ERC-8196 Standard (Ethereum Standard · Virtuals Protocol co-author).

Evaluator-facing comparison of SliverVine Protocol versus legacy execution, agent-wallet, and cross-venue stacks. Complements the §6.7 tabular benchmark.

**Matrix 1 — Execution & Pre-Broadcast Severance Profile**

```text
┌───────────────────────────┬─────────────────────────────┬────────────────────────────┬────────────────────────────┐
│ Dimension                 │ SliverVine ExoMesh (BeΔ)   │ Legacy ERC-4337 / OZ       │ Gauntlet / Chaos Labs      │
├───────────────────────────┼─────────────────────────────┼────────────────────────────┼────────────────────────────┤
│ 1. Latency Profile        │ p50 ~106µs (Sub-ms Edge)   │ 50ms – 500ms+ (Bundler RTT)│ Hours to Days (Parameter) │
│ 2. Pre-Broadcast Severance│ YES (0-Gas Fail-Closed)     │ NO (Post-validation/mempool│ NO (Post-execution audit) │
│ 3. Gas Overhead           │ 0 Gas (Edge Rejection)      │ Wasted Bundler Gas         │ On-chain Governance Gas    │
│ 4. Invariant Enforcement  │ Δnet ≡ 0 & lostUsd ≡ 0      │ Basic Balance Checks       │ Dynamic Risk Parameters    │
└───────────────────────────┴─────────────────────────────┴────────────────────────────┴────────────────────────────┘
```

**Matrix 2 — AI Agent Wallet Policy & ExoMesh Execution Layer**

```text
┌───────────────────────────┬─────────────────────────────┬────────────────────────────┬────────────────────────────┐
│ Dimension                 │ SliverVine ExoMesh (BeΔ)   │ Multisig / Timelock        │ Web2 LLM Guardrails        │
├───────────────────────────┼─────────────────────────────┼────────────────────────────┼────────────────────────────┤
│ 1. Policy Gate Layer      │ ERC-8196 (Final) Sub-ms Policy Gate│ On-chain Voting / Delay    │ API Proxy (Centralized)    │
│ 2. Prompt Injection Guard │ R20 Physical Deadlock       │ Vulnerable to Signed Intent│ Bypassable via Jailbreak   │
│ 3. Key Pipe Severing      │ <1ms `severSigningChannel`  │ N/A (Requires On-chain Tx) │ N/A (No On-chain Hook)     │
│ 4. Standard Alignment     │ ERC-8196 (Final) Sub-ms Policy Gate · EIP-7562 │ Standard ERC-20 / ERC-721  │ Proprietary REST APIs      │
└───────────────────────────┴─────────────────────────────┴────────────────────────────┴────────────────────────────┘
```

**Matrix 3 — Cross-Venue Liquidation & Ingress Escort Paradigm**

```text
┌───────────────────────────┬─────────────────────────────┬────────────────────────────┬────────────────────────────┐
│ Dimension                 │ SliverVine ExoMesh (BeΔ)   │ Native DEX Limit Orders    │ Raw Cross-Chain Bridges    │
├───────────────────────────┼─────────────────────────────┼────────────────────────────┼────────────────────────────┤
│ 1. Cross-Spread Sensing   │ Live GMX/HL Soil Resistance │ Static Slippage Tolerance  │ Blind Asset Relaying       │
│ 2. Liquidation Defense    │ -40 Haircut (Observatory)   │ Cascading Liquidation Risk │ No Execution Awareness     │
│ 3. Ingress Accounting     │ `lostUsd ≡ 0` Escort Label  │ Immediate Capital Loss     │ Phantom In-flight Balances│
│ 4. AML Shielding          │ Blocked Reverse Path (46630)│ Open Protocol Ingress      │ Unfiltered Contamination   │
└───────────────────────────┴─────────────────────────────┴────────────────────────────┴────────────────────────────┘
```

<a id="69-strategic-blue-chip-ecosystem-settlement-integrations-v10-core-v15"></a>

### 6.9 Strategic Blue-Chip Ecosystem & Settlement Integrations (V1.0 Core + V1.5)

> **v1.0 execution boundary:** v1.0 active execution and liquidity routing are bound to **GMX v2 GM + HL delta-neutral** via the public open gateway. **Pendle Institutional Shield**, **Variational Omni RFQ**, and **Stabilizer Sepolia Cross-Pass Sandbox** are **v1.0 Live** pre-execution firewalls — see [§2.5](#25-strategic-blue-chip-ecosystem-settlement-roadmap-v10-core-v15).

| Venue | Integration surface | Reflex hook | Horizon |
|-------|-------------------|-------------|---------|
| **Pendle Finance** | PT/YT registry + sync oracle + cross-guard · soil-wired | `checkSoilResistance()` · `pendleOracle` / `pendleCrossGuard` · `PENDLE_ORACLE_STALE` · `evaluatePendleGmxCrossGuard()` · maturity &lt;7d + jitter &gt;200 bps fail-closed | **V1.0** |
| **Stabilizer** | Sepolia universal sandbox · zero-slippage stablecoin cross-pass routing | `evaluateStabilizerSwapGuard()` · identical `checkSoilResistance()` gate as Mainnet | **V1.0** ✅ Live · Sepolia `421614` |
| **Variational** | Omni RFQ stale quote · OLP depth · oracle drift | [variational-rfq-adapter.ts](../../../src/adapters/variational-rfq-adapter.ts) · Bits 12–13 | **V1.0** ✅ Live · `pnpm demo:variational` |

---

## 2. Triangle Liquidity Loop & Segregated Tranches

Closed-loop three-venue routing with **Arbitrum One as the primary yield base**. **Hyperliquid** — Independent L1 High-Frequency Orderbook AppChain (originated alongside Arbitrum's perp liquidity ecosystem) — provides the cross-chain hedge leg; permissioned ingress (e.g. Robinhood Chain) is optional:

```text
Arbitrum One (GMX GM Yield Base — PRIMARY · ETH/USDC)
 ↕ 1× Δ-neutral hedge
Hyperliquid (Independent L1 HF Orderbook AppChain · 1× Short Hedge)
 ↑ optional permissioned ingress (e.g. Robinhood Chain 46630 / 4663)
```

| Leg | Venue | Role |
|-----|-------|------|
| **Yield base (PRIMARY)** | Arbitrum One · GMX v2 GM | Underweight-side GM LP · builder `uiFeeReceiver` (**+10 bps**) · ExoMesh pre-execution gate |
| **Hedge** | Hyperliquid (Independent L1 HF Orderbook AppChain) | Session-key **1× short** Emergency Liquidity Sponge · `evaluateHyperliquidSessionGuard()` · nonce-healed signing |
| **Ingress (optional example)** | Robinhood Chain | Supported permissioned institutional ingress · outbound-only escort into Arbitrum · **ZeroDev Smart Route Calldata Binding** (reference harness — USDG → GMX `ExchangeRouter`; production baseline = **Arbitrum One Native Ingress**) |

**Control plane:** Cloudflare Edge Worker (`SystemState` SSOT) evaluates sequencer · oracle lag · soil · RPC radar before any unsigned GMX payload or HL hedge dispatch. Routing is unidirectional into `SystemState`; venue adapters never mutate peer books without a gate pass.

**Read API:** `GET /api/yield/triangle` — structural APY / depth / gate status across HL · GMX (Robinhood Chain ingress stub stacked via egress escort).

### 2.1 Segregated Tranches

Solidity vault surface splits capital into two non-fungible risk lanes:

| Tranche | Chain policy | Behavior |
|---------|--------------|----------|
| **Permissioned RWA Tranche** | Robinhood Chain **4663** inbound **BLOCKED** at Edge protocol filter | Institutional / RWA-tagged deposits only · **[src/adapters/across-ingress-bridge.ts](../../../src/adapters/across-ingress-bridge.ts)** AML inbound block · **`IngressSafetySwitch`** oracle flush + address blacklist · no permissionless public mint path from 4663 |
| **Permissionless DeFi Tranche** | Arbitrum One + HL | Open GM / hedge flow behind ExoMesh fail-closed gate · standard DeFi UX |

**Invariant:** RWA capital on the permissioned lane cannot be atomically reminted into the permissionless DeFi tranche without an explicit, audited bridge + compliance gate (Across + AA). Chain **4663 → Arbitrum** inbound is denied by default; Testnet **46630** remains the active integration sandbox.

**On-chain anchors:** [contracts/IngressSafetySwitch.sol](../../../contracts/IngressSafetySwitch.sol) · [contracts/SliverVineRiskOracle.sol](../../../contracts/SliverVineRiskOracle.sol) · [contracts/src/SliverVineAgentPolicyGuard.sol](../../../contracts/src/SliverVineAgentPolicyGuard.sol).

**Lean On-Chain Gate by Design:** Dual-contract settlement core is [SliverVineGate.sol/](../../../SliverVineGate/out/SliverVineGate.sol) (consume-once attestation) + [SliverVineAgentPolicyGuard.sol](../../../contracts/src/SliverVineAgentPolicyGuard.sol) ([ERC-8196](https://eips.ethereum.org/EIPS/eip-8196) (Final) policy validation). Both are **immutable, non-custodial, no proxy** so risk math remains on Edge (`checkSoilResistance()` **p50 ~106µs**) — on-chain is the fail-closed record, not the HFT hot path.

**Arbitrum One (42161) — ExoMesh Live Anchors** · SSOT: [02_CONTRACT_DEPLOYMENT_MATRIX.md](./03_CONTRACT_DEPLOYMENT_MATRIX.md)

| Contract | Role | Verified Address (Arbitrum One) |
|----------|------|----------------------------------|
| `SliverVineGate` | Consume-once EIP-712 attestation anchor · domain `SliverVineExoMesh` | [0x71D7d26f98110c5DE3df0fCbddCf2A3A2BC6e2f1](https://arbiscan.io/address/0x71d7d26f98110c5de3df0fcbddcf2a3a2bc6e2f1) |
| `SliverVineAgentPolicyGuardV2` | [ERC-8196](https://eips.ethereum.org/EIPS/eip-8196) (Final) · GMX wire · Stylus wired | [0x5df192f9454fd02a89e768632cb5da0762a774bc](https://arbiscan.io/address/0x5df192f9454fd02a89e768632cb5da0762a774bc) |
| `SliverVineSoilCoprocessor` (Stylus) | Engine A on-chain soil coprocessor · PolicyGuardV2 staticcall | [0xc23587d6573dd134f95b02b0202ffbf84686625e](https://arbiscan.io/address/0xc23587d6573dd134f95b02b0202ffbf84686625e) |
| **ZeroDev Smart Route UserOp** | Kernel v3 ERC-7579 · Robinhood ingress → GMX smart-route `payloadHash` bind | [0xe12714a7…](https://arbiscan.io/tx/0xe12714a7b26d8983c32e471180e640dfb2ff000b4e1530a34cee02169f11e816) |
| **Mainnet Ignition Tx** | Forge broadcast · Gate contract creation | [0x54c153e9a41f704b5eb0ae554eac593d1110d62bd826ff094e72f2bd60c1b0c6](https://arbiscan.io/tx/0x54c153e9a41f704b5eb0ae554eac593d1110d62bd826ff094e72f2bd60c1b0c6) |
| **Deploy script** | ChainID guard + optional smoke | [DeployArbitrumOneGate.s.sol](../../../SliverVineGate/script/DeployArbitrumOneGate.s.sol) · [deploy-mainnet-gate-ignition.ts](../../../scripts/deploy-mainnet-gate-ignition.ts) |

> **Bootstrap Keys:** Initial mainnet deploy uses Bootstrap Ignition Keys (`0x1111…`/`0x2222…`) for public verification; production multisig rotation via native governance.

**Arbitrum Sepolia (421614) — verified deployment addresses:**

| Contract | Role | Verified Address (Sepolia) |
|----------|------|----------------------------|
| **Deployer / Admin / Signer** | OpSec-isolated Forge broadcast signer · gate stack admin | `0xbd65d785Dac74EBa9efFdB357b2dC52fCC26EC7F` |
| `SliverVineGate` | Consume-once EIP-712 attestation anchor · domain `SliverVineExoMesh` | [0xc66F96611a737c4e58706D0955594456eAb88959](https://sepolia.arbiscan.io/address/0xc66f96611a737c4e58706d0955594456eab88959) |
| `SliverVineRiskOracle` | EIP-712 offline risk report · `STATUS_SHUTDOWN` flush | [0x6CA7eA722F139F3C23280ebc973caff3B17d8fEa](https://sepolia.arbiscan.io/address/0x6ca7ea722f139f3c23280ebc973caff3b17d8fea) |
| `IngressSafetySwitch` | Pillar Set X compliance filter (oracle flush + blacklist) | [0xc1Eb1624A3A93e969De57466b1CDbD0e0189D192](https://sepolia.arbiscan.io/address/0xc1eb1624a3a93e969de57466b1cdbd0e0189d192) |
| `SliverVineSoilCoprocessor` (Stylus) | On-chain HF soil math coprocessor | **Mainnet only** · [0xc23587d6573dd134f95b02b0202ffbf84686625e](https://arbiscan.io/address/0xc23587d6573dd134f95b02b0202ffbf84686625e) |

#### 2.1.1 Explicit Scope Isolation for IngressSafetySwitch

> **Design remark (IngressSafetySwitch nomenclature):** `IngressSafetySwitch` is a **Pillar Set X address-level compliance filter only**. It does **not** implement chainId routing, R17/R20 daily-loss cutoff, Hot Key severance, or `checkSoilResistance()`.

| Layer | Responsibility | Module |
|-------|----------------|--------|
| **Edge ingress adapter** | Chain ID unidirectional escort · `AML_INBOUND_TO_ROBINHOOD_BLOCKED` | [src/adapters/across-ingress-bridge.ts](../../../src/adapters/across-ingress-bridge.ts) (Robinhood = reference adapter) |
| **On-chain ingress switch** | Oracle flush + institutional blacklist per address | [IngressSafetySwitch.sol](../../../contracts/IngressSafetySwitch.sol) |
| **Pre-execution shield** | Sub-ms soil fuse · R17/R20 · Hot Key / `rootProtection()` | Pillar Set Y Edge · Wasm · **not** IngressSafetySwitch |

> Shutdown is triggered upstream by **`SliverVineRiskOracle.applySignedReport(STATUS_SHUTDOWN)`** (EIP-712 offline signer → `isSystemFlushed`). **`IngressSafetySwitch`** reads oracle state only — no independent `Ownable` / `Pausable` admin surface.

**Invariant:** `RobinhoodSafetySwitch` → `IngressSafetySwitch` rename is **nomenclature + SSOT realignment only** — zero predicate or storage-layout change. [SliverVineGate.sol/](../../../SliverVineGate/out/SliverVineGate.sol) has **no** on-chain dependency on this contract.

### 2.2 Asset Redemption & Clearing Boundaries

| Path | Boundary |
|------|----------|
| **Arbitrum One Off-ramp** | Native **ETH, BTC, and USDC** supported directly upon GMX v2 async unwind (3–5 min). |
| **USDG Clearing** | Native USDG treasury redemptions are restricted to Robinhood Chain (`46630`/`4663`) via the unidirectional bridge; Arbitrum USDC is converted on return to preserve compliance bounds. Inbound AML contamination (reverse path) is blocked. |

## 5. Settlement Windows & Fee Tokenomics

### 5.1 Settlement Windows

| Window | Constant | Duration | Meaning |
|--------|----------|----------|---------|
| GMX GM redemption / settle | `GMX_REDEMPTION_WINDOW` | **3–5 minutes** | Keepers / oracle settle band for GM deposit·withdrawal completion on Arbitrum |
| HL withdrawal settle | `HL_WITHDRAWAL_SETTLEMENT_WINDOW` | **15 minutes** | L1 bridge / withdrawal finality budget before ExoMesh treats capital as free for re-route |

Gates must not assume instant atomicity across the triangle; inventory accounting holds legs in-flight until the respective window elapses or venue ack confirms.

#### 5.1.1 Strategic Settlement Extensions (V1.0 Core + V1.5)

| Extension | Settlement role | Horizon | Status |
|-----------|-----------------|---------|--------|
| **Pendle Finance** | PT/YT exit proceeds vs GMX margin shadow accounting — expiry blackhole / oracle decoupling guard · `PENDLE_ORACLE_STALE` soil fuse | **V1.0** | ✅ Live · Pillar Set Y · soil-wired · **254 test files | 1206 PASS clean (100%)** |
| **USD.ai** | AI-compute RWA yield-bearing collateral tier — sUSDai peg · GPU oracle freshness · NAV deviation · depth fuse · `USD_AI_DEPEG_ORACLE_TRIP` | **V1.0** | ✅ Live · Pillar Set Y · [risk-engine-usdai.ts](../../../src/core/risk-engine-usdai.ts) (SSOT) · [usdai-adapter.ts](../../../src/adapters/usdai/usdai-adapter.ts) (orchestration) · `pnpm demo:usdai` |
| **Stabilizer** | Sepolia cross-pass sandbox for AI agent stablecoin rebalance · `421614` | **V1.0** | ✅ Live · `pnpm demo:stabilizer` |

See [§2.5 Strategic Blue-Chip Ecosystem & Settlement Roadmap](#25-strategic-blue-chip-ecosystem-settlement-roadmap-v10-core-v15) for integration anchors.

### 5.2 Active Fee Path (v1.0)

| Item | Definition | Status |
|------|------------|--------|
| **Builder UI Fee** | **+10 bps** `uiFeeReceiver` on every unsigned GMX v2 increase / decrease / deposit payload (`GMX_UI_FEE_BPS`) | ✅ Code-Verified |
| **Referral Rebate** | Up to **25%** of GMX trading fees via registered `referralCode` (`GMX_REFERRAL_CODE_BYTES32`) | ✅ Code-Verified |

### 5.3 Dynamic Target Range (8.2% ~ 11.8%) — Mathematical APY Breakdown

Allocator-facing HUD band — **non-guaranteed**; derived from exogenous Delta-Neutral cash flows with **zero native token emissions**. Full narrative: [Risk Framework §2.6.2](./04_RISK_MITIGATION_AND_DISCLAIMER_FRAMEWORK.md).

| Yield Source Leg | Conservative Band (Lower 8.2%) | Bull/Volatile Band (Upper 11.8%) | Payer & Mechanism |
| :--- | :--- | :--- | :--- |
| **GMX v2 ETH/USDC GM Base** | **4.5%** | **6.5%** | GMX trader swap, borrow & closing fees |
| **Skew Rebate & Builder Fee** | **1.0%** (+10 bps UI fee included) | **1.8%** | Positive skew price-impact rebate + `uiFeeReceiver` (+10 bps · `GMX_UI_FEE_BPS`) |
| **Hyperliquid 1× Short Funding** | **3.2%** | **4.2%** | Counterparty long-side funding payment on HL orderbook |
| **Friction & Rebalance Costs** | **−0.5%** (`FRICTION_BUFFER_APY`) | **−0.7%** | Absorbed by ExoMesh Safety Buffer (basis & slippage) |
| **Net Strategy APY Range** | **8.2%** | **11.8%** | **Exogenous Delta-Neutral Cash Flow (Zero Token Emissions)** |

> **Evaluator defense narrative:** Unlike speculative emission vaults, SliverVine ExoMesh's **8.2% ~ 11.8%** target range is mathematically grounded in real GMX trading fees, skew rebates, and Hyperliquid short funding rates, guarded by our **0.5% Hurdle Gate** (`FRICTION_BUFFER_APY = 0.005` in [rebalance-rules.ts](../../../src/services/yield/rebalance-rules.ts)).

### 5.4 Capital Hurdle SSOT

> **Code SSOT:** Hyperliquid Native Earn USDC APY via [earn-probe.ts](../../../src/services/hyperliquid/earn-probe.ts) (`HURDLE_RATE_APY`). GMX markets-wire fallback → Pendle base APY in [arbitrum-yield-ingress-ops.ts](../../../src/adapters/arbitrum/arbitrum-yield-ingress-lib/arbitrum-yield-ingress-ops.ts). **No lending-protocol venue adapter.** Rebalance gate: `FRICTION_BUFFER_APY = 0.005` in [rebalance-rules.ts](../../../src/services/yield/rebalance-rules.ts).

### 5.5 Public Audit Surface

`GET /api/grant-audit` — guard states, TVL, `provenanceVerified`, `sepoliaDualLegProof`. No signing material or proprietary encode paths.

## Appendix: Real-World Threat Model & Market Landscape

### Market Adoption Metrics (The Agentic Web Shift)

The Web3 attack surface is shifting from human UI phishing to **autonomous agent execution pipelines**. Industry telemetry indicates the agentic web is already material on-chain:

| Metric | Estimate | Source |
|--------|----------|--------|
| **AI agents deployed** | **17,000+** autonomous on-chain agents | [Dune — ERC-8004: Trustless Agent Activity](https://dune.com/dune/erc-8004-onchain-ai-agents) · [ERC-8004 (EIP)](https://eips.ethereum.org/EIPS/eip-8004) · [Dune AI Agents hub](https://dune.com/agents) |
| **Share of on-chain transactions** | **~19%** agent-attributed activity | [Dune AI Agents](https://dune.com/agents) · [ERC-8004 cross-chain registrations](https://dune.com/queries/6705945) · agent-attribution telemetry (industry estimate) |
| **Daily Active Wallets (DAW) touchpoints** | **~4.5M** wallets interacting with agent frameworks | [Dune AI Agents](https://dune.com/agents) · on-chain wallet–agent interaction dashboards (industry estimate) |

> **Telemetry note:** Figures are order-of-magnitude **industry estimates** for threat-modeling — not audited SliverVine protocol KPIs. Primary on-chain SSOT for agent identity and registration growth is [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) telemetry on [Dune](https://dune.com/dune/erc-8004-onchain-ai-agents). See also [CryptoRank Symposium — agent-security focus](https://cryptorank.io/news/feed/fae5e-ai-agents-web3-hacking-wyoming-symposium).

**Implication:** Security must evolve from post-hoc dashboards and mutable pause functions to **microsecond Pre-Broadcast Intent Firewalls** — severing toxic calldata **before** Sequencer queues, Bundler ingress, or MEV mempools. SliverVine ExoMesh targets this gap at **p50 ~106µs** Edge Wasm evaluation ([§3.5 ReflexCore (SSRC) soil engine](./02_DEFENSE_MATRIX_AND_SSRC_CORE.md)) — addressing the pre-broadcast partition of the modeled on-chain risk surface (formal **88% / 12%** modeled split per [Risk Framework §0.1](./04_RISK_MITIGATION_AND_DISCLAIMER_FRAMEWORK.md)); the systemic residual tail is disclosed with Fail-Closed posture.

### Real-World Case Studies (Why SliverVine ExoMesh is Essential)

| # | Case | Loss / Impact | ExoMesh Alignment | Source |
|---|------|---------------|-------------------|--------|
| **1** | **[Jaredfromsubway.eth $7.5M Exploit (MEV Honeypot Trap)](https://www.blockaid.io/blog/the-predator-becomes-the-prey-how-a-counter-mev-honeypot-drained-75m-from-jaredfromsubway)** | Automated signature logic exploited via malicious permission / honeypot traps | Validates **sub-ms Wasm pre-broadcast** `checkSoilResistance()` + honeypot RPC defense (`evaluateRpcDefenseGate()`) | [Blockaid incident analysis](https://www.blockaid.io/blog/the-predator-becomes-the-prey-how-a-counter-mev-honeypot-drained-75m-from-jaredfromsubway) · [Chainalysis](https://www.chainalysis.com/blog/sandwich-attack-jaredfromsubway-hack/) · [CertiK](https://www.certik.com/blog/jaredfromsubway-mev-bot-incident-analysis) · [The Defiant](https://thedefiant.io/news/hacks/jaredfromsubway-eth-mev-bot-drained-7-5-million-counter-mev-honeypot) |
| **2** | **[Virtuals Protocol / BasisOS ~$531k Unbound Agent Drain](https://finance.yahoo.com/news/ai-agent-virtuals-protocol-stole-114617216.html)** | Unbound agent execution exceeded safe notional envelopes | Validates **R06/R07** · **`SESSION_KEY_NOTIONAL_CAP_USD = $5,000`** ([§3.6](./02_DEFENSE_MATRIX_AND_SSRC_CORE.md)) | [KuCoin — Virtuals compensation disclosure](https://www.kucoin.com/news/flash/virtuals-protocol-to-cover-full-compensation-for-basis-security-incident) · [Yahoo Finance](https://finance.yahoo.com/news/ai-agent-virtuals-protocol-stole-114617216.html) |
| **3** | **[ElizaOS / ai16z Fraud & Governance Collapse](https://www.burwick.law/active-cases/ai16z-elizaos-token-lawsuit-doe-v-walters)** | SDNY class-action litigation — raw Node.js prompt wrappers lacked on-chain execution guarantees | Validates **bytecode predicate assertions** ([§0.1](#01-bytecode-predicate-verification-v10-erc-7715-post-grant-design-spec)) · EIP-712 Gate · **LLM back-off cooldown** | [Burwick Law — Doe v. Walters (SDNY)](https://www.burwick.law/active-cases/ai16z-elizaos-token-lawsuit-doe-v-walters) · [CoinDesk](https://www.coindesk.com/markets/2026/08/05/ai-agent-token-once-worth-usd2-4-billion-ends-with-founder-calling-it-dead) · [Decrypt](https://decrypt.co/374958/eliza-ai-token-dead-shuts-down-foundation-lawsuit) |

### Competitive Landscape Matrix

| Dimension | **SliverVine V1.0 (Pre-Broadcast Mesh)** | **Wayfinder** | **Virtuals Protocol** | **ElizaOS Framework** | **ZeroDev / Biconomy (ERC-4337 AA)** |
|-----------|-----------------------------------|---------------|-------------------------|----------------------|--------------------------------------|
| **Pre-broadcast severance** | ✅ Sub-ms SSRC soil fuse · 0-Gas fail-closed | ⚠️ Intent routing; **no** sub-ms Wasm severance | ❌ Web2.5 layer; wallets without pre-execution bounds | ❌ No native pre-broadcast gates | ❌ Session keys; **no** AI-context fuse |
| **On-chain immutability** | ✅ 0-proxy Gate · `consumed[digest]` | Varies | Consumer UX focus | Open-source plugins | Strong AA infra |
| **AI behavioral safety** | ✅ 60s LLM cooldown · ±2–5 bps jitter | Limited | Limited | Prompt-only guardrails | N/A |
| **Session blast-radius** | ✅ $5k cap · scoped `ORDER_EXECUTE` | Varies | **Unbound drain risk** | Framework-dependent | ✅ ERC-4337 scopes |
| **Prompt injection immunity** | ✅ Bytecode predicates | Partial | Partial | **Vulnerable** at hook | **Vulnerable** to injected UserOps |

> See also [§0 Competitive Matrix — Pre-Execution vs. Post-Execution Risk](#competitive-matrix-pre-execution-vs-post-execution-risk) · [Pre-Broadcast Defense Mesh](../../00_ARB_Buildathon/SUBMISSION_GRANT_APPENDIX.md) in [SUBMISSION.md](../../00_ARB_Buildathon/SUBMISSION.md) · [Risk Spectrum §0.1](./04_RISK_MITIGATION_AND_DISCLAIMER_FRAMEWORK.md) (formal modeled **88% / 12%** + **80/20 Pareto** definition).

### Supplementary Industry References

- **MEV & thin-liquidity** — `checkSoilResistance()` · `evaluateHlOrderbookGapGuard()`
- **$441k+ bot execution error** — [PumpParade / Medium](https://pumpparade.medium.com/ai-trading-bots-lost-441k-in-one-error-heres-what-actually-works-and-what-doesn-t-4f04f890c189)
- **AI antivirus primitives** — [CertiK AI Skill Scanner](https://www.tradingview.com/news/chainwire:d064d7d1f094b:0-certik-launches-ai-skill-scanner-an-antivirus-software-for-the-ai-age/)
- **Institutional agent-security focus** — [CryptoRank Symposium](https://cryptorank.io/news/feed/fae5e-ai-agents-web3-hacking-wyoming-symposium)
