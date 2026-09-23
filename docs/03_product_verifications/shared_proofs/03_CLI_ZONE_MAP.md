# CLI Zone Map (Tier 0–1 Verification + Ops Zones)

> **SSOT index:** [README.md](../README.md) · **Hub:** [../01_VERIFICATION_MATRIX.md](../01_VERIFICATION_MATRIX.md) · **Adversarial boundaries (FW-01–16):** [01_ADVERSARIAL_BOUNDARY_MATRIX.md](../module_a_exomesh/01_ADVERSARIAL_BOUNDARY_MATRIX.md)

## Zone A — 30-Second Express Verification (Fast Track)

### Verification Tiers (CLI SSOT)

| Tier / Zone | Tag | Commands | Scope |
|-------------|-----|----------|-------|
| **Tier 0 — SDK/CLI Unit & Integration** | `[ExoMesh]` | `pnpm demo:exomesh` · `npx vitest run tests/sdk/retail-guard-provider.test.ts` · `npx vitest run tests/sdk/eip5792-send-calls.test.ts` | **ExoMesh Agentic Guard (EIP-1193/5792/6963+)** · `withRetailGuardProvider()` · Scenario A–D |
| **8 CAN Adversarial Boundary** | `[ExoMesh]` | `pnpm demo:FW-{01,02,04,10,11,12,13,14}` | 1-line per CAN row — [01_ADVERSARIAL_BOUNDARY_MATRIX.md](../module_a_exomesh/01_ADVERSARIAL_BOUNDARY_MATRIX.md) |
| **Tier 0 — Module B Vault Standard** | `[Sanctuary]` | `pnpm demo:sanctuary` | ERC-7540+ Async Escort Matrix |
| **Tier 0 — Module B Treasury Ingress** | `[Sanctuary]` | `pnpm demo:ingress` · `npx vitest run tests/adapters/treasury-escort-router.test.ts` | Pillar Set X Across/AML escort |
| **Tier 1 — Full Protocol Regression** | `[ExoMesh]` | `pnpm test -- --run` | **254 files / 1206 PASS** · `pnpm exec tsc --noEmit` 0 errors |
| **Tier 1 — 5-Core Venues** | `[ExoMesh]` | `pnpm demo:{gmx,pendle,usdai,hl,variational}` · `--trip` | GMX · Pendle · USD.ai · HL · Variational — 5-Core Venue Matrix |
| **Tier 1 — Sanctuary GM I/O** | `[ExoMesh]` | `pnpm execute:gmx:gm-deposit` · `pnpm demo:gmx` · `pnpm demo:hl` | Arbitrum Native USDC GM deposit · live Wallet B multicall |
| **Zone A — Strategy Loops** | `[ExoMesh]` | `pnpm demo:{perp-loop,spot-loop}` · `--trip` | Loop A perp/yield · Loop B USD.ai collateral |
| **Zone B — Sandbox & E2E** | `[Sanctuary]` | `pnpm demo:{e2e,sanctuary,ingress}` | ERC-7540+ · treasury ingress · **4-step Happy Path** (`--unwind` · `--trip` optional) |
| **Ops Zone — Vitest matrix** | `[ExoMesh]` | `pnpm demo` | 12 Dual Pillar Set X & Y ANSI scenarios ([tests/demo/](../../../tests/demo)) |

All standalone CLIs measure latency via `process.hrtime.bigint()` (µs precision).

### Path 1: Instant Monorepo (Recommended — ~3 Seconds)

```bash
pnpm install
pnpm demo       # Primary Judge Showcase (12 Dual Pillar Set X & Y Scenarios)
pnpm demo:delta-neutral   # 4-Step Happy Path Macro Lifecycle CLI (--unwind · --trip optional)
pnpm test       # Full System Regression Suite (254 test files | 1206 PASS clean)
```

