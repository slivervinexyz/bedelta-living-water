# Grant Submission Appendix — Venue Integration Matrix · Milestones

> **Lean submission:** [SUBMISSION.md](./SUBMISSION.md) · **Hub:** [../03_product_verifications/01_VERIFICATION_MATRIX.md](../03_product_verifications/01_VERIFICATION_MATRIX.md)  
> **Live address SSOT (2026-09-17):** [02_CONTRACT_DEPLOYMENT_MATRIX.md](../01_architecture_and_standards/01_core_specs/03_CONTRACT_DEPLOYMENT_MATRIX.md) · [src/config/contract-deployments.ts](../../src/config/contract-deployments.ts). **Migration:** ExoMesh redeploy — wire live addresses only; legacy Sanctuary-era → [03_SUPERSEDED_DEPLOYMENTS_APPENDIX.md](../01_architecture_and_standards/01_core_specs/05_SUPERSEDED_DEPLOYMENTS_APPENDIX.md).

## Executive Summary & One-Page Strategic Memo

**Official positioning:** Sub-ms 0-Gas Pre-Broadcast ExoMesh Intent Firewall & Risk Navigator for AI Agents on Arbitrum — see metadata table above.

| Judge pointer | SSOT document |
|---------------|---------------|
| Hybrid Pillar Sets X & Y · R01–R20 | [Architecture index §01–03](../01_architecture_and_standards/README.md) · [Hybrid Pillar Sets X & Y](../01_architecture_and_standards/01_core_specs/01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md) · [Defense Matrix](../01_architecture_and_standards/01_core_specs/02_DEFENSE_MATRIX_AND_SSRC_CORE.md) |
| CLI Tier 0–5 verification | [Verification Matrix](../03_product_verifications/01_VERIFICATION_MATRIX.md) |
| Dune telemetry · SQL panels | [Dune Dashboard Specification](../01_architecture_and_standards/03_telemetry_and_mo/03_DUNE_DASHBOARD_SPECIFICATION.md) |
| Pendle × GMX cross-guard | [§ Core Risk Decision Matrix](#core-risk-decision-matrix-evaluatependlegmxcrossguard) · [pendle-gmx-cross-guard.ts](../../src/guards/pendle-gmx-cross-guard.ts) |
| [ERC-8196](https://eips.ethereum.org/EIPS/eip-8196) (Final) agent policy | [Technical Specification §0.1](../01_architecture_and_standards/01_core_specs/01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md) |
| Institutional DD / Basel mapping | [Due Diligence Memorandum](../01_architecture_and_standards/01_core_specs/04_RISK_MITIGATION_AND_DISCLAIMER_FRAMEWORK.md) |
| Market & security imperative | [Market & Security Imperative](../03_product_verifications/04_MARKET_AND_SECURITY_IMPERATIVE.md) — Apollo / Navier research · Elevator metaphor |
| **80/20 boundaries & post-grant R&D** | [Risk Spectrum §0.1](../01_architecture_and_standards/01_core_specs/04_RISK_MITIGATION_AND_DISCLAIMER_FRAMEWORK.md) · [§ Pre-Broadcast Defense Mesh](#pre-broadcast-defense-mesh-12-post-grant-rd-roadmap) · [JUDGE_BRIEF.md](../../JUDGE_BRIEF.md) |
| **EIP / ERC end-to-end workflow** | [§ Standards Workflow — Judge Quick Path](#eip-erc-standards-workflow-judge-quick-path) |

Built on the BeDelta Living Water v1.0 · SSRC (p50 ~106µs), [@slivervine/exomesh-agentic-wallet-guard](../../docs/02_sdk_and_integrations/01_guides/01_SDK_INTEGRATION_BLUEPRINT.md), and consume-once EIP-712 Gate attestation — SliverVine intercepts AI trade intents **before** mempool or bundler ingress. Deep narrative: [Problem / Solution](#the-problem) · [Standards Workflow](#eip-erc-standards-workflow-judge-quick-path) · [Venue Integration Matrix](#venue-integration-matrix).

---

<a id="eip-erc-standards-workflow-judge-quick-path"></a>

## EIP / ERC Standards Workflow — Judge Quick Path

> **Authority chain:** [SUBMISSION.md](./SUBMISSION.md) (lean authoritative spec) → **this section** (simple E2E flow + per-standard detail) → [Yellow Paper §1.6](../01_architecture_and_standards/01_core_specs/01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md) · [EIP Compliance Matrix](../01_architecture_and_standards/02_eip_standards/01_EIP_COMPLIANCE_AND_COMPETITIVE_MATRIX.md).

SliverVine is **not** a single EIP. Judges should read **two lanes** — **Lane A (Module A · ExoMesh)** is the primary Buildathon verification path; **Lane B (Module B · Sanctuary)** is the treasury-escort complement.

### Lane A — Module A: ExoMesh Pre-Consensus (primary judge path)

```text
[Cerebrum] LLM / agent plans intent (~1–10s)
        │
        ▼
[EIP-1193] withRetailGuardProvider() — eth_sendTransaction · eth_signTypedData_v4 · wallet_sendCalls (EIP-5792)
        │  ← intercept BEFORE wallet signs or RPC broadcasts
        ▼
[SSRC Wasm] checkSoilResistance()  (p50 ~106µs PASS · p50 ~15µs FAIL_CLOSED · 0 gas on reject)
        │ FAIL ──► severSigningChannel() · RetailGuardRejectedError · tx never reaches RPC
        ▼ PASS
[EIP-712] RiskAttestation · domain SliverVineExoMesh · SliverVineGate 0x71D7… verifyAndConsume (consume-once)
        │
        ▼
[ERC-8196] PolicyGuardV2 0x5df192… — on-chain agent-policy pre-screen (fleet / UserOp paths)
        │
        ▼
[Venue guards] GMX v2 · HL · Pendle · Variational · USD.ai — broadcast or session-key execution
```

| Phase | Standard | Role | Entry / anchor | Verify |
|-------|----------|------|----------------|--------|
| 0 | — | Intent formation | LLM / agent tool loop | — |
| 1 | **[EIP-1193](https://eips.ethereum.org/EIPS/eip-1193)** | C-End wallet middleware | `withRetailGuardProvider()` · [provider.ts](../../src/sdk/exomesh-agentic-wallet-guard/provider.ts) | `npx vitest run tests/sdk/retail-guard-provider.test.ts` **35/35** |
| 1b | **[EIP-5792](https://eips.ethereum.org/EIPS/eip-5792)** | `wallet_sendCalls` batch unfold | [eip5792-send-calls.ts](../../src/sdk/exomesh-agentic-wallet-guard/eip5792-send-calls.ts) | `eip5792-send-calls.test.ts` **3/3** |
| 2 | **SSRC Wasm** | 0-Gas pre-broadcast soil fuse | `checkSoilResistance()` · [pkg/soil_core.wasm](../../pkg/soil_core.wasm) | `pnpm demo:gmx -- --trip` |
| 3 | **[EIP-712](https://eips.ethereum.org/EIPS/eip-712)** | Consume-once typed-data attestation | `SliverVineGate` · domain **`SliverVineExoMesh`** · `consumed[digest]` | Foundry [SliverVineGate.t.sol](../../SliverVineGate/test/SliverVineGate.t.sol) |
| 4 | **[ERC-8196](https://eips.ethereum.org/EIPS/eip-8196)** | Agent policy pre-validation | `PolicyGuardV2` [0x5df192…774bc](https://arbiscan.io/address/0x5df192f9454fd02a89e768632cb5da0762a774bc) | Mainnet wired · Forge suite |
| 5 | **[ERC-7579](https://eips.ethereum.org/EIPS/eip-7579)** *(opt-in AA)* | **v1.0 shipped:** pre-UserOp oracle read + scoped session-key gates (off-chain). **Post-grant:** TYPE-4 Kernel `installModule` hook pilot. | `SliverVineRiskOracle` (Sepolia) · `risk-oracle-gate.ts` · ZeroDev Kernel v3 adapter | `pnpm test:zerodev` (mock dry-run) · `pnpm demo:ingress` Route C |

**Optional B2B appendix (not judge-primary):** `withExoMeshShield()` · `verifyAgentIntent()` — [decorator.ts](../../src/sdk/decorator.ts) · server-side execution hook · same `checkSoilResistance()`. High-frequency M2M reflex may use **HMAC session proof** on the sub-ms plane; **EIP-712 ECDSA** is reserved for human / on-chain settlement ([Yellow Paper §6.6](../01_architecture_and_standards/01_core_specs/01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md)).

**SDK vs SKU (judge clarity):** Industry alignment is **EIP/ERC**. **`@slivervine/exomesh-agentic-wallet-guard`** is the Apache-2.0 **SDK** integration surface. **SKU** in [SUBMISSION.md](./SUBMISSION.md) labels the **evaluable C-End product unit** (Wallet Guard **35/35**) — not a separate protocol standard.

### Lane B — Module B: Sanctuary Treasury Escort (complement)

```text
[Ingress] Robinhood / Across 4663→42161 (unidirectional outbound escort)
        │
        ▼
[Compliance] inbound AML contamination BLOCK at ingress firewall
        │
        ▼
[ERC-7540+] async vault escort · operator whitelist · pending→claimable drift guard
        │
        ▼
[Settlement] Arbitrum One treasury / GM vault lanes (Wallet B deposit/withdraw only)
```

| Standard | Role | Verify |
|----------|------|--------|
| **[ERC-7540](https://eips.ethereum.org/EIPS/eip-7540)** | Async vault operator escort · `lostUsd ≡ 0` invariant | `pnpm demo:sanctuary` |
| **[ERC-7683](https://eips.ethereum.org/EIPS/eip-7683)** *(orthogonal)* | Cross-chain intent scrub before solver acceptance | `pnpm demo:ingress` |

> **Scope honesty:** Module B escorts **treasury / vault capital** — it is **not** a generic AI trading API. C-End judges should start with **Lane A**.

### Plane A / B (Edge vs Nitro — same intent, different phase)

| Plane | Runtime | When | Latency / gas |
|-------|---------|------|---------------|
| **A — Edge pre-consensus** | Cloudflare Worker + `soil_core.wasm` | Before sign / broadcast | p50 ~106µs · **0 gas** on reject |
| **B — On-chain Nitro** | Stylus coprocessor + `SliverVineRiskOracle` | Inside sequencer block execution | ~313 gas modeled vs naive EVM path |

Full ASCII: [Yellow Paper §1.6](../01_architecture_and_standards/01_core_specs/01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md).

### Out of v1.0 live path (do not wire integrators here)

| Item | Status |
|------|--------|
| EIP-712 domain `SliverVineExoMesh` | **Superseded** — legacy Gate `0xb174…` only · [appendix](../01_architecture_and_standards/01_core_specs/05_SUPERSEDED_DEPLOYMENTS_APPENDIX.md) |
| ERC-7715 advanced permissions | **Post-grant design spec** — not shipped v1.0 |
| Paid API / subscription tiers | **Not in v1.0 submission** — public open gateway (`X-SliverVine-Tier: public` · 5 RPS) only |

**Wallet-level capital flow (live mainnet):** [Production Workflow](#production-workflow-live-mainnet-ssot) below · [PRODUCTION_WORKFLOW_DEEP_DIVE.md](../PRODUCTION_WORKFLOW_DEEP_DIVE.md).

---

### The Problem

AI Trading Agents combine dynamic yield tokens (e.g., Pendle PTs), high-leverage perpetuals (e.g., GMX), and cross-chain liquidity into automated strategies. However, existing risk controls are either reactive (on-chain liquidation after damage is done) or coarse "transaction blockers" that fail to distinguish between **risk-expanding** and **risk-reducing** actions. Blocking a de-leveraging transaction during volatility traps the AI agent in a high-risk position, accelerating forced liquidation (The Observatory Paradox).

* **Real-World Exploit Context**: Autonomous AI Agents on Arbitrum and Base (e.g., Virtuals ecosystem agents & Clanker smart accounts) face unmitigated pre-broadcast vulnerabilities, where prompt injections and sandwich bots exploit execution latency, leading to unauthorized trade execution and slippage losses before mempool confirmation.

### The Solution: Intent-Aware Risk Navigation

SliverVine shifts risk management from "naive blocking" to **Intent-Aware Navigation**:

1. **Observability**: Real-time monitoring of Pendle PT yield jitter/expiry dynamic fees, GMX maintenance margin buffers, and liquidity depth — [Pendle registry SSOT](../../src/adapters/pendle/pendle-pt-registry.ts) · [Technical Specification §1](../01_architecture_and_standards/01_core_specs/01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md).
2. **Intent Taxonomy**: Directional division separating `RISK_INCREASE` (`open`/`increase` → strict Fail-Closed evaluation) from `RISK_DECREASE` (`close`/`reduce` → greenlighted with safety routing) — [§ Core Risk Decision Matrix](#core-risk-decision-matrix-evaluatependlegmxcrossguard).
3. **Shadow Margin Engine**: Pre-execution PT exit proceeds vs GMX maintenance margin — [pendle-gmx-cross-guard.ts](../../src/guards/pendle-gmx-cross-guard.ts) · [Technical Specification §3.1](../01_architecture_and_standards/01_core_specs/02_DEFENSE_MATRIX_AND_SSRC_CORE.md).

### Why SliverVine ExoMesh (Module A) is NOT a Normal RPC Gateway (Cerebrum vs. Cerebellum)

**SliverVine ExoMesh (Module A)** is the **Cerebellum & Reflex Arc** — the LLM **Cerebrum** plans; ExoMesh **Cerebellum** executes involuntary safety reflexes before EIP-712 signing via ReflexCore (SSRC).

```
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

| Dimension | Normal RPC Gateway | SliverVine ExoMesh (SSRC) |
|-----------|-------------------|-----------------------------|
| **Role** | Transport relay | Involuntary safety reflex |
| **Latency** | 50–300ms+ RTT (transport) | **p50 ~15µs – p50 ~106µs** (0.015ms–0.106ms) vs LLM **~1.0s–10.0s** reasoning loop |
| **On hallucination** | Forwards calldata | **0-Gas FAIL-CLOSED** · `severSigningChannel()` |
| **AI safety** | Unprotected | Out-of-scope cross-chain venue (e.g. Base / **Aerodrome**) severed in **p50 ~15µs** |

**Fail-Closed walkthrough:** Cerebrum drifts into **cross-chain intent hallucination** — routing to **Aerodrome** (legitimate Base-native protocol) while policy authorizes only Arbitrum One's **7-protocol matrix**. Aerodrome is **out-of-scope**, not malicious; ExoMesh's Cerebellum triggers **p50 ~15µs** physical deadlock, severing EIP-712 **before** any cross-chain or unvetted execution → reproduce via `npx vitest run tests/sdk/retail-guard-provider.test.ts` · `pnpm demo:gmx -- --trip`.

### Legal & Regulatory Positioning

> **DISCLAIMER**: SliverVine Protocol provides software-based risk analytics, monitoring, policy enforcement, and execution-safety tooling only. It does NOT provide asset custody, underwriting, indemnity, reimbursement, profit guarantees, uptime SLAs, or any form of insurance-like coverage. All risk decisions are algorithmic and based on user-defined policy parameters and protocol-aware market signals. v1.0 submission publishes **no pricing, subscriptions, or paid API tiers** — see [Commercial Posture (v1.0)](#commercial-posture-v10).

---

<a id="pre-broadcast-defense-mesh-12-post-grant-rd-roadmap"></a>
<a id="88-defense-mesh-12-post-grant-rd-roadmap"></a> <!-- legacy redirect -->

## Pre-Broadcast Defense Mesh & Post-Grant R&D Roadmap

> **Modeled risk partition (SSOT):** [Risk Mitigation & Disclaimer Framework §0.1](../01_architecture_and_standards/01_core_specs/04_RISK_MITIGATION_AND_DISCLAIMER_FRAMEWORK.md) — **100%** modeled on-chain risk surface = **88%** pre-broadcast interception mesh + **12%** insurmountable systemic residuals (**not** a measured live interception rate) · **80/20 Pareto** (microstructure loss concentration) targets the acute 20% tail within Pillar Set Y · judge-verifiable: **FW-01–16** status table · **255/255** fail-closed chaos · `pnpm demo:FW-xx` / `pnpm demo:gmx -- --trip`.

### Industry Baseline (~80% or Below)

Traditional DeFi / Agent risk checks rely on **post-hoc analytics** or **mutable pause functions**, leaving exploitable gaps for MEV sandwiching, LLM retry token-burn, and session-key blast-radius expansion.

### Pre-Broadcast Defense Coverage (Modeled · §0.1)

| Layer | Defense |
|-------|---------|
| 🟢 **Sub-ms Pre-Broadcast Severance** | 0-Gas Wasm soil fuse (`checkSoilResistance()` p50 ~106µs) blocks MEV & toxic fills **before** mempool / Sequencer queues |
| 🟢 **AI Behavioral Safety Substrate** | **60s LLM cooldown lock** prevents token-burning infinite retry loops; **dynamic ±2–5 bps jitter** prevents MEV threshold sniping ([decorator.ts](../../src/sdk/decorator.ts) · [soil-threshold-jitter.ts](../../src/services/risk-control-lib/soil-threshold-jitter.ts)) |
| 🟢 **0-Proxy Immutable Gate** | No admin upgrade backdoors; EIP-712 consume-once attestation (`consumed[digest]`) on live **Arbitrum One** Gate |
| 🟢 **Session Key Blast-Radius Isolation** | Scoped `ORDER_EXECUTE` + **$5,000** notional cap · **v0.95 replay guard** — consume-once nonce + `expiresAt` (`5829e9a`) | `executeHlSessionKeyOrder` |
| 🟢 **Oracle & RPC Resilience** | **30s** oracle-lag fail-closed (`ORACLE_LAG_DEADLOCK` / `ORACLE_LAG_DEADLOCK_MS = 30_000`) + **Honeypot trap RPC** defense (`evaluateRpcDefenseGate()` · 99% synthetic slippage decoy) |

> **Engineering scope boundary:** ExoMesh is a **pre-consensus intent firewall**, not a universal risk insurer. V1.0 models pre-broadcast mesh coverage (**88%** partition per §0.1) with a disclosed **12%** systemic residual tail — see [Risk Framework §0.1](../01_architecture_and_standards/01_core_specs/04_RISK_MITIGATION_AND_DISCLAIMER_FRAMEWORK.md).

### Systemic Residual Tail (**12%** modeled · Post-Grant R&D)

Residual systemic out-of-scope risks: **TEE enclave supply chains**, **multi-RPC eclipse consensus**, and **protocol-level DeFi flash-loan black swans** on external venues (GMX / Hyperliquid).

Grant allocation directly fuels our **post-grant R&D roadmap**:

1. **Fleet Policy + Policy Studio + block certificate (V1.5 SKU)** — one ERC-8196 policy hash per fleet · structured mandate compile · deterministic block certificates for audit / PEV. NL compiler-only.
2. **TEE / Enclave Hardware Key Isolation** — AWS KMS / SGX Enclaves beyond Bootstrap Ignition Keys.
3. **Multi-RPC Quorum Consensus Verification** — Protecting against RPC eclipse spoofing before Wasm evaluation.
4. **Decentralized PEV (Prevented Exploit Volume) Intelligence Feed** — Real-time Dune telemetry into decentralized agent alert networks.

### Variational RFQ Engine: Zero-Allocation Coprocessor

> **Status:** Blueprint + **V1.0 hot-path module** landed — [variational-instrument-guard.zero.ts](../../src/guards/variational-instrument-guard.zero.ts) · full Stylus/Wasm lane wiring is post-grant.

SliverVine models **TradFi Total Return Swaps** and **crypto perpetuals** as distinct instrument lanes inside the same Variational RFQ envelope. The reflex core must not allocate on the hot path — memory slabs are pre-sized for C/Rust `soil_core.wasm` FFI alignment:

| Slab | Role | Zero-alloc contract |
|------|------|---------------------|
| `FlatQuoteInput` | Caller-owned numeric quote (instrument type, carry bps, funding vol, OLP depth) | Plain struct — no nested objects on hot path |
| `SoilResultSlot` | Mutated in-place by `evaluateSwapPerpSoilZero` | `action` · `reason` · `flags` · `hintInstrument` — stable numeric ABI |
| `ACTION` / `REASON` constants | Wasm / host parity | Materialize strings only via cold-path `reasonToString()` |

**TradFi TRS lane (SWAP):** flat carry ceiling **8%** · fail-closed when swap market hours are closed · dividend pass-through modeled as carry, not funding volatility.

**Crypto perp lane (PERP):** funding volatility **>80 bps** → fail-closed with **SWAP** hint — steers agents toward TRS when perp funding is toxic.

**Memory efficiency:** Hot path writes only into caller-provided `SoilResultSlot`; aligns with `SOIL_LANE_SCRATCH` / `wasm-soil-ffi.ts` reusable buffers — **one FFI round-trip**, no ephemeral `Float64Array` per intent on the reflex arc.

**Verification:** `npx vitest run tests/guards/variational-instrument-guard.zero.test.ts` · architecture SSOT: [01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md](../01_architecture_and_standards/01_core_specs/01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md).

**V1.0 production scope:** Ephemeral Ignition Signers (`0x1111…`/`0x2222…`) on Mainnet Gate · GMX v2 dry-run/Vitest pre-flight guards · **GM Pool I/O channel CLOSED on 42161** (deposit [0xe3155220…](https://arbiscan.io/tx/0xe3155220e464c375329838bb5ca8498226b8c8fa32c11929b7605070f7be4774) · withdraw [0xfd3601dc…](https://arbiscan.io/tx/0xfd3601dce5c2407d371186d8a24829994547ec8810f4a20c3e798d2fb67ae410)) · **Pendle Institutional Safety Sentinel** + **Pendle AI Guarded Pool Factory** · **EIP-1193 Retail Guard SDK** + **5-Core Venue guards** · Stabilizer Sepolia · Dune Sepolia live stream + 42161 SQL pre-compiled · **public open gateway** (`X-SliverVine-Tier: public` · 5 RPS) · Stylus dual-execution coprocessor (`pnpm build:stylus`; EIP-1967 upgradeable proxy path) · **automated R20 severance on `FLAGS_*` trips** · **30s sliding-window pending OI defense** · Monte Carlo 87.39% toxic flow blocked (10,000-run simulation; nominal modeled capital).

---

## Architectural SSOT & Hardened Metrics

* **Test Suite**: **254 test files | 1206 PASS clean (100%)** — re-run `pnpm test -- --run` to confirm. Full matrix: [Verification Matrix](../03_product_verifications/01_VERIFICATION_MATRIX.md).
* **Dual-Demo Architecture**: **`pnpm demo`** — 12 Dual Pillar Set X & Y ANSI scenarios (GMX v2 price impact / Data Streams lag / delever · HL EIP-712 session key / WS stale / GateLockout · Pendle AI guarded pool / 60s TTL stale oracle) · zero-I/O sync hot-path **p50 ~106µs** · **`pnpm demo:delta-neutral`** — **4-step Happy Path** macro cross-venue lifecycle (`--unwind` · `--trip` optional) · **`npx vitest run tests/sdk/retail-guard-provider.test.ts`** — EIP-1193 Retail Guard SDK (35/35 PASS).
* **Formal Verification**: Consume-once and replay-denial invariant lemmas 100% code-verified via native Foundry test suite ([SliverVineGate.t.sol](../../SliverVineGate/test/SliverVineGate.t.sol) & [SliverVineGate.invariant.t.sol](../../SliverVineGate/test/SliverVineGate.invariant.t.sol)) · [Technical Specification §3](../01_architecture_and_standards/01_core_specs/02_DEFENSE_MATRIX_AND_SSRC_CORE.md).
* **Game-Theoretic Simulation**: 10,000 Monte Carlo runs · **87.39% toxic flow blocked** · $9.88M **nominal simulated** LP capital — [game_theory_simulation_results.json](../audit/game_theory_simulation_results.json) *(simulation only; not live savings)*.
* **Deployments (ExoMesh · 2026-09-17):** Mainnet Gate [0x71D7…e2f1](https://arbiscan.io/address/0x71d7d26f98110c5de3df0fcbddcf2a3a2bc6e2f1) · Sepolia Gate [0xc66F…8959](https://sepolia.arbiscan.io/address/0xc66f96611a737c4e58706d0955594456eab88959) · EIP-712 domain `SliverVineExoMesh` · Robinhood Chain `46630`/`4663` — [Deployment Matrix](../01_architecture_and_standards/01_core_specs/03_CONTRACT_DEPLOYMENT_MATRIX.md).
* **0-Gas off-chain severance:** ExoMesh Edge gates halt compromised payload signatures **prior to mempool submission** (off-chain demos: `pnpm demo:exomesh`). On-chain Gate anchors consume-once attestations for cleared intents.

### Core Risk Invariants (Judge Quick Reference)

$$
\Delta_{\text{net}} = \Delta_{\text{GMX\_GM}} + \Delta_{\text{HL\_Short}} \equiv 0
$$

$$
\text{lostUsd} \equiv 0 \quad \forall \text{InFlightBridgeCapital}
$$

$$
t_{\text{reflector\_p50}} \sim 106\,\mu\mathrm{s} \ll t_{\text{mempool\_broadcast}}
$$

Full derivations: [Technical Specification §3.1](../01_architecture_and_standards/01_core_specs/02_DEFENSE_MATRIX_AND_SSRC_CORE.md) · [Verification Matrix](../03_product_verifications/01_VERIFICATION_MATRIX.md) · [JUDGE_BRIEF.md](../../JUDGE_BRIEF.md).

### Multi-Wallet Cross-Venue Architecture (Wallet A × Wallet B)

SliverVine's **production delta-neutral envelope** is not a single-wallet abstraction. Two specialized wallets cooperate across venues with **zero key coupling**; the **cross-wallet hedge SSOT** ([gmx-cross-wallet-hedge.ts](../../src/services/gmx-cross-wallet-hedge.ts)) matches **GMX ETH long delta (Wallet B)** to **Hyperliquid ETH perp shorts (Wallet A)** until **Δ_net ≡ 0**. Live Worker logs: `[WALLET_B_GMX_STATE]` · `[WALLET_A_HL_STATE]` · `[CROSS_VENUE_MATCH]`. HL session-key execution is **exclusively** via `executeHlSessionKeyOrder` (legacy stubs blocked when `IS_MAINNET=true`).

#### Production Workflow (Live Mainnet SSOT)

| Plane | Wallet / Contract | Role |
|-------|-------------------|------|
| **Wallet B — GM LP Yield Vault** | `0xc9BddABD80982d2201376195DD9B85fb7951546f` | **Dedicated exclusively** to GM LP deposit/withdraw · **no** HL keys · **no** GMX perp |
| **Wallet A — Hedge Engine (Primary)** | `0xef0752df6387248B897F3A59A180af42D801960d` | Hyperliquid session-key **perp short** · 0-Gas · low latency |
| **Wallet A — Hedge Engine (Fallback)** | same | GMX v2 synthetic short via [gmx-v2-wallet-a-short-builder.ts](../../src/services/adapters/gmx-v2-wallet-a-short-builder.ts) · USDC collateral · simulate only |
| **On-Chain Settlement** (ExoMesh) | PolicyGuardV2 `0x5df192…` · Matrix `0xd840…` · RiskOracleV2 `0xc7f5…` · Gate `0x71D7…` | **Verified Live** · Stylus wired on PolicyGuardV2 · native `setPolicyGuard` on Gate |
| **Gate ↔ PolicyGuardV2 Link** | Gate `0x71D7…` → PolicyGuardV2 `0x5df192…` | **Verified Live** — setPolicyGuard [0x67507851…](https://arbiscan.io/tx/0x6750785188fe72f137dbf140b70cdd3b8094df62db1d86339194245cb0dba0ba) |
| **Wallet B Perp Isolation** | [wallet-isolation-guard.ts](../../src/core/wallet-isolation-guard.ts) | Global `WALLET_B_PERP_FORBIDDEN` on all GMX createOrder builders |

**Wallet B — Verified GM I/O (triple-proof Arbiscan):**

| Event | Tx |
|-------|-----|
| GM Deposit Multicall | [0xe3155220e464c375329838bb5ca8498226b8c8fa32c11929b7605070f7be4774](https://arbiscan.io/tx/0xe3155220e464c375329838bb5ca8498226b8c8fa32c11929b7605070f7be4774) |
| GM LP → Router Approve | [0x30ec0b7a9493f0c43edb257fd40f6d6f9258401e206357f3db7574b11071b00e](https://arbiscan.io/tx/0x30ec0b7a9493f0c43edb257fd40f6d6f9258401e206357f3db7574b11071b00e) |
| GM Withdraw Multicall | [0xfd3601dce5c2407d371186d8a24829994547ec8810f4a20c3e798d2fb67ae410](https://arbiscan.io/tx/0xfd3601dce5c2407d371186d8a24829994547ec8810f4a20c3e798d2fb67ae410) |

| Lane | Default address | Venue | Responsibilities |
|------|-----------------|-------|------------------|
| **Wallet A — Hyperliquid Short Lane** | `0xef0752df6387248B897F3A59A180af42D801960d` | Hyperliquid L1 | Perp margin · scoped **session keys** · 1× short IOC execution · cron via `runScheduledGmxHedgeCron` · GMX short **fallback builder** (simulate) |
| **Wallet B — Arbitrum Vault / GMX GM Lane** | `0xc9BddABD80982d2201376195DD9B85fb7951546f` | Arbitrum One | **GM LP I/O only** · **$2,500** ingress vault · **$2,400** GMX v2 GM LP · **+10 bps `uiFeeReceiver`** treasury rebate |

**Capital flow (Grant Happy Path narrative):**

```
User $2,500 USDC ──► Wallet B (Arbitrum)
                         ├─ $2,400 ──► GMX v2 ETH/USDC GM Pool (long leg)
                         ├─  +$2.40 ──► Protocol Treasury (uiFeeReceiver · not principal)
                         └─  $100  ──► HL L1 margin bridge
Wallet A (Hyperliquid) ◄── session-key 1× short ──► Δ_net ≡ 0
```

**Judge demo:** `pnpm demo:delta-neutral` simulates the full **multi-wallet lifecycle in one ANSI HUD** (Gatehouse → Robinhood escort → GMX deposit → HL hedge). Optional `--unwind` adds Step 5 R20 exercise; `--trip` stress-tests Step 1 soil intercept. Proof JSON is written at runtime to `docs/logging/last_e2e_run.json` (generated by `pnpm demo:delta-neutral`, not committed).

**Latency SSOT:** **p50 ~106 µs** Edge `checkSoilResistance()` · Wasm **<28kb Cloudflare budget, <60µs execution** · M2M reflex `src/core/agent-exomesh-guard.ts` &lt;12 µs. Full spec: [README.md](../01_architecture_and_standards/README.md).

### Version Roadmap SSOT (V1.0 / V1.5)

| Horizon | Status | Scope |
|---------|--------|-------|
| **V1.0** | ✅ Code-Verified Live Baseline | Arbitrum One GMX v2 ETH/USDC GM + HL 1× short · Wasm `checkSoilResistance()` p50 ~106µs · **V1.0 Direct SDK / EIP-1193 Guard** (`withRetailGuardProvider`) · optional B2B `withExoMeshShield` · 5-Core venue CLI demos · Stabilizer Sepolia sandbox · [ERC-8196](https://eips.ethereum.org/EIPS/eip-8196) (Final) policy pre-validation · EIP-712 ExoMesh Gate One [0x71D7d26f98110c5DE3df0fCbddCf2A3A2BC6e2f1](https://arbiscan.io/address/0x71d7d26f98110c5de3df0fcbddcf2a3a2bc6e2f1) · Sepolia [0xc66F96611a737c4e58706D0955594456eAb88959](https://sepolia.arbiscan.io/address/0xc66f96611a737c4e58706d0955594456eab88959) · static `GET /api/grant-audit` SHA-256 provenance archive · **public open gateway** (`X-SliverVine-Tier: public` · 5 RPS) · Worker bundle **40.5 KiB gzip** · **254 test files | 1206 PASS clean (100%)** |
| **V1.5** | ⏳ Roadmap Spec | **Fleet Policy + Policy Studio + block certificate** — one canonical [ERC-8196](https://eips.ethereum.org/EIPS/eip-8196) policy hash binds a fleet; humans compile structured mandate params (venues · notional · TTL · slippage); **NL is compiler-only, never the enforcement judge**; blocked intents emit a deterministic certificate (flags · policy hash · digest) for audit / PEV. EIP-7702 / Kernel v4 / Stage ⑦ = **onboarding plumbing**. Venue/yield extensions stay appendix. **V2.0 is not a public SKU.** |

Optional bridges (Robinhood / Across) are **Pillar Set X Reference Escort Adapters** — they do not define product identity.

---

## Ecosystem Synergy — Judge Persona Quick Map

| Ecosystem | Role for SliverVine | Why they win together | SSOT |
|-----------|---------------------|----------------------|------|
| **Arbitrum** | Pre-consensus execution primitive on **42161** | Live immutable Gate + Edge clearing before Sequencer ingress | Mainnet Tx · `SliverVineGate.sol` |
| **Pendle** | **Institutional Sentinel + AI Guarded Pool Factory** (V1.0 Pillar Set Y) | 60s TTL Oracle Fuse · 200bps Jitter Guard · `validateAIPoolSelection()` 5 Invariants · protocol-tax-free pre-execution validation | `src/adapters/pendle/pendle-market-oracle-adapter.ts` · `src/adapters/pendle/pendle-pool-factory-adapter.ts` · `src/guards/pendle-gmx-cross-guard.ts` |
| **Dune** | **PEV** + `RiskTripBlocked` telemetry | Indexes off-chain blocked attacks; Sepolia live · One SQL spec | `DUNE_DASHBOARD_SPECIFICATION.md` |
| **GMX** | Builder lane + pre-broadcast soil fuse | +10 bps `uiFeeReceiver`; blocks toxic GM intents pre-DataStore | `src/services/adapters/gmx-v2-order-payload.ts` |
| **EIP-1193 Retail Guard** | Universal C-end wallet middleware | `withRetailGuardProvider()` · 0-Gas pre-consensus intercept | `src/sdk/exomesh-agentic-wallet-guard/` · `npx vitest run tests/sdk/retail-guard-provider.test.ts` |
| **Stabilizer** | Universal Sepolia sandbox & cross-pass layer on **421614** | Stabilizer → GMX v2 → Pendle routing · identical `checkSoilResistance()` gates | `src/adapters/stabilizer/stabilizer-adapter.ts` · `pnpm demo:stabilizer` |
| **B2B Agent Decorator (optional)** | Server-side execution hook · not judge-primary | `withExoMeshShield()` · `verifyAgentIntent()` | [decorator.ts](../../src/sdk/decorator.ts) · `pnpm demo:agent` |
| **Robinhood** | Pillar Set X RWA ingress firewall | Outbound-only `46630/4663 → 42161` · **`lostUsd ≡ 0`** · inbound AML BLOCK · ArbOS Elara compatible | Unit-Verified Vitest SSOT — [tests/adapters/across-ingress-bridge.test.ts](../../tests/adapters/across-ingress-bridge.test.ts) **6/6** · [src/adapters/across-ingress-bridge.ts](../../src/adapters/across-ingress-bridge.ts) · `IngressSafetySwitch.sol` |

---

## Venue Integration Matrix

### 1. Arbitrum One / Sepolia (Core Base)

* **Lean On-Chain Gate by Design**: On-chain logic is strictly **immutable and non-custodial** (no proxy, no ETH custody) so the hot path stays on Cloudflare Edge — `checkSoilResistance()` **p50 ~106µs**. Dual-contract core: `SliverVineGate.sol` (consume-once attestation, ExoMesh Gate One `0x71D7…` · Sepolia `0xc66F…`) + [SliverVineAgentPolicyGuard.sol](../../contracts/src/SliverVineAgentPolicyGuard.sol) ([ERC-8196](https://eips.ethereum.org/EIPS/eip-8196) (Final) agent-policy validation).
* **Mechanism**: Intercepts AI Trade Intents in the sub-millisecond off-chain pipeline (`src/core/agent-exomesh-guard.ts`), validating soil fuse + deadman switch before settlement-layer EIP-712 (`SliverVineExoMesh` domain) (0-Gas Fail-Closed).

### 2. Robinhood Chain (Chain ID: 46630 / 4663) — Pillar Set X RWA Ingress Firewall

* **Arbitrum H1 2026 alignment:** Permissioned **RWA capital escort** from Robinhood Chain (`46630` testnet · `4663` **production mainnet ingress**) into **Arbitrum One (`42161`)** via Pillar Set X Compliance Ingress Firewall — institutional treasuries ingress without naked delta or phantom loss booking.
* **Live Mainnet Smart Route (4663 → 42161 · precedent):** ZeroDev Kernel v3 UserOp Hash `0x7b72ee9f4dc3f32f08a5de914ecf076c243d895522ecd72d17a2f7b025bc956d` · Verified Tx [0x4c4ca1362d4a50d4684662e633e728401478c29dbef13f49e109e68253b5964a](https://arbiscan.io/tx/0x4c4ca1362d4a50d4684662e633e728401478c29dbef13f49e109e68253b5964a) · Harness `pnpm tsx scripts/execute-smart-route-live-demo.ts`
* **Live Testnet Baseline (46630 · 2026-09-21):** Tier1 Smart Route `46630→42161` · Tx [0xdca66358…2a2f](https://arbiscan.io/tx/0xdca66358ffb9a2463d1069722ea27dcfabe1d374dc1d5264698c74341bb02a2f) · Tier2 native escort [0x4574c97f…fcf6](https://explorer.testnet.chain.robinhood.com/tx/0x4574c97ff91b5321c3281c535577a1a55908f4e92de8c3ecb55433e94735fcf6) · inbound B1/B2/B3 JSON (**0 broadcast**) · [ROBINHOOD_LIVEFIRE_ARTIFACTS.md](../logging/ROBINHOOD_LIVEFIRE_ARTIFACTS.md)
* **Live Mainnet Tier2 (4663 · 2026-09-21):** Native escort attestation · Tx [0x02ced821…951d](https://explorer.chain.robinhood.com/tx/0x02ced8215cb1a9f6ec1b82dd39e01536991f278967d63c63dc29bde2ef6d951d) · UserOp `0x9ce020ba389e59aee46e1e3520acf2e48f760a3e76ec1f9ddac74c47c0ecbfea` · Harness `pnpm probe:rchain-mainnet` · stub attestation · `bridgeDeployed: false` · **not** production buffer verified
* **Integration**: Pillar Set X Ingress Bridge Adapter (`src/adapters/across-ingress-bridge.ts`) & R20 Circuit Breaker Sever Pipeline (`src/services/root-protection-lib/circuit-breaker-sever.ts`) · on-chain **`IngressSafetySwitch.sol`** AML oracle flush.
* **Mechanism**: **Optional Pillar Set X Reference Escort Adapter** (not the protocol identity). Outbound `46630`/`4663` → `42161` only; inbound `42161` → Robinhood → **`AML_INBOUND_TO_ROBINHOOD_BLOCKED`**. **Pending-Capital Recognition Invariant:** **`lostUsd ≡ 0`** on `IN_FLIGHT_BRIDGE_CAPITAL` until explicit `SETTLED` or `BRIDGE_TIMEOUT_FAIL_CLOSED` (>1h). When deadlock condition R20 is triggered, `severSigningChannel()` immediately severs hot-key signature pipelines, locking the engine into read-only observer mode.

### 3. Pendle Finance (V1.0 Live · Pillar Set Y)

V1.0 ships **two complementary Pendle integrations** — institutional safety layer, not a yield product:

**1. Pendle Institutional Safety Sentinel** — 60s TTL Oracle Fuse & 200bps Jitter Guard

* ExoMesh operates as an **institutional pre-execution safety layer** for existing PT/YT exposure — **60s TTL Oracle** with **`PENDLE_ORACLE_STALE`** soil fuse · expiry **<7d** + yield jitter **>200 bps** → fail-closed
* **Dynamic Market Oracle** ([pendle-market-oracle-adapter.ts](../../src/adapters/pendle/pendle-market-oracle-adapter.ts)): zero-I/O sync `ingest()` / `resolve()` in-memory cache · **TTL default 60s**
* **Cross-Guard** ([pendle-gmx-cross-guard.ts](../../src/guards/pendle-gmx-cross-guard.ts)): Shadow Margin vs GMX maintenance · Observatory Paradox fix (`close`/`reduce` greenlit)
* **Expiry Guard** ([pendle-pt-expiry-guard.ts](../../src/adapters/pendle/pendle-pt-expiry-guard.ts)): `evaluatePendlePtExpiryRiskFromRegistry`
* Defends PT/YT expiry blackholes and oracle decoupling — **not a Pendle YT competitor**

**2. Pendle AI Guarded Pool Factory** — 5 Invariants via `validateAIPoolSelection()`

* **Adapter SSOT** ([pendle-pool-factory-adapter.ts](../../src/adapters/pendle/pendle-pool-factory-adapter.ts)): sync pre-flight validation for AI agent pool selection at **p50 ~106µs**
* Gates **`PENDLE_CREATE_POOL`** / **`PENDLE_ADD_LIQUIDITY`** intents via optional `pendlePoolFactory` soil probe wired into `checkSoilResistance()`
* **5 Pool Invariants:** maturity ≥7d · yield drift ≤300bps · $100K min initial liquidity · underlying asset whitelist (`eETH` / `ETH` / `USDai` / `sUSDai` / `USD.AI`) · supported intent taxonomy
* Demo: [tests/demo/pendle-ai-agent-flow.demo.test.ts](../../tests/demo/pendle-ai-agent-flow.demo.test.ts) · [tests/adapters/pendle-pool-factory.test.ts](../../tests/adapters/pendle-pool-factory.test.ts)

> **DX:** AI Agent pool creation and parameter validation through **Pendle AI Guarded Pool Factory** are **100% free from protocol tax** — pre-execution safety checks only; no protocol fee surface in v1.0.

* **Integration (Core-verified · Extended-verified)**:
  * **Registry SSOT**: [pendle-pt-registry.ts](../../src/adapters/pendle/pendle-pt-registry.ts) · `hydrateFromOracle` · `resolvePendlePtMarketState`
  * **Shared Types**: [core/pendle-types.ts](../../src/core/pendle-types.ts)
* **Soil Fuse Wiring (Fail-Closed)**: `pendleOracle`, `pendleCrossGuard`, and `pendlePoolFactory` probes wired into `checkSoilResistance()` (`collectExternalSoilFlags`) — emits **`PENDLE_ORACLE_STALE`** when feed is missing, TTL-expired, or carries invalid fields (zero/negative price, etc.)
* **Performance**: Oracle resolution is **purely cached / synchronous** — no `fetch()` on the hot path; coexists with Shield **p50 ~106µs** budget.
* **Arbitrum One PT Markets (Registry SSOT — production selector targets USD.AI)**:
  * **PT-sUSDai (Oct 2026):** `0xcbf629c8d396b1261f81f55175afa010e94787d8` — primary live harness market
  * **PT-USDai (Oct 2026):** `0xa8a0dea40174cfc30fea9e3a77f182ab33f46e25`
  * **PT-eETH:** `0x8B330d3A50a624f1fE1744d037048BdBc9664E5D` — institutional shield coverage only
* **Funding wedge (Wallet A · 42161):** Pendle Fixed Yield **does not accept USDC**. Fund **USDai** + ETH gas; redeem outputs **sUSDai**. Preflight: `pnpm preflight:venues --venue=pendle` · code `WRONG_TOKEN_USDC_FOR_PENDLE` · live round-trip (execution harness): deposit [0x22d7…82b4](https://arbiscan.io/tx/0x22d7c93994ae930d95c159ee9087c7c49e3462d95a41ddd17b70c94877cd82b4) · redeem [0x9cfb…67e1](https://arbiscan.io/tx/0x9cfbeff8a08472ed4f14e659b940c3b56f0c9e0dc23bc1c42e61cc0521a867e1) · soil proof: `pnpm demo:pendle -- --trip`
* **Mechanism**: Resolves real Pendle PT market parameters from registry (optionally hydrated from oracle), monitors maturity boundaries (&lt;7 days) and yield jitter (&gt;200 bps), integrates dynamic fee curve decay and Shadow Margin cross-guard with Observatory Paradox fix (`close`/`reduce` −40 score discount). Market auto-selector filters `protocolFilter: ["USD.AI"]` · `preferredSymbols: ["sUSDai"]` for live dust harness.
* **Vitest Coverage**:
  * [tests/adapters/pendle-market-oracle.test.ts](../../tests/adapters/pendle-market-oracle.test.ts) — oracle hydration · TTL stale · soil `PENDLE_ORACLE_STALE` trip
  * [tests/adapters/pendle-pool-factory.test.ts](../../tests/adapters/pendle-pool-factory.test.ts) — AI pool selection · yield drift · maturity cliff · soil fuse
  * [tests/adapters/pendle-pt-registry.test.ts](../../tests/adapters/pendle-pt-registry.test.ts) — `resolve*` · `normalize*` · address indexing
  * [tests/risk-control/pendle-soil-guard.test.ts](../../tests/risk-control/pendle-soil-guard.test.ts) — `checkSoilResistance()` Pendle fuse integration
  * [tests/guards/pendle-gmx-cross-guard.test.ts](../../tests/guards/pendle-gmx-cross-guard.test.ts) · [tests/adapters/pendle-pt-expiry-guard.test.ts](../../tests/adapters/pendle-pt-expiry-guard.test.ts)

### 4. GMX

* **GMX on-chain invariant stack (@ `572e5cd`):**
  * **Solidity layer — [GmxRiskInvariantLib.sol](../../contracts/src/libs/GmxRiskInvariantLib.sol)** (**83 LOC**): pure Solidity GMX wire invariants (executionFee floor · slippage floor · pool imbalance) — mirrors [gmx-risk-core.ts](../../src/core/gmx-risk-core.ts).
  * **Bitmap layer — [GmxSoilMatrixSwitch.sol](../../contracts/GmxSoilMatrixSwitch.sol)** (**47 LOC**) + [DefenseMatrixBitmap.sol](../../contracts/libs/DefenseMatrixBitmap.sol) (**66 LOC**): defense matrix **single SLOAD** bitmap switch · Forge **8/8**.
  * **Stylus layer — [sanctuary_invariants](../../contracts/sanctuary_invariants/)** Rust/Stylus coprocessor: 96-byte packed `evaluate_packed` · GMX errMask + soil flags · host wasm parity via `pnpm build:sanctuary-invariants` · Cargo **2/2** · Vitest [stylus-gmx-parity.test.ts](../../tests/wasm/stylus-gmx-parity.test.ts) **6/6**.
  * **Stylus layer integration — [SliverVineAgentPolicyGuardV2.sol](../../contracts/src/SliverVineAgentPolicyGuardV2.sol)** (**71 LOC**): optional `stylusCoprocessor` staticcall first · revert or `address(0)` → **Solidity fallback** to `GmxRiskInvariantLib` · Forge PolicyGuard **9/9**.
  * **Mainnet deploy (ExoMesh · Verified Live · 42161):** [scripts/deploy-policy-guard-v2-mainnet.ts](../../scripts/deploy-policy-guard-v2-mainnet.ts) · Gate `0x71D7…` · `RiskOracleV2` `0xc7f577…` · `GmxSoilMatrixSwitch` `0xd840…` · `PolicyGuardV2` [0x5df192…](https://arbiscan.io/address/0x5df192f9454fd02a89e768632cb5da0762a774bc) · Stylus wired.
* **Dry-run / Vitest verification (0-Gas pre-flight):** GMX v2 execution guards verified via `pnpm demo` · [tests/demo/gmx-v2-agent-flow.demo.test.ts](../../tests/demo/gmx-v2-agent-flow.demo.test.ts) · [gmx-v2-order-payload-guards.ts](../../src/services/adapters/gmx-v2-order-payload-guards.ts) — pre-flight severance before live GM pool capital deployment.
* **GM Pool I/O channel (Verified Live · 42161):** **CLOSED** — Wallet B ETH/USDC GM deposit + withdraw ExchangeRouter multicall paths broadcast on Arbitrum One:
  * **Deposit multicall:** [0xe3155220e464c375329838bb5ca8498226b8c8fa32c11929b7605070f7be4774](https://arbiscan.io/tx/0xe3155220e464c375329838bb5ca8498226b8c8fa32c11929b7605070f7be4774) · Block **503036082** · `pnpm execute:gmx:gm-deposit`
  * **GM LP → GMX v2 Router approve:** [0x30ec0b7a9493f0c43edb257fd40f6d6f9258401e206357f3db7574b11071b00e](https://arbiscan.io/tx/0x30ec0b7a9493f0c43edb257fd40f6d6f9258401e206357f3db7574b11071b00e) · Block **503051738** · spender `0x7452c558…`
  * **Withdraw multicall:** [0xfd3601dce5c2407d371186d8a24829994547ec8810f4a20c3e798d2fb67ae410](https://arbiscan.io/tx/0xfd3601dce5c2407d371186d8a24829994547ec8810f4a20c3e798d2fb67ae410) · Block **503051752** · `pnpm execute:gmx:gm-withdraw`
* **Mainnet micro-fill harness:** `pnpm execute:gmx:micro-fill --size=1` — calibrated **$1–$20** GMX v2 increase order via PolicyGuardV2 `0x5df192…` + Gate `0x71D7…` · **automatic low-OI side calibration** (balanced market leg) · Live: `CONFIRM_GMX_MICRO_FILL=YES BROADCAST=1 MAINNET_PK=0x… ZERODEV_PROJECT_ID=…` · [scripts/execute-gmx-mainnet-micro-fill.ts](../../scripts/execute-gmx-mainnet-micro-fill.ts)
* **Mainnet micro-fill Fail-Closed evidence (Live Interception Payload):** `pnpm execute:gmx:micro-fill --size=1` on Arbitrum One (`42161`) — harness intelligently selected **`"short"`** side to balance GM pool (**$71 Long** vs **$58 Short**) · Soil Resistance + Root Protection **successfully intercepted** execution: `DEPTH_USD = $129 < $100,000` min requirement · `GUARD_BLOCKED:ORACLE_LAG_DEADLOCK:154000ms>30000ms` (**154s** stale oracle) · **`lostUsd ≡ 0`** · **0 slippage loss** · no mempool exposure
* **Stylus mainnet (verified):** `SliverVineSoilCoprocessor` **[0xc23587d6573dd134f95b02b0202ffbf84686625e](https://arbiscan.io/address/0xc23587d6573dd134f95b02b0202ffbf84686625e)** · activation tx [0x92079e15…](https://arbiscan.io/tx/0x92079e150697717af75b0b750ff80be36d06212337189ef368bf65fead6c9397) · Nitro Prover JIT + **ArbWasm `0x71`** · `pnpm deploy:stylus:mainnet` · [scripts/deploy-stylus-mainnet.ts](../../scripts/deploy-stylus-mainnet.ts)
* **Integration**: `evaluatePendleGmxCrossGuard` (`src/guards/pendle-gmx-cross-guard.ts`) & GMX Order Payload Guard (`src/services/adapters/gmx-v2-order-payload-guards.ts`).
* **Mechanism**: Implements Shadow Margin accounting. Evaluates whether swapping out PT collateral under dynamic fees threatens GMX Maintenance Margin. Builder fee SSOT: **`GMX_UI_FEE_BPS` = 10** (`src/config/gmx-revenue.ts`); payload price-impact gate uses **`DEFAULT_GMX_PENALTY_BPS` = 50** (`src/services/yield/gmx-v2-price-impact.ts`).

### 5. Dune Analytics

> **Telemetry boundary partition (zero misleading claims):** Sepolia and Arbitrum One are **explicitly separated** — live streaming vs. contracts-anchored SQL specs.

| Network | ChainID | Status | What is claimed |
|---------|---------|--------|-----------------|
| **Arbitrum Sepolia** | `421614` | ✅ **Active Live Event Pipeline** | Dune ingests decoded `IntentAttested` · `RiskTripBlocked` from Sepolia ExoMesh Gate [0xc66F…8959](https://sepolia.arbiscan.io/address/0xc66f96611a737c4e58706d0955594456eab88959) — **only** Sepolia claimed as live stream |
| **Arbitrum One** | `42161` | ✅ **Contracts Anchored** + **SQL Query Specs Ready for Ingest** | Production DuneSQL (Queries 0–0b + 1–3) pre-compiled for **42161** semantics · **not** claimed as live mainnet event stream until ingest is wired |

> **Governance footnote (re-confirmed):** Bootstrap Ignition Keys (`0x1111…` / `0x2222…`) are **strictly for public verification and sandbox reproducibility** — not production HSM custody. Post-launch rotation to production multisig via `proposeAdmin` / `acceptAdmin` is the designed authority path.

* **Live Dashboard:** [Dune Telemetry (Sepolia Live Verification & Production SQL Spec)](https://dune.com/silvervinelabs/slivervine-protocol)
* **Sepolia event streaming (verified):** Dune engine ingests **decoded events** from Sepolia ExoMesh Gate [0xc66F96611a737c4e58706D0955594456eAb88959](https://sepolia.arbiscan.io/address/0xc66f96611a737c4e58706d0955594456eab88959) (`IntentAttested` · `RiskTripBlocked`) — **only** Sepolia is claimed as active live stream.
* **Arbitrum One production SQL (`42161`):** Matching production DuneSQL queries (Queries 0–0b feed + chart; Queries 1–3 reconciliation panels) target **Arbitrum One mainnet** contract semantics — **SQL specs ready for ingest**; mainnet Gate business-event stream is a post-ingest milestone — [DUNE_DASHBOARD_SPECIFICATION.md](../01_architecture_and_standards/03_telemetry_and_mo/03_DUNE_DASHBOARD_SPECIFICATION.md).
* **Live Telemetry Feed (Query 0):** `arbitrum.blocks` 12h window · Sepolia Gate [0xc66F96611a737c4e58706D0955594456eAb88959](https://sepolia.arbiscan.io/address/0xc66f96611a737c4e58706d0955594456eab88959) · `RiskTripBlocked` / `IntentAttested` / heartbeat status.
* **Telemetry Activity Chart (Query 0b):** 1h minute-bucket toxic-flow distribution (`BLOCKED` / `PASS` / `HEARTBEAT`).
* **Integration**: [DUNE_DASHBOARD_SPECIFICATION.md](../01_architecture_and_standards/03_telemetry_and_mo/03_DUNE_DASHBOARD_SPECIFICATION.md) · static `/api/grant-audit` `duneTelemetry` provenance snapshot (Historical Audit Telemetry Snapshot & Provenance Archive — not a live dynamic market oracle).
* **Mechanism**: Production DuneSQL feed + chart (Queries 0–0b) plus reconciliation panels (Queries 1–3) — Toxic Flow Blocked · Observatory Paradox Bypasses · PT Expiry × GMX Margin Health — reconciled against `duneTelemetry.responseRef` sha256 provenance.

### Execution Speed & Protocol-Agnostic Resilience (HL Delta Pool)

Hyperliquid — an **Independent L1 High-Frequency Orderbook AppChain** that originated alongside Arbitrum's perp liquidity ecosystem — Session Key Adapter and TCA provenance (`src/data/verified-5tx-lib/verified-5tx-provenance.ts`) are framed as **cross-venue Δ-neutral execution speed proofs** (GMX v2 ETH/USDC GM + HL 1× short), complementing (not competing with) the Shield pre-execution narrative. SSOT: `src/adapters/hl/hyperliquid-session-guard.ts` · `src/adapters/hl/execution-wire.ts` · `src/adapters/hl/session-key-executor.ts`.

---

## Core Risk Decision Matrix (`evaluatePendleGmxCrossGuard`)

| Intent Direction (Code Mapping) | Trigger Condition | Reflector Action | Strategic Purpose |
| :--- | :--- | :--- | :--- |
| `close` / `reduce` (`RISK_DECREASE`) | Any Market State | `EMERGENCY_DELEVERAGE_ALLOWED` | **Fixes Observatory Paradox**: Applies -40 risk score discount; always greenlights risk reduction to prevent forced liquidation on GMX. |
| `open` / `increase` (`RISK_INCREASE`) | Raw Risk Score &gt; 75 OR Shadow Margin &lt; 0 | `FAIL_CLOSED_BLOCK` | **0-Gas Defense**: Blocks toxic/hallucinated leverage before mempool ingress. |
| `open` / `increase` (`RISK_INCREASE`) | Raw Risk Score ≤ 75 AND Shadow Margin ≥ 0 | `PASS_GREENLIGHT` | Eligible for downstream EIP-712 attestation pipeline (`SliverVineGate.sol`). |

**Demo tests:** [tests/guards/pendle-gmx-cross-guard.test.ts](../../tests/guards/pendle-gmx-cross-guard.test.ts) · [tests/adapters/pendle-pt-expiry-guard.test.ts](../../tests/adapters/pendle-pt-expiry-guard.test.ts) · [tests/adapters/pendle-market-oracle.test.ts](../../tests/adapters/pendle-market-oracle.test.ts) · [tests/adapters/pendle-pt-registry.test.ts](../../tests/adapters/pendle-pt-registry.test.ts) · [tests/risk-control/pendle-soil-guard.test.ts](../../tests/risk-control/pendle-soil-guard.test.ts).

---

## Three-Pillar Architecture (Submission SSOT)

| Pillar | Role | SSOT |
|--------|------|------|
| **Gatehouse (Auth)** | **Opt-In Pillar Set X · Component 1 (Gatehouse)** ZeroDev scoped session keys · Kernel v3 · R06 / R07 · `USE_ZERODEV_AA` default-off | `zerodev-aa-*` · Gate attestation · [Yellow Paper §Ingress](../01_architecture_and_standards/01_core_specs/01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md) |
| **Pillar Set X · Component 2 — Compliance Ingress Firewall** | Venue-agnostic unidirectional AML escort · Robinhood Chain RWA ingress (`46630`/`4663` → `42161`) · **`lostUsd ≡ 0`** · inbound AML block · **ArbOS 61 Elara** reinforcement plane | `src/adapters/across-ingress-bridge.ts` · `contracts/IngressSafetySwitch.sol` |
| **Shield (CORE MOAT)** | Sub-ms Wasm pre-execution armor · **p50 ~106 µs** · Wasm **<28kb / <60µs** · fail-closed before mempool · **auto `severSigningChannel()` on bitmask trips** · **Stylus 96KB coprocessor ready** (`SliverVineSoilCoprocessor` · 9/9 PASS) · **independent of ZeroDev** | `checkSoilResistance()` · `soil_core.wasm` · `check_soil_resistance_stylus` |

### Competitive Positioning — Four-Dimensional ASCII Matrices (SliverVine Protocol)

**Entity:** SilverVine Labs · **Protocol:** SliverVine Protocol · ExoMesh + Sanctuary (BeΔ)  
**[ERC-8196](https://eips.ethereum.org/EIPS/eip-8196):** Finalized ERC-8196 Standard — Ethereum Standard.

**Matrix 1 — Execution & Pre-Broadcast Severance Profile**

```text
┌───────────────────────────┬─────────────────────────────┬────────────────────────────┬────────────────────────────┐
│ Dimension                 │ SliverVine ExoMesh + Sanctuary   │ Legacy ERC-4337 / OZ       │ Gauntlet / Chaos Labs      │
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
│ Dimension                 │ SliverVine ExoMesh + Sanctuary   │ Multisig / Timelock        │ Web2 LLM Guardrails        │
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
│ Dimension                 │ SliverVine ExoMesh + Sanctuary   │ Native DEX Limit Orders    │ Raw Cross-Chain Bridges    │
├───────────────────────────┼─────────────────────────────┼────────────────────────────┼────────────────────────────┤
│ 1. Cross-Spread Sensing   │ Live GMX/HL Soil Resistance │ Static Slippage Tolerance  │ Blind Asset Relaying       │
│ 2. Liquidation Defense    │ -40 Haircut (Observatory)   │ Cascading Liquidation Risk │ No Execution Awareness     │
│ 3. Ingress Accounting     │ `lostUsd ≡ 0` Escort Label  │ Immediate Capital Loss     │ Phantom In-flight Balances│
│ 4. AML Shielding          │ Blocked Reverse Path (46630)│ Open Protocol Ingress      │ Unfiltered Contamination   │
└───────────────────────────┴─────────────────────────────┴────────────────────────────┴────────────────────────────┘
```

---

## Commercial Posture (v1.0)

> **Commercial posture (v1.0):** SliverVine is **not** publishing pricing, subscriptions, or paid API tiers. Buildathon delivery is **technical only**: ExoMesh pre-broadcast guard + **public open gateway** (`X-SliverVine-Tier: public` · `X-SliverVine-RPS-Limit: 5`). Post-grant work may expand integrations and hardening; **no revenue model is committed in this submission.**

**V1.0 Public Open Gateway (submission baseline):**

* No API key required for hackathon / judge evaluation.
* Lightweight Edge RPS rate limiter (header/IP-based) protects memory queues against Sybil DoS.
* Gateway responses include `X-SliverVine-Tier: public` and `X-SliverVine-RPS-Limit: 5`.

**GMX builder lane (on-chain fact, not a product tier):** +10 bps `uiFeeReceiver` on unsigned GMX v2 payloads — see [gmx/GMX_BUILDERS_PITCH.md](../0A_grants/gmx/GMX_BUILDERS_PITCH.md).

---

## Post-Hackathon Expansion Roadmap

* **Milestone 1 (Weeks 2–3 post-grant approval): Policy Studio + EIP-1193 distribution**
 * Ship structured Policy Studio (venues · notional · TTL · slippage → mandate compile) on the primary `withRetailGuardProvider` SDK path (optional B2B hook for server-side agents) — **no per-framework plugin SKU**. Optional NL is a **compiler** into that mandate; signing-layer enforcement stays bytecode / bitmask.
* **Milestone M-Dune (Day 7 – 30)**
 * Deploy live Dune Analytics dashboards and onboard 3 design partners (**agent operators · vault managers · wallet SDK integrators**) for technical Proof-of-Value — fleet policy hash + block certificates, not framework-plugin adoption.
* **Milestone M-ExoMesh (Day 60 – 90)**
 * Institutional rollout of TEE-enclosed (SGX/Automata) Reflector nodes and Secure RPC Gateway across Arbitrum Orbit chains.

---

## Granular Milestone Matrix (Buildathon · Grant-Tied Distribution)

| ID | Unlock condition (objective) | Venue / track | Status |
|----|------------------------------|-----------------|--------|
| **M-Sepolia** | Sepolia Gate + RiskOracle + IngressSafetySwitch verified · `sepoliaDualLegProof` in static `/api/grant-audit` archive | Arbitrum | ✅ Delivered |
| **M-CLI** | Vitest **254 test files | 1206 PASS clean (100%)** | All | ✅ Delivered |
| **M-RH-Testnet-46630** | **`46630` testnet live-fire baseline** · Tier1 Smart Route Tx [0xdca66358…2a2f](https://arbiscan.io/tx/0xdca66358ffb9a2463d1069722ea27dcfabe1d374dc1d5264698c74341bb02a2f) · Tier2 RH tx [0x4574c97f…fcf6](https://explorer.testnet.chain.robinhood.com/tx/0x4574c97ff91b5321c3281c535577a1a55908f4e92de8c3ecb55433e94735fcf6) · inbound B1/B2/B3 **0 broadcast** · [ROBINHOOD_LIVEFIRE_ARTIFACTS.md](../logging/ROBINHOOD_LIVEFIRE_ARTIFACTS.md) | Robinhood Chain | ✅ Live-verified |
| **M-RH-Demo (4663 precedent)** | `4663` → `42161` outbound Smart Route **Verified Live** · UserOp `0x7b72ee9f…` · Tx [0x4c4ca136…](https://arbiscan.io/tx/0x4c4ca1362d4a50d4684662e633e728401478c29dbef13f49e109e68253b5964a) · inbound AML blocked · `lostUsd ≡ 0` | Robinhood Chain | ✅ Live-verified |
| **M-RH-Mainnet-4663** | **`4663` mainnet native Tier2** · Tx [0x02ced821…951d](https://explorer.chain.robinhood.com/tx/0x02ced8215cb1a9f6ec1b82dd39e01536991f278967d63c63dc29bde2ef6d951d) · UserOp `0x9ce020ba…cbfea` · [JSON](../logging/robinhood_livefire_outbound_2026-09-21T03-00-51-080Z.json) · `pnpm probe:rchain-mainnet` | Robinhood Chain | ✅ Live-verified |
| **M-GMX-Fee** | Unsigned GMX v2 payload injects **10 bps** `uiFeeReceiver` | GMX | ✅ Injected · ⏳ `claimUiFees` |
| **M-Dune** | Publish Dune dashboard per [DUNE_DASHBOARD_SPECIFICATION.md](../01_architecture_and_standards/03_telemetry_and_mo/03_DUNE_DASHBOARD_SPECIFICATION.md) | Dune | ✅ [Live dashboard](https://dune.com/silvervinelabs/slivervine-protocol) |
| **M6-Mainnet** | ExoMesh Gate `0x71D7…` live on 42161 · legacy Gate ignition receipt → [superseded appendix](../01_architecture_and_standards/01_core_specs/05_SUPERSEDED_DEPLOYMENTS_APPENDIX.md) | Arbitrum · Grant | ✅ Delivered |
| **M1-Wallet-SDK** | **Milestone 1 (Weeks 2–3 post-grant):** EIP-1193 Retail Guard wallet vendor integrations — MetaMask Snaps · Rabby · Coinbase Wallet distribution | Wallet vendors | ⏳ Post-grant Weeks 2–3 |

---

## On-Chain Verification — Arbitrum One (42161)

| Contract | Role | Verified Address (Mainnet) | Proof |
|----------|------|----------------------------|-------|
| `SliverVineGate` (ExoMesh) | Consume-once EIP-712 attestation anchor | [0x71D7d26f98110c5DE3df0fCbddCf2A3A2BC6e2f1](https://arbiscan.io/address/0x71d7d26f98110c5de3df0fcbddcf2a3a2bc6e2f1) | ExoMesh redeploy 2026-09-17 · [02_CONTRACT_DEPLOYMENT_MATRIX.md](../01_architecture_and_standards/01_core_specs/03_CONTRACT_DEPLOYMENT_MATRIX.md) · legacy → [appendix](../01_architecture_and_standards/01_core_specs/05_SUPERSEDED_DEPLOYMENTS_APPENDIX.md) |

> **Governance footnote (Bootstrap Ignition Keys):** ExoMesh Mainnet Gate [0x71D7d26f98110c5DE3df0fCbddCf2A3A2BC6e2f1](https://arbiscan.io/address/0x71d7d26f98110c5de3df0fcbddcf2a3a2bc6e2f1) deploys with **Bootstrap Ignition Keys** (`0x1111…` / `0x2222…`) — **strictly for public verification and sandbox reproducibility**, not production HSM custody. Governance authority is designed for **post-launch rotation** to production multisig via native `proposeAdmin` / `acceptAdmin` functions.

> **0-Gas Off-Chain Severance architecture:** Arbitrum One ExoMesh Gate (`0x71D7…`) **is engineered for 0-Gas Pre-Execution Off-Chain Severance**. ExoMesh risk gates halt compromised payload signatures at the Edge **prior to mempool submission**, preserving **Arbitrum L2 state space cleanliness** — toxic paths never consume Sequencer gas; on-chain Gate anchors consume-once attestations only for cleared intents.

### [MAINNET_LIVE_EXECUTION_EVIDENCE]

> **Harness:** `pnpm deploy:stylus:mainnet` · `pnpm execute:gmx:micro-fill --size=1` · `pnpm tsx scripts/deploy-policy-guard-and-live-fill.ts` · ZeroDev AA: `pnpm tsx scripts/execute-zerodev-mainnet-test.ts` · Smart Route: `pnpm tsx scripts/execute-smart-route-live-demo.ts` · Live: `CONFIRM_SMART_ROUTE_DEMO=YES BROADCAST=1` · Default ingress: Robinhood Mainnet `4663` (`SMART_ROUTE_SOURCE_CHAIN_ID` override supported)

| Field | Value |
|-------|-------|
| **PolicyGuardV2 (ExoMesh)** | [0x5df192f9454fd02a89e768632cb5da0762a774bc](https://arbiscan.io/address/0x5df192f9454fd02a89e768632cb5da0762a774bc) · Stylus wired |
| **SliverVineSoilCoprocessor** (Stylus) | [0xc23587d6573dd134f95b02b0202ffbf84686625e](https://arbiscan.io/address/0xc23587d6573dd134f95b02b0202ffbf84686625e) · `MAINNET` only (`42161`) · Engine A |
| **Gate setPolicyGuard Tx** | [0x6750785188fe72f137dbf140b70cdd3b8094df62db1d86339194245cb0dba0ba](https://arbiscan.io/tx/0x6750785188fe72f137dbf140b70cdd3b8094df62db1d86339194245cb0dba0ba) |
| **GmxSoilMatrixSwitch** | [0xd840ad013d3be8a363d537a80d5ea8700f7a34c4](https://arbiscan.io/address/0xd840ad013d3be8a363d537a80d5ea8700f7a34c4) |
| **SliverVineRiskOracleV2** | [0xc7f577ac7e1270e6e99e1b700301c25e98df2456](https://arbiscan.io/address/0xc7f577ac7e1270e6e99e1b700301c25e98df2456) |
| **ZeroDev Kernel v3 AA Proof Tx** | [0xc765…4aad](https://arbiscan.io/tx/0xc7659e299e4961279f03b9cafa988dc082d7f9baf107bcd7b62812e8dfb54aad) · [Arbiscan](https://arbiscan.io/tx/0xc7659e299e4961279f03b9cafa988dc082d7f9baf107bcd7b62812e8dfb54aad) |
| **Smart Route Source Chain** | Robinhood Mainnet (`4663`) |
| **Smart Route Target Chain** | Arbitrum One (`42161`) |
| **ZeroDev Kernel v3 Smart Route UserOp Hash** | `0x7b72ee9f4dc3f32f08a5de914ecf076c243d895522ecd72d17a2f7b025bc956d` |
| **ZeroDev Kernel v3 Smart Route UserOp Tx** | [0x4c4c…964a](https://arbiscan.io/tx/0x4c4ca1362d4a50d4684662e633e728401478c29dbef13f49e109e68253b5964a) · [Arbiscan](https://arbiscan.io/tx/0x4c4ca1362d4a50d4684662e633e728401478c29dbef13f49e109e68253b5964a) |
| **Chain** | Arbitrum One (`42161`) |
| **Status** | **Verified Live** on Arbitrum One (42161) with **Fail-Closed Risk Protection** active |
| **GMX Micro-Fill Live Attempt (`--size=1`)** | **Fail-Closed** — balanced side **`"short"`** ($71 Long vs $58 Short) · `DEPTH_USD=$129<$100k` · `ORACLE_LAG_DEADLOCK:154000ms>30000ms` · Soil Resistance + Root Protection intercepted pre-mempool · **`lostUsd ≡ 0`** · 0 slippage loss |
| **GMX Fill Live Attempt (prior)** | **Fail-Closed** — pre-broadcast trip `GMX_POOL_IMBALANCE_BREACH` · no toxic fill submitted · live invariant shield **confirmed active** |
| **Notional (USD)** | `$1–$20` (CLI `--size`; default **$1** micro-fill) |
| **Stylus Build Proof** | `cargo test stylus_core` **5/5 PASS** · `wasm32-unknown-unknown` release build verified · Wasm ABI v2 **28-slot** ↔ [wasm-soil-ffi.ts](../../src/core/wasm-soil-ffi.ts) |

---

## On-Chain Verification — Arbitrum Sepolia (421614)

| Contract | Role | Verified Address (Sepolia) | Source |
|----------|------|----------------------------|--------|
| **Deployer / Admin / Signer** | OpSec-isolated Forge broadcast signer | `0xbd65d785Dac74EBa9efFdB357b2dC52fCC26EC7F` | [scripts/deploy-sepolia-gate.sol](../../scripts/deploy-sepolia-gate.sol) |
| `SliverVineGate` | Consume-once EIP-712 attestation anchor · ExoMesh | [0xc66F96611a737c4e58706D0955594456eAb88959](https://sepolia.arbiscan.io/address/0xc66f96611a737c4e58706d0955594456eab88959) | [SliverVineGate/src/SliverVineGate.sol](../../SliverVineGate/src/SliverVineGate.sol) |
| `SliverVineRiskOracle` | EIP-712 offline risk report · `STATUS_SHUTDOWN` flush | [0x6CA7eA722F139F3C23280ebc973caff3B17d8fEa](https://sepolia.arbiscan.io/address/0x6ca7ea722f139f3c23280ebc973caff3b17d8fea) | [contracts/SliverVineRiskOracle.sol](../../contracts/SliverVineRiskOracle.sol) |
| `IngressSafetySwitch` | Pillar Set X compliance filter | [0xc1Eb1624A3A93e969De57466b1CDbD0e0189D192](https://sepolia.arbiscan.io/address/0xc1eb1624a3a93e969de57466b1cdbd0e0189d192) | [contracts/IngressSafetySwitch.sol](../../contracts/IngressSafetySwitch.sol) |
| `SliverVineSoilCoprocessor` (Stylus) | On-chain `soil_core` coprocessor · ArbOS 61 **96KB** Wasm expansion ready · `check_soil_resistance_stylus` dual-execution | **Code-Verified** (Cargo 9/9 · Stylus SDK **0.10.7** · `pnpm build:stylus` · EIP-1967 proxy path) | [contracts/stylus-probe/src/lib.rs](../../contracts/stylus-probe/src/lib.rs) |

---

## Verification (60s)

```bash
pnpm install
pnpm demo:gmx     # Tier 1 — GMX v2 shadow margin (ALLOW)
pnpm demo:hl      # Tier 1 — Hyperliquid session key (ALLOW)
pnpm demo:pendle  # Tier 1 — Pendle guarded pool factory (ALLOW)
pnpm demo:usdai    # Tier 1 — USD.ai collateral guard (ALLOW)
pnpm demo:pendle   # Tier 1 — Pendle yield guard (ALLOW)
pnpm demo       # Vitest Dual Pillar Set X & Y matrix (12 scenarios)
pnpm demo:delta-neutral   # Tier 3 — 4-Step Happy Path Macro Lifecycle CLI (--unwind · --trip optional)
npx vitest run tests/sdk/retail-guard-provider.test.ts  # Tier 0 — EIP-1193 Retail Guard SDK
pnpm demo:agent                  # Optional appendix — B2B agent lifecycle smoke demo (not judge path)
pnpm test       # Full System Regression Suite (254 test files | 1206 PASS clean)
pnpm run audit:security # 3-Tier Security Matrix: 5/0/0 PASS (Vitest, Forge, Slither, Aderyn, pnpm-audit)
cd SliverVineGate && forge test --gas-report && cd ..
# Static Buildathon provenance archive (not a live market oracle):
curl -s "https://bedeltawater.slivervine.xyz/api/grant-audit" | jq .sepoliaDualLegProof
```

**Dual Pillar Set X & Y micro demo** (`pnpm demo` — `tests/demo/`):

| File | Venue | Scenarios |
|------|-------|-----------|
| `gmx-v2-agent-flow.demo.test.ts` | GMX v2 | Healthy payload · toxic price impact · oracle-lag + `reduceOnly` rescue · 1,000× benchmark |
| `hyperliquid-agent-flow.demo.test.ts` | Hyperliquid | Valid session key · WS stale/latency fuse · GateLockout · 1,000× benchmark |
| `pendle-ai-agent-flow.demo.test.ts` | Pendle | AI pool PASS · yield-drift reject · stale oracle · 1,000× benchmark |

**Grant E2E macro demo highlights** (`pnpm demo:delta-neutral` — default **4-step Happy Path**; GitHub `diff` syntax):

```diff
+ ── Step 1: ExoMesh Pre-Execution Check ──
+ Intent: allowedToSign=true · elapsed=106µs · Invariant: Δnet ≡ 0
+ ── Step 2: Robinhood Escort ──
+ Outbound: lostUsd=0 · RESULT: Escort PASS · lostUsd ≡ 0
- Inbound AML block: AML_INBOUND_TO_ROBINHOOD_BLOCKED
! GMX Payload: uiFeeReceiver (+10 bps) injected
+ Step 4: Margin Anchor · $100 HL margin backs $1,200 notional short · Δnet ≡ 0
+ RESULT: E2E OK (4/4)
```

**Optional `--unwind` (Step 5 ExoMesh reflex exercise):**

```diff
- ALERT: SOIL_TRIPPED — toxic depth fuse
- [CRITICAL] PHYSICAL_DEADLOCK_TRIGGERED: EIP-712 Signature Pipe Severed
+ Treasury State: Protocol Treasury retains +$2.40 (uiFeeReceiver share)
+ Flash unwind: PASS · RESULT: E2E OK (5/5)
```

**Regression bar:** Vitest **254 test files | 1206 PASS clean (100%)** · **3-Tier Security Matrix: 5/0/0 PASS (Vitest, Forge, Slither, Aderyn, pnpm-audit)** · Forge 60/60 · Cargo Stylus 9/9 · Worker bundle **40.5 KiB gzip** (`pnpm bundle:measure` · pass &lt;75 KiB) · Wasm **<28kb Cloudflare budget, <60µs execution** · Shield **p50 ~106µs**.

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [../../JUDGE_BRIEF.md](../../JUDGE_BRIEF.md) | 1-page executive brief for Buildathon evaluators |
| [../../README.md](../../README.md) | English SSOT landing page |
| [../03_product_verifications/01_VERIFICATION_MATRIX.md](../03_product_verifications/01_VERIFICATION_MATRIX.md) | CLI Tier 0–5 verification hub |
| [../PRODUCTION_WORKFLOW_DEEP_DIVE.md](../PRODUCTION_WORKFLOW_DEEP_DIVE.md) | Dual-wallet production workflow SSOT |
| [../01_architecture_and_standards/README.md](../01_architecture_and_standards/README.md) | R01–R20 Defense Matrix · latency benchmarks |
| [../01_architecture_and_standards/03_telemetry_and_mo/03_DUNE_DASHBOARD_SPECIFICATION.md](../01_architecture_and_standards/03_telemetry_and_mo/03_DUNE_DASHBOARD_SPECIFICATION.md) | Production DuneSQL feed + activity chart (Queries 0–0b) + 3 reconciliation panels · [modeled replay dashboard](https://dune.com/silvervinelabs/slivervine-protocol) (Module A · NOT Mainnet live PnL) |
| [../0A_grants/arbitrum/ARBITRUM_ONE_PAGER.md](../0A_grants/arbitrum/ARBITRUM_ONE_PAGER.md) | One-pager |
| [../0A_grants/arbitrum/GRANT_PROPOSAL.md](../0A_grants/arbitrum/GRANT_PROPOSAL.md) | Scope & roadmap |
| [../0A_grants/gmx/GMX_BUILDERS_PITCH.md](../0A_grants/gmx/GMX_BUILDERS_PITCH.md) | GMX builder economics |
| [../02_sdk_and_integrations/02_specs_and_research/02_MARKET_INTELLIGENCE_AND_COMPETITOR_AUDIT.md](../02_sdk_and_integrations/02_specs_and_research/02_MARKET_INTELLIGENCE_AND_COMPETITOR_AUDIT.md) | Competitive matrix · grant strategy |
| [../03_product_verifications/02_CLI_DEMO_RUNBOOK.md](../03_product_verifications/02_CLI_DEMO_RUNBOOK.md) | Judge demo CLI · 5-core venue `--trip` proofs |
| [§ Threat Model Appendix](#appendix-real-world-threat-model-market-landscape) | Agentic web metrics · case studies · competitive matrix |

---

## Appendix: Real-World Threat Model & Market Landscape

### Market Adoption Metrics (The Agentic Web Shift)

The Web3 attack surface is shifting from human UI phishing to **autonomous agent execution pipelines**. Industry telemetry indicates the agentic web is already material on-chain:

| Metric | Estimate |
|--------|----------|
| **AI agents deployed** | **17,000+** autonomous on-chain agents |
| **Share of on-chain transactions** | **~19%** agent-attributed activity |
| **Daily Active Wallets (DAW) touchpoints** | **~4.5M** wallets interacting with agent frameworks |

**Implication:** Security must evolve from post-hoc dashboards and mutable pause functions to **microsecond Pre-Broadcast Intent Firewalls** — severing toxic calldata **before** Sequencer queues, Bundler ingress, or MEV mempools. SliverVine ExoMesh targets this gap at **p50 ~106µs** Edge Wasm evaluation.

### Real-World Case Studies (Why ExoMesh Pre-Broadcast Severance is Essential)

| # | Case | Loss / Impact | ExoMesh Alignment |
|---|------|---------------|-------------------|
| **1** | **Jaredfromsubway.eth $7.5M Exploit (MEV Honeypot Trap)** | Automated signature logic exploited via malicious permission / honeypot traps | Validates **sub-ms Wasm pre-broadcast** `checkSoilResistance()` + honeypot RPC defense — signatures never reach toxic mempool paths |
| **2** | **Virtuals Protocol $500k Unbound Agent Drain** | Unbound agent execution exceeded safe notional envelopes | Validates **R06/R07** session-key blast-radius isolation · **`SESSION_KEY_NOTIONAL_CAP_USD = $5,000`** · scoped `ORDER_EXECUTE` |
| **3** | **ElizaOS / ai16z Fraud & Governance Collapse** | SDNY class-action litigation — raw Node.js prompt wrappers lacked on-chain execution guarantees | Validates **non-semantic bytecode predicate assertions** · EIP-712 consume-once Gate · **LLM back-off cooldown** — prompt layer compromise ≠ signing-layer authorization |

### Competitive Landscape Matrix

| Dimension | **SliverVine V1.0 (Pre-Broadcast Mesh)** | **Wayfinder** | **Virtuals Protocol** | **ElizaOS Framework** | **ZeroDev / Biconomy (ERC-4337 AA)** |
|-----------|-----------------------------------|---------------|-------------------------|----------------------|--------------------------------------|
| **Pre-broadcast severance** | ✅ Sub-ms Wasm soil fuse (p50 ~106µs) · 0-Gas fail-closed | ✅ **V1.0 Live** via competitor `wayfinderShieldHook` (illustrative) on Arbitrum `42161` | ❌ Web2.5 agent layer; wallets exposed without pre-execution bounds | ❌ No native pre-broadcast risk gates | ❌ Session keys only; **no** AI-context fuse |
| **On-chain immutability** | ✅ 0-proxy `SliverVineGate` · `consumed[digest]` | Varies by deployment | Consumer UX focus | Open-source plugins | Strong AA infra |
| **AI behavioral safety** | ✅ 60s LLM cooldown · ±2–5 bps jitter | Limited | Limited | Prompt-only guardrails | N/A |
| **Session blast-radius** | ✅ $5k notional cap · scoped modules | Varies | High adoption; **unbound drain risk** | Framework-dependent | ✅ ERC-4337 session scopes |
| **Prompt injection immunity** | ✅ Bytecode predicates · not NL prompts | Partial | Partial | **Vulnerable** at execution hook | **Vulnerable** — signs whatever UserOp encodes |

### Supplementary Industry References

| Reference | Alignment in SliverVine |
|-----------|-------------------------|
| **Arbitrum Off-Chain Execution Paradigm & Rollup MEV (Goldfeder et al.)** | Validates sub-ms pre-consensus bitmask evaluation at Edge isolates to prevent Sequencer queue pollution and zero-gas execution severance. |
| **MEV & thin-liquidity on autonomous agents** | `checkSoilResistance()` · `evaluateHlOrderbookGapGuard()` |
| **$441k+ bot execution error** — [PumpParade / Medium](https://pumpparade.medium.com/ai-trading-bots-lost-441k-in-one-error-heres-what-actually-works-and-what-doesn-t-4f04f890c189) | AI retry severance · `INTENT_RING_U32` attempt budget |
| **AI antivirus primitives** — [CertiK AI Skill Scanner](https://www.tradingview.com/news/chainwire:d064d7d1f094b:0-certik-launches-ai-skill-scanner-an-antivirus-software-for-the-ai-age/) | Non-semantic bytecode predicates at signing layer |
| **Institutional agent-security focus** — [CryptoRank: AI Agents & Web3 Hacking Symposium](https://cryptorank.io/news/feed/fae5e-ai-agents-web3-hacking-wyoming-symposium) | Pre-broadcast intent firewall for agentic DeFi |

---

**SliverVine Protocol** — *The Risk Operating System for AI-Driven DeFi.*
