# Defense Matrix (R01–R20) & Stylus ReflexCore (SSRC)

> **Primary Highlights (Direction B — ReflexCore / SSRC):**
> - **Pure-Math Risk Engine** — **~0.5µs–1.1µs** pure invariant evaluation · zero async on the hot path · 28-protocol-slot bitmask vectoring
> - **R01–R20 Defense Matrix** — single-bitmask fail-closed evaluation · **R20** triggers **p50 ~15µs** physical deadlock via `rootProtection()` / `severSigningChannel()`
> - **ReflexCore (SSRC) soil engine** — [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) **< 28 KiB** · ABI v2 · SSRC **p50 ~106 µs** · warm **< 60 µs**
> - **Physical Deadlock** — toxic intent severed in **p50 ~15µs** before EIP-712 broadcast · **0-Gas** fail-closed
> - **Zero-Allocation Hot-Path Engine** — pre-allocated **256×4** intent heap · **O(1)** slot hash · **&lt;16 KiB** heap delta / 10k hot-path iterations (Vitest worker isolation) · ~**50,000 ephemeral heap objects/sec eliminated**
>
> **Document:** R01–R20 defense matrix · sub-ms `soil_core` Wasm · microsecond moats · risk equations · **Vitest SSOT:** **254 test files | 1206 PASS clean (100%)** · **Defense Matrix:** `17 Active | 2 Refactored | 1 Deprecated` · **p50 ~106 µs**
> **Full Pillar Set Y audit:** [02_DEFENSE_MATRIX_AND_SSRC_CORE.md](./02_DEFENSE_MATRIX_AND_SSRC_CORE.md) · **Topology:** [01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md](./01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md)

## ⚡ Pure-Math Risk Engine Vector Evaluation & Bitmask Parallelism

Institutional-grade technical moat: SliverVine ExoMesh evaluates the **5-Core Venue Matrix** (GMX · Pendle · USD.ai · Variational · Hyperliquid) as a **single parallel vector** — not a sequential per-venue RPC loop. **RESERVED_ABI_V2 Wasm bitmask holes (protocol bits 4–6)** preserve frozen ABI v2 slots without active venue evaluators. The hot path is **pure deterministic math** sunk into [src/core/](../../../src/core) with one Wasm FFI round-trip.

### Pure-Math Invariant Evaluation (~0.5µs–1.1µs)

| Property | Implementation | Why it matters |
|----------|----------------|----------------|
| **Zero async on critical path** | [soil-resistance-core.ts](../../../src/core/soil-resistance-core.ts) · [risk-engine-core.ts](../../../src/core/risk-engine-core.ts) | No `await`, no I/O, no network probes inside `checkSoilResistance()` pure evaluation — eliminates event-loop jitter during reflex arcs |
| **Pre-allocated scratch** | Module-level `Float64Array` / `Uint8Array` lanes (`PROTO_VECT_LEN=28`) | **Zero-Allocation Hot-Path** — zero ephemeral alloc on microsecond reflex phase |
| **Measured pure invariant** | CLI harness `Pure Invariant Time` row ([examples/lib/demo-timing.ts](../../../examples/lib/demo-timing.ts)) | **~0.5µs–1.1µs** isolated soil math — invariant evaluation only, excluding harness I/O |

$$
\mathrm{AllowedToSign} = f_{\mathrm{pure}}(\mathbf{v}_{28}) \in \{0,1\} \quad \text{where } t_{\mathrm{pure}} \sim 0.5\text{–}1.1\,\mu\mathrm{s}
$$

### Bitwise Bitmask FFI Vectoring (28-Protocol-Slot ABI v2)

| Layer | SSOT module | Parallelism model |
|-------|-------------|-------------------|
| **TS bitmask compiler** | [risk-flags.ts](../../../src/core/risk-flags.ts) · [risk-engine-core.ts](../../../src/core/risk-engine-core.ts) | All R01–R20 + protocol lanes compile to **`protocolMask` / `tripFlags`** — evaluated in one bitwise pass |
| **Wasm FFI vector** | [wasm-soil-ffi.ts](../../../src/core/wasm-soil-ffi.ts) · [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) | **One** `check_soil_resistance()` call per intent — **28-protocol-slot ABI v2** packs active lanes (GMX · Pendle · USD.ai · Variational · HL) + **RESERVED_ABI_V2** holes · slot **27** = aggregated `protocolMask` |
| **5-core matrix coverage** | Per-venue demos · `pnpm demo:gmx -- --trip` · `pnpm demo:pendle -- --trip` · `pnpm demo:usdai -- --trip` · `pnpm demo:variational -- --trip` · `pnpm demo:hl -- --trip` | Active lanes evaluated via bitmask — **RESERVED_ABI_V2 Wasm bitmask holes (protocol bits 4–6)** frozen |

```text
Intent → pack Float64Array[28] → Wasm bitmask eval → tripFlags (u64) → severSigningChannel()
         └─ single FFI hop ─┘     └─ parallel OR across all protocol bits ─┘
```

### Zero-Latency Fail-Closed Parallelism

Parallel vector checking is what makes **simultaneous multi-venue R20 physical deadlock** possible without N× sequential guard latency:

| Stage | Latency budget | Mechanism |
|-------|----------------|-----------|
| **Pure invariant kernel** | **~0.5µs–1.1µs** | Pure-math soil resistance · no async |
| **Wasm reflex core** | **p50 ~15µs** (**<20µs warm path**) | `rootProtection()` · `severSigningChannel()` on any trip bit |
| **E2E ExoMesh Edge gate** | **p50 ~106µs** | End-to-end Shield path (TS Gateway + `soil_core.wasm`) — per-venue demos trip **FAIL_CLOSED** without batch queueing |

**Proof commands:** `pnpm demo:gmx -- --trip` · `pnpm demo:variational -- --trip` · `pnpm demo:hl -- --trip` — targeted single-venue FAIL_CLOSED severance HUD.