| Command | Proves | Expected |
|---------|--------|----------|
| `pnpm demo` | Dual Pillar Set X & Y micro E2E matrix ([tests/demo/](../../../tests/demo)) | **12/12 PASS** · ANSI output |
| `pnpm demo:gmx -- --trip` | GMX v2 shadow margin · cross-venue slippage · position cap | **FAIL_CLOSED** · pool skew / price-impact breach |
| `pnpm demo:hl -- --trip` | Hyperliquid session key auth · WS depth guard | **FAIL_CLOSED** · session / spread breach |
| `pnpm demo:pendle -- --trip` | Pendle PT/YT sentinel · guarded pool factory · **USD.AI** markets (USDai in · sUSDai redeem) | **FAIL_CLOSED** · oracle TTL / PT maturity breach |
| `pnpm preflight:venues --venue=pendle` | Wallet A funding wedge — **USDai** + ETH (not USDC) | `WRONG_TOKEN_USDC_FOR_PENDLE` when only USDC funded |
| `pnpm demo:usdai -- --trip` | USD.ai AI-compute yield collateral guard (`evaluateUsdAiCollateralGuard`) | **FAIL_CLOSED** · peg / oracle / depth breach · [usdai-adapter.test.ts](../../../tests/adapters/usdai-adapter.test.ts) **5/5** |
| `pnpm demo:variational -- --trip` | Variational Omni RFQ stale quote & OLP depth guard | **FAIL_CLOSED** (`VARIATIONAL_STALE_QUOTE_BREACH`) |
| `pnpm demo:gmx -- --trip` | **Judge fast track** — GMX V2 Arbitrum native hard anchor | **FAIL_CLOSED** · pool skew / price-impact breach |
| `pnpm demo:variational -- --trip` | **Judge fast track** — Variational multi-venue RFQ gate | **FAIL_CLOSED** · stale quote / OLP breach |
| `pnpm demo:hl -- --trip` | **Judge fast track** — Hyperliquid L1 primary hedge path | **FAIL_CLOSED** · session-key / depth guard |
| `pnpm demo:perp-loop -- --trip` | Loop A perp/yield stack (GMX / Pendle / HL / Variational) | **FAIL_CLOSED** · p50 ~15µs reflex core |
| `pnpm demo:spot-loop -- --trip` | Loop B USD.ai collateral lane | **FAIL_CLOSED** · p50 ~15µs reflex core |
| `pnpm demo:delta-neutral` | 4-step ExoMesh ANSI HUD dry-run (Happy Path SSOT) | `RESULT: E2E OK (4/4)` |
| `pnpm demo:delta-neutral -- --unwind` | Optional Step 5 ExoMesh R20 unwind exercise | `RESULT: E2E OK (5/5)` |
| `pnpm demo:delta-neutral -- --trip` | Step 1 soil-trip stress intercept | `E2E FAIL` at Gatehouse |
| `npx vitest run tests/sdk/retail-guard-provider.test.ts` | ExoMesh Agentic Guard (EIP-1193/5792/6963+) | **35/35 PASS** |
| `pnpm demo:agent` | Optional B2B agent lifecycle smoke demo · **not judge path** | `ALLOW` / intent gate |
| `pnpm demo:sanctuary` | **Module B Vault Standard** — ERC-7540+ Scenario A–C | `ALLOW` · `REJECT_OPERATOR` · `REJECT_SLIPPAGE` (`demo:escort` alias) |
| `pnpm demo:ingress` | **Module B Treasury Ingress** — Pillar Set X Across/AML escort | `lostUsd ≡ 0` · Route A/C HUD |
| `pnpm test` | Full Vitest regression bar | **254 test files | 1206 PASS clean (100%)** |

**`demo:delta-neutral` expected terminal highlights** (GitHub `diff` syntax):

```diff
+  ┌─ SliverVine Protocol · ExoMesh + Sanctuary ─────────────────────┐
+  │  Sepolia Gate · p50 ~106µs · Δnet ≡ 0 · lostUsd ≡ 0            │
+  └────────────────────────────────────────────────────────────────┘
+ Step 1: allowedToSign=true · elapsed=106µs · Δnet ≡ 0
+ Step 2: Escort PASS · lostUsd ≡ 0
- AML_INBOUND_TO_ROBINHOOD_BLOCKED (inbound 42161→46630)
! Step 3: uiFeeReceiver (+10 bps)
+ Step 4: Margin Anchor · Δnet ≡ 0
+ RESULT: E2E OK (4/4)
```

