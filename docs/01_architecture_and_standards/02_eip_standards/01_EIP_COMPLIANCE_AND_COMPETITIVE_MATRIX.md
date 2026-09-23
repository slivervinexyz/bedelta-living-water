# Standard Compliance & ERC/EIP Wiki

> **Product:** **SliverVine ExoMesh** (Module A) · **SliverVine Sanctuary** (Module B) — Pre-Consensus Intent Firewall & Execution Safety Primitive  
> **Protocol:** SliverVine Protocol (BeDelta Living Water v1.0 / BeΔ) · BeDelta Living Water v1.0 · SSRC  
> **Document:** Standards Compliance & ERC/EIP Reference Wiki · **Vitest SSOT:** **254 test files | 1206 PASS clean (100%)**  
> **Architecture index:** [README.md](../README.md) · [01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md](../01_core_specs/01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md) · [02_DEFENSE_MATRIX_AND_SSRC_CORE.md](../01_core_specs/02_DEFENSE_MATRIX_AND_SSRC_CORE.md) · **This file**

Official infrastructure standards map — each row links a public ERC/EIP (or venue spec) to SliverVine Protocol implementation anchors and verification. The **ERC/EIP Standards Reference Wiki** below is the formal deep-dive for AA, attestation, asset-escrow, and on-chain coprocessor standards.

> **Standards compliance:** SliverVine Protocol is **100% compliant** with standard **EIP-1193** / **EIP-5792** and **ERC-7540** specs, while extending them into **0-Gas pre-consensus security supersets** — **ExoMesh Agentic Guard (EIP-1193/5792/6963+)** and **Sanctuary Async Escort (ERC-7540+)**.
>
> **Engineering honesty:** SliverVine is an **Off-Chain Client/Edge Pre-Consensus Intent Firewall**. All EIP/ERC claims use the **3-Tier Taxonomy** below — read the **Status** column before citing.

### 3-Tier EIP/ERC Taxonomy

