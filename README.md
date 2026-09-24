# SliverVine Protocol (BeΔ) — SliverVine ExoMesh — Pre-Consensus Intent Firewall for AI Agents on Arbitrum

> 📌 **System Metrics SSOT**: Verified via [docs/audit/SYSTEM_METRICS_SSOT.json](docs/audit/SYSTEM_METRICS_SSOT.json)

<!-- SSOT:README_BADGES_START -->
![Vitest](https://img.shields.io/badge/Vitest-1206_PASS_%28254_files%29-brightgreen?logo=vitest)
![Zero-Alloc Hot-Path](https://img.shields.io/badge/Zero--Alloc_Hot--Path-%3C16_KiB_%2F_10k_iterations-blue?logo=vitest)
![V2.0 Stylus Probe](https://img.shields.io/badge/V2.0_Stylus_Probe-9%2F9_PASS_%28Roadmap%29-blue?logo=rust)
[![risk-control.ts coverage](https://img.shields.io/badge/risk--control.ts-100%25_coverage-success?logo=vitest)](src/services/risk-control.ts)
![Chaos Matrix](https://img.shields.io/badge/Chaos_Matrix-255%2F255_Fail--Closed-blue?logo=github)
![Benchmark Latency](https://img.shields.io/badge/Latency-E2E_p50_106µs_%7C_Reflex_p50_15µs-blueviolet?logo=speedtest)
![TypeScript](https://img.shields.io/badge/TypeScript-0_errors-blue?logo=typescript)
![License](https://img.shields.io/badge/License-BUSL--1.1-orange)
![Arbitrum One Gate](https://img.shields.io/badge/Arbitrum_One_Gate-Sepolia_Verified_%2842161_Ready%29-28A0F0?logo=arbitrum)
[![ZeroDev AA Ready](https://img.shields.io/badge/ZeroDev_AA-Kernel_v3_Ready-00D26A.svg)](https://zerodev.app)
<!-- SSOT:README_BADGES_END -->

<p align="center">
  <img src="./public/brand/Detox_Sanctuary_wm.png" alt="SliverVine ExoMesh — Detox Sanctuary" width="600" />
</p>

**SliverVine Protocol · v1.0 · BeDelta Living Water v1.0 (BeΔ)** · SilverVine Labs · **SSRC:** Slivervine Stylus ReflexCore  
**DApp:** [slivervine.xyz](https://slivervine.xyz) · **Corporate:** [silvervinelabs.com](https://silvervinelabs.com) · **Telemetry (supplementary):** [Dune Operational Shield](https://dune.com/silvervinelabs/slivervine-protocol) · [Dune SEPSB](https://dune.com/silvervinelabs/slivervine-sepsb-stress) · verify `pnpm docs:dune-reconcile`

> **SliverVine ExoMesh** (Module A) — **ExoMesh Agentic Guard (EIP-1193/5792/6963+)** pre-consensus exoskeleton · **SSRC** ([pkg/soil_core.wasm](pkg/soil_core.wasm) · [src/services/risk-control.ts](src/services/risk-control.ts) · sub-1.8µs warm soil check).
> **SliverVine Sanctuary** (Module B) — **Sanctuary Async Escort (ERC-7540+)** · Treasury escort · Robinhood / Across compliance ingress.
>
> **V1.0 Buildathon Baseline:** Public Open Gateway — **no API key** · **5 RPS** (`X-SliverVine-Tier: public`).

---

## Primary SDK Entrypoint — EIP-1193+ Agentic Wallet Guard

**Primary product:** One-line **EIP-1193+** middleware for integrators — pre-consensus `request()` guard that wraps existing MetaMask / Rabby / Viem / ZeroDev providers (not an RPC proxy; not a new wallet). **0-Gas fail-closed on reject.** — [@slivervine/exomesh-agentic-wallet-guard](./src/sdk/exomesh-agentic-wallet-guard/).

```ts
import { withRetailGuardProvider } from "@slivervine/exomesh-agentic-wallet-guard";

const ethereum = withRetailGuardProvider(window.ethereum, {
  allowedSpenders: [/* routers you trust */],
  allowedVenues: [/* verifyingContract allowlist */],
});

await ethereum.request({ method: "eth_sendTransaction", params: [tx] });
// infinite approve · Permit2 phishing · EIP-712 domain drift · 4th retry → throw, $0 Gas
```

**Integration wiring:** End users keep MetaMask / Rabby — integrators wrap once at bootstrap. MetaMask · Rabby · Viem · wagmi paths + three GTM integration models → [Wallet Integration & Install Guide](./docs/02_sdk_and_integrations/01_guides/03_WALLET_INTEGRATION_AND_INSTALL_GUIDE.md)

| Capability | Outcome |
|------------|---------|
| **One-line EIP-1193+ wrap** | Integrators wrap any injected provider at the signing boundary; end users keep their existing wallet |
| **0-Gas pre-sign intercept** | Toxic calldata never reaches Sequencer |
| **Local in-process reflex** | No Blockaid-class 200–800ms round-trip |
| **AI retry severance** | 4th rapid submit → `MAX_ATTEMPTS_EXCEEDED_SEVERED` |

<!-- SSOT:README_VITEST_LINE_START -->
**Verify:** `npx vitest run tests/sdk/retail-guard-provider.test.ts` **35/35** · `pnpm demo:gmx -- --trip` · **Vitest SSOT:** **254 test files | 1206 PASS clean (100%)**
<!-- SSOT:README_VITEST_LINE_END -->

### Key Architectural Moats

- **EIP-1193+ `withRetailGuardProvider()`:** 0-Gas fail-closed at signing boundary · **254/1206** Vitest.
- **Uniswap V4 Hook Guard (Retail Guard · not 5-Core):** PoolManager selector LUT + `evaluateUniswapV4HookGate` — 0-Gas fail-closed on non-allowlisted hooks, fee cap, quoted-vs-calldata mismatch, opaque `unlock`. Threat model aligned with [0x v4 hook analysis](https://x.com/0xProject/status/2099578032960995502). **Not** a venue adapter; **not** `beforeSwap`/`afterSwap` instrumentation. → [Verification matrix · Uniswap V4 Hook Guard](./docs/03_product_verifications/01_VERIFICATION_MATRIX.md)
- **Honeypot & Jitter Armor:** 99% synthetic slippage decoy on trap RPC hosts · ±2–5 bps soil-threshold jitter.
- **Observatory Paradox Haircut:** −40 risk-score discount on `close`/`reduce` so emergency de-leveraging is never blocked.

→ Deep dive: [Defense Matrix §4 · Hidden Engineering Gems](./docs/01_architecture_and_standards/01_core_specs/02_DEFENSE_MATRIX_AND_SSRC_CORE.md)

### Honesty Boundaries

| Topic | Fact |
|-------|------|
| **Gate** | ExoMesh · Mainnet [0x71D7…e2f1](https://arbiscan.io/address/0x71d7d26f98110c5de3df0fcbddcf2a3a2bc6e2f1) · Sepolia [0xc66F…8959](https://sepolia.arbiscan.io/address/0xc66f96611a737c4e58706d0955594456eab88959) · matrix → [03_CONTRACT_DEPLOYMENT_MATRIX.md](./docs/01_architecture_and_standards/01_core_specs/03_CONTRACT_DEPLOYMENT_MATRIX.md) · legacy → [05_SUPERSEDED_DEPLOYMENTS_APPENDIX.md](./docs/01_architecture_and_standards/01_core_specs/05_SUPERSEDED_DEPLOYMENTS_APPENDIX.md) |
| **Stylus** | Mainnet only [0xc235…625e](https://arbiscan.io/address/0xc23587d6573dd134f95b02b0202ffbf84686625e) · wired on PolicyGuardV2 `0x5df192…` · Sepolia has **no** Stylus deploy |
| **Rate limit** | Per-isolate **5 RPS** (`X-SliverVine-Tier: public`) — not a global Cloudflare product limiter |
| **Uniswap V4** | Retail Guard calldata / hook allowlist — **not** 5-Core · does **not** reopen `RESERVED_ABI_V2` bit 4 · no hook-bytecode / reentrancy / oracle simulation · proof `npx vitest run tests/adapters/uniswap-v4-hook-guard.test.ts` |
| **npm SDK** | `"private": true` in [package.json](./src/sdk/exomesh-agentic-wallet-guard/package.json) — **public npmjs release Post-Grant Milestone 1** |
| **B2B decorator** | Optional `withExoMeshShield()` — server-side agent execution hook · same `checkSoilResistance()` · **not** the wallet wrap · not judge-primary · [decorator.ts](./src/sdk/decorator.ts) |

---

## Neuromorphic Security Architecture (Cerebrum vs Cerebellum)

**SliverVine ExoMesh acts as the involuntary reflex arc for autonomous AI agents (Pillar Set Y).** The LLM **Cerebrum** plans (~1–10s CoT); the **Cerebellum** shield severs toxic intents in **p50 ~15µs** — **$0 Gas** — before Sequencer ingress.

```text
┌────────────────────────────────────────────────────────────────┐
│ [Cerebrum] LLM Reasoning & Agent Loop (~1.0s - 10.0s)          │  <-- CoT / Tool Calls / Non-Deterministic
└────────────────────────────────────────────────────────────────┘
                         │ (Intent Payload)
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ [ExoMesh Reflex Arc] Cerebellum Shield (⚡ p50 ~15µs – p50 ~106µs)     │  <-- 0.015ms-0.106ms / Deterministic Fail-Closed
└────────────────────────────────────────────────────────────────┘
                         │
           ┌─────────────┴─────────────┐
           ▼                           ▼
     [ PASS: p50 ~106µs ]            [ FAIL: p50 ~15µs ]
    Signature Released          Reflex Deadlock Severed
```

> **Optional (ODA harness vocab):** ExoMesh = **Act gate** at EIP-1193 — [JUDGE_BRIEF · Agent harness ODA](./JUDGE_BRIEF.md).

> 🤖 **Agentic Commerce Safeguard (x402 & ERC-7683 Orthogonality)**:
> While **x402** defines HTTP 402 payment intent workflows for AI Autonomous Agents and **ERC-7683** handles cross-chain intent settlement, **SliverVine ExoMesh** operates strictly as the **Pre-Consensus Risk Engine (V8/Wasm Isolate)**. It intercepts high-risk micro-transactions, adverse price impact, and sandwich exploits *before* the agent signs or dispatches payments to the sequencer.

---

## 5-Core Venue Execution Matrix

All production lanes are protected by Wasm `checkSoilResistance()`. Pruned legacy venues retain `RESERVED_ABI_V2` bitmask holes — see [verification matrix · v1.1 Pruned Scope](./docs/03_product_verifications/01_VERIFICATION_MATRIX.md).

| Venue | Protocol | Physical Boundary Guard | CLI Demo Command |
|-------|----------|-------------------------|------------------|
| `gmx` | **GMX v2** | OI skew / PoolTVL > **0.35** · reserve < **105%** | `pnpm demo:gmx -- --trip` |
| `pendle` | **Pendle** | Oracle TTL > **60s** · yield jitter > **200 bps** · PT maturity < **7d** | `pnpm demo:pendle -- --trip` |
| `usdai` | **USD.ai** | Peg drift > **30 bps** · oracle age > **2h** | `pnpm demo:usdai -- --trip` |
| `hyperliquid` | **Hyperliquid L1** | Spread > **20 bps** · session-key rate cap | `pnpm demo:hl -- --trip` |
| `variational` | **Variational RFQ** | Quote stale > **500ms** · OLP > **15%** | `pnpm demo:variational -- --trip` |

→ SSOT: [02_CLI_DEMO_RUNBOOK.md](./docs/03_product_verifications/02_CLI_DEMO_RUNBOOK.md) · [01_architecture_and_standards/README.md](./docs/01_architecture_and_standards/README.md)

---

## ExoMesh Pre-Consensus Security Benchmark (SEPSB)

**What it is:** A measurable, reproducible benchmark for pre-consensus intent firewalls that decide transaction intent safety *before* signature release and *before* L2 sequencer ingress.

<!-- SSOT:README_SEPSB_TABLE_START -->
| Metric | Target | Achieved (SSOT) |
|--------|--------|-----------------|
| Reflex Latency (p50) | ≤ 20µs | **1.283µs** (Wasm) |
| Reflex Latency (p99) | ≤ 50µs | **6.102µs** (Wasm) |
| End-to-End Edge Latency (p50) | ≤ 120µs | p50 ~106µs |
| True Positive Rate (TPR) | ≥ 99.5% | **100%** |
| False Positive Rate (FPR) | ≤ 0.5% (kill-switch) | **0%** |
| Observatory Paradox Mis-block Count | 0 | **0** |
| 5-Venue Reflex Cap | < 50µs | **<undefinedµs** (undefined) |
<!-- SSOT:README_SEPSB_TABLE_END -->

**Verification:**

```bash
pnpm audit:sepsb    # Run full SEPSB benchmark & export JSON snapshot
```

**Audit artifacts:** [SEPSB_BENCHMARK_SSOT.json](./docs/audit/SEPSB_BENCHMARK_SSOT.json) · [SEPSB_CORPUS_SNAPSHOT.json](./docs/audit/SEPSB_CORPUS_SNAPSHOT.json) · weekly CI via [.github/workflows/weekly-sepsb-deploy.yml](./.github/workflows/weekly-sepsb-deploy.yml)

<!-- SSOT:README_DUAL_TELEMETRY_START -->
> 💡 **Dual Telemetry Architecture**:
> - **[Dune Operational Shield](https://dune.com/silvervinelabs/slivervine-protocol)** (`/slivervine-protocol`): **Modeled Simulation Telemetry (Backtested Chaos Matrix Replay)** (`pnpm export:dune` · 577-row · **$13.49M** simulated loss prevented · **$136.25** gas saved · NOT a Mainnet Live Feed).
> - **[Dune SEPSB Stress Matrix](https://dune.com/silvervinelabs/slivervine-sepsb-stress)** (`/slivervine-sepsb-stress`): Deterministic benchmark runner proving 100% TPR, 0% FPR, and sub-50µs Wasm reflex speeds across undefined venues (GMX, Pendle, USD.ai, Hyperliquid, Variational).

> 🔗 **Live On-Chain Gate Attestations**: `SliverVineGate` (One [0x71d7…e2f1](https://arbiscan.io/address/0x71D7d26f98110c5DE3df0fCbddCf2A3A2BC6e2f1) · Sepolia [0xc66f…8959](https://sepolia.arbiscan.io/address/0xc66F96611a737c4e58706D0955594456eAb88959)) · 5-row (`pnpm export:dune:onchain` · ExoMesh solidity/stylus + Sanctuary gate · Arbiscan-verifiable tx hashes).
<!-- SSOT:README_DUAL_TELEMETRY_END -->

### 🔗 Relation to Industry Standards (x402, ERC-7683 & Simulation Engine)

- **Orthogonal to x402 (HTTP 402)**: x402 defines agent payment *intent dispatch* over HTTP 402; ExoMesh is the **pre-sign / pre-sequencer risk gate** — not a payment rail — blocking poisoned liquidity and oracle-drift traps on automated micro-payments before wallets sign.
- **Orthogonal to ERC-7683**: ERC-7683 defines cross-chain intent *settlement & solver formats*. SliverVine ExoMesh operates strictly *before* settlement, acting as a sub-microsecond pre-consensus firewall before signatures enter solver/sequencer pipelines.
- **Complementary to Simulation Scanners**: While simulation tools (e.g. Blockaid) take 100–300ms via cloud RPC, SEPSB targets microsecond-class local/edge WASM decisions with 0-Gas rejected paths.

---

## Standards Compliance — 3-Tier EIP/ERC Taxonomy

> **Engineering honesty:** SliverVine is an **Off-Chain Client/Edge Pre-Consensus Intent Firewall**. Read the **Status** column before citing any EIP/ERC claim.

| Tier | Status Label | Standards | Narrative |
| ---- | ------------ | --------- | --------- |
| **1** | `[Final]` | **EIP-1193+** · **EIP-5792** · **ERC-7540+** | **100% compliant** with standard specs, extended into **0-Gas pre-consensus security supersets** (ExoMesh & Sanctuary) |
| **2** | `[De-facto Industrial Draft]` | **ERC-7683** (Uniswap/Across) · **ERC-7579** (ZeroDev/Rhinestone) | **Semantic alignment** — not normative Final conformance; production code maps to industrial draft problem spaces |
| **3** | `[Unrelated Draft — Not Implemented]` | [EIP-8105](https://eips.ethereum.org/EIPS/eip-8105) · [EIP-8079](https://eips.ethereum.org/EIPS/eip-8079) · [ERC-8226](https://eips.ethereum.org/EIPS/eip-8226) · [ERC-8118](https://eips.ethereum.org/EIPS/eip-8118) | **No implementation claim** — see [wiki · Conceptual Industry Alignment Targets](./docs/01_architecture_and_standards/02_eip_standards/01_EIP_COMPLIANCE_AND_COMPETITIVE_MATRIX.md) |

## Performance Verification & Latency Hierarchy

| Tier | Metric | Scope | Canonical Verification Command |
|------|--------|-------|-------------------------------|
| **Pure Invariant Math** | **~0.5µs–1.1µs** | Isolated `checkSoilResistance()` — no async I/O | CLI HUD `Pure Invariant Time` row |
| **Stylus ReflexCore (SSRC)** | **p50 ~15µs** | `rootProtection()` · `severSigningChannel()` · `soil_core.wasm` | `pnpm demo:gmx -- --trip` |
| **E2E ExoMesh Edge** | **p50 ~106µs** | Cloudflare Worker + TS Gateway + SSRC FFI | `pnpm demo:gmx` |
| **Worker bundle (hot-path)** | **40.5 KiB gzip** | 111.19 KiB raw · `limitKiB: 150` · pass | `pnpm bundle:measure` |

*Zero-Allocation Hot-Path:* Pre-allocated **256×4 ring slab** achieves `<16 KiB` heap delta over 10,000 iterations — `npx vitest run tests/core/intent-sinking-audit.test.ts`.

---

## Installation & Quickstart

```bash
pnpm install
```

> ℹ️ **Buildathon Audit Note**: `@slivervine/exomesh-agentic-wallet-guard` is currently loaded via local workspace packages (`private: true`) for reproducible evaluation. NPM public registry distribution is scheduled post-grant.

Import the SDK from the monorepo workspace (not npmjs):

```ts
import { withRetailGuardProvider } from "@slivervine/exomesh-agentic-wallet-guard";
```

---

## 🧪 Verification

```bash
pnpm exec tsc --noEmit

# Run SDK & Risk Engine test suite
pnpm test
```

---

## Quick Verification Reference

```bash
# Tier 0 — Fully Demo (Flagship · Module A + B · Scenario A–D)
pnpm demo:exomesh                 # EIP-1193+ Agentic Guard · interactive Scenario A–D matrix
pnpm demo:exomesh -- --json       # CI / Dune structured output

# Tier 1 — 5-Venue Fast-Track Proofs (0-Gas FAIL_CLOSED)
pnpm demo:gmx -- --trip           # GMX v2 FAIL_CLOSED proof
pnpm demo:pendle -- --trip        # Pendle Institutional Sentinel FAIL_CLOSED proof
pnpm demo:usdai -- --trip         # USD.ai Collateral FAIL_CLOSED proof
pnpm demo:hl -- --trip            # Hyperliquid Session Guard FAIL_CLOSED proof
pnpm demo:variational -- --trip   # Variational RFQ FAIL_CLOSED proof

# Tier 2 — Specific Standards & Strategy Use Cases
pnpm demo:sanctuary               # Module B · ERC-7540+ Async Vault Escort (Scenario A–C · `--json`)
pnpm demo:ingress                 # Module B · Across/Robinhood AML Compliance Ingress (Scenario A–C · `--json`)
pnpm demo:delta-neutral           # Multi-venue delta-neutral hedge lifecycle (`--zerodev=on` default · `--json`)
pnpm demo:delta-neutral -- --zerodev=off  # Native EIP-1193 signer (AA disabled)

# Unit Verification & Full Test Suite
npx vitest run tests/sdk/retail-guard-provider.test.ts  # 35/35
<!-- SSOT:README_TEST_CMD_START -->
pnpm test -- --run                                       # 254 files | 1206 PASS
<!-- SSOT:README_TEST_CMD_END -->
pnpm run audit:security                                  # 3-Axis: 5/0/0 PASS
pnpm audit:sepsb                                         # SEPSB benchmark + corpus snapshot
```

---

## Documentation Hub

| Priority | Document | Purpose |
|----------|----------|---------|
| **1** | [JUDGE_BRIEF.md](./JUDGE_BRIEF.md) | 30-second scorecard |
| **2** | [01_VERIFICATION_MATRIX.md](./docs/03_product_verifications/01_VERIFICATION_MATRIX.md) | CLI proof index |
| **3** | [SUBMISSION.md](./docs/00_ARB_Buildathon/SUBMISSION.md) | Technical spec entry |
| **4** | [01_SDK_INTEGRATION_BLUEPRINT.md](./docs/02_sdk_and_integrations/01_guides/01_SDK_INTEGRATION_BLUEPRINT.md) | SDK integration |
| **5** | [01_architecture_and_standards/README.md](./docs/01_architecture_and_standards/README.md) | Yellow Paper · R01–R20 |
| **6** | [01_EIP_COMPLIANCE…](./docs/01_architecture_and_standards/02_eip_standards/01_EIP_COMPLIANCE_AND_COMPETITIVE_MATRIX.md) | EIP/ERC taxonomy |
| **7** | [03_DUNE_DASHBOARD_SPECIFICATION.md](./docs/01_architecture_and_standards/03_telemetry_and_mo/03_DUNE_DASHBOARD_SPECIFICATION.md) | **Module A/B** Dune telemetry · [modeled replay dashboard](https://dune.com/silvervinelabs/slivervine-protocol) (NOT Mainnet live PnL) |

**Protocol & Entity:** SilverVine Labs · `grants@silvervinelabs.com` · Apache-2.0 SDK · BUSL-1.1 contracts → [LICENSE](./LICENSE)

---

## 🛡️ Honesty & Operational Boundaries

| Dimension | Current State | Target / Roadmap |
| :--- | :--- | :--- |
| **Admin Multisig** | Bootstrap Safe Admin Active | Timelock + 3/5 Multisig Governance (Post-Grant M1) |
| **Stylus Coprocessor** | EVM Assembly Fallback Active | WASM Native Stylus Deployment (Arbitrum One) |
| **Package Registry** | Private (`"private": true` in `package.json`) | Public NPM Release Post-Audit Completion |
| **Soil Probe Intercept** | Edge Wasm + Fallback Gateway | 100% On-Chain Hard Ingress Gate Verification |