**Optional modes:**

```diff
+ pnpm demo:delta-neutral -- --unwind   # Step 5 ExoMesh R20 unwind · RESULT: E2E OK (5/5)
+ pnpm demo:delta-neutral -- --trip     # Step 1 soil-trip intercept · E2E FAIL at Gatehouse
```

**Legacy stress diff** (`--unwind` only — Step 5 soil exercise):

```diff
- ALERT: SOIL_TRIPPED — toxic depth fuse
- [CRITICAL] PHYSICAL_DEADLOCK_TRIGGERED: EIP-712 Signature Pipe Severed
+ Treasury State: Protocol Treasury retains +$2.40 (uiFeeReceiver share)
+ Flash unwind: PASS · RESULT: E2E OK (5/5)
```

### Path 2: Isolated Docker (Zero Host Node/pnpm)

```bash
docker build -t slivervine-sanctuary . && docker run --rm slivervine-sanctuary
```

| Command | Proves | Expected |
|---------|--------|----------|
| Default `docker run` | 4-step Sanctuary **`demo:delta-neutral`** Happy Path inside container | `[tier0] demo:delta-neutral PASS` |
| `docker run --rm slivervine-sanctuary pnpm test` | Full Vitest regression (host-free) | **254 test files | 1206 PASS clean (100%)** |

**Why Docker Path:** Eliminates judge laptop Node version drift, pnpm store corruption, and missing WSL deps — same PASS bar, hermetic container.

---

## Zone A.1 — Dual-Demo Architecture (Dual Pillar Set X & Y Showcase)

Cloudflare Edge **SaaS gateway** positioning: sub-ms **zero-I/O sync** `checkSoilResistance()` hot-path (**p50 ~106µs**) — independent of AA bundler latency.

### (a) Microsecond Risk Gate Demo Matrix — `pnpm demo`

```bash
pnpm demo
# or: npx vitest run tests/demo/
```

**12 ANSI-readable Vitest scenarios** across GMX v2 · Hyperliquid · Pendle (`tests/demo/*.demo.test.ts`):

| Demo file | Scenarios | Risk surfaces proven |
|-----------|-----------|----------------------|
| [gmx-v2-agent-flow.demo.test.ts](../../../tests/demo/gmx-v2-agent-flow.demo.test.ts) | 4 | Healthy MarketIncrease · toxic price-impact soil trip · Chainlink Data Streams oracle-lag reject + `reduceOnly` delever rescue · 1,000× payload validation benchmark |
| [hyperliquid-agent-flow.demo.test.ts](../../../tests/demo/hyperliquid-agent-flow.demo.test.ts) | 4 | Valid `ApproveAgent` EIP-712 · WS stale / latency >200ms soil trip · expired session key / GateLockout · 1,000× session-key validation benchmark |
| [pendle-ai-agent-flow.demo.test.ts](../../../tests/demo/pendle-ai-agent-flow.demo.test.ts) | 4 | AI guarded pool PASS · 450bps yield-drift MEV reject · 60s TTL stale oracle · 1,000× `validateAIPoolSelection()` benchmark |

| Command | Proves | Expected |
|---------|--------|----------|
| `pnpm demo` | Dual Pillar Set X & Y micro E2E matrix | **12/12 PASS** · colorful ANSI console output |

### (b) Macro Lifecycle E2E Suite — `pnpm demo:delta-neutral`

```bash
pnpm demo:delta-neutral
```

| Command | Proves | Expected |
|---------|--------|----------|
| `pnpm demo:delta-neutral` | 4-step cross-venue agent hedge Happy Path (SSOT) | `RESULT: E2E OK (4/4)` |
| `pnpm demo:delta-neutral -- --unwind` | Optional Step 5 R20 panic flash unwind | `RESULT: E2E OK (5/5)` |
| `pnpm demo:delta-neutral -- --trip` | Step 1 soil-trip stress intercept | `E2E FAIL` at Gatehouse |

Steps (Happy Path): Intent + Deadman → Robinhood escort → GMX underweight rebalance → HL session hedge. Optional `--unwind` adds Step 5 ExoMesh R20 exercise; `--trip` stress-tests Step 1 Gatehouse intercept.