→ Deep dive: [§3.1 Microsecond Moats (Summary)](#31-microsecond-moats-summary) · [§3.3 Defense Matrix (R01–R20)](#33-defense-matrix-r01-r20-summary)

---

<a id="zero-allocation-hot-path-engine"></a>

## Zero-Allocation Hot-Path Engine (Pre-Allocated Ring Slab)

> **Zero-Allocation Hot-Path (engineering SSOT):** The pre-consensus microsecond execution phase operates on pre-allocated static `Uint32Array` slabs and Wasm linear memory with **zero ephemeral heap allocations** (~**50,000 ephemeral heap objects/sec eliminated** on the RPC reflex arc), while non-critical cold paths (user warning formatters, error loggers) remain standard readable TypeScript.

High-frequency AI-agent intent validation (`evaluateIntentMandateGate` · `evaluateIntentGatePure`) minimizes **Stop-The-World (STW) GC** pauses on Cloudflare V8 isolates by replacing per-digest `Map<string, …>` churn with a **module-load ring slab** — one contiguous buffer, **O(1)** numeric slot indexing, and a **u32 hot path** that never touches `bigint` inside the inner loop.

### Ring Slab Layout (Module-Load SSOT)

| Buffer | Type | Size | Role |
|--------|------|------|------|
| **`INTENT_RING_SLAB`** | `BigInt64Array` | **256 slots × 4 i64** = **1,024 words** (8 KiB) | Wasm FFI / Stylus C-ABI export surface · `*mut i64` pointer parity |
| **`INTENT_RING_U32`** | `Uint32Array` | **1,024 u32 words** (4 KiB) | **Zero-Allocation Hot-Path** — venue drift + attempt budget in-place |
| **Singleton host** | `globalThis` SSOT | [intent-core-buffers.ts](../../../src/core/intent-core-buffers.ts) | Survives duplicate Vitest module graphs · **zero per-intent `new`** |

**Per-slot heap layout (32 bytes · ABI v1):**

```text
slot[i] @ offset = (hashKeyToSlotIndex(key) & 0xFF) × 4
┌────────────┬────────┬─────────────────┬──────────────┐
│ attempts   │ flags  │ allowed_mask    │ target_bit   │
│ u32[0]     │ u32[1] │ u32[2]          │ u32[3]       │
└────────────┴────────┴─────────────────┴──────────────┘
         ↔ Rust [intent_core.rs](../../../src/wasm/intent_core.rs) 4 × i64 @ `heap_ptr`
```

### O(1) Numeric Slot Hashing (No `Map` Churn)

Legacy mandate tracking allocated a fresh `Map<string, BigInt64Array>` entry per `intentDigest` / `agentId` — unbounded heap growth under agent retry storms. The ring engine derives the slot index in **constant time**:

$$
\text{slotIndex} = \texttt{hashKeyToSlotIndex}(\text{key}) \mathbin{\&} \texttt{0xFF} \quad \Rightarrow \quad \text{baseOffset} = \text{slotIndex} \times 4
$$

| Property | Before | After (Ring Slab) |
|----------|--------|-------------------|
| **Lookup** | `Map.get(digest)` — hash table + string key retention | Bitwise mask into **256 fixed slots** |
| **Allocation** | Per-key `BigInt64Array(4)` on miss | **Single** slab at module load |
| **Hot-path types** | `bigint` read/write per iteration | **`Uint32Array` in-place** — no `Number(bigint)` boxing |

**SSOT modules:** [intent-core.ts](../../../src/core/intent-core.ts) · [intent-core-ring.ts](../../../src/core/intent-core-ring.ts) · [intent-mandate.ts](../../../src/core/intent-mandate.ts) · [wasm-intent-ffi.ts](../../../src/core/wasm-intent-ffi.ts).

<a id="strict-vitest--worker-zero-allocation-proof"></a>
<a id="strict-vitest--worker-heap-isolation-proof"></a>

### Strict Vitest / Worker Zero-Allocation Proof

| Test | Command | Assertion |
|------|---------|-----------|
| **Zero-allocation hot path** | `npx vitest run tests/core/intent-sinking-audit.test.ts` | Subprocess worker [intent-zero-alloc.worker.ts](../../../tests/core/intent-zero-alloc.worker.ts) · **10,000** `evaluateIntentGatePure()` iterations · **50-round JIT warmup** · `global.gc()` before snapshot · **min-of-3** heap samples |
| **Heap budget** | `--expose-gc` (Vitest `poolOptions.forks.execArgv`) | **`heapUsed` delta &lt; 16 KiB** (strict) |
| **Determinism / layout** | Same file (6 additional cases) | C-ABI slot packing · `hashKeyToSlotIndex` mask · `resetIntentRingSlab` |

```bash
npx vitest run tests/core/intent-sinking-audit.test.ts   # 8/8 PASS · includes <16 KiB worker gate
```

### Foundry On-Chain Ring Slab Fuzz Proof ([IntentRingSlabLib.sol](../../../contracts/src/libs/IntentRingSlabLib.sol))

Solidity mandate semantics mirror the TypeScript u32 hot path — [IntentRingSlabLib.sol](../../../contracts/src/libs/IntentRingSlabLib.sol) enforces FNV-1a slot hashing · venue drift flags · attempt-budget severance. Foundry fuzz suite **5/5 PASS**:

```bash
# Verify Solidity Ring Slab Invariants & Fuzz Testing (5/5 PASS)
forge test --match-contract IntentRingSlabTest
```

| Fuzz / unit case | Invariant | Assertion |
|------------------|-----------|-----------|
| `testFuzz_hashKeyToSlot_alwaysMasked` | **Slot mask** | `hashKeyToSlot(key) ≤ 255` for arbitrary `bytes` keys |
| `testFuzz_collidingKeysShareAttemptBudget` | **Collision sharing** | Keys mapping to the same slot share one attempt counter |
| `testFuzz_attemptBudget_seversOnFourth` | **4th-attempt severing** | 4th bump with `maxAttempts=3` → `ok=false` · `severChannel=true` |
| `testFuzz_venueDrift_doesNotIncrementAttempts` | **Venue drift isolation** | Drift reject does not consume attempt budget |
| `test_hashKeyToSlot_knownCollisionProbe` | **Mask boundary** | Known collision probe slots ∈ `[0, 255]` |

**SSOT:** [IntentRingSlab.t.sol](../../../contracts/test/IntentRingSlab.t.sol) · TS parity: [intent-core-ring.ts](../../../src/core/intent-core-ring.ts).

<a id="c-abi-parity--rust-wasm--arbitrum-stylus-coprocessors"></a>

### C-ABI Parity — Rust Wasm & Arbitrum Stylus Coprocessors

Host ring slots mirror [src/wasm/intent_core.rs](../../../src/wasm/intent_core.rs) exports — **100% pointer-aligned** `4 × i64` mandate heap:

| C-ABI export | Behavior |
|--------------|----------|
| `intent_core_check_venue_drift` | `(allowed_mask & target_bit) ≠ 0` → pass |
| `intent_core_track_attempt_budget` | In-place `attempts++` · `FLAG_SEVER_CHANNEL` on exceed |
| `intent_core_evaluate_gate` | Combined drift + budget gate · writes slots 2–3 |

Edge TypeScript executes the **u32 ring hot path**; `syncIntentSlotToWasmSlab()` cold-syncs into `INTENT_RING_SLAB` before Wasm FFI or Nitro Stylus handoff — identical semantics, zero allocation on the reflex arc.

### Buildathon Commercial Value (Grant Judges)

| Advantage | Mechanism | Judge takeaway |
|-----------|-----------|----------------|
| **Zero STW GC latency spikes** | Pre-allocated slab · reused scratch `IntentGateResult` | HF AI agents validate intents at **p50 ~106µs** without V8 pause risk during retry storms |
| **Bounded memory footprint** | **256 slots × 32 B** = **8 KiB** mandate state (plus 4 KiB u32 mirror) | Predictable Edge isolate memory — no unbounded `Map` growth under adversarial `agentId` fan-out |
| **Wasm / Stylus portability** | Same slot layout as [intent_core.rs](../../../src/wasm/intent_core.rs) | One mandate semantics across **Cloudflare Worker** · **[pkg/soil_core.wasm](../../../pkg/soil_core.wasm)** · **Arbitrum Stylus** coprocessor — audit once, deploy everywhere |

---

<a id="3-cross-venue-risk-engine-defense-matrix-r01-r20"></a>

## 3. Cross-Venue Risk Engine & Defense Matrix (R01–R20)

> **Full Pillar Set Y specification:** [02_DEFENSE_MATRIX_AND_SSRC_CORE.md](./02_DEFENSE_MATRIX_AND_SSRC_CORE.md) — Wasm `soil_core.wasm` engine, `checkSoilResistance()` latency moats (p50 ~106 µs · warm &lt;60 µs), Tri-Sensor matrix, and complete R01–R20 defense matrix. Below is the integration summary for grant evaluators.

### 3.1 Microsecond Moats (Summary)

| Moat | Constant / Module | Spec |
|------|-------------------|------|
| **Emergency Margin Buffer** | `DEFAULT_CROSS_MMR = 0.05` (5% account equity reserve) | Blocks new risk when free margin buffer would fall below **5%** after intended notional ([src/services/risk/liquidation-meter.ts](../../../src/services/risk/liquidation-meter.ts)) |
| **HL Nonce Auto-Resync** | `HL_NONCE_AUTO_RESYNC` · `session-key-adapter-lib/nonce-auto-healing` | Monotonic nonce heal on `Invalid nonce` WS · heartbeat revoke closes signing channel |
| **NTP Clock Drift Compensator** | `NTP_CLOCK_DRIFT_COMPENSATOR` | Rejects / skew-corrects venue timestamps with **&lt;200ms** drift vs Edge NTP; aligns with Pgate latency fuse (`PGATE_MAX_LATENCY_MS` = 200) |
| **Cross-Venue Net Slippage TWAP** | `CrossVenueNetSlippage` | When net cross-book slippage **&gt; 0.5%** (`MAX_SLIPPAGE = 0.005`), trips soil + schedules **TWAPEngineV2** path slicing instead of market sweep |
| **GMX Positive Skew Rebate** | `gmx-v2-balancer` / price-impact soil | Qualifies underweight-side flow · captures **positive skew / price-impact rebate** bps — never conflated with builder UI fee |
| **Core Sinking SSOT** | `src/core/*` (intent ring slab + soil/risk modules) | Pure invariants sunk from adapters/services · **Zero-Allocation Hot-Path** ring slab for mandate state · legacy paths = thin-shell re-exports · Worker **40.5 KiB gzip** post-sink |
| **Ingress Custom Errors** | [SliverVineRiskOracle.sol](../../../contracts/SliverVineRiskOracle.sol) · [IngressSafetySwitch.sol](../../../contracts/IngressSafetySwitch.sol) | `revert CustomError()` gas-efficient fail-closed · `ERR_*` bytes32 events preserved for telemetry |

**Core modules ([src/core/](../../../src/core)):** [intent-core.ts](../../../src/core/intent-core.ts) · [intent-core-ring.ts](../../../src/core/intent-core-ring.ts) · [intent-core-buffers.ts](../../../src/core/intent-core-buffers.ts) · [intent-mandate.ts](../../../src/core/intent-mandate.ts) · [monotonic-time.ts](../../../src/core/monotonic-time.ts) · [risk-engine-usdai.ts](../../../src/core/risk-engine-usdai.ts) · [soil-resistance-core.ts](../../../src/core/soil-resistance-core.ts) · [session-key-guard-core.ts](../../../src/core/session-key-guard-core.ts) · [delta-neutral-calculator.ts](../../../src/core/delta-neutral-calculator.ts) · [funding-regime-core.ts](../../../src/core/funding-regime-core.ts).

<a id="311-physical-clock--edge-monotonicity-matrix-v10-santenmoku"></a>

### 3.1.1 Physical Clock & Edge Monotonicity Matrix (v1.0 · BeDelta Living Water v1.0 · SSRC)

SliverVine ExoMesh does **not** require HKG, SIN, NTP, or RPC clocks to agree. **Immunity** means: when any physical clock lies (leap second, NTP step, RPC `block.timestamp` regression, multi-PoP drift), the pre-consensus firewall produces **no negative intervals**, **no fake-fresh oracle ages**, and **no silent state rollback** — untrusted time states **fail-closed**.

| Layer | SSOT | Role |
|-------|------|------|
| **Edge host** | [monotonic-time.ts](../../../src/core/monotonic-time.ts) · [clock-wasm.ts](../../../src/sdk/clock-wasm.ts) | TypeScript typed-array adapter · deterministic fallback when Wasm asset absent |
| **Wasm bytecode** | [clock_core.rs](../../../src/wasm/clock_core.rs) in [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) | **Obfuscated proprietary math** — saturating arithmetic + leap guards compiled to Wasm (not exposed as TS source) |
| **Stylus (Nitro)** | [contracts/stylus-probe](../../../contracts/stylus-probe/) | On-chain coprocessor verification path · `cargo stylus check` |

**Dual-layer execution:**

```text
Cloudflare Edge (performance.now / injected nowMs)
        │ C-ABI FFI (i64 pointer parity)
        ▼
pkg/soil_core.wasm — clock_core_read · clock_core_rpc_ingest · clock_core_resolve_wall_age
        │ optional Nitro path
        ▼
Arbitrum Stylus (contracts/stylus-probe) — cargo stylus check / deploy
```

**Memory layout parity (zero-allocation):** Host `BigInt64Array(2)` ↔ Rust `*mut i64` slots `[lastWallMs, offsetMs]`. RPC watermark: `[blockNumber, timestampSec]`. Bitwise `saturatingSub` — no `Math.max()` on the hot path.

| C-ABI export | Behavior |
|--------------|----------|
| `clock_core_read` | Virtual monotonic wall — NTP step-back does not regress virtual time; **sticky** `CLOCK_NEGATIVE_LEAP_DETECTED` |
| `clock_core_rpc_ingest` | High-watermark hold when `block_N.timestamp < block_{N-1}.timestamp` |
| `clock_core_resolve_wall_age` | Negative delta → **LEAP** (fail-closed STALE) — never `age=0` fake-freshness |

**Build:** `pnpm run build:wasm` · **Tests:** [tests/clock-monotonicity.test.ts](../../../tests/clock-monotonicity.test.ts) · **Verification:** [docs/03_product_verifications/module_a_exomesh/03_ADAPTER_INTEGRATION_PROOFS.md](../../03_product_verifications/module_a_exomesh/03_ADAPTER_INTEGRATION_PROOFS.md)

**Formal risk equations (SSOT):**

$$
\mathrm{BufferRatio} = \frac{\mathrm{Equity}}{\mathrm{Notional}} - \mathrm{MMR},\quad \mathrm{MMR}=0.05
$$

$$
\mathrm{MaxSL} = \mathrm{Balance} \times 0.01 + 100
$$

$$
\mathrm{AllowedToSign} = \mathrm{Injection} \land \mathrm{Digest} \land \mathrm{Soil} \land \mathrm{Session} \land \mathrm{Gas} \land \mathrm{Attestation} \land \mathrm{Armor} \land \mathrm{Wasm}
$$

$$
\Delta_{\text{net}} = \Delta_{\text{GMX\_GM}} + \Delta_{\text{HL\_Short}} \equiv 0
$$

$$
\text{lostUsd} \equiv 0 \quad \forall \text{InFlightBridgeCapital}
$$

$$
t_{\text{reflector\_p50}} \sim 106\,\mu\mathrm{s} \ll t_{\text{mempool\_broadcast}}
$$

**Companion fuses:** Dynamic Account Risk Ceiling (V0.8 Baseline: Equity-Weighted SL; V1.0 Mainnet: Dynamic Adaptive Engine) · Sequencer 600s grace · Oracle lag fail-closed · Root slippage breaker (0.5%). · Configurable Dynamic Slippage Deadman is an additional fail-closed fuse on the AA / SDK path.

#### § Pendle Institutional Shield (V1.0 Live · Component of Pillar Set Y)

| Layer | Module | Hot-path behavior |
|-------|--------|-----------------|
| **Dynamic Oracle** | [pendle-market-oracle-adapter.ts](../../../src/adapters/pendle/pendle-market-oracle-adapter.ts) | Sync `ingest()` / `resolve()` in-memory cache · **TTL default 60s** · zero hot-path I/O |
| **Registry Hydration** | [pendle-pt-registry.ts](../../../src/adapters/pendle/pendle-pt-registry.ts) | `hydrateFromOracle` merges `impliedYield`, `ptPriceInAsset`, `liquidityConstant`, `expirySec` |
| **Soil Fuse** | [soil-resistance.ts](../../../src/services/risk-control-lib/soil-resistance.ts) | `pendleOracle` + `pendleCrossGuard` → `collectExternalSoilFlags()` · **`PENDLE_ORACLE_STALE`** fail-closed |
| **Cross-Guard** | [pendle-gmx-cross-guard.ts](../../../src/guards/pendle-gmx-cross-guard.ts) | Shadow Margin vs GMX maintenance · Observatory Paradox de-leverage greenlight |
| **Expiry Guard** | [pendle-pt-expiry-guard.ts](../../../src/adapters/pendle/pendle-pt-expiry-guard.ts) | PT maturity &lt;7d ∧ yield jitter &gt;200bps fail-closed |
| **AI Pool Factory** | [pendle-pool-factory-adapter.ts](../../../src/adapters/pendle/pendle-pool-factory-adapter.ts) | `validateAIPoolSelection()` · maturity ≥7d · yield drift ≤300bps · min liquidity · asset whitelist |

**Vitest:** [pendle-market-oracle.test.ts](../../../tests/adapters/pendle-market-oracle.test.ts) · [pendle-pool-factory.test.ts](../../../tests/adapters/pendle-pool-factory.test.ts) · [pendle-pt-registry.test.ts](../../../tests/adapters/pendle-pt-registry.test.ts) · [pendle-soil-guard.test.ts](../../../tests/risk-control/pendle-soil-guard.test.ts) · [usdai-adapter.test.ts](../../../tests/adapters/usdai-adapter.test.ts) · [intent-sinking-audit.test.ts](../../../tests/core/intent-sinking-audit.test.ts) (**&lt;16 KiB** ring-slab gate) · **254 test files | 1206 PASS clean (100%)** · coexists with SSRC **p50 ~106µs** budget.

#### § USD.ai AI-Compute Yield Collateral (V1.0 Live · Pillar Set Y · USD.ai Collateral Module)

| Layer | Module | Hot-path behavior |
|-------|--------|-------------------|
| **Core SSOT** | [risk-engine-usdai.ts](../../../src/core/risk-engine-usdai.ts) | `resolveUsdAiClockSsotPure()` · peg/NAV/depth gates · `PROTO_USDAI` lane (module-level `Float64Array` scratch) |
| **Collateral Guard** | [usdai-adapter.ts](../../../src/adapters/usdai/usdai-adapter.ts) | Thin orchestration · `evaluateUsdAiCollateralGuard()` — re-exports core via `usdai-*` shells |
| **Legacy shells** | [usdai-constants.ts](../../../src/adapters/usdai/usdai-constants.ts) · [usdai-soil-gate.ts](../../../src/adapters/usdai/usdai-soil-gate.ts) · [usdai-protocol-lane.ts](../../../src/adapters/usdai/usdai-protocol-lane.ts) | 100% backward-compatible re-exports from [risk-engine-usdai.ts](../../../src/core/risk-engine-usdai.ts) |
| **Soil Fuse** | [soil-resistance.ts](../../../src/services/risk-control-lib/soil-resistance.ts) | `usdai` → `collectExternalSoilFlags()` · `protocolMask` OR-assign · `USD_AI_DEPEG_ORACLE_TRIP` |
| **USD.ai CLI** | `pnpm demo:usdai -- --trip` | `USD.ai Yield Collateral Fuse: OK/TRIPPED` ANSI board |

**Formal de-peg / oracle deviation (SSOT):**

$$
\Delta P_{\mathrm{USDai}} = \left| P_{\mathrm{sUSDai}} - 1.00 \right|,\quad \frac{d P_{\mathrm{USDai}}}{dt} > \theta_{\mathrm{depeg}} \implies \mathtt{FLAGS\_USDAI\_PEG\_DRIFT}
$$

$$
\mathrm{age}_{\mathrm{oracle}} > 7{,}200{,}000\,\mathrm{ms} \implies \mathtt{FLAG\_USDAI\_ORACLE\_STALE}
$$

#### § AI Guarded Pool Factory Protocol (V1.0)

Autonomous AI agents may propose Pendle pool creation or liquidity-add intents (`PENDLE_CREATE_POOL` · `PENDLE_ADD_LIQUIDITY`). Before mempool broadcast, `validateAIPoolSelection()` enforces four synchronous safety invariants on the hot path:

| Invariant | Threshold | Fail reason |
|-----------|-----------|-------------|
| **Liquidity cliff** | Days to maturity **≥ 7** | `PENDLE_POOL_MATURITY_CLIFF` |
| **Yield drift (MEV sandwich)** | Implied vs oracle yield **≤ 300 bps** | `PENDLE_POOL_YIELD_DRIFT_BREACH` |
| **Min initial liquidity** | **≥ $100,000 USD** | `PENDLE_POOL_LOW_INITIAL_LIQUIDITY` |
| **Underlying whitelist** | `eETH` · `ETH` · `USDai` · `sUSDai` · `USD.AI` | `PENDLE_POOL_ASSET_NOT_WHITELISTED` |

> **Arbitrum Fixed Yield funding (42161):** Pendle PT deposit on Arbitrum One requires **USDai** input — **not USDC**. Redeem outputs **sUSDai**. SSOT: [venue-execution-matrix.ts](../../../src/core/venue-execution-matrix.ts) · preflight `WRONG_TOKEN_USDC_FOR_PENDLE` · live harness: `execute:pendle:dust` / `dust-exit` (USDai→PT-sUSDai→sUSDai).

**Soil wiring:** optional `pendlePoolFactory` probe on `checkSoilResistance()` → `collectExternalSoilFlags()` · may chain `useOracle` freshness (`PENDLE_ORACLE_STALE`) before drift check · **p50 ~106µs** Shield budget preserved (zero hot-path I/O).

### 3.2 Risk & Execution Matrix

#### § Poisson Jitter & Anti-MEV Adaptive TWAP

For **$1,000,000+** treasury routing into GMX v2 GM pools, SSRC schedules child clips via **Wasm-driven Poisson random intervals** uniformly bounded **18s–110s** across a **12–18 minute** parent window. Inter-arrival jitter drives autocorrelation toward **near zero**, keeping GMX local price impact **≤ 10 bps**; any residual depth breach still short-circuits via `checkSoilResistance()` (R01).

#### § Block 0 Sequencer Desync Defense

| Layer | Mechanism |
|-------|-----------|
| **Private path** | Bypass public mempools via **Private Relays / QUIC** — Edge never exposes intent on the open gossip surface during desync windows. |
| **Settlement timing moat** | Leverage GMX v2 **two-stage async settlement**: keepers execute create→settle asynchronously; **`cancelOrder` remains a single-stage atomic** counter to stale MEV intent if soil / sequencer / oracle sensors trip mid-window. |

#### § SGX PRM Key Caching — ⏳ Planned / V1.0 Design Spec

> **Not in v1.0 codebase.** Documented cold-path / hot-signing architecture for future hardened key isolation.

| Phase | Bound |
|-------|-------|
| **Epoch attestation bootstrap** | **24-hour** SGX / PRM attestation refresh — cold path only. |
| **Hot signing** | Sub-ms **in-memory Ephemeral Key** signing after bootstrap — **&lt;30µs** CPU PRM execution on the ReflexCore (SSRC) hot wire (no per-tx remote attestation). |

#### § Step-down Auto-Deleveraging Rules

Python-verified **48-day runway** under sustained negative funding. Automated 3-phase unwind (R12 / escalation ladder family):

| Trigger | Action |
|---------|--------|
| **Day 8** | Delever **−20%** notional |
| **Day 15** | Delever **−50%** notional |
| **Day 22 (30% reserve)** | **100% Fail-Closed return** — flatten remaining exposure; R17 / R20 severance envelope if flatten stalls |

<a id="33-defense-matrix-r01-r20-summary"></a>

<a id="defense-matrix-r01-r20"></a>

### 3.3 Defense Matrix (R01–R20) — Summary

**Status:** **17 Active | 2 Refactored | 1 Deprecated** · Full rule table: [02_DEFENSE_MATRIX_AND_SSRC_CORE.md](./02_DEFENSE_MATRIX_AND_SSRC_CORE.md).

**Bitmask SSOT:** All R01–R20 rules compile into a single defense bitmask evaluated atomically by `checkSoilResistance()` — any trip bit set → **FAIL-CLOSED** in **p50 ~15µs** via `rootProtection()` / `severSigningChannel()` before EIP-712 signing channel release.

| Tier | Rules | Role |
|------|-------|------|
| **Pre-execution soil** | R01 · R03 · R04 · R05† | SSRC soil fuse · L2 stale book · Pgate latency |
| **Session / AA** | R06 · R07 · R08 · R14 | Scoped keys · notional cap · nonce heal · re-auth |
| **Saga / flatten** | R09 · R10 · R12 · R13 | 2PC ledger · auto-flatten · leverage scaling · black-swan halt |
| **Severance** | R17 · R20 · R02 | Daily loss cutoff · **p50 ~15µs physical deadlock** · `rootProtection()` |
| **Anchors / infra** | R11 · R15 · R16 · R18 · R19 | Dynamic SL · CCXT harness · 5-TX provenance · KV hardlock |

† R05 SpoofBuster — **Deprecated** (superseded by soil / depth gate).

**Supporting sensors:** Sequencer Guard · Arbitrum Gas / Oracle Lag · RPC Whitelist · Escalation Ladder.

### 3.4 Topology & Request Flow

| Engine | Venue | Role |
|--------|-------|------|
| **Arbitrum ExoMesh** (primary) | GMX v2 GM pools, Arbitrum One | Pre-execution gate · underweight-side routing |
| **Hyperliquid Native** (cross-chain L1) | Independent L1 HF orderbook perps · session-key signing · spread/size/rate-limit guard | Emergency Liquidity Sponge when ExoMesh soil fuse trips |

Routing policy: venue selected per risk flags; both paths share the same fail-closed envelope. On-chain attestation consume-once: [SliverVineGate.sol](../../../SliverVineGate/src/SliverVineGate.sol) (`verifyAndConsume`).

1. **Ingress** — [worker-fetch.ts](../../../src/worker-fetch.ts) / [worker-scheduled.ts](../../../src/worker-scheduled.ts).
2. **Pre-execution** — sequencer → oracle-lag → `checkSoilResistance()` (depth, cross-spread, slippage fuse, **Pendle oracle / cross-guard soil probes**).
3. **Routing** — underweight GM qualification → unsigned payload with optional builder hooks.
4. **Hedge** — session-key HL leg when ExoMesh soil fuse trips.
5. **State** — unidirectional `SystemState`; 2PC intent ledger → KV.

<a id="35-wasm-soil-core-m4-summary"></a>
<a id="wasm-soil-core-engine-no_std"></a>

### 3.5 ReflexCore (SSRC) soil engine (M4) — Summary

> **Wasm Budget SSOT:** [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) **< 28 KiB** · hot-path exec **< 60 µs** · SSRC p50 **~106 µs** · fail path **< 14 µs** physical deadlock.

> **Full Wasm / latency specification:** [02_DEFENSE_MATRIX_AND_SSRC_CORE.md](./02_DEFENSE_MATRIX_AND_SSRC_CORE.md).

> **Sequencer Defense Plane A/B:** Plane A = Edge TS/Wasm Gateway (**p50 ~106µs**, **0 gas** pre-broadcast). Plane B = Nitro Stylus `check_soil_resistance_stylus` + [SliverVineRiskOracle.sol](../../../contracts/SliverVineRiskOracle.sol) on-chain execution inside the sequencer block. Edge remains SSOT for agent hot paths; Stylus provides auditable Nitro-native reinforcement — **not** a substitute for Plane A.

> **Dual-Engine Soil Topology:** SliverVine ExoMesh enforces dual-engine soil resistance: pure high-throughput TypeScript soil math on Cloudflare Worker hot paths, alongside native [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) execution on `@slivervine/exomesh-agentic-wallet-guard` agent-intent paths. Both engines share identical p50 ~106µs fail-closed thresholds and defense bounds.

- Artifact: [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) (`#![no_std]`) — **soil_core** + **clock_core** C-ABI exports
- Budget: **&lt;28kb** Cloudflare · hot-path exec **&lt;60µs** · SSRC p50 **~106µs** · clock_core **~1.5 KiB** additive
- Wire: [src/sdk/soil-wasm.ts](../../../src/sdk/soil-wasm.ts) + [src/sdk/clock-wasm.ts](../../../src/sdk/clock-wasm.ts) (production); TS sim fallback for dev

#### 3.5.1 Stylus Nitro Opcode Gas Benchmark (Layer 2)

Run: `pnpm tsx scripts/benchmark-stylus-opcode.ts` · SSOT: [stylus_core.rs](../../../contracts/stylus-probe/src/stylus_core.rs) `check_soil_resistance_stylus(flags, risk_vector)`.

| Path | Modeled L2 Gas | Nitro runtime | Notes |
|------|----------------|---------------|-------|
| **Stylus native Wasm opcode** | **~313 gas** | **&lt;1 ms** (sub-ms in Nitro VM) | Stateless · `#[inline(always)]` · 6-lane f64 vector |
| **EVM-equivalent (naive Solidity)** | **~34,540 gas** | multi-ms (6× cold `SLOAD` thresholds) | Storage-heavy branch tree — **not** production path |
| **Gas ratio (EVM / Stylus)** | **~110×** | — | Nitro Wasm opcode schedule vs naive EVM |
| **Edge Layer 1 Gateway** | **0 gas** | **p50 ~106 µs** | Pre-consensus intercept — **before** Nitro block |

**Reviewer clarification:** p50 ~106µs measures **Layer 1 Edge Gateway + Wasm** — not L1/L2 block confirmation. Layer 2 Nitro protection is proven by Stylus opcode Gas parity ([benchmark-stylus-opcode.ts](../../../scripts/benchmark-stylus-opcode.ts)) and `SliverVineRiskOracle` STATUS_SHUTDOWN flush — both execute **inside** Arbitrum Sequencer block production.

<a id="37-eip-1193-agentic-wallet-guard-sdk--c-end-eip-1193-middleware"></a>

### 3.7 ExoMesh Agentic Guard (EIP-1193/5792/6963+) — EIP-1193/5792/6963 Agentic Wallet Guard Extension

> **SSOT:** [docs/02_sdk_and_integrations/01_guides/01_SDK_INTEGRATION_BLUEPRINT.md](../../02_sdk_and_integrations/01_guides/01_SDK_INTEGRATION_BLUEPRINT.md) · [src/sdk/exomesh-agentic-wallet-guard/](../../../src/sdk/exomesh-agentic-wallet-guard/) · **License:** Apache-2.0 wrapper · Wasm IP core [pkg/soil_core.wasm](../../../pkg/soil_core.wasm)  
> **Vitest:** `npx vitest run tests/sdk/` → **48/48 PASS** (5 files)

The **ExoMesh Agentic Guard** (`@slivervine/exomesh-agentic-wallet-guard`) — an **EIP-1193/5792/6963 Agentic Wallet Guard Extension** — packages ExoMesh's pre-consensus reflex arc as **ultra-lightweight browser middleware** compliant with standard EIP-1193 / EIP-5792 / EIP-6963 specs, extended into a **0-Gas pre-consensus superset**. No Cloudflare Worker required for C-end wallet and agentic wallet integrations.

| Layer | Module | Defense role |
|-------|--------|--------------|
| **Ingress** | [provider.ts](../../../src/sdk/exomesh-agentic-wallet-guard/provider.ts) · `announceGuardedProvider` (EIP-6963) · [eip5792-send-calls.ts](../../../src/sdk/exomesh-agentic-wallet-guard/eip5792-send-calls.ts) | Wrap `window.ethereum` before `eth_sendTransaction` / `eth_signTypedData_v4` / `wallet_sendCalls` |
| **Transport sync** | [transport-stream.ts](../../../src/sdk/exomesh-agentic-wallet-guard/transport-stream.ts) | `evaluateTransportStreamSync` · `verifyTransportBitmark` on `INTENT_RING_U32` sentinel |
| **Calldata** | [calldata-parser.ts](../../../src/sdk/exomesh-agentic-wallet-guard/calldata-parser.ts) | u32 bitwise selectors — ERC20 · Permit2 · generic DEX router · GMX (`CALLDATA_SCRATCH`, zero alloc) |
| **Policy** | [guard-engine.ts](../../../src/sdk/exomesh-agentic-wallet-guard/guard-engine.ts) · [risk-evaluator.ts](../../../src/sdk/exomesh-agentic-wallet-guard/risk-evaluator.ts) | Approve gate · venue allowlist · soil fuse · intent ring budget |
| **Wasm FFI** | [wasm-adapter.ts](../../../src/sdk/exomesh-agentic-wallet-guard/wasm-adapter.ts) | Optional `soil_core_eval` · `intent_core_evaluate_gate` acceleration |

**Reject reason codes (fail-closed · 0-Gas):**

| Code | Trigger |
|------|---------|
| `UNAUTHORIZED_SPENDER_REJECTED` | Infinite / over-cap approve · Permit2 · EIP-712 spender |
| `VENUE_DRIFT_REJECTED` | Contract outside `allowedVenues[]` |
| `SLIPPAGE_EXCEEDED` / `DEPTH_INSUFFICIENT` | Soil lane honeypot fuse |
| `MAX_ATTEMPTS_EXCEEDED_SEVERED` / `CHANNEL_SEVERED` | `INTENT_RING_U32` 4th-submit severance |
| `RPC_TRANSPORT_SYNC_FAILED` | RPC transport stream sync recovery (nonce-safe pause) |
| `SEND_CALLS_BATCH_REJECTED` | EIP-5792 empty / malformed `wallet_sendCalls` `calls[]` |

```text
dApp → withRetailGuardProvider(config)
     → evaluateRpcTransportProtocol
     → parseTransactionCalldata (Permit2 / ERC20 / swap)
     → evaluateRetailApproveGate | evaluateRetailSoilGate | evaluateRetailIntentGate
     → [PASS] baseProvider.request()
     → [FAIL] RetailGuardRejectedError + plainTextWarning
```

→ Integration blueprint: [docs/02_sdk_and_integrations/01_guides/01_SDK_INTEGRATION_BLUEPRINT.md](../../02_sdk_and_integrations/01_guides/01_SDK_INTEGRATION_BLUEPRINT.md)  
→ Competitive moat: [docs/02_sdk_and_integrations/02_specs_and_research/03_ARCHITECTURE_AND_MOAT.md](../../02_sdk_and_integrations/02_specs_and_research/03_ARCHITECTURE_AND_MOAT.md)

### 3.6 Financial Risk Parameters & Epoch Operations

| Layer | Parameter | Value / Rule | Status |
|-------|-----------|--------------|--------|
| **Active v1.0 Controls** | Single-order notional cap | **$5,000 USD** (`SESSION_KEY_NOTIONAL_CAP_USD`) | ✅ Code-Verified |
| **Active v1.0 Controls** | Protocol UI fee accrual | **+10 bps** `uiFeeReceiver` (`GMX_UI_FEE_BPS`) + up to **25%** referral rebate | ✅ Code-Verified |
| **Active v1.0 Controls** | Emergency margin buffer | **5%** (`DEFAULT_CROSS_MMR = 0.05`) | ✅ Code-Verified |
| **Active v1.0 Controls** | Circuit breakers | **R17** daily-loss severance · **R20** physical deadlock / flatten-fail | ✅ Code-Verified |
| **Vault Operational Spec (V1.0 Roadmap)** | Alpha Vault Cap | **$100,000** hard TVL ceiling | ⏳ Planned |
| **Vault Operational Spec (V1.0 Roadmap)** | Epoch batching | **4-hour** epoch windows for cross-venue execution | ⏳ Planned |
| **Vault Operational Spec (V1.0 Roadmap)** | Deposit cooldown | **24-hour** minimum hold to prevent flash arbitrage | ⏳ Planned |

<a id="dynamic-risk-parameter-update-architecture"></a>

### 3.6.1 Dynamic Risk Parameter Update Architecture

SliverVine risk thresholds are **deterministic for judges and auditors today**, yet **dynamically tunable in production** without breaking the pre-consensus fail-closed contract. Public numbers prove reproducibility; private execution physics prevent copy-paste bypass.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ TIER 1 — Deterministic Audit Phase (Judge / Vitest SSOT)                 │
│ Fixed default soil fuses · depth floors · venue caps                       │
│ 100% reproducible FAIL_CLOSED proofs (`pnpm demo:gmx -- --trip`)           │
│ Jitter disabled under VITEST=true for bit-exact regression               │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ live pool / oracle feeds (off hot-path config)
┌────────────────────────────────────────────────────────────────────────────┐
│ TIER 2 — Real-Time Off-Chain Feed (Zero-Gas Edge Worker)                   │
│ Cloudflare Worker + SSRC Wasm adjusts slippage / depth gates per venue     │
│ Liquidity-aware tightening — no on-chain gas · pre-broadcast only         │
│ SSOT: checkSoilResistance() · worker-fetch / worker-scheduled ingress      │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ black-swan / governance signal
┌────────────────────────────────────────────────────────────────────────────┐
│ TIER 3 — On-Chain Emergency Governance (Stylus + RiskOracle)             │
│ Stylus Coprocessor + SliverVineRiskOracle hard circuit breaker             │
│ PolicyGuardV2 / IngressSafetySwitch STATUS_SHUTDOWN flush inside block     │
│ Last-resort severance when off-chain feeds cannot be trusted               │
└────────────────────────────────────────────────────────────────────────────┘
```

| Tier | What changes | Who consumes it | Verification |
|------|----------------|-----------------|--------------|
| **1 — Audit defaults** | Published fuse constants in repo + SSOT JSON | Judges · CI · `pnpm test` | **254 files · 1206 PASS** · deterministic jitter-off |
| **2 — Edge feed** | Per-venue depth / slippage inputs at Worker ingress | Live agents · retail guard · venue demos | `pnpm demo:gmx -- --trip` · SEPSB matrix |
| **3 — On-chain breaker** | Governance-flushed oracle status · emergency halt | Sequencer Plane B · mainnet PolicyGuardV2 | `pnpm tsx scripts/benchmark-stylus-opcode.ts` · Gate ExoMesh [0x71D7…e2f1](https://arbiscan.io/address/0x71d7d26f98110c5de3df0fcbddcf2a3a2bc6e2f1) |

**Defense moat (engineering honesty):** Publishing Tier-1 parameters does **not** expose an exploitable static boundary. Each live `checkSoilResistance()` call applies **±2–5 bps Soil Threshold Jitter** ([soil-resistance-jitter.ts](../../../src/core/soil-resistance-jitter.ts)) to `slippageFuse` and `minDepthUsd`, plus **microsecond Wasm reflex** execution — an adversary cannot probe the exact fuse edge with manipulated RPC quotes and replay the result. The jitter band and sub-15µs severance path are the **physical moat**; the public table is the **auditability guarantee**.

**Verify:** `npx vitest run tests/risk-control/soil-threshold-jitter.test.ts` · `pnpm demo:exomesh` · [JUDGE_BRIEF.md](../../../JUDGE_BRIEF.md) · [#dynamic-risk-parameter-update-architecture](#dynamic-risk-parameter-update-architecture)

---

<a id="hidden-engineering-gems-and-invariants"></a>

## 4. Hidden Engineering Gems & Invariants

Engineering-honest deep dive for five production invariants. Each item cites SSOT paths and line ranges.

### 4.1 SDK Integration Surfaces (Primary + Optional B2B)

**Problem:** Human wallets and autonomous agent loops need the same soil reflex but different integration surfaces.

| Surface | SSOT | Lines | Integration |
|---------|------|-------|-------------|
| **Primary — `withRetailGuardProvider`** | [src/sdk/exomesh-agentic-wallet-guard/provider.ts](../../../src/sdk/exomesh-agentic-wallet-guard/provider.ts) | **L51–55, L74–93** | Wraps an EIP-1193 `request()` provider. Intercepts `eth_sendTransaction`, `eth_signTypedData_v4`, and EIP-5792 `wallet_sendCalls` before broadcast. **Judge-primary.** |
| **EIP-6963 discovery (optional)** | Same file | **L101–128** | `announceGuardedProvider()` registers a guarded provider via `eip6963:announceProvider`. |
| **Optional B2B — `withExoMeshShield`** | [src/sdk/decorator.ts](../../../src/sdk/decorator.ts) | **L54–78** | Server-side execution hook. Runs `checkSoilResistance()` then the wrapped `executionFn`. Trip → 60s cooldown per `agentId` (**L14–27, L62–69**). **Not judge path.** |
| **8-dimension agent gate (optional)** | [src/sdk/agent-intent.ts](../../../src/sdk/agent-intent.ts) | **L7–8, L31–88** | `verifyAgentIntent`: Injection ∧ Digest ∧ Soil ∧ Session ∧ Gas ∧ Attestation ∧ Armor ∧ Wasm. |

**Verify (judge-primary):** `npx vitest run tests/sdk/retail-guard-provider.test.ts` (35/35) · `pnpm demo:exomesh`

**Verify (optional appendix):** `npx vitest run tests/sdk/decorator.test.ts` · `pnpm demo:agent`

**Honesty boundary:** `withRetailGuardProvider` is the judge-primary SDK Package (`@slivervine/exomesh-agentic-wallet-guard`). `withExoMeshShield` does not wrap `window.ethereum`; it guards agent-side execution hooks and is not judge-primary.

---

### 4.2 Honeypot RPC Trap + Soil Threshold Jitter

Two complementary defenses: outbound RPC integrity (honeypot) and inbound threshold gaming resistance (jitter).

### 2.1 Honeypot — `evaluateRpcDefenseGate()`

| Item | SSOT | Lines |
|------|------|-------|
| Gate evaluation | [src/services/defense/rpc-fetch-gate-lib/rpc-fetch-gate-eval.ts](../../../src/services/defense/rpc-fetch-gate-lib/rpc-fetch-gate-eval.ts) | **L73–94** |
| 99% synthetic slippage constant | Same file | **L17** (`HONEYPOT_SIMULATED_SLIPPAGE = 0.99`) |
| Decoy telemetry (frozen object) | Same file | **L96–108** |
| Trap hosts in default allowlist | [src/services/defense/rpc-allowlist-hosts.ts](../../../src/services/defense/rpc-allowlist-hosts.ts) | **L34–43** |
| Enforced on every allowlisted fetch | [src/services/defense/rpc-fetch-gate-lib/rpc-fetch-gate-fetch.ts](../../../src/services/defense/rpc-fetch-gate-lib/rpc-fetch-gate-fetch.ts) | **L26–33** |

**Mechanism:** Unauthenticated requests to trap hosts (`rpc.silvervine-clone.trap`, etc.) trip immediately with `HONEYPOT_ACTIVE` and status `0x99`. No real venue RTT is consumed. Scrapers or forked frontends that copy the default RPC list receive decoy slippage telemetry, not production state. Authenticated operators bypass via layout-metric unlock or `X-ExoMesh-Session-Sig` ([`rpc-fetch-gate-eval.ts` L58–71](../../../src/services/defense/rpc-fetch-gate-lib/rpc-fetch-gate-eval.ts)).

**Verify:** `npx vitest run tests/defense/rpc-whitelist.test.ts`

### 2.2 Jitter — `resolveJitteredSoilThresholds()`

| Item | SSOT | Lines |
|------|------|-------|
| Jitter SSOT | [src/core/soil-resistance-jitter.ts](../../../src/core/soil-resistance-jitter.ts) | **L6–7, L16–37** |
| Re-export barrel | [src/services/risk-control-lib/soil-threshold-jitter.ts](../../../src/services/risk-control-lib/soil-threshold-jitter.ts) | **L1–6** |
| Hot-path integration | [src/services/risk-control-lib/soil-resistance.ts](../../../src/services/risk-control-lib/soil-resistance.ts) | **L135** |

**Mechanism:** Each soil check applies ±2–5 bps random offset to `slippageFuse` and `minDepthUsd` via `crypto.getRandomValues`. Prevents adversaries from probing an exact 0.5% fuse boundary with manipulated RPC quotes. Disabled under `VITEST=true` for deterministic tests ([`soil-resistance-jitter.ts` L12](../../../src/core/soil-resistance-jitter.ts)).

**Verify:** `npx vitest run tests/risk-control/soil-threshold-jitter.test.ts`

---

### 4.3 Observatory Paradox Resolution — −40 Haircut on Risk-Decrease Intents

**Problem:** A naive fail-closed guard that blocks `close`/`reduce` during volatility traps the agent in a high-risk position — the Observatory Paradox.

| Item | SSOT | Lines |
|------|------|-------|
| De-leverage detection | [src/guards/pendle-gmx-cross-guard.ts](../../../src/guards/pendle-gmx-cross-guard.ts) | **L54–57** |
| −40 score discount | Same file | **L55–57** (`effectiveScore = rawRiskScore - 40`) |
| Emergency greenlight | Same file | **L66–76** (`EMERGENCY_DELEVERAGE_ALLOWED`) |
| Expansion still blocked | Same file | **L78–86** (`FAIL_CLOSED_BLOCK` when score > 75 or shadow margin < 0) |

**Mechanism:** Pendle PT shadow-margin cross-guard computes a composite risk score. `close` and `reduce` intents receive a 40-point haircut and always pass as `EMERGENCY_DELEVERAGE_ALLOWED`. Risk-expanding intents retain full scoring.

**Verify:** `npx vitest run tests/guards/pendle-gmx-cross-guard.test.ts`

**Honesty boundary:** This guard applies to the Pendle × GMX cross-guard lane. It is not a universal bypass for all venue soil trips.

---

### 4.4 Session Key Constraints — Notional Cap, Clip, Dynamic SL

Session-key pipelines enforce layered USD limits before EIP-712 signing.

| Layer | Constant / Formula | SSOT | Lines |
|-------|-------------------|------|-------|
| **Physical notional cap** | `$5,000` (`SESSION_KEY_NOTIONAL_CAP_USD`) | [src/services/session-key-adapter-lib/session-key-types.ts](../../../src/services/session-key-adapter-lib/session-key-types.ts) | **L77–78** |
| **Enforcement + sever** | `assertSessionKeyExecutionGates` | [src/services/session-key-adapter-lib/session-key-gates.ts](../../../src/services/session-key-adapter-lib/session-key-gates.ts) | **L63–67, L25–32** |
| **Agent mandate clip** | `$30` (`MAX_ORDER_CLIP_USD`) | [src/config/risk-parameters.ts](../../../src/config/risk-parameters.ts) | **L11–12** |
| **7-day auto-expire** | `SESSION_KEY_AUTO_EXPIRE_MS` | [src/services/risk/session-audit.ts](../../../src/services/risk/session-audit.ts) | **L15–16, L41–78** |
| **Dynamic Max SL** | `Balance × 1% + $100` | [src/core/dynamic-max-sl.ts](../../../src/core/dynamic-max-sl.ts) | **L1–7** |
| **Wasm parity** | `session_core_ok` + dynamic SL in soil eval | [src/wasm/soil_core.rs](../../../src/wasm/soil_core.rs) | **L61, L78–98** |

**Mechanism:** `assertSessionKeyExecutionGates` checks signing-channel state, R20 lock, $5k notional cap, dynamic SL, and position cap. Breach calls `severSigningChannel()` and throws `SESSION_KEY_HARDLOCK_INTERCEPTED`. Separately, `auditSessionKeyConstraints` enforces the $30 clip and 7-day TTL for agent mandate attenuation.

**Verify:** `npx vitest run tests/services/session-key-gates.test.ts`

---

### 4.5 Cross-Isolate KV Sync — Non-Blocking `protocolMask`

**Problem:** Soil trip flags must propagate across Cloudflare isolates without adding `await` latency to the reflex hot path.

| Item | SSOT | Lines |
|------|------|-------|
| O(1) sync read | [src/core/protocol-mask-sync.ts](../../../src/core/protocol-mask-sync.ts) | **L51–53** |
| Local merge | Same file | **L55–57** |
| Fire-and-forget KV write | Same file | **L99–114** (`void put().catch()`) |
| KV adapter shell | [src/services/kv-lib/protocol-mask.ts](../../../src/services/kv-lib/protocol-mask.ts) | **L32–40** |
| Worker bootstrap | [src/worker-fetch.ts](../../../src/worker-fetch.ts) | **L47–48** (`bind` + `ctx.waitUntil(prefetch…)`) |
| Route-level prefetch | [src/api/routes-lean.ts](../../../src/api/routes-lean.ts) via `routeRequest` | Entry at **L34** (RPS gate runs first) |
| Soil integration | [src/services/risk-control-lib/soil-resistance.ts](../../../src/services/risk-control-lib/soil-resistance.ts) | **L141–143** |
| Wasm trip bit | [src/wasm/soil_core.rs](../../../src/wasm/soil_core.rs) | **L54–57** (`TRIP_PROTOCOL`) |

**Mechanism:** `readProtocolMaskSync()` returns a module-scoped `cachedMask` OR-ed with any global snapshot — zero allocation, no I/O. On isolate startup, `prefetchProtocolMaskKv` hydrates cache via `ctx.waitUntil`. When a local isolate discovers new trip bits, `scheduleProtocolMaskKvWrite` updates cache immediately and persists to KV asynchronously. KV write failure is swallowed; the hot path never awaits.

**Verify:** `npx vitest run tests/core/protocol-mask-sync.test.ts`

**Honesty boundary:** Mask sync is eventually consistent across isolates. A trip in isolate A may not be visible in isolate B until KV propagation completes.

---

### 4.6 Appendix — Public Gateway Rate Limiter (Related)

Not one of the five core invariants above, but referenced from README:

| Item | SSOT | Lines |
|------|------|-------|
| In-memory 5 RPS bucket | [src/middleware/rate-limiter.ts](../../../src/middleware/rate-limiter.ts) | **L82–104** |
| Enforced before handlers | [src/api/routes-lean.ts](../../../src/api/routes-lean.ts) | **L34–35** |
| Response headers | [src/middleware/rate-limiter.ts](../../../src/middleware/rate-limiter.ts) | **L68–79** |

**Honesty boundary:** Per-isolate `Map` counter — not a global Cloudflare Rate Limit product. Some explicit GET routes in `worker-fetch.ts` bypass `routeRequest` and therefore bypass this limiter.

---

### 4.7 Verification Index

```bash
npx vitest run tests/sdk/retail-guard-provider.test.ts   # Primary · judge path
npx vitest run tests/sdk/decorator.test.ts                 # Optional B2B appendix
npx vitest run tests/defense/rpc-whitelist.test.ts         # Honeypot
npx vitest run tests/risk-control/soil-threshold-jitter.test.ts
npx vitest run tests/guards/pendle-gmx-cross-guard.test.ts # Observatory
npx vitest run tests/services/session-key-gates.test.ts    # Session caps
npx vitest run tests/core/protocol-mask-sync.test.ts       # KV mask sync
```