| Tier | Status Label | Standards | Narrative |
| ---- | ------------ | --------- | --------- |
| **1** | `[Final]` | **EIP-1193** · **EIP-5792** · **ERC-7540** | **100% compliant** with standard specs, extended into **0-Gas pre-consensus security supersets** (ExoMesh & Sanctuary) |
| **2** | `[De-facto Industrial Draft]` | **ERC-7683** (Uniswap/Across) · **ERC-7579** (ZeroDev/Rhinestone) | **Semantic alignment** — production code maps to industrial draft problem spaces; not normative Final conformance |
| **3** | `[Unrelated Draft — Not Implemented]` | EIP-8105 · EIP-8079 · ERC-8226 · ERC-8118 | **No implementation claim** — see [Conceptual Industry Alignment Targets](#conceptual-industry-alignment-targets-draft--emerging-eips) |

### Tier 1 — Finalized Core Standards `[Final]`

| Standard | Physical Limitation | SliverVine Pre-Consensus Superset |
| -------- | ------------------- | --------------------------------- |
| **EIP-1193** `[Final]` | Provider APIs allow txs to reach Sequencer unchecked — reverts burn gas | **ExoMesh Sub-1.8µs 0-Gas Pre-Consensus Wasm Gate** — intercepts **before** Sequencer ingress |
| **EIP-5792** `[Final]` | `wallet_sendCalls` batches bypass tx-only guards | `eip5792-send-calls.ts` unfolds `calls[]` into retail risk stack |
| **ERC-7540** `[Final]` | Zero-trust attack window during Pending → Claimable (drift · operator hijacking) | **Sanctuary Selector-Level Escort** — `evalAsyncVaultDriftBps` + Whitelisted Operator Lock |

### Tier 2 — Active Industrial Standards `[De-facto Industrial Draft]`

| Standard | Industrial Origin | SliverVine Semantic Alignment |
| -------- | ----------------- | ----------------------------- |
| **ERC-7683** `[De-facto Industrial Draft]` | Uniswap / Across | **Pre-Consensus Solver Integrity Lock & Semantic Alignment** — Solver Pre-flight Capital Lock |
| **ERC-7579** `[De-facto Industrial Draft]` | ZeroDev / Rhinestone | **v1.0:** pre-UserOp oracle read + ingress policy. **Post-grant:** TYPE-4 Kernel hook install (V1.5 Track A). |

SliverVine Protocol binds **ERC-4337** · **EIP-7562** · **EIP-712** · **ERC-1271** · **EIP-1193** · **EIP-5792** · **EIP-6963** · **ERC-20/777** · **OpenZeppelin v5** · **ERC-7579** · **EIP-7702** · **ERC-7683** · **ERC-7710** · **ERC-7715** · **ERC-8196** (Final) · **EIP-1559** · **Arbitrum Stylus SDK** · **ArbOS / Stylus** · **Robinhood Chain Ingress** · **Wasm `soil_core`** — each mapped to implementation anchors and verification probes in this wiki ([ExoMesh competitive matrix](#exomesh-competitive-matrix--edge-wasm-0-gas-pre-consensus-reference-implementation-judge-brief) · [active matrix](#active-evm-standard-compliance-matrix-v10-production) · [conceptual alignment targets](#conceptual-industry-alignment-targets-draft--emerging-eips) · [pre-consensus EIP defense matrix](#pre-consensus-eip-defense-matrix-erc-7683-eip-7702-erc-7710) · [summary table](#standards-summary-table) · [compliance posture](#compliance-posture) · [ArbOS/Stylus](#arbos-stylus-alignment-code-verified-on-chain-coprocessor) · [RPC/WSS](#infrastructure-rpc-wss-alchemy-ha)).

---

<a id="exomesh-competitive-matrix--edge-wasm-0-gas-pre-consensus-reference-implementation-judge-brief"></a>

## ExoMesh Competitive Matrix — Edge-Wasm 0-Gas Pre-Consensus Reference Implementation (Judge Brief)

> **Positioning thesis:** **SliverVine ExoMesh** ships a **Pre-Consensus Edge-Wasm [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) Reference Implementation (RI)** — policy executes in **client + Edge Wasm** **before** Arbitrum Sequencer / bundler ingress. Market wallets and AA bundlers optimize **post-broadcast** revert analytics or **on-chain** policy screens that **burn gas** on failure. ExoMesh severs the signing channel at **p50 ~15µs** reflex core (**SSRC soil <1.8µs** warm lane · **E2E p50 ~106µs** ExoMesh Edge gate) with **$0 gas** on `FAIL_CLOSED`.

```text
[ LLM / Agent / dApp Intent ]
        │
        ▼  ← ExoMesh intercept (T3 · microsecond reflex)
┌──────────────────────────────────────────────────────────────────────┐
│ EIP-1193 withRetailGuardProvider() · calldata-parser · guard-engine    │
│ wallet_sendCalls calls[] unfold · INTENT_RING_U32 · soil_core.wasm    │
│ RetailGuardRejectedError — NEVER calls baseProvider.request() on trip   │
└───────────────────────────────┬──────────────────────────────────────┘
                                ▼  ← Market default starts here (T1/T2)
              [ RPC / Bundler / L2 Sequencer / On-chain revert ]
```

### Master Matrix — Standard Market vs SliverVine ExoMesh

| # | Standard / attack surface | Status | **Standard market** (MetaMask-class wallets · ERC-4337 bundlers · solver networks) | **SliverVine ExoMesh** fail-closed implementation | Latency · gas | SSOT anchor | Verification |
|---|-------------------------|--------|-----------------------------------------------------------------------------------|-------------------------------------|---------------|-------------|--------------|
| **1** | **[EIP-1193](https://eips.ethereum.org/EIPS/eip-1193)** `eth_sendTransaction` · `eth_signTypedData_v4` | `[Final]` | Forward `request()` to RPC → user signs → tx enters mempool → **revert burns gas** · Permit/approve toxic spenders discovered **after** broadcast | `withRetailGuardProvider()` proxies `request()` · `evaluateRetailRisk()` runs transport sync · u32 calldata parse · approve/venue/soil/intent gates **before** `baseProvider.request()` · `RetailGuardRejectedError` = **0-Gas fail-closed** | **p50 ~106µs** E2E ALLOW · **p50 ~15µs** reflex severance · **$0** on reject | [provider.ts](../../../src/sdk/exomesh-agentic-wallet-guard/provider.ts) · [risk-evaluator.ts](../../../src/sdk/exomesh-agentic-wallet-guard/risk-evaluator.ts) · [guard-engine.ts](../../../src/sdk/exomesh-agentic-wallet-guard/guard-engine.ts) | [retail-guard-provider.test.ts](../../../tests/sdk/retail-guard-provider.test.ts) **35/35** |
| **1b** | **[EIP-5792](https://eips.ethereum.org/EIPS/eip-5792)** `wallet_sendCalls` | `[Final]` | Atomic `calls[]` batches **bypass** `eth_sendTransaction`-only guards · hidden approve + swap combos reach signer | `evaluateEip5792WalletSendCalls()` **unfolds** `params[0].calls[]` into send-tx risk stack · reuses `TX_PARAMS` pointer (zero per-call array alloc) · **one** `INTENT_RING_U32` attempt per batch · empty/malformed → `SEND_CALLS_BATCH_REJECTED` | Same as row 1 · batch = single intent-ring debit | [eip5792-send-calls.ts](../../../src/sdk/exomesh-agentic-wallet-guard/eip5792-send-calls.ts) | [eip5792-send-calls.test.ts](../../../tests/sdk/eip5792-send-calls.test.ts) **3/3** |
| **1c** | **[ERC-7540](https://eips.ethereum.org/EIPS/eip-7540)** async vault selectors | `[Final]` | Sync ERC-4626 guards miss `requestDeposit` / `setOperator` Pending→Claimable drift | [erc7540-async-escort.ts](../../../src/sdk/exomesh-agentic-wallet-guard/erc7540-async-escort.ts) — selector-level escort · operator whitelist + `evalAsyncVaultDriftBps` | **0-Gas** on reject | [erc7540-async-escort.ts](../../../src/sdk/exomesh-agentic-wallet-guard/erc7540-async-escort.ts) | `pnpm demo:sanctuary` · **3/3** |
| **2** | **[ERC-8196](https://eips.ethereum.org/EIPS/eip-8196)** Pre-Consensus Wasm policy gate | `[Final]` | **Solidity-only** on-chain `PolicyGuard` / module hooks — policy runs **at execution** · prompt-injection / calldata drift invisible until **gas spent** · no NL-immune bytecode predicates | **Off-chain RI (primary):** EIP-1193 middleware + [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) (`evaluateSoilViaWasm` · `intent_core_evaluate_gate`) · u32 selector dispatch (approve · Permit2 · router · ERC-7540) — **non-semantic** calldata fingerprints · **On-chain anchor:** [SliverVineAgentPolicyGuardV2.sol](../../../contracts/src/SliverVineAgentPolicyGuardV2.sol) settlement only after Edge PASS · **Stylus parity:** `check_soil_resistance_stylus()` | SSRC soil **<1.8µs** warm · reflex **p50 ~15µs** · artifact **<28 KiB** | [wasm-adapter.ts](../../../src/sdk/exomesh-agentic-wallet-guard/wasm-adapter.ts) · [calldata-parser.ts](../../../src/sdk/exomesh-agentic-wallet-guard/calldata-parser.ts) · [wasm-soil-ffi.ts](../../../src/core/wasm-soil-ffi.ts) · [stylus-probe/src/lib.rs](../../../contracts/stylus-probe/src/lib.rs) | [intent-sinking-audit.test.ts](../../../tests/core/intent-sinking-audit.test.ts) **11/11** · Stylus `cargo test` **9/9** |
| **3** | **Session mandate attenuation** | `[Final]` ERC-7715 · `[Conceptual]` ERC-8226 | Blind **EIP-712** session signing · ERC-4337 validation-phase rejection **after** bundler queue · no physical hot-key severance · cumulative agent spend caps unenforced at RPC layer | **Bitwise `INTENT_RING_U32` mandate slab** (256×4 word pre-alloc · **<16 KiB** / 10k iter **Zero-Allocation Hot-Path**) · `trackAttemptBudgetU32Pure()` default **3 strikes** → **4th attempt** `MAX_ATTEMPTS_EXCEEDED_SEVERED` + `severSigningChannel()` · `VENUE_DRIFT_REJECTED` on mask `&` target bit = 0 · session TTL via `verifySessionKeyValidity()` | Ring hot path **~0.5–1.1µs** pure TS · Wasm gate FFI parity | [intent-core-ring.ts](../../../src/core/intent-core-ring.ts) · [intent-core-buffers.ts](../../../src/core/intent-core-buffers.ts) · [session-key-guard-core.ts](../../../src/core/session-key-guard-core.ts) · [guard-engine.ts](../../../src/sdk/exomesh-agentic-wallet-guard/guard-engine.ts) | [intent-sinking-audit.test.ts](../../../tests/core/intent-sinking-audit.test.ts) zero-alloc worker **PASS** · [retail-guard-provider.test.ts](../../../tests/sdk/retail-guard-provider.test.ts) intent severance |
| **4** | **[ERC-7683](https://eips.ethereum.org/EIPS/eip-7683)** cross-chain intent | `[De-facto Industrial Draft]` | Solver fills `CrossChainOrder` post-signature · capital deployed before settlement · **MEV** + slippage overshoot | **Pre-Consensus Solver Integrity Lock & Semantic Alignment:** `evaluateErc7683CrossChainIntentGuard()` — pre-signature Edge simulation · [across-ingress-bridge.ts](../../../src/adapters/across-ingress-bridge.ts) — Solver Pre-flight Capital Lock (`IN_FLIGHT_BRIDGE_CAPITAL` → `SETTLED`) · `pnpm demo:ingress` | **sub-10ms** · SSRC **<1.8µs** | [erc7683-intent-guard.ts](../../../src/sdk/exomesh-agentic-wallet-guard/erc7683-intent-guard.ts) · [across-ingress-bridge.ts](../../../src/adapters/across-ingress-bridge.ts) | [erc7683-intent-guard.test.ts](../../../tests/sdk/erc7683-intent-guard.test.ts) **3/3** · `pnpm demo:ingress` |
| **5** | **[ERC-7579](https://eips.ethereum.org/EIPS/eip-7579)** modular AA hooks | `[De-facto Industrial Draft]` | On-chain TYPE(4) hooks incur EVM gas/latency; AML ingress lacks native wallet middleware | **v1.0 shipped:** Edge-isomorphic pre-UserOp policy (`assertExoMeshRiskGate()` + oracle read). **Post-grant:** TYPE-4 `installModule` pilot — hook **not** installed on Kernel today. | **Sub-1.8µs Wasm** pre-UserOp vs on-chain hook gas | [zerodev-aa-gate.ts](../../../src/adapters/arbitrum/zerodev-aa/zerodev-aa-gate.ts) · [risk-oracle-gate.ts](../../../src/services/aa-adapter/risk-oracle-gate.ts) | `pnpm demo:ingress` Route C · `pnpm test:zerodev` (mock) |

### Cross-Cutting Pre-Consensus Differentiation — ExoMesh vs Post-Broadcast Guards

| Dimension | Standard market | SliverVine ExoMesh |
|-----------|-----------------|-------------------|
| **Execution tier** | T1 on-chain settlement · T2 bundler/mempool | **T3 pre-Sequencer** — only tier that can sever EIP-712 at μs scale |
| **Reject gas cost** | Revert gas + failed UserOp sponsorship | **$0** — `baseProvider.request()` never invoked on `FAIL_CLOSED` |
| **Policy plane** | Solidity modules · off-chain analytics dashboards | **Edge Wasm `soil_core`** + TS gateway · Stylus on-chain **reinforcement** (not substitute) |
| **Memory model** | Per-RPC heap churn · `BigInt` / object alloc on hot path | **Zero-Allocation Hot-Path Engine** — `INTENT_RING_U32` · `CALLDATA_SCRATCH` · `SOIL_LANE_SCRATCH` · reusable `DataView` FFI buffers |
| **Batch / agent surface** | `wallet_sendCalls` opaque to legacy guards | **calls[] pointer unpack** · single intent-ring budget per atomic batch |
| **Proof discipline** | Vendor claims · post-mortem | **254 test files · 1206 PASS** · `pnpm exec tsc --noEmit` 0 errors · `pnpm demo:gmx -- --trip` live severance |

> **Judge one-liner:** Competitors sell **safer mempools** or **smarter solvers**. ExoMesh sells **involuntary reflex** — toxic intent never reaches the Sequencer queue.

---

## Active EVM Standard Compliance Matrix (v1.0 Production)

Five standards form the **active C-end / on-chain compliance spine** — each row maps to live TypeScript or Solidity SSOT in this repository.

| # | Standard | Status | SliverVine role | Implementation anchor | Verification |
|---|----------|--------|--------------|----------------------|--------------|
| **1** | **ExoMesh Agentic Guard (EIP-1193/5792/6963+)** — [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) / [EIP-5792](https://eips.ethereum.org/EIPS/eip-5792) / [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) | `[Final]` | Universal provider middleware — pre-consensus `request()` intercept | [withRetailGuardProvider()](../../../src/sdk/exomesh-agentic-wallet-guard/provider.ts) · guards `eth_sendTransaction` / `eth_signTypedData_v4` / `wallet_sendCalls` · [eip5792-send-calls.ts](../../../src/sdk/exomesh-agentic-wallet-guard/eip5792-send-calls.ts) | [retail-guard-provider.test.ts](../../../tests/sdk/retail-guard-provider.test.ts) **35/35** · [eip5792-send-calls.test.ts](../../../tests/sdk/eip5792-send-calls.test.ts) **3/3** |
| **2** | **[ERC-7540+](https://eips.ethereum.org/EIPS/eip-7540)** Sanctuary Async Escort | `[Final]` | Selector-level async vault escort — Pending→Claimable drift + operator lock | [erc7540-async-escort.ts](../../../src/sdk/exomesh-agentic-wallet-guard/erc7540-async-escort.ts) | `pnpm demo:sanctuary` · **3/3** |
| **3** | **[ERC-7683](https://eips.ethereum.org/EIPS/eip-7683)** cross-chain intent | `[De-facto Industrial Draft]` | Pre-Consensus Solver Integrity Lock & Semantic Alignment | [erc7683-intent-guard.ts](../../../src/sdk/exomesh-agentic-wallet-guard/erc7683-intent-guard.ts) · [across-ingress-bridge.ts](../../../src/adapters/across-ingress-bridge.ts) | `pnpm demo:ingress` · **3/3** |
| **4** | **[ERC-7579](https://eips.ethereum.org/EIPS/eip-7579)** modular AA hooks | `[De-facto Industrial Draft]` | **v1.0:** pre-UserOp policy + oracle read. **Post-grant:** TYPE-4 hook install. | [zerodev-aa-gate.ts](../../../src/adapters/arbitrum/zerodev-aa/zerodev-aa-gate.ts) · [risk-oracle-gate.ts](../../../src/services/aa-adapter/risk-oracle-gate.ts) | `pnpm demo:ingress` Route C · `pnpm test:zerodev` (mock) |
| **5** | **[EIP-712](https://eips.ethereum.org/EIPS/eip-712)** | `[Final]` | Off-chain typed structured data parsing & **pre-signing severance** | Retail Guard: [risk-evaluator.ts](../../../src/sdk/exomesh-agentic-wallet-guard/risk-evaluator.ts) · Gate: [SliverVineGate.sol](../../../SliverVineGate/src/SliverVineGate.sol) · severance: [root-protection-core.ts](../../../src/core/root-protection-core.ts) | Forge Gate I1–I12 · `pnpm demo:gmx -- --trip` |
| **6** | **[ERC-4337](https://eips.ethereum.org/EIPS/eip-4337)** | `[Final]` | Agentic modular AA on-chain policy guard | [SliverVineAgentPolicyGuardV2.sol](../../../contracts/src/SliverVineAgentPolicyGuardV2.sol) · live **42161** [0x5df192…774bc](https://arbiscan.io/address/0x5df192f9454fd02a89e768632cb5da0762a774bc) · ZeroDev Kernel v3 | Forge PolicyGuard **9/9** |
| **7** | **ERC-2612** / **Permit2** | `[Final]` | Zero-gas allowance extraterritorial defense — block toxic approvals pre-broadcast | [calldata-parser.ts](../../../src/sdk/exomesh-agentic-wallet-guard/calldata-parser.ts) · [risk-evaluator.ts](../../../src/sdk/exomesh-agentic-wallet-guard/risk-evaluator.ts) | Permit2 parse + block in [retail-guard-provider.test.ts](../../../tests/sdk/retail-guard-provider.test.ts) |

> **ERC-8196 attribution (not a product venue):** [ERC-8196](https://eips.ethereum.org/EIPS/eip-8196) is documented below as **Factual EIP Attribution & Historical Co-authoring Reference** (Virtuals Protocol co-authored the finalized standard). It is **not** a native venue adapter in the 5-Core Venue Matrix — see [§ ERC-8196](#erc-8196--factual-eip-attribution--historical-co-authoring-reference-not-a-venue-adapter).

### Live SSOT Anchors

| Anchor | Value |
|--------|-------|
| **Vitest baseline** | **254 test files | 1206 PASS clean (100%)** · `pnpm test -- --run` · `pnpm exec tsc --noEmit` **0 errors** |
| **Wasm hot path** | [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) **< 28 KiB** · warm exec **< 60 µs** · Edge p50 ~106 µs |
| **Worker bundle** | **111.19 KiB raw** · **40.5 KiB gzip** hot-path (`pnpm bundle:measure` · `limitKiB: 150` · `pass: true`) |
| **Arbitrum One Gate (ExoMesh)** | [0x71D7d26f98110c5DE3df0fCbddCf2A3A2BC6e2f1](https://arbiscan.io/address/0x71d7d26f98110c5de3df0fcbddcf2a3a2bc6e2f1) |
| **Stylus coprocessor** | `SliverVineSoilCoprocessor` · [contracts/stylus-probe/src/lib.rs](../../../contracts/stylus-probe/src/lib.rs) · Stylus SDK **0.10.7** · `cargo test` **9/9 PASS** |

---

<a id="emerging-standards--edge-wasm-reference-implementations-erc-8196-erc-77158226-eip-80798105"></a>

<a id="conceptual-industry-alignment-targets-draft--emerging-eips"></a>

## Conceptual Industry Alignment Targets (Tier 3 — Draft / Emerging EIPs)

> **Tier 3 — `[Unrelated Draft — Not Implemented]`:** The subsections below describe **conceptual industry alignment targets** only. SliverVine does **not** claim to implement these draft EIPs as normative specifications. Production code is anchored to **Tier 1 `[Final]`** standards ([EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) · [EIP-5792](https://eips.ethereum.org/EIPS/eip-5792) · [ERC-7540](https://eips.ethereum.org/EIPS/eip-7540)) and **Tier 2 `[De-facto Industrial Draft]`** alignments ([ERC-7683](https://eips.ethereum.org/EIPS/eip-7683) · [ERC-7579](https://eips.ethereum.org/EIPS/eip-7579)) via the [ExoMesh competitive matrix](#exomesh-competitive-matrix--edge-wasm-0-gas-pre-consensus-reference-implementation-judge-brief) and [active matrix](#active-evm-standard-compliance-matrix-v10-production).

SliverVine's **Off-Chain Client/Edge Pre-Consensus Intent Firewall** solves the same *problem spaces* that several draft proposals address — without claiming EIP conformance:

```text
[ LLM / Agent Intent ]
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│ Layer A — EIP-1193 Retail Guard (adopted · production RI)     │
│ withRetailGuardProvider() · calldata-parser · guard-engine  │
│ p50 ~106µs E2E · p50 ~15µs reflex · 0-Gas on reject         │
└───────────────────────────┬───────────────────────────────┘
                            ▼
┌───────────────────────────────────────────────────────────┐
│ Layer B — Session mandate attenuation (ERC-7715 delivered)  │
│ INTENT_RING_U32 · session-key-guard · agentic-auto-roll     │
└───────────────────────────┬───────────────────────────────┘
                            ▼
┌───────────────────────────────────────────────────────────┐
│ Layer C — Off-Chain Pre-Consensus Intent Firewall           │
│ Local Wasm policy eval + instant reject BEFORE Sequencer    │
│ Tier 3: unrelated to EIP-8105 encrypted mempool drafts      │
└───────────────────────────┬───────────────────────────────┘
                            ▼
              [ Arbitrum Sequencer / Bundler ingress ]
```

<a id="erc-8196--erc-8118--ai-agent-authenticated-wallet-off-chain-reference-implementation"></a>

### ERC-8196 — Final Standard (Production) + ERC-8118 — Conceptual Alignment Target

| Layer | SliverVine binding | Status |
|-------|-----------------|--------|
| **Off-chain RI (primary)** | [withRetailGuardProvider()](../../../src/sdk/exomesh-agentic-wallet-guard/provider.ts) — EIP-1193 middleware implementing **ERC-8196 Final** pre-execution policy for AI agent wallets **before** `eth_sendTransaction` reaches any RPC | ✅ **Production** |
| **Calldata / prompt-injection defense** | u32 selector dispatch on toxic calldata (approve · Permit2 · router swaps) — **non-semantic bytecode predicates** immune to NL jailbreak at signing layer | ✅ **Production** — [calldata-parser.ts](../../../src/sdk/exomesh-agentic-wallet-guard/calldata-parser.ts) |
| **Edge SSRC soil fuse** | `evaluateSoilViaWasm()` / `checkSoilResistance()` — sub-ms bitmask evaluation on slippage · depth · cross-venue drift | ✅ **Production** |
| **On-chain anchor** | [ERC-8196](https://eips.ethereum.org/EIPS/eip-8196) **Final** — [SliverVineAgentPolicyGuardV2.sol](../../../contracts/src/SliverVineAgentPolicyGuardV2.sol) settlement-plane policy screen | ✅ Live **42161** [0x5df192…774bc](https://arbiscan.io/address/0x5df192f9454fd02a89e768632cb5da0762a774bc) |
| **[ERC-8118](https://eips.ethereum.org/EIPS/eip-8118) (draft)** | Draft companion for authenticated agent wallet surfaces — **conceptual alignment target only**; SliverVine ExoMesh routes via EIP-1193 RI + PolicyGuard V2; **not** a separate product adapter · **not** a claimed ERC-8118 implementation | ⏳ **Conceptual target** |

**0-Gas invariant:** Rejected intents throw `RetailGuardRejectedError` locally — **no Sequencer gas** consumed. Latency: **p50 ~106µs** E2E ExoMesh Edge gate · **p50 ~15µs** Wasm reflex core on `--trip` severance (sub-10ms wall-clock budget, deterministic).

### ERC-7715 — Delivered (Kernel v3) + ERC-8226 — Conceptual Alignment Target

| Concern | SliverVine implementation | Status |
|---------|------------------------|--------|
| **Scoped session mandates** | `allowedVenues[]` bitmask · `VENUE_DRIFT_REJECTED` on unauthorized venue hops | ✅ **Production** — [intent-mandate.ts](../../../src/core/intent-mandate.ts) |
| **Session-key TTL / clip** | `verifySessionKeyValidity()` — expiry + clock-drift buffer before HL order broadcast | ✅ **Production** — [session-key-guard-core.ts](../../../src/core/session-key-guard-core.ts) |
| **Zero-gas attempt attenuation** | `INTENT_RING_U32` ring slab — `trackAttemptBudgetU32Pure()` · default **3 attempts** → `MAX_ATTEMPTS_EXCEEDED_SEVERED` · `severSigningChannel()` | ✅ **Production** |
| **Pendle Shield Option 3 (agentic roll)** | `evaluateAgenticRollGate()` — PT/YT roll actions gated by yield drift · expiry · hallucinated amount | ✅ **Production** — [agentic-auto-roll-gate.ts](../../../src/services/api/pendle-shield/agentic-auto-roll-gate.ts) |
| **[ERC-8226](https://eips.ethereum.org/EIPS/eip-8226) (draft)** | Permission attenuation / delegation decay — **conceptual alignment target**; Kernel v3 session modules + `INTENT_RING_U32` severance share problem space; universal ERC-8226 wallet API **not** claimed | ⏳ **Conceptual target** |

**Verification:** `npx vitest run tests/sdk/retail-guard-provider.test.ts` **35/35** · `npx vitest run tests/core/intent-sinking-audit.test.ts` **11/11** · Pendle roll gate unit tests.

### Tier 3 — Unrelated Draft Proposals `[Unrelated Draft — Not Implemented]`

| Draft EIP | Status | What it proposes | SliverVine posture |
|-----------|--------|------------------|-------------------|
| **[EIP-8079](https://eips.ethereum.org/EIPS/eip-8079)** | `[Unrelated Draft — Not Implemented]` | Client-side security firewall between dApp/agent and wallet | **No implementation claim** — Tier 1 EIP-1193 middleware solves the same *client-side pre-broadcast* problem space via production code |
| **[EIP-8105](https://eips.ethereum.org/EIPS/eip-8105)** | `[Unrelated Draft — Not Implemented]` | L1 **Universal Enshrined Encrypted Mempool** — encrypted transaction ordering at protocol layer | **Explicitly unrelated.** SliverVine is an **Off-Chain Client/Edge Pre-Consensus Intent Firewall** — fundamentally different from an L1 encrypted mempool |

| Production behavior (problem-space overlap) | SSOT |
|---------------------------------------------|------|
| `evaluateRetailRisk()` runs full policy stack locally before wallet broadcast | [guard-engine.ts](../../../src/sdk/exomesh-agentic-wallet-guard/guard-engine.ts) · [provider.ts](../../../src/sdk/exomesh-agentic-wallet-guard/provider.ts) |
| Fail-closed paths never call `baseProvider.request()` — tx does not enter L2 Sequencer queue | `RetailGuardRejectedError` in [provider.ts](../../../src/sdk/exomesh-agentic-wallet-guard/provider.ts) |
| Wasm bitmask parallel eval on soil / slippage / depth lanes | [wasm-soil-ffi.ts](../../../src/core/wasm-soil-ffi.ts) · [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) |

> **Engineering thesis:** Competitors optimize **post-execution** analytics or **on-chain** governance delays. SliverVine's Edge-Wasm firewall executes **pre-Sequencer** — the only tier that can sever EIP-712 at **p50 ~15µs** with **$0 gas** on rejection.

<a id="next-gen-eip-defense-matrix-erc-7683-eip-7702-erc-7710"></a>

<a id="pre-consensus-eip-defense-matrix-erc-7683-eip-7702-erc-7710"></a>

### Pre-Consensus EIP Defense Matrix (ERC-7683, ERC-7579, EIP-7702, ERC-7710)

Production guards extend the Pre-Consensus Edge-Wasm reference implementation into cross-chain intents, modular AA hooks, EOA delegation, and zero-gas intent expiry — each bound to a dedicated Vitest proof anchor.

| Standard | Status | Architectural gap | Fail-closed implementation | Implementation SSOT | Verification |
|----------|--------|-------------------|----------------------|---------------------|--------------|
| **[ERC-7683](https://eips.ethereum.org/EIPS/eip-7683)** | `[De-facto Industrial Draft]` | Solver MEV and slippage exploitation on `CrossChainOrder` fills before signature release | **Pre-Consensus Solver Integrity Lock & Semantic Alignment** — execution delta + solver MEV bps gate (**sub-10ms**) | [erc7683-intent-guard.ts](../../../src/sdk/exomesh-agentic-wallet-guard/erc7683-intent-guard.ts) · [across-ingress-bridge.ts](../../../src/adapters/across-ingress-bridge.ts) | [erc7683-intent-guard.test.ts](../../../tests/sdk/erc7683-intent-guard.test.ts) **3/3** · `pnpm demo:ingress` |
| **[ERC-7579](https://eips.ethereum.org/EIPS/eip-7579)** | `[De-facto Industrial Draft]` | On-chain TYPE(4) hooks incur EVM gas/latency; AML ingress lacks native wallet middleware | **v1.0:** pre-UserOp oracle read + ingress policy. **Post-grant:** TYPE-4 Kernel hook install (V1.5 Track A). | [zerodev-aa-gate.ts](../../../src/adapters/arbitrum/zerodev-aa/zerodev-aa-gate.ts) · [risk-oracle-gate.ts](../../../src/services/aa-adapter/risk-oracle-gate.ts) | `pnpm demo:ingress` Route C · `pnpm test:zerodev` (mock) |
| **[EIP-7702](https://eips.ethereum.org/EIPS/eip-7702)** | `[Final]` | Prompt-injected EOA delegation can install malicious implementation bytecode pre-broadcast | Decodes `authorization` tuples · whitelisted implementation invariant matrix · blocked-address denylist | [eip7702-auth-guard.ts](../../../src/sdk/exomesh-agentic-wallet-guard/eip7702-auth-guard.ts) | [eip7702-auth-guard.test.ts](../../../tests/sdk/eip7702-auth-guard.test.ts) **3/3** |
| **[ERC-7710](https://eips.ethereum.org/EIPS/eip-7710)** | `[De-facto Industrial Draft]` | No zero-gas cancellation path when soil resistance trips before sequencer inclusion | Couples `rootProtection()` (**p50 ~15µs**) with Permit2 deadline expiry cancellation signal on soil trip | [erc7710-intent-expiry.ts](../../../src/services/api/pendle-shield/erc7710-intent-expiry.ts) | [erc7710-intent-expiry.test.ts](../../../tests/services/api/erc7710-intent-expiry.test.ts) **2/2** |

```text
[ CrossChainOrder / EIP-7702 auth / ERC-7710 delegation ]
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│ Layer D — ERC-7683 cross-chain intent guard                 │
│ erc7683-intent-guard.ts · solver MEV bps · slippage delta  │
└───────────────────────────┬───────────────────────────────┘
                            ▼
┌───────────────────────────────────────────────────────────┐
│ Layer E — EIP-7702 authorization inspector                  │
│ eip7702-auth-guard.ts · bytecode invariant · whitelist      │
└───────────────────────────┬───────────────────────────────┘
                            ▼
┌───────────────────────────────────────────────────────────┐
│ Layer F — ERC-7710 zero-gas expiry + rootProtection()       │
│ erc7710-intent-expiry.ts · p50 ~15µs severance on soil trip │
└───────────────────────────┬───────────────────────────────┘
                            ▼
              [ Arbitrum Sequencer / Bundler ingress ]
```

---

## Standards Summary Table

| Standard | Status | Role in SliverVine Protocol | Implementation anchor | Verification |
|----------|--------|-----------------|----------------------|--------------|
| **[EIP-1193](https://eips.ethereum.org/EIPS/eip-1193)** | `[Final]` | Ethereum Provider JavaScript API — pre-consensus wallet guard middleware | `withRetailGuardProvider` · [provider.ts](../../../src/sdk/exomesh-agentic-wallet-guard/provider.ts) | [retail-guard-provider.test.ts](../../../tests/sdk/retail-guard-provider.test.ts) **35/35** |
| **[EIP-5792](https://eips.ethereum.org/EIPS/eip-5792)** | `[Final]` | Wallet Call API — `wallet_sendCalls` batch unfold into retail risk stack | [eip5792-send-calls.ts](../../../src/sdk/exomesh-agentic-wallet-guard/eip5792-send-calls.ts) | **3/3** |
| **[ERC-7540](https://eips.ethereum.org/EIPS/eip-7540)** | `[Final]` | Async vault selector-level escort — Pending→Claimable drift + operator lock | [erc7540-async-escort.ts](../../../src/sdk/exomesh-agentic-wallet-guard/erc7540-async-escort.ts) | `pnpm demo:sanctuary` · **3/3** |
| **[ERC-7683](https://eips.ethereum.org/EIPS/eip-7683)** | `[De-facto Industrial Draft]` | Pre-Consensus Solver Integrity Lock & Semantic Alignment | [erc7683-intent-guard.ts](../../../src/sdk/exomesh-agentic-wallet-guard/erc7683-intent-guard.ts) · [across-ingress-bridge.ts](../../../src/adapters/across-ingress-bridge.ts) | **3/3** · `pnpm demo:ingress` |
| **[ERC-7579](https://eips.ethereum.org/EIPS/eip-7579)** | `[De-facto Industrial Draft]` | **v1.0:** pre-UserOp policy + oracle read. **Post-grant:** TYPE-4 hook install. | [zerodev-aa-gate.ts](../../../src/adapters/arbitrum/zerodev-aa/zerodev-aa-gate.ts) · [risk-oracle-gate.ts](../../../src/services/aa-adapter/risk-oracle-gate.ts) | `pnpm demo:ingress` Route C · `pnpm test:zerodev` (mock) |
| **[ERC-4337](https://eips.ethereum.org/EIPS/eip-4337)** | `[Final]` | Account Abstraction — scoped agent UserOps without hot-wallet custody | ZeroDev Kernel **v0.3.1** · EntryPoint **v0.7** · [src/adapters/arbitrum/zerodev-aa/](../../../src/adapters/arbitrum/zerodev-aa) | ZeroDev AA gate · aa-adapter tests |
| **[EIP-7562](https://eips.ethereum.org/EIPS/eip-7562)** | `[Final]` | AA storage-access rules — **Zero-Bundler-Rejection Invariant** | Session-key `callData` whitelist · static breaker · `BUNDLER_TIMEOUT_FAIL_CLOSED` | [zerodev-aa-bundler.ts](../../../src/adapters/arbitrum/zerodev-aa/zerodev-aa-bundler.ts) |
| **[EIP-712](https://eips.ethereum.org/EIPS/eip-712)** | `[Final]` | Typed structured data hashing · domain binding `SliverVineExoMesh` | [SliverVineGate.sol/](../../../SliverVineGate/out/SliverVineGate.sol) · [src/sdk/constants.ts](../../../src/sdk/constants.ts) | Forge I1–I12 · SDK ExoMesh domain tests |
| **[ERC-1271](https://eips.ethereum.org/EIPS/eip-1271)** | `[Final]` | Contract signature validation for Kernel smart accounts | ZeroDev Kernel `isValidSignature` · Gate ECDSA m-of-n on `RiskAttestation` | Gate Forge suite · agent-intent SDK |
| **[ERC-20](https://eips.ethereum.org/EIPS/eip-20) / [ERC-777](https://eips.ethereum.org/EIPS/eip-777)** | `[Final]` | Non-custodial asset transfer & in-flight escrow semantics | `GMX_USDC_ARBITRUM` · [across-ingress-bridge.ts](../../../src/adapters/across-ingress-bridge.ts) | [across-ingress-bridge.test.ts](../../../tests/adapters/across-ingress-bridge.test.ts) **6/6** |
| **[OpenZeppelin Contracts v5](https://docs.openzeppelin.com/contracts/5.x/)** | `[Final]` | On-chain gate access control & reentrancy guard | [SliverVineGate.sol/](../../../SliverVineGate/out/SliverVineGate.sol) · [IngressSafetySwitch.sol](../../../contracts/IngressSafetySwitch.sol) | Foundry Gate **60 passed** |
| **Solidity Custom Errors** | `[Final]` | Bytecode-efficient fail-closed ingress with telemetry-compatible `ERR_*` events | [SliverVineRiskOracle.sol](../../../contracts/SliverVineRiskOracle.sol) · [IngressSafetySwitch.sol](../../../contracts/IngressSafetySwitch.sol) | Foundry oracle/switch tests |
| **[EIP-7702](https://eips.ethereum.org/EIPS/eip-7702)** | `[Final]` | EOA Account Abstraction via `SetCode` — `authorization` tuple whitelist | [eip7702-auth-guard.ts](../../../src/sdk/exomesh-agentic-wallet-guard/eip7702-auth-guard.ts) | **3/3** · Kernel v4 adapter ⏳ V1.5 |
| **[ERC-7710](https://eips.ethereum.org/EIPS/eip-7710)** | `[De-facto Industrial Draft]` | Intent-based delegations & expiry — zero-gas cancellation on soil trip | [erc7710-intent-expiry.ts](../../../src/services/api/pendle-shield/erc7710-intent-expiry.ts) · `rootProtection()` | **2/2** |
| **[ERC-7715](https://eips.ethereum.org/EIPS/eip-7715)** | `[Final]` | Advanced Wallet Permissions — session-key permission evolution target | [session-key-gates.ts](../../../src/services/session-key-adapter-lib/session-key-gates.ts) · ZeroDev Kernel v3 session adapter | ✅ v1.0 Delivered (Kernel v3) |
| **[ERC-8196](https://eips.ethereum.org/EIPS/eip-8196)** | `[Final]` | **Factual EIP attribution** — AI Agent Wallet Policy standard; on-chain policy screen via PolicyGuard lineage | [SliverVineAgentPolicyGuardV2.sol](../../../contracts/src/SliverVineAgentPolicyGuardV2.sol) · **not** a venue adapter | Foundry PolicyGuard suite · live **42161** [0x5df192…774bc](https://arbiscan.io/address/0x5df192f9454fd02a89e768632cb5da0762a774bc) |
| **[EIP-6963](https://eips.ethereum.org/EIPS/eip-6963)** | `[Final]` | Multi Injected Provider Discovery — guarded provider announcement | `announceGuardedProvider` · [provider.ts](../../../src/sdk/exomesh-agentic-wallet-guard/provider.ts) | [retail-guard-provider.test.ts](../../../tests/sdk/retail-guard-provider.test.ts) |
| **ERC-2612 / Permit2** | `[Final]` | Zero-gas allowance extraterritorial defense | [calldata-parser.ts](../../../src/sdk/exomesh-agentic-wallet-guard/calldata-parser.ts) · [risk-evaluator.ts](../../../src/sdk/exomesh-agentic-wallet-guard/risk-evaluator.ts) | Retail guard Vitest |
| **[EIP-1559](https://eips.ethereum.org/EIPS/eip-1559)** | `[Final]` | Dynamic base-fee congestion sensing on Arbitrum One | Tri-Sensor **BaseFee Velocity** · [arbitrum-gas-guard.ts](../../../src/services/risk/arbitrum-gas-guard.ts) | Gas-guard tests |
| **[Arbitrum Stylus SDK](https://github.com/OffchainLabs/stylus-sdk-rs)** | `[Final]` | WASM Soil Coprocessor Alignment — on-chain soil parity with Edge | [contracts/stylus-probe/src/lib.rs](../../../contracts/stylus-probe/src/lib.rs) · `SliverVineSoilCoprocessor` | `cargo test` **9/9** · `pnpm build:stylus` |
| **ArbOS 61** | `[Design Spec]` | Arbitrum L2 execution / Stylus co-residence alignment | [IngressSafetySwitch.sol](../../../contracts/IngressSafetySwitch.sol) | ⏳ V1.0 Design Spec |
| **Robinhood Chain Ingress** | `[Final]` | Permissioned institutional egress · AML inbound isolation | Chains **46630** / **4663** · Across bridge · [IngressSafetySwitch.sol](../../../contracts/IngressSafetySwitch.sol) | Across bridge tests |
| **WASM Core (`soil_core`)** | `[Final]` | Sub-ms pre-execution soil fuse · Cloudflare Edge hot path | [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) · **< 28 KiB** · warm exec **< 60 µs** | Wasm feasibility suite |
| **Clock / L2 timestamp monotonicity** | `[Final]` EIP-1482-class | RPC `block.timestamp` high-watermark · leap / NTP fail-closed | [monotonic-time.ts](../../../src/core/monotonic-time.ts) · [rpc-radar.ts](../../../src/services/adapters/rpc-radar.ts) | **14/14** |

---

## ERC/EIP Standards Reference Wiki

### ERC-4337 — Account Abstraction & UserOperation Structure

> **Deep specification:** [Technical Specification §2.4](../01_core_specs/01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md) Pillar Set X — ZeroDev Account Abstraction (Kernel v3/v4 · Paymaster · EIP-7562 · v4 Seven Stages roadmap).

| Field | SliverVine binding |
|-------|-----------------|
| **EntryPoint** | `entryPoint07Address` — SSOT `ZERODEV_ENTRY_POINT_ADDRESS` |
| **Kernel** | ZeroDev Kernel **v0.3.1** (`ZERODEV_KERNEL_VERSION`) — v4 adapter swap ⏳ Post-Grant (V1.5)（[§2.4.2](../01_core_specs/01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md)） |
| **UserOp draft** | `sender` · `nonce` · `callData` · optional `factory`/`factoryData` · gas limits · `paymaster`/`paymasterData` · `signature` |
| **Paymaster** | ZeroDev `zerodev.sponsorUserOperation` — per-op ≤ $0.50 · daily $10 · [zerodev-aa-gas-ledger.ts](../../../src/adapters/arbitrum/zerodev-aa/zerodev-aa-gas-ledger.ts) |
| **Pre-broadcast gate** | `verifyAgentIntent()` — `AllowedToSign = Injection ∧ Digest ∧ Soil ∧ Session ∧ Gas ∧ Attestation ∧ Armor ∧ Wasm` |
| **106 µs decoupling** | Shield (`checkSoilResistance` · [pkg/soil_core.wasm](../../../pkg/soil_core.wasm)) runs **before** paymaster sign + bundler dispatch — Wasm powers sub-ms latency; ZeroDev is opt-in delivery only |

UserOps are drafted locally, sponsored via ZeroDev paymaster middleware, and submitted only after Edge soil + static-breaker evaluation. Bundler RPC MUST advertise EntryPoint v0.7 (`supportsEntryPoint07`). ZeroDev is the **opt-in non-custodial delivery substrate** (Pillar Set X); ReflexCore (SSRC) Edge is the **pre-broadcast decision SSOT** ([§2.4.1](../01_core_specs/01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md)).

### EIP-7562 — Account Abstraction Storage Access Rules

**Zero-Bundler-Rejection Invariant:** ExoMesh-gated UserOps MUST NOT violate EIP-7562 opcode/storage rules during the validation phase; bundler rejection is treated as a **protocol fault**, not a retry signal. See [Technical Specification §2.4.4](../01_core_specs/01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md).

| Rule | Enforcement |
|------|-------------|
| Validation-phase storage reads | Session-key modules restrict `callData` to whitelisted targets/selectors — no forbidden cross-contract reads |
| Edge pre-screen | `evaluateStaticBreakerMatrix()` — soil first, then gas ledger, before `sendUserOperation()` |
| Fail-closed | Bundler unreachable, missing EP v0.7, or timeout → `BUNDLER_TIMEOUT_FAIL_CLOSED` (`ZERODEV_BUNDLER_FAIL_CLOSED_TIMEOUT_MS` = 3_000`) |
| Verification | [zerodev-aa-bundler.ts](../../../src/adapters/arbitrum/zerodev-aa/zerodev-aa-bundler.ts) · `supportsEntryPoint07` probe · aa-adapter Vitest suite |

### EIP-712 — Typed Structured Data Hashing & Domain Binding

| Component | Value |
|-----------|-------|
| **Domain `name`** | `SliverVineExoMesh` (`GATE_EIP712_DOMAIN_EXOMESH_WIRE` / `EIP712_DOMAIN_NAME`) · legacy `SliverVineExoMesh` → superseded Gate `0xb174…` only |
| **Domain `version`** | `1` (`EIP712_DOMAIN_VERSION`) |
| **Domain `chainId`** | Live `block.chainid` — cached immutable in Gate constructor |
| **Domain `verifyingContract`** | `SliverVineGate` address (`SLIVERVINE_GATE_ADDRESS`) |
| **Primary type** | `RiskAttestation(bytes32 payloadHash, address subject, uint8 verdict, uint16 riskBps, uint64 issuedAt, uint64 expiresAt, uint256 nonce)` |
| **Digest** | `keccak256("\x19\x01" ‖ domainSeparator ‖ structHash)` — single-use via `consumed[digest]` at `verifyAndConsume` |

SDK envelopes mirror Gate domain binding: `evaluateAttestation()` rejects mismatched `verifyingContract` or `domainName`. Cross-chain replay is denied at L1 consumption.

### ERC-1271 — Standard Signature Validation Method for Contracts

| Path | Mechanism |
|------|-----------|
| **Kernel (ERC-4337)** | ZeroDev Kernel validates session-key proofs via `isValidSignature(bytes32 hash, bytes signature)` — magic value `0x1626ba7e` |
| **Gate (L1 attestation)** | m-of-n ECDSA on `RiskAttestation` EIP-712 digest — OZ-aligned `ECDSA.tryRecover`, non-malleable `s` |
| **UserOp `signature`** | Module-bound session proof consumed by Kernel validation hook, not raw EOA sig |

Edge `verifyAgentIntent()` validates attestation envelope shape; on-chain ERC-1271 / ECDSA verification occurs at Kernel validateUserOp and Gate `verifyAndConsume` respectively.

### EIP-1193 — Ethereum Provider JavaScript API (Wallet Guard Middleware)

| Field | SliverVine binding |
|-------|-----------------|
| **Wrapper** | `withRetailGuardProvider(baseProvider, config)` — proxies `request()` on the injected provider |
| **Guarded methods** | `eth_sendTransaction` · `eth_signTypedData_v4` · [EIP-5792](https://eips.ethereum.org/EIPS/eip-5792) `wallet_sendCalls` — evaluated **before** `baseProvider.request()` |
| **Risk stack** | `evaluateRetailRisk()` → RPC transport protocol · calldata parse · approve gate · venue allowlist · soil gate · intent ring |
| **Fail-closed** | `RetailGuardRejectedError` thrown pre-broadcast — **0-Gas** on rejection; tx never reaches RPC |
| **Package** | `@slivervine/exomesh-agentic-wallet-guard` · Apache-2.0 wrapper · Wasm IP [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) |

The Wallet Guard is an EIP-1193 **middleware layer**, not a replacement wallet. Integrators wrap `window.ethereum` (or any compliant provider) and retain full downstream signing semantics when policy passes.

### EIP-5792 — Wallet Call API (`wallet_sendCalls`)

Agent wallets and modern injectors submit atomic batches via `wallet_sendCalls`, which **does not** pass through `eth_sendTransaction`. SliverVine ExoMesh unfolds `params[0].calls[]` into the existing `evaluateRetailRisk()` send-tx stack (approve · venue · soil) and increments `INTENT_RING_U32` **once per batch**. Empty or malformed `calls[]` returns `SEND_CALLS_BATCH_REJECTED` (0-Gas).

| Field | SliverVine binding |
|-------|-----------------|
| **SSOT** | [eip5792-send-calls.ts](../../../src/sdk/exomesh-agentic-wallet-guard/eip5792-send-calls.ts) |
| **Ingress** | `withRetailGuardProvider()` · method `wallet_sendCalls` |
| **Verification** | `npx vitest run tests/sdk/eip5792-send-calls.test.ts` **3/3 PASS** |

<a id="erc-7540--asynchronous-erc-4626-vault-token-sanctuary-escort"></a>

### Sanctuary Async Escort (ERC-7540+) — ERC-7540 Async Vault Escort Extension

Selector-level escort for async vault `requestDeposit`, `requestRedeem`, and `setOperator` — non-whitelisted operators fail-closed; Pending→Claimable slippage drift gate. **100% ERC-7540-compliant** calldata surface, extended into a **0-Gas pre-consensus superset**. Tagged **`[Sanctuary]`** (Module B).

| Field | Sanctuary binding |
|-------|-------------------|
| **SSOT** | [erc7540-async-escort.ts](../../../src/sdk/exomesh-agentic-wallet-guard/erc7540-async-escort.ts) |
| **Ingress** | `evaluateErc7540FromParsedCalldata()` via `evaluateRetailRisk()` |
| **Verification** | `pnpm demo:sanctuary` (`demo:escort` alias) `[Sanctuary]` |
| **Unit SSOT** | [erc7540-async-escort.test.ts](../../../tests/erc7540-async-escort.test.ts) **3/3 PASS** |

### EIP-6963 — Multi Injected Provider Discovery (Guarded Provider Announcement)

| Field | SliverVine binding |
|-------|-----------------|
| **Entry** | `announceGuardedProvider(baseProvider, config, options?)` |
| **Announce event** | `eip6963:announceProvider` with `{ info, provider }` detail |
| **Request listener** | `eip6963:requestProvider` → re-announce on dApp discovery |
| **Default metadata** | `name`: `SliverVine ExoMesh Agentic Guard (EIP-1193+)` · `rdns`: `io.slivervine.agenticretailwalletguard` |
| **SSR / Node fallback** | When `dispatchEvent` / `addEventListener` unavailable, returns guarded-only wrap (no EIP-6963 registration) |

EIP-6963 enables dApps to discover the guarded provider alongside MetaMask-class injectors without overwriting `window.ethereum`. Implementation SSOT: [provider.ts](../../../src/sdk/exomesh-agentic-wallet-guard/provider.ts) (`announceGuardedProvider` — no separate announcer module). See [01_SDK_INTEGRATION_BLUEPRINT.md](../../02_sdk_and_integrations/01_guides/01_SDK_INTEGRATION_BLUEPRINT.md) · [Defense Matrix §3.7](../01_core_specs/02_DEFENSE_MATRIX_AND_SSRC_CORE.md).

### ERC-2612 / Permit2 — Zero-Gas Allowance Extraterritorial Defense

| Path | Mechanism | SSOT |
|------|-----------|------|
| **On-chain calldata** | `eth_sendTransaction` → u32 selector dispatch on ERC-20 `approve` · Permit2 `approve` · Permit2 `permit` | [calldata-parser.ts](../../../src/sdk/exomesh-agentic-wallet-guard/calldata-parser.ts) · `evaluateRetailApproveGate()` in [guard-engine.ts](../../../src/sdk/exomesh-agentic-wallet-guard/guard-engine.ts) |
| **Off-chain EIP-712 permit (ERC-2612-class)** | `eth_signTypedData_v4` → `verifyingContract` venue allowlist · `allowedSpenders` clip on permit spender | [risk-evaluator.ts](../../../src/sdk/exomesh-agentic-wallet-guard/risk-evaluator.ts) · `UNAUTHORIZED_SPENDER_REJECTED` |

Rejected allowance paths throw `RetailGuardRejectedError` **before** RPC broadcast — **0-Gas** on fail-closed severance.

<a id="erc-8196--factual-eip-attribution--historical-co-authoring-reference-not-a-venue-adapter"></a>

### ERC-8196 — Factual EIP Attribution & Historical Co-authoring Reference (Not a Venue Adapter)

| Field | Clarification |
|-------|---------------|
| **Standard status** | [ERC-8196](https://eips.ethereum.org/EIPS/eip-8196) **Final** — Ethereum AI Agent Wallet Policy |
| **Co-author attribution** | Virtuals Protocol is a **historical co-author** of the ERC text — factual EIP metadata only |
| **SliverVine binding** | On-chain policy pre-screen via `SliverVineAgentPolicyGuard` lineage → **V2** [SliverVineAgentPolicyGuardV2.sol](../../../contracts/src/SliverVineAgentPolicyGuardV2.sol) on Arbitrum One |
| **Explicit non-scope** | **Not** a native venue adapter · **not** part of the 5-Core Venue Matrix · pruned Virtuals GAME adapter (v1.1) replaced by EIP-1193 Retail Guard (`withRetailGuardProvider`) · optional B2B server-side hook |

### ERC-20 / ERC-777 — Non-Custodial Asset Transfer Escrow Semantics

| Semantics | Rule |
|-----------|------|
| **Collateral SSOT** | USDC on Arbitrum (`GMX_USDC_ARBITRUM`) — GMX v2 increase/decrease payloads |
| **No indefinite custody** | Protocol never books user principal as protocol-owned; capital remains in user Kernel account or venue GM position |
| **In-flight bridge escrow** | Outbound Robinhood → Arbitrum Across legs labelled `IN_FLIGHT_BRIDGE_CAPITAL`; `lostUsd ≡ 0` until timeout (`BRIDGE_TIMEOUT_FAIL_CLOSED`) |
| **Venue settlement** | GMX async keeper window **3–5 min**; HL withdrawal **15 min** — inventory held in-flight, not escrowed by Gate |
| **ERC-777** | Not on ExoMesh hot path; ERC-20 `transfer`/`approve` invoked only via Kernel-scoped UserOp `callData` to whitelisted contracts |

`GatedExecutor.payloadHash()` binds UserOp `callData` to Gate `RiskAttestation.payloadHash` — asset movements without matching attestation revert on-chain.

### WASM Core (`soil_core`) — Edge Hot Path

| Field | SliverVine binding |
|-------|-----------------|
| **Artifact** | [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) — `#![no_std]` Rust compiled for Cloudflare Workers |
| **Size budget** | **< 28 KiB** artifact · **40.5 KiB gzip** Worker hot-path bundle (`pnpm bundle:measure`) |
| **Latency** | Warm exec **< 60 µs** · Edge shield p50 **~106 µs** (`checkSoilResistance()`) |
| **Parity** | Bitmask + six-lane risk vector semantics mirrored by Stylus `check_soil_resistance_stylus()` |
| **Verification** | [02_DEFENSE_MATRIX_AND_SSRC_CORE.md](../01_core_specs/02_DEFENSE_MATRIX_AND_SSRC_CORE.md) · `tests/risk-control/*` · Vitest **254 test files | 1206 PASS clean (100%)** |

Edge Wasm is the **pre-broadcast SSOT**; Stylus coprocessor provides on-chain reinforcement — never a weaker substitute for fail-closed Edge gates.

<a id="dual-engine-infrastructure-map-frozen--2026-09-10"></a>

<a id="eip-1482-class-block-timestamp-monotonicity--rpc-regression-defense"></a>

### EIP-1482-Class: Block Timestamp Monotonicity & RPC Regression Defense

> **Auditor note:** Canonical [EIP-1482](https://eips.ethereum.org/EIPS/eip-1482) on ethereum.org defines **shard block proofs**, not wall-clock monotonicity. In this wiki, **EIP-1482-class** denotes SliverVine's **L2 `block.timestamp` monotonicity & bounded-drift profile** — aligned with Arbitrum sequencer non-decreasing timestamp rules and heterogeneous RPC load-balancer behavior. Implementation SSOT: [02_DEFENSE_MATRIX_AND_SSRC_CORE.md](../01_core_specs/02_DEFENSE_MATRIX_AND_SSRC_CORE.md) §3.1.1 · [01_ON_CHAIN_MAINNET_ANCHORS.md](../../03_product_verifications/shared_proofs/01_ON_CHAIN_MAINNET_ANCHORS.md) § Dual-Engine Map.

SliverVine Protocol does **not** ship a standalone `MonotonicRpcRatchetGuard` class or `rpc-timestamp-guard.ts` module. The **monotonic RPC ratchet** is a **composite guard** across three SSOT surfaces:

| Layer | SSOT symbol | Role |
|-------|-------------|------|
| **Wasm ratchet** | `RpcTimestampWatermark` · `clock_core_rpc_ingest()` | Per-source high-watermark on `(blockNumber, timestampSec)` — regression freezes held timestamp (fail-closed) |
| **RPC failover** | [rpc-radar.ts](../../../src/services/adapters/rpc-radar.ts) · `evaluateRpcRadarTier()` | Multi-provider probe race; `RPC_RADAR_STALE_BLOCK_MAX_MS` = **5_000** marks stale `latest` blocks; `IS_SEQUENCER_OUTAGE` triggers soil fuse |
| **Virtual wall clock** | `MonotonicTimeSSOT.read()` · sticky `CLOCK_NEGATIVE_LEAP_DETECTED` | NTP / leap step-back does not regress virtual wall time; anomaly persists until reset |

```text
RPC probe (Alchemy / QuickNode / Ankr)
    → clock_core_rpc_ingest / RpcTimestampWatermark (monotonic timestampSec)
    → rpc-radar stale tier (blockAgeMs > 5s → failover)
    → checkSoilResistance() SOIL_REASON_RPC_OUTAGE / fast-path deny
```

| Invariant | Enforcement | Fail-closed outcome |
|-----------|-------------|-------------------|
| `timestampSec` must not regress at equal/higher block height | `RpcTimestampWatermark.ingest()` · Wasm `clock_core_rpc_ingest` | Held high-watermark; regression flag → stale / deny |
| Heterogeneous RPC `latest` skew | `rpc-radar` fastest-fresh-wins + all-stale tier-2 outage | `getRpcRadarOutageReason()` → soil trip |
| Wall-clock leap / NTP step | `MonotonicTimeSSOT` offset + sticky anomaly | [risk-engine-soil.ts](../../../src/core/risk-engine-soil.ts) fast-path deny when anomaly ≠ null |

**Verification:** `npx vitest run tests/clock-monotonicity.test.ts` — **14/14 PASS** (includes Wasm FFI regression hold).

<a id="erc-4337--erc-7579--erc-7715-account-abstraction--session-key-time-gates"></a>

### ERC-4337 / ERC-7579 / ERC-7715: Account Abstraction & Session Key Time Gates

Session-key and modular-account time semantics are enforced **before** UserOp broadcast. Clock immunity prevents **fake-fresh** ages that could bypass TTL / staleness modules.

| Standard facet | Clock SSOT binding | Module anchor |
|----------------|-------------------|---------------|
| **ERC-4337** UserOp validation window | `resolveWallAge(nowMs, quoteTimestampMs)` → `LEAP` trips stale flags | [risk-engine-flag-alt.ts](../../../src/core/risk-engine-flag-alt.ts) · `evaluateVariationalFlags()` |
| **ERC-7579** modular session scope | `resolveUsdAiClockSsotPure()` + `CLOCK_NEGATIVE_LEAP_DETECTED` → `FLAGS_SEVERED` | [risk-engine-usdai.ts](../../../src/core/risk-engine-usdai.ts) · [usdai-adapter.ts](../../../src/adapters/usdai/usdai-adapter.ts) |
| **ERC-7579** session clip / TTL | `session_core_ok()` Wasm FFI · `verifySessionKeyValidity(expiresAt, nowMs)` | [soil_core.rs](../../../src/wasm/soil_core.rs) · [session-key-guard-core.ts](../../../src/core/session-key-guard-core.ts) |
| **ERC-7715** permission expiry evolution | `expiresAtMs <= nowMs` replay guard + clock-skew trip (`CLOCK_SKEW_EXCEEDED` >30s) | [session-audit.ts](../../../src/services/risk/session-audit.ts) · USDAI clock SSOT |

**Anti-spoofing rule:** Negative wall deltas (`nowMs < timestampMs`) MUST NOT clamp to `ageMs = 0`. `resolveWallAge()` returns `{ kind: "LEAP" }` → variational / USDAI **STALE** or `FLAGS_SEVERED` — never ALLOW with fake freshness.

### ERC-7715 / EIP-7702 & EIP-712: Session Delegation, Intent Hashing & Physical Deadlock

| Mechanism | Clock / Wasm binding | Outcome |
|-----------|---------------------|---------|
| **EIP-712** structured intent | Domain-bound digest evaluated only after soil clock snapshot is fixed | [evaluateAttestation()](../../../src/sdk/attestation.ts) · Gate `verifyAndConsume` |
| **EIP-7702** / Kernel upgrade path | Pre-broadcast `checkSoilResistance()` — clock anomaly → no signature release | [agent-exomesh-guard.ts](../../../src/core/agent-exomesh-guard.ts) |
| **Physical deadlock** | `rootProtection()` / `severSigningChannel()` on `FLAGS_SEVERED` | [root-protection-core.ts](../../../src/core/root-protection-core.ts) · [risk-severance.ts](../../../src/core/risk-severance.ts) |
| **Wasm FFI struct pack** | `packClockStateForWasm()` · `clock_core_pack_state()` — `[virtualWallMs, offsetMs, anomalyFlags]` | [monotonic-time.ts](../../../src/core/monotonic-time.ts) · [clock_core.rs](../../../src/wasm/clock_core.rs) · [wasm-clock-ffi.ts](../../../src/core/wasm-clock-ffi.ts) |

Any sticky `CLOCK_NEGATIVE_LEAP_DETECTED` or `CLOCK_EXCESSIVE_FORWARD_STEP` propagates through `applyAutoSeveranceOnFlags()` → **hot-key pipeline severed** before EIP-712 signing resumes.

---

## Compliance Posture

- **ERC-4337:** UserOps pass Edge `verifyAgentIntent()` before bundler dispatch; EntryPoint v0.7 + Kernel v0.3.1 are canonical; gas ledger caps per-UserOp and daily sponsorship.
- **EIP-7562:** Zero-Bundler-Rejection Invariant — session modules + Edge pre-screen prevent validation-phase storage violations; bundler failure is fail-closed, not retried blindly.
- **EIP-712:** All Gate attestations and SDK envelopes bind `chainId` + `verifyingContract` + domain `SliverVineExoMesh` — cross-chain replay denied at `verifyAndConsume`. Legacy Sanctuary domain applies only to superseded Gate `0xb174…` ([superseded appendix](../01_core_specs/05_SUPERSEDED_DEPLOYMENTS_APPENDIX.md)).
- **ERC-1271:** Kernel session-key signatures validated via standard magic value; Gate path uses ECDSA m-of-n — dual validation planes, neither bypasses the other.
- **ERC-20 / ERC-777:** Non-custodial escort — in-flight capital labelled, never booked as loss; ERC-777 hooks excluded from hot path.
- **OpenZeppelin Contracts v5:** Gate contracts enforce fail-closed access control and reentrancy-safe execution patterns; `SliverVineGate` ECDSA verification intentionally matches OZ `ECDSA.tryRecover` (strict 65-byte, non-malleable `s`).
- **ERC-4337 / ERC-7579:** Session modules enforce clip + TTL caps alongside UserOp structure constraints.
- **[ERC-8196](https://eips.ethereum.org/EIPS/eip-8196):** **Factual EIP attribution** — Finalized standard co-authored by Virtuals Protocol; implemented via PolicyGuard on-chain screen — **not** a product venue adapter ([§ ERC-8196](#erc-8196--factual-eip-attribution--historical-co-authoring-reference-not-a-venue-adapter)).
- **ExoMesh Agentic Guard (EIP-1193/5792/6963+) / ERC-2612·Permit2:** Active C-end compliance spine — see [Active EVM Standard Compliance Matrix](#active-evm-standard-compliance-matrix-v10-production).
- **EIP-1559:** Gas-yield ratio fuse blocks dispatch when L1 surcharge exceeds target yield band.
- **Robinhood Chain:** Outbound-only escort (`46630`/`4663` → `42161`); inbound AML blocked · `lostUsd ≡ 0`.
- **WASM:** Hot-path soil evaluation mirrors Edge `checkSoilResistance()` semantics for sub-ms fail-closed.
- **EIP-1482-class (clock):** `RpcTimestampWatermark` + `rpc-radar` + `MonotonicTimeSSOT` enforce monotonic timestamps and fail-closed on RPC regression — see [§ EIP-1482-Class](#eip-1482-class-block-timestamp-monotonicity--rpc-regression-defense).
- **Session-key time gates:** `resolveWallAge()` LEAP branch prevents fake-fresh oracle/quote ages on ERC-4337 / ERC-7579 paths — see [§ ERC-4337 / ERC-7579 / ERC-7715](#erc-4337--erc-7579--erc-7715-account-abstraction--session-key-time-gates).
- **ERC-7715 Decoupling:** ⏳ **Planned / V1.0 Design Spec** — ZeroDev Kernel v3 is the v1.0 ephemeral session-key adapter (Gatehouse). Universal **ERC-7715 Advanced Wallet Permissions** is the evolution target for adapter swap without Shield or Wasm rewrite.

---

## ArbOS / Stylus Alignment — ✅ Code-Verified On-Chain Coprocessor

> **Edge (Cloudflare) remains the pre-broadcast SSOT.** The **`SliverVineSoilCoprocessor`** ([contracts/stylus-probe/src/lib.rs](../../../contracts/stylus-probe/src/lib.rs)) is an active **u128 fixed-point** soil math coprocessor compiled via **Stylus SDK 0.10.7** — on-chain reinforcement aligned with Edge `checkSoilResistance()` semantics. Elara protocol ingress remains ⏳ V1.0 Design Spec.

| Layer | Alignment | Status |
|-------|-----------|--------|
| **Stylus Soil Coprocessor** | **`SliverVineSoilCoprocessor`** — u128 fixed-point score · `check_soil_resistance_stylus(flags, risk_vector)` · quadratic spread/slippage penalty · fail-closed `depth_usd ≥ 10_000` · `evaluate_soil_coprocessor(spread_bps, depth_usd, slippage_bps)` · parity with Edge soil fuse | ✅ **Mainnet Deployed & Activated** ([0xc23587d6573dd134f95b02b0202ffbf84686625e](https://arbiscan.io/address/0xc23587d6573dd134f95b02b0202ffbf84686625e) · activation tx [0x92079e15…](https://arbiscan.io/tx/0x92079e150697717af75b0b750ff80be36d06212337189ef368bf65fead6c9397) · Nitro Prover JIT + **ArbWasm `0x71`** · Stylus SDK **0.10.9** · `cargo test` **9/9 PASS** · `pnpm deploy:stylus:mainnet`) |
| **Elara protocol ingress** | Protocol-level ingress filtering drops non-compliant Robinhood Chain / blacklisted senders before GM payload construction — complements `IngressSafetySwitch` | ⏳ V1.0 Design Spec |
| **ArbOS gas / base-fee sensor** | Tri-Sensor **BaseFee Velocity** channel remains the congestion throttle for dispatch SLO | ✅ v1.0 Delivered (Sepolia verified) ([arbitrum-gas-guard.ts](../../../src/services/risk/arbitrum-gas-guard.ts)) |

**Design rule:** Edge (Cloudflare) remains the pre-broadcast SSOT; Stylus coprocessor + Elara are the on-chain reinforcement plane — never a weaker substitute for fail-closed Edge gates.

### EIP-1967 Upgradeable Proxy — Zero Lock-In Stylus Path

V2.0 on-chain Stylus rollout targets the standard **[EIP-1967](https://eips.ethereum.org/EIPS/eip-1967) Transparent Upgradeable Proxy** pattern:

| Slot | Purpose |
|------|---------|
| `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc` | Implementation — `SliverVineSoilCoprocessor` / `check_soil_resistance_stylus` logic |
| `0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103` | Admin — multisig-governed upgrades; **no bytecode lock-in** |

The immutable **Solidity `SliverVineGate`** on Arbitrum One ([0x71D7d26f98110c5DE3df0fCbddCf2A3A2BC6e2f1](https://arbiscan.io/address/0x71d7d26f98110c5de3df0fcbddcf2a3a2bc6e2f1) · ExoMesh domain) is the live attestation plane; Stylus is an additive coprocessor reinforcement layer wired on PolicyGuardV2 without restricting future math upgrades.

**Dual-execution SSOT:** [stylus_core.rs](../../../contracts/stylus-probe/src/stylus_core.rs) exports `check_soil_resistance_stylus(flags: u64, risk_vector: [f64; 6]) -> bool` — bitmask + six-lane vector parity with Edge `evaluate*Flags()` / `checkSoilResistance()`. **Arbitrum One mainnet:** [0xc23587d6573dd134f95b02b0202ffbf84686625e](https://arbiscan.io/address/0xc23587d6573dd134f95b02b0202ffbf84686625e) · activation [0x92079e150697717af75b0b750ff80be36d06212337189ef368bf65fead6c9397](https://arbiscan.io/tx/0x92079e150697717af75b0b750ff80be36d06212337189ef368bf65fead6c9397) (Nitro JIT + ArbWasm `0x71`). Build: `pnpm deploy:stylus:mainnet`.

---

## Infrastructure RPC / WSS (Alchemy HA)

Multi-chain HTTPS/WSS placeholders live in `.env.example` — replace `YOUR_ALCHEMY_API_KEY` locally; never commit live keys.

| Venue | Chain ID | HTTPS (RPC) | WSS |
|-------|----------|-------------|-----|
| **Arbitrum One** (primary) | 42161 | `ARB_MAINNET_RPC_URL` | `ARBITRUM_WSS_URL` |
| **Arbitrum Sepolia** (sandbox) | 421614 | `ARB_SEPOLIA_RPC_URL` | `ARBITRUM_SEPOLIA_WSS_URL` |
| **Robinhood Testnet** | 46630 | `ROBINHOOD_TESTNET_RPC_URL` | `ROBINHOOD_TESTNET_WSS_URL` |
| **Robinhood Mainnet** | 4663 | `ROBINHOOD_MAINNET_RPC_URL` | `ROBINHOOD_MAINNET_WSS_URL` |
| **Hyperliquid** (venue-native + optional HA) | — | `HYPERLIQUID_*_RPC_URL` · SSOT `HL_INFO_URL` / `HL_EXCHANGE_URL` | `HYPERLIQUID_WSS_URL` |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [../README.md](../README.md) | Documentation index · English SSOT hub |
| [01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md](../01_core_specs/01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md) | Yellow Paper — R01–R20 · Hybrid Pillar Sets X & Y · topology |
| [03_RISK_MITIGATION_AND_DISCLAIMER_FRAMEWORK.md](../01_core_specs/04_RISK_MITIGATION_AND_DISCLAIMER_FRAMEWORK.md) | modeled risk spectrum (§0.1) · fail-closed boundaries · Basel mapping |
| [../../03_product_verifications/01_VERIFICATION_MATRIX.md](../../03_product_verifications/01_VERIFICATION_MATRIX.md) | CLI Tier 0–5 verification hub |
| [Yellow Paper §Ingress](../01_core_specs/01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md) | Pillar Set X — ZeroDev Kernel v3 AA · EIP-7702 comparative |
| [02_DEFENSE_MATRIX_AND_SSRC_CORE.md](../01_core_specs/02_DEFENSE_MATRIX_AND_SSRC_CORE.md) | Pillar Set Y — ReflexCore (SSRC) engine · p50 ~106µs |
| [02_DEFENSE_MATRIX_AND_SSRC_CORE.md](../01_core_specs/02_DEFENSE_MATRIX_AND_SSRC_CORE.md) | R01–R20 Defense Matrix · §3.1.1 Physical Clock & Edge Monotonicity |
| [../../03_product_verifications/shared_proofs/01_ON_CHAIN_MAINNET_ANCHORS.md](../../03_product_verifications/shared_proofs/01_ON_CHAIN_MAINNET_ANCHORS.md) | Dual-Engine Map (Engine A Stylus · Engine B Edge Wasm) · FROZEN anchors |
| [../../02_sdk_and_integrations/README.md](../../02_sdk_and_integrations/README.md) | Wallet Guard SDK documentation index (01 → 04) |
| [../../02_sdk_and_integrations/01_guides/01_SDK_INTEGRATION_BLUEPRINT.md](../../02_sdk_and_integrations/01_guides/01_SDK_INTEGRATION_BLUEPRINT.md) | EIP-1193 Agentic Wallet Guard SDK |