---

## Zone B — Inside Hybrid Pillar Sets X & Y (Core Protocol Invariants)

### Pillar Set X — Sanctuary Escrow Substrate (Gatehouse AA)

**Command:** `pnpm test:zerodev`

**Definition:** `vitest run tests/adapters/zerodev-aa-dryrun-harness.test.ts`

| Assertion | Status |
|-----------|--------|
| Kernel v3 / EntryPoint **v0.7** UserOp **draft** path | ✅ Dry-run harness verified |
| Session scope + Risk Oracle Gate fail-closed | ✅ Offline / mock bundler |
| Mainnet UserOp broadcast (4663 precedent) | ✅ **Verified Live** — Robinhood Mainnet Smart Route `4663` → `42161` · UserOp [0x7b72ee9f…](https://arbiscan.io/tx/0x4c4ca1362d4a50d4684662e633e728401478c29dbef13f49e109e68253b5964a) |
| Testnet UserOp broadcast (46630 live-fire) | ✅ **Verified Live** — Tier1 Smart Route `46630` → `42161` · Tx [0xdca66358…2a2f](https://arbiscan.io/tx/0xdca66358ffb9a2463d1069722ea27dcfabe1d374dc1d5264698c74341bb02a2f) · Tier2 RH native tx [0x4574c97f…fcf6](https://explorer.testnet.chain.robinhood.com/tx/0x4574c97ff91b5321c3281c535577a1a55908f4e92de8c3ecb55433e94735fcf6) · [ROBINHOOD_LIVEFIRE_ARTIFACTS.md](../../logging/ROBINHOOD_LIVEFIRE_ARTIFACTS.md) |
| Mainnet native escort (4663 live-fire) | ✅ **Verified Live** — Tier2-mainnet RH native tx [0x02ced821…951d](https://explorer.chain.robinhood.com/tx/0x02ced8215cb1a9f6ec1b82dd39e01536991f278967d63c63dc29bde2ef6d951d) · UserOp `0x9ce020ba…cbfea` · [ROBINHOOD_LIVEFIRE_ARTIFACTS.md](../../logging/ROBINHOOD_LIVEFIRE_ARTIFACTS.md) |

**Narrative:** ZeroDev Kernel v3 is an **Opt-In Pillar Set X Account Abstraction Layer** — scoped 30s session keys and Paymaster gas sponsorship ($0.50/op · $10/day). **Pillar Set Y ReflexCore (SSRC) Engine** ([pkg/soil_core.wasm](../../../pkg/soil_core.wasm) · p50 ~106 µs) and **Pillar Set X Arbitrum Native Ingress** operate **100% independently** of ZeroDev. [zerodev-aa-gate.ts](../../../src/adapters/arbitrum/zerodev-aa/zerodev-aa-gate.ts) provides pre-bundler UserOp validation when AA is enabled.

**v1.0 AA scope:** Stage ① Sign-in · ③ Gas · ④ Authorize · ⑤ Execute (Sepolia verified). Stage ② Smart Routing = Reference Harness. Stages ⑥⑦ = Post-Grant Roadmap.

**Read order:**

```text
zerodev-aa-gate.test.ts → assertExoMeshRiskGate() + evaluateZeroDevGasGuards()
zerodev-aa-gate.ts → evaluateStaticBreakerMatrix() + ExoMesh risk gate
 ├─ zerodev-aa-failover.ts → Arbitrum One health / AA probe route
 ├─ [zerodev-aa-static-breaker.ts](../../../src/adapters/arbitrum/zerodev-aa/zerodev-aa-static-breaker.ts) → soil + gas sponsorship limits
 └─ zerodev-aa-userop.ts → Paymaster + bundler dispatch (after gate PASS)
```

---

### Pillar Set X — Sanctuary Escrow Substrate (Compliance Ingress)

**CLI (policy replay):** `pnpm demo:ingress` · [examples/ingress-escort-demo.ts](../../../examples/ingress-escort-demo.ts) — **not** live-fire proof

**Live-fire harnesses (46630 testnet · 4663 mainnet · 2026-09-21):**

```bash
pnpm tsx scripts/execute-smart-route-live-demo.ts   # Case A-Tier1 · SMART_ROUTE_SOURCE_CHAIN_ID=46630
pnpm probe:rchain-testnet                             # Case A-Tier2 · 46630 native escort tx
pnpm probe:rchain-mainnet                             # Case A-Tier2-mainnet · 4663 native escort tx
pnpm probe:robinhood-inbound-treasury                 # Case B3 · treasury pre-sign · 0 broadcast
```

| Case | Artifact |
|------|----------|
| **B1** inbound block | [inbound_block JSON](../../logging/robinhood_livefire_inbound_block_2026-09-21T01-54-27-239380566Z.json) · `AML_INBOUND_TO_ROBINHOOD_BLOCKED` |
| **B2** audit certificate | [inbound_audit JSON](../../logging/robinhood_livefire_inbound_audit_2026-09-21T02-09-39-263Z.json) · `sha256Signature` `c9896689…bd9bb` |
| **B3** treasury probe | [inbound_treasury JSON](../../logging/robinhood_livefire_inbound_treasury_2026-09-21T02-09-41-885Z.json) · `RWA_YIELD_SOURCE_CHAIN_UNSUPPORTED` |

Full index: [ROBINHOOD_LIVEFIRE_ARTIFACTS.md](../../logging/ROBINHOOD_LIVEFIRE_ARTIFACTS.md)

**Unit SSOT:**

```bash
pnpm exec vitest run tests/adapters/across-ingress-bridge.test.ts
```

| Metric | Expected |
|--------|----------|
| Test cases | **6/6 PASS** |
| Escort invariant | `lostUsd ≡ 0` |
| AML isolation | `AML_INBOUND_TO_ROBINHOOD_BLOCKED` — unidirectional 42161→46630 outbound only |

**Narrative:** Robinhood Chain (`46630`/`4663`) Across ingress is a **Pillar Set X Reference Escort Adapter** — not product identity. Inbound AML block enforces fail-closed unidirectional isolation before capital reaches Arbitrum deployable NAV.

Related: [Yellow Paper §Ingress](../../01_architecture_and_standards/01_core_specs/01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md)

---

### Pillar Set Y — SliverVine ExoMesh Engine Substrate (Pre-Consensus Wasm Risk Engine)

| Command | Proves | Expected |
|---------|--------|----------|
| `cd SliverVineGate && forge test` | On-chain Gate · default property fuzz | **60/60 Passed** · **5,120 fuzz** (5×1,024) |
| `pnpm audit:nightly` | Deep fuzz gate (`FOUNDRY_PROFILE=deep`) | **327,675** executions |
| `pnpm audit:fast` / `pnpm audit:security` | TSC · Vitest security · Solhint · Gitleaks · Slither · Aderyn | Fast PASS · Security **5/0/0 PASS** |

**Default forge command:**

```bash
cd SliverVineGate && forge test --gas-report && cd ..
```

**Deep fuzz command:**

```bash
pnpm audit:nightly
# or: cd SliverVineGate && FOUNDRY_PROFILE=deep forge test --match-path 'test/*.fuzz.t.sol' && cd ..
```

| Metric | Default `forge test` | Deep profile (`FOUNDRY_PROFILE=deep` / `pnpm audit:nightly`) |
|--------|----------------------|----------------------------------------------------------------|
| Unit tests | **60 Passed · 0 Failed** | **60 Passed · 0 Failed** |
| Property fuzzing | **5 × 1,024 = 5,120** executions | **5 × 65,535 = 327,675** executions |
| Invariants | **3 × 16,384** stateful calls · 0 counterexamples | same |
| Core | [SliverVineGate.sol](../../../SliverVineGate/src/SliverVineGate.sol) consume-once attestation · gas-bounded `verifyAndConsume` | same |

**Formal Verification — Native Foundry Invariant Tests**

| Invariant | Test anchor | Verify |
|-----------|-------------|--------|
| Replay denial (I6) | `test_I6_Replay_Denies` | `cd SliverVineGate && forge test --match-test test_I6_Replay_Denies` |
| No double-spend | `invariant_NoDoubleSpend` | `cd SliverVineGate && forge test --match-path test/SliverVineGate.invariant.t.sol` |
| Full Gate suite | 60 unit + fuzz + invariant tests | `cd SliverVineGate && forge test` |

**R03 / R04 — RPC & Execution-Lag Telemetry (Provenance)**

| ID | Guard | Fail-closed budget | Code SSOT |
|----|-------|-------------------|-----------|
| **R04** | PGATE Latency / WS jitter | **200ms** | `PGATE_MAX_LATENCY_MS` · [src/adapters/hl/websocket/websocket-health.ts](../../../src/adapters/hl/websocket/websocket-health.ts) |
| **R03** | HL L2 book stale / RPC probe | **500ms** | `HL_L2_STALE_THRESHOLD_MS` · [src/services/exchanges/hl-l2-book-lib/hl-l2-book-types.ts](../../../src/services/exchanges/hl-l2-book-lib/hl-l2-book-types.ts) |

Related: [02_DEFENSE_MATRIX_AND_SSRC_CORE.md](../../01_architecture_and_standards/01_core_specs/02_DEFENSE_MATRIX_AND_SSRC_CORE.md) · [VERIFICATION_MATRIX.md](../01_VERIFICATION_MATRIX.md)

#### Pendle Institutional Guard (ExoMesh · Pillar Set Y)

Zero-I/O sync oracle + fail-closed soil wiring within the existing Shield **p50 ~106µs** budget.

```bash
pnpm demo   # 12 Dual Pillar Set X & Y ANSI scenarios (recommended first)
pnpm exec vitest run tests/adapters/pendle-market-oracle.test.ts
pnpm exec vitest run tests/adapters/pendle-pt-registry.test.ts
pnpm exec vitest run tests/risk-control/pendle-soil-guard.test.ts
pnpm exec vitest run tests/guards/pendle-gmx-cross-guard.test.ts tests/adapters/pendle-pt-expiry-guard.test.ts
pnpm exec vitest run tests/demo/pendle-ai-agent-flow.demo.test.ts
```

| Test file | Proves | Expected |
|-----------|--------|----------|
| [tests/adapters/pendle-market-oracle.test.ts](../../../tests/adapters/pendle-market-oracle.test.ts) | Sync oracle `ingest`/`resolve` · **TTL 60s** stale · `PENDLE_ORACLE_STALE` soil trip | **PASS** |
| [tests/adapters/pendle-pt-registry.test.ts](../../../tests/adapters/pendle-pt-registry.test.ts) | `resolve*` · `normalize*` · address index · `hydrateFromOracle` | **PASS** |
| [tests/risk-control/pendle-soil-guard.test.ts](../../../tests/risk-control/pendle-soil-guard.test.ts) | `pendleOracle` + `pendleCrossGuard` → `checkSoilResistance()` | **PASS** |
| [tests/guards/pendle-gmx-cross-guard.test.ts](../../../tests/guards/pendle-gmx-cross-guard.test.ts) | Shadow Margin cross-guard · Observatory Paradox de-leverage | **PASS** |
| [tests/adapters/pendle-pt-expiry-guard.test.ts](../../../tests/adapters/pendle-pt-expiry-guard.test.ts) | PT expiry &lt;7d ∧ jitter &gt;200bps fail-closed · 1,000 fuzz | **PASS** |

**Code SSOT:** [pendle-market-oracle-adapter.ts](../../../src/adapters/pendle/pendle-market-oracle-adapter.ts) · [pendle-pt-registry.ts](../../../src/adapters/pendle/pendle-pt-registry.ts) · [pendle-gmx-cross-guard.ts](../../../src/guards/pendle-gmx-cross-guard.ts) · [core/pendle-types.ts](../../../src/core/pendle-types.ts) · [venue-execution-matrix.ts](../../../src/core/venue-execution-matrix.ts) (`pendle-pt-dust` → USDai)

**Funding wedge:** Arbitrum Fixed Yield deposit requires **USDai** — not USDC. Live harness: `execute:pendle:dust` / `dust-exit` (USDai→PT-sUSDai→sUSDai) · evidence: [02_LIVE_FIRE_EVIDENCE.md](../shared_proofs/02_LIVE_FIRE_EVIDENCE.md)

---
