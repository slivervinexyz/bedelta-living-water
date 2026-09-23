# On-Chain Mainnet Anchors (Arbitrum One · 42161)

> **SSOT index:** [README.md](../README.md) · **Hub:** [../01_VERIFICATION_MATRIX.md](../01_VERIFICATION_MATRIX.md)

> **GMX invariant stack:** three deployed layers — Solidity wire invariants → single-SLOAD defense bitmap → Stylus/Wasm coprocessor with Solidity fallback.

### Sandbox Security & Distribution Boundaries (Evaluator Read First)

> **ExoMesh live (2026-09-17):** domain `SliverVineExoMesh` v1 · Mainnet Gate [0x71D7…e2f1](https://arbiscan.io/address/0x71d7d26f98110c5de3df0fcbddcf2a3a2bc6e2f1) · Sepolia Gate [0xc66F…8959](https://sepolia.arbiscan.io/address/0xc66f96611a737c4e58706d0955594456eab88959). Legacy Sanctuary-era → [03_SUPERSEDED_DEPLOYMENTS_APPENDIX.md](../../01_architecture_and_standards/01_core_specs/05_SUPERSEDED_DEPLOYMENTS_APPENDIX.md).

> **Stylus:** PolicyGuardV2 [0x5df192…](https://arbiscan.io/address/0x5df192f9454fd02a89e768632cb5da0762a774bc) wires Stylus [0xc23587…625e](https://arbiscan.io/address/0xc23587d6573dd134f95b02b0202ffbf84686625e) with Solidity fallback.

> **npm SDK Status:** `@slivervine/exomesh-agentic-wallet-guard` is currently **private monorepo-bound** (`"private": true`). **Public npmjs release scheduled for Post-Grant Milestone 1.**

### Absolute SSOT Lock (Evaluator Copy-Paste)

| Field | Locked value | Verify |
|-------|--------------|--------|
| **Official H1** | SliverVine Protocol (BeDelta Living Water v1.0 / BeΔ): Sub-ms 0-Gas Pre-Broadcast Safety ExoMesh & Risk Navigator for AI Agents on Arbitrum | [README.md](../../../README.md) · [SUBMISSION.md](../../00_ARB_Buildathon/SUBMISSION.md) |
| **Vitest baseline** | **254 test files | 1206 PASS clean (100%)** | `pnpm test -- --run` · `pnpm exec tsc --noEmit` **0 errors** |
| **Verified commit** | <!-- SSOT:ONCHAIN_VERIFIED_COMMIT_START -->
`main` @ **`0885225`** · baseline **`572e5cd`** (GMX on-chain invariant stack @ 572e5cd) · Worker bundle **111.19 KiB raw | 40.5 KiB gzip** (`limitKiB: 150` · `pass: true`) | `git rev-parse HEAD` · `pnpm bundle:measure`
<!-- SSOT:ONCHAIN_VERIFIED_COMMIT_END --> |
| **Solidity layer — GmxRiskInvariantLib** | Pure Solidity GMX wire invariants — mirrors [gmx-risk-core.ts(../../../src/core/gmx-risk-core.ts) · **83 LOC** | [GmxRiskInvariantLib.sol](../../../contracts/src/libs/GmxRiskInvariantLib.sol) · Forge PolicyGuard **9/9** |
| **Bitmap layer — GmxSoilMatrixSwitch** | Single **SLOAD** defense bitmap · **47 LOC** + `DefenseMatrixBitmap` **66 LOC** | [GmxSoilMatrixSwitch.sol](../../../contracts/GmxSoilMatrixSwitch.sol) · Forge **8/8** |
| **Stylus layer — sanctuary_invariants** | Stylus/Wasm coprocessor `evaluate_packed` · TS/Rust parity · **PolicyGuardV2** Stylus staticcall + `GmxRiskInvariantLib` fallback | [contracts/sanctuary_invariants/](../../../contracts/sanctuary_invariants/) · `pnpm build:sanctuary-invariants` · [stylus-gmx-parity.test.ts](../../../tests/wasm/stylus-gmx-parity.test.ts) **6/6** · Cargo **2/2** |
| **Auto R20 severance** | `applyAutoSeveranceOnFlags()` — bitmask trips auto-call `severSigningChannel()` | [risk-severance.ts(../../../src/core/risk-severance.ts) · [tests/core/risk-severance.test.ts](../../../tests/core/risk-severance.test.ts) |
| **Variational RFQ core bitmask** | `evaluateVariationalFlags()` — **Bit 12** `FLAG_VARIATIONAL_STALE_QUOTE` · **Bit 13** `FLAG_VARIATIONAL_OLP_DEPTH_EXCEEDED` · both bound to `FLAGS_AUTO_SEVER_MASK` | [risk-engine-core.ts(../../../src/core/risk-engine-core.ts) · [risk-flags.ts(../../../src/core/risk-flags.ts) · [variational-rfq-adapter.ts(../../../src/adapters/variational-rfq-adapter.ts) |
| **Sliding-window pending OI** | 30s GMX skew/notional accumulator — split-payload defense | [pending-exposure-window.ts(../../../src/core/pending-exposure-window.ts) |
| **Dual-Engine Wasm (FROZEN)** | **Engine A** Stylus `0xc23587…` · **Engine B** Edge SHA-256 `67f8fcc7…` — see [§ Dual-Engine Map](#dual-engine-infrastructure-map-frozen--2026-09-10) | [01_ON_CHAIN_MAINNET_ANCHORS.md](./01_ON_CHAIN_MAINNET_ANCHORS.md) |
| **ExoMesh Agentic Guard (EIP-1193/5792/6963+)** | `withRetailGuardProvider()` — C-end wallet middleware · 0-Gas pre-consensus intercept | [provider.ts(../../../src/sdk/exomesh-agentic-wallet-guard/provider.ts) · `npx vitest run tests/sdk/retail-guard-provider.test.ts` **35/35** |
| **B2B agent decorator (optional)** | `withExoMeshShield` · `verifyAgentIntent()` — server-side hook · not judge-primary | [decorator.ts(../../../src/sdk/decorator.ts) · `pnpm demo:agent` |
| **v1.1 pruned scope** | Framework adapters removed · **RESERVED_ABI_V2** holes preserved | [Verification matrix § v1.1 Pruned Scope](../01_VERIFICATION_MATRIX.md) |
| **Stabilizer Sepolia adapter** | Universal Cross-DEX Testnet Sandbox on **421614** — 1:1 capacity · de-peg severance · cross-pass routing · `evaluateStabilizerSwapGuard()` · 15% reserve ratio · USDZ >50bps peg guard · 60s LLM cooldown | [exomesh-agentic-wallet-guard](../../../src/sdk/exomesh-agentic-wallet-guard/) · `pnpm demo:stabilizer` |
| **Sepolia Gate (ExoMesh)** | [0xc66F96611a737c4e58706D0955594456eAb88959](https://sepolia.arbiscan.io/address/0xc66f96611a737c4e58706d0955594456eab88959) | Sepolia Arbiscan |
| **Arbitrum One Gate (ExoMesh)** | [0x71D7d26f98110c5DE3df0fCbddCf2A3A2BC6e2f1](https://arbiscan.io/address/0x71d7d26f98110c5de3df0fcbddcf2a3a2bc6e2f1) | Arbiscan One |
| **PolicyGuardV2 (42161 · current)** | [0x5df192f9454fd02a89e768632cb5da0762a774bc](https://arbiscan.io/address/0x5df192f9454fd02a89e768632cb5da0762a774bc) · Stylus wired | ExoMesh redeploy 2026-09-17 |
| **GmxSoilMatrixSwitch (42161)** | [0xd840ad013d3be8a363d537a80d5ea8700f7a34c4](https://arbiscan.io/address/0xd840ad013d3be8a363d537a80d5ea8700f7a34c4) → oracle [0xc7f577…](https://arbiscan.io/address/0xc7f577ac7e1270e6e99e1b700301c25e98df2456) | ExoMesh redeploy |
| **Stylus Soil Coprocessor (42161)** | [0xc23587d6573dd134f95b02b0202ffbf84686625e](https://arbiscan.io/address/0xc23587d6573dd134f95b02b0202ffbf84686625e) | Engine A |
| **ZeroDev Smart Route UserOp (46630→42161 · testnet binding)** | UserOp `0xd15dbd386a95435e825bf05c0f6186a8b8601bb6ee9071f87f59d41f79416941` · Tx [0xdca66358…2a2f](https://arbiscan.io/tx/0xdca66358ffb9a2463d1069722ea27dcfabe1d374dc1d5264698c74341bb02a2f) · [JSON log](../../logging/robinhood_livefire_tier1_2026-09-21T02-02-17-204Z.json) | Arbiscan Tx |
| **ZeroDev Smart Route UserOp (4663→42161 · mainnet precedent)** | UserOp `0x7b72ee9f4dc3f32f08a5de914ecf076c243d895522ecd72d17a2f7b025bc956d` · Tx [0x4c4ca136…964a](https://arbiscan.io/tx/0x4c4ca1362d4a50d4684662e633e728401478c29dbef13f49e109e68253b5964a) | Arbiscan Tx |
| **Robinhood Testnet Tier2 escort (46630 native tx)** | UserOp `0x1e5870ce700a5acb05e746e93b66197ce068195b38b5639ea4807b12a5c39563` · Tx [0x4574c97f…fcf6](https://explorer.testnet.chain.robinhood.com/tx/0x4574c97ff91b5321c3281c535577a1a55908f4e92de8c3ecb55433e94735fcf6) · [JSON log](../../logging/robinhood_livefire_outbound_2026-09-21T01-49-53-777Z.json) | Robinhood Explorer |
| **Robinhood Mainnet Tier2 escort (4663 native tx)** | UserOp `0x9ce020ba389e59aee46e1e3520acf2e48f760a3e76ec1f9ddac74c47c0ecbfea` · Tx [0x02ced821…951d](https://explorer.chain.robinhood.com/tx/0x02ced8215cb1a9f6ec1b82dd39e01536991f278967d63c63dc29bde2ef6d951d) · [JSON log](../../logging/robinhood_livefire_outbound_2026-09-21T03-00-51-080Z.json) | Robinhood Explorer |
| **Agent SDK decorator (optional)** | `withExoMeshShield` — server-side execution hook · not judge-primary | [src/sdk/decorator.ts(../../../src/sdk/decorator.ts) · [examples/agent-interceptor-demo.ts](../../../examples/agent-interceptor-demo.ts) |
| **5-Core venue demos (Tier 1)** | GMX v2 · Pendle · USD.ai · Hyperliquid · Variational standalone CLIs | [gmx-demo.ts](../../../examples/gmx-demo.ts) · [pendle-demo.ts](../../../examples/pendle-demo.ts) · [usdai-demo.ts](../../../examples/usdai-demo.ts) · [hyperliquid-demo.ts](../../../examples/hyperliquid-demo.ts) · [variational-demo.ts](../../../examples/variational-demo.ts) · `pnpm demo:{gmx,pendle,usdai,hl,variational}` |
| **Pendle execution harness (42161)** | `execute:pendle:dust` + `execute:pendle:dust-exit` — USDai→PT-sUSDai→sUSDai round-trip · **execution proof only** · not on-chain soil | Deposit [0x22d7c939…82b4](https://arbiscan.io/tx/0x22d7c93994ae930d95c159ee9087c7c49e3462d95a41ddd17b70c94877cd82b4) · Redeem [0x9cfbeff8…67e1](https://arbiscan.io/tx/0x9cfbeff8a08472ed4f14e659b940c3b56f0c9e0dc23bc1c42e61cc0521a867e1) · Soil proof: `pnpm demo:pendle -- --trip` |
| **Pruned venue adapters** | Not 5-Core · Wasm **RESERVED_ABI_V2** bits 4–6 frozen | [Verification matrix § v1.1 Pruned Scope](../01_VERIFICATION_MATRIX.md) |
| **Hyperliquid L1 session guard** | `evaluateHyperliquidSessionGuard()` — Independent L1 HF Orderbook AppChain · MaxSizePerOrder · rate limit (120/min) · spread > **20 bps** | [hyperliquid-session-guard.ts(../../../src/adapters/hl/hyperliquid-session-guard.ts) · `pnpm demo:hl` |
| **Variational Omni RFQ adapter** | `validateVariationalRFQIntent()` → `evaluateVariationalFlags()` — quote stale **>500ms** or oracle drift **>30 bps** · OLP depth utilization **>15%** (long-tail) · **Bits 12–13** in core bitmask · `FLAGS_AUTO_SEVER_MASK` | [variational-rfq-adapter.ts(../../../src/adapters/variational-rfq-adapter.ts) · [risk-engine-core.ts(../../../src/core/risk-engine-core.ts) · `pnpm demo:variational -- --trip` |
| **GMX v2 pool invariants** | `verifyGmxPoolImbalance()` · `verifyGmxCollateralReserve()` — imbalance > **0.35** · reserve < **105%** | [gmx-v2-invariants.ts(../../../src/adapters/gmx/gmx-v2-invariants.ts) · `pnpm demo:gmx` |
| **Dune dashboard** | [SliverVine Protocol Master Dashboard (Dune)](https://dune.com/silvervinelabs/slivervine-protocol) | Public URL |
| **Dune — Sepolia (`421614`)** | ✅ **Active Live Event Stream** — decoded `IntentAttested` · `RiskTripBlocked` from Sepolia ExoMesh Gate [0xc66F…8959](https://sepolia.arbiscan.io/address/0xc66f96611a737c4e58706d0955594456eab88959) · **PEV** `SUM(blocked_intent_notional_usd)` operational | [DUNE_DASHBOARD_SPECIFICATION.md](../../01_architecture_and_standards/03_telemetry_and_mo/03_DUNE_DASHBOARD_SPECIFICATION.md) |
| **Dune — Arbitrum One (`42161`)** | ✅ **Contracts Anchored** + **SQL Query Specs Ready for Ingest** — Queries 0–0b feed/chart + Queries 1–3 reconciliation panels pre-compiled for **ChainID `42161`** · **not** claimed as live mainnet event stream | Same spec |
| **[ERC-8196](https://eips.ethereum.org/EIPS/eip-8196)** | Final (Ethereum Standard · Virtuals Protocol co-author) | [SUBMISSION.md](../../00_ARB_Buildathon/SUBMISSION.md) |

> **Governance footnote (Bootstrap Ignition Keys):** ExoMesh Mainnet Gate `0x71D7…` deploys with **Bootstrap Ignition Keys** (`0x1111…` / `0x2222…`) — **strictly for public verification and sandbox reproducibility**, not production HSM custody. **Multisig rotation scheduled for Post-Grant Milestone 1** via native `proposeAdmin` / `acceptAdmin` functions.

### GMX On-Chain Invariant Stack (Solidity · Bitmap · Stylus)

> **Status:** **100% delivered @ `572e5cd`** — three-layer GMX wire audit path from pure Solidity fallback through single-SLOAD soil matrix to optional Stylus coprocessor.

| Layer | SSOT module | Role | LOC | Verification |
|-------|-------------|------|-----|--------------|
| **Solidity layer** | [GmxRiskInvariantLib.sol](../../../contracts/src/libs/GmxRiskInvariantLib.sol) | executionFee floor · slippage floor · pool imbalance · zero SLOAD/RPC | **83** | [PolicyGuardGmxWire.t.sol](../../../contracts/test/PolicyGuardGmxWire.t.sol) **9/9** · TS mirror [gmx-risk-core.ts(../../../src/core/gmx-risk-core.ts) **131** |
| **Bitmap layer** | [GmxSoilMatrixSwitch.sol](../../../contracts/GmxSoilMatrixSwitch.sol) + [DefenseMatrixBitmap.sol](../../../contracts/libs/DefenseMatrixBitmap.sol) | defense matrix **single SLOAD** bitmap switch | **47 + 66** | [GmxSoilMatrixSwitch.t.sol](../../../contracts/test/GmxSoilMatrixSwitch.t.sol) **8/8** |
| **Stylus layer** | [sanctuary_invariants](../../../contracts/sanctuary_invariants/) Rust crate | 96-byte packed eval · GMX errMask + soil flags · Stylus `evaluate_packed` entrypoint | **lib 58 · abi 39 · gmx 60 · soil 31** | Cargo **2/2** · Vitest [stylus-gmx-parity.test.ts](../../../tests/wasm/stylus-gmx-parity.test.ts) **6/6** |
| **Stylus layer** | [SliverVineAgentPolicyGuardV2.sol](../../../contracts/src/SliverVineAgentPolicyGuardV2.sol) | optional `stylusCoprocessor` staticcall · revert/`address(0)` → **Solidity fallback** | **71** | Forge PolicyGuard **9/9** |
| **Pack / call** | `SanctuaryInvariantsPackLib` · `SanctuaryInvariantsStylusLib` · `ISanctuaryInvariantsCoprocessor` | wire+ctx → 96 bytes · parse 32-byte LE result word | **41 + 28 + 6** | integrated in `_enforceGmxWire` |

**Build commands:** `pnpm build:sanctuary-invariants` (host wasm parity; `build:sanctuary-invariants` alias retained) · `cargo build --features stylus` (Stylus deploy) · `pnpm exec tsc --noEmit` **0 errors**.

### Stylus Module Build Proof (Local Verification)

| Check | Result | SSOT |
|-------|--------|------|
| `cargo test stylus_core --release` | **5/5 PASS** (100% local) | [contracts/stylus-probe/src/stylus_core.rs](../../../contracts/stylus-probe/src/stylus_core.rs) |
| `cargo build --target wasm32-unknown-unknown --release` | **Verified locally** (100%) | [contracts/stylus-probe/Stylus.toml](../../../contracts/stylus-probe/Stylus.toml) · ChainID **42161** |
| Wasm ABI v2 **28-slot** alignment | `WASM_ABI_VERSION = 2` · `WASM_PROTOCOL_LEN = PROTO_VECT_LEN = 28` | [src/core/wasm-soil-ffi.ts(../../../src/core/wasm-soil-ffi.ts) · [src/wasm/soil_core.rs(../../../src/wasm/soil_core.rs) · [tests/core/wasm-ffi-alignment.test.ts](../../../tests/core/wasm-ffi-alignment.test.ts) |
| Mainnet readiness harness | `pnpm deploy:stylus:mainnet` | [scripts/deploy-stylus-mainnet.ts](../../../scripts/deploy-stylus-mainnet.ts) |

<a id="dual-engine-infrastructure-map-frozen--2026-09-10"></a>

### Dual-Engine Infrastructure Map (FROZEN · 2026-09-10)

SliverVine ExoMesh runs **two independent Wasm engines**. They share risk semantics but **not** the same binary, deploy path, or runtime.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Engine B — Off-Chain Cloudflare Edge Wasm Monotonic Core                │
│ pkg/soil_core.wasm · SHA-256 67f8fcc7… · V8 Isolates · 0 gas          │
│ Role: sub-ms leap / NTP / RPC regression firewall (clock_core C-ABI)    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ pre-broadcast intent (fail-closed)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Engine A — On-Chain Arbitrum Stylus Coprocessor (Nitro)                 │
│ SliverVineSoilCoprocessor 0xc23587… · ArbWasm 0x71 · on-chain verify    │
│ Role: pre-consensus state validation · Stylus soil bitmask coprocessor  │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Engine A — On-Chain Arbitrum Stylus Coprocessor

| Field | Locked value |
|-------|--------------|
| **Status** | `DEPLOYED_MAINNET` · `FROZEN` |
| **Contract** | `SliverVineSoilCoprocessor` · **[0xc23587d6573dd134f95b02b0202ffbf84686625e](https://arbiscan.io/address/0xc23587d6573dd134f95b02b0202ffbf84686625e)** |
| **Explorer** | [0xc23587d6573dd134f95b02b0202ffbf84686625e](https://arbiscan.io/address/0xc23587d6573dd134f95b02b0202ffbf84686625e) |
| **Activation Tx** | [0x92079e150697717af75b0b750ff80be36d06212337189ef368bf65fead6c9397](https://arbiscan.io/tx/0x92079e150697717af75b0b750ff80be36d06212337189ef368bf65fead6c9397) |
| **Role** | On-chain pre-consensus state validation · Stylus `check_soil_resistance_stylus` verification inside Nitro blocks |
| **Source** | [contracts/stylus-probe](../../../contracts/stylus-probe/) · [stylus_core.rs](../../../contracts/stylus-probe/src/stylus_core.rs) |
| **Deploy harness** | [scripts/deploy-stylus-mainnet.ts](../../../scripts/deploy-stylus-mainnet.ts) |
| **Activation path** | Nitro Prover JIT + `activateProgram` via ArbWasm precompile **`0x0000000000000000000000000000000000000071`** |
| **Toolchain** | `cargo-stylus v0.10.9` · ChainID **42161** · metadata hash `955b67a82cd3bd16066ee85b5b44ffe96d7be9e25e0842586481a294ec720ee7` |
| **Preflight (2026-09-10)** | `cargo stylus check --endpoint https://arb1.arbitrum.io/rpc` — **PASS** · **7.1 KB** (7122 bytes) |

#### Engine B — Off-Chain Cloudflare Edge Wasm Monotonic Core

| Field | Locked value |
|-------|--------------|
| **Status** | `EDGE_ARTIFACT_VERIFIED` · `FROZEN` |
| **Binary** | [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) · build: `pnpm run build:wasm` |
| **Wasm SHA-256** | `67f8fcc70563fec84727036b6c36607733114fb30577a58490584247f8010b14` |
| **Size** | **1,557 bytes** (&lt;28 KiB Cloudflare Worker budget) |
| **Role** | Sub-millisecond physical clock leap / NTP step / RPC `block.timestamp` regression firewall on Edge Isolates |
| **Source** | [src/wasm/clock_core.rs(../../../src/wasm/clock_core.rs) · [src/wasm/soil_core.rs(../../../src/wasm/soil_core.rs) · host [monotonic-time.ts(../../../src/core/monotonic-time.ts) · loader [clock-wasm.ts(../../../src/sdk/clock-wasm.ts) |
| **C-ABI exports** | `clock_core_read` · `clock_core_rpc_ingest` · `clock_core_resolve_wall_age` · `clock_core_abi_version` = **1** |
| **Not Stylus-deployable** | `cargo stylus check --wasm-file pkg/soil_core.wasm` → **FAIL** (missing `#[entrypoint]` — Edge cdylib only) |

#### Verification Freeze Record (2026-09-10)

| Check | Result | SSOT |
|-------|--------|------|
| `npx vitest run tests/clock-monotonicity.test.ts` | **14/14 PASS** | Engine B TS + Wasm FFI parity |
| `cargo test stylus_core --release` | **5/5 PASS** | Engine A unit tests |
| `cargo stylus check` (stylus-probe · mainnet RPC) | **PASS** | Engine A Nitro compatibility |
| `pnpm run build:wasm` | **PASS** | Regenerates Engine B [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) |

> **Redeploy note:** Engine B is **never** broadcast to Arbitrum. Future Engine A redeploys use [scripts/deploy-stylus-mainnet.ts](../../../scripts/deploy-stylus-mainnet.ts) (not `cargo stylus deploy --wasm-file pkg/soil_core.wasm`).
