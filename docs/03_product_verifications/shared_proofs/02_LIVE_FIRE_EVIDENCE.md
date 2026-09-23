# Live-Fire Execution Evidence (Mainnet · 42161)

> **Note on Live Evidence:** Mainnet GMX transaction hashes ([0xa37f52c8…](https://arbiscan.io/tx/0xa37f52c857614ea47f2da8c6f1831fbf0f76ed39e881e716f0f077e9feab0e1a) open & [0x2e47f4fe…](https://arbiscan.io/tx/0x2e47f4fe1cc7c1579e1c450d92264c444c854f1b28a80dab31761a504c5bcb45) close) demonstrate complete **42161 mainnet execution capability**. Pre-consensus guard failure modes are verified via **non-bypass** CLI demos (`pnpm demo:gmx -- --trip`) and unit tests ([tests/sdk/retail-guard-provider.test.ts](../../../tests/sdk/retail-guard-provider.test.ts) **35/35**). Armed micro-fill may set `ALLOW_STALE_ORACLE=1` / `BYPASS_SOIL_PROBE=true` — that is an **execution harness**, not the firewall demo.

> **SSOT index:** [README.md](../README.md) · **Hub:** [../01_VERIFICATION_MATRIX.md](../01_VERIFICATION_MATRIX.md)  
> **Deployment matrix:** [02_CONTRACT_DEPLOYMENT_MATRIX.md](../../01_architecture_and_standards/01_core_specs/03_CONTRACT_DEPLOYMENT_MATRIX.md)

### ExoMesh Redeploy (2026-09-17) — Current Production Anchors

| Network | Contract | Address |
|---------|----------|---------|
| **42161** | SliverVineGate (ExoMesh) | [0x71D7d26f98110c5DE3df0fCbddCf2A3A2BC6e2f1](https://arbiscan.io/address/0x71d7d26f98110c5de3df0fcbddcf2a3a2bc6e2f1) |
| **42161** | PolicyGuardV2 (Stylus wired) | [0x5df192f9454fd02a89e768632cb5da0762a774bc](https://arbiscan.io/address/0x5df192f9454fd02a89e768632cb5da0762a774bc) |
| **42161** | SliverVineSoilCoprocessor (Stylus) | [0xc23587d6573dd134f95b02b0202ffbf84686625e](https://arbiscan.io/address/0xc23587d6573dd134f95b02b0202ffbf84686625e) |
| **42161** | RiskOracleV2 | [0xc7f577ac7e1270e6e99e1b700301c25e98df2456](https://arbiscan.io/address/0xc7f577ac7e1270e6e99e1b700301c25e98df2456) |
| **42161** | GmxSoilMatrixSwitch | [0xd840ad013d3be8a363d537a80d5ea8700f7a34c4](https://arbiscan.io/address/0xd840ad013d3be8a363d537a80d5ea8700f7a34c4) |
| **421614** | SliverVineGate (ExoMesh) | [0xc66F96611a737c4e58706D0955594456eAb88959](https://sepolia.arbiscan.io/address/0xc66f96611a737c4e58706d0955594456eab88959) |
| **421614** | IngressSafetySwitch | [0xc1Eb1624A3A93e969De57466b1CDbD0e0189D192](https://sepolia.arbiscan.io/address/0xc1eb1624a3a93e969de57466b1cdbd0e0189d192) |

**Sepolia telemetry:** `ARB_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc npx tsx scripts/emit-sepolia-telemetry-events.ts`

> **Migration (2026-09-17):** ExoMesh redeploy — wire addresses above only. Legacy Sanctuary-era → [03_SUPERSEDED_DEPLOYMENTS_APPENDIX.md](../../01_architecture_and_standards/01_core_specs/05_SUPERSEDED_DEPLOYMENTS_APPENDIX.md).

### Mainnet Live-Fire Script Specifications

| Script | Command | Role | Live arm |
|--------|---------|------|----------|
| **Stylus mainnet readiness** | `pnpm deploy:stylus:mainnet` | **Deployed & activated** [0xc23587d6573dd134f95b02b0202ffbf84686625e](https://arbiscan.io/address/0xc23587d6573dd134f95b02b0202ffbf84686625e) · Tx [0x92079e15…](https://arbiscan.io/tx/0x92079e150697717af75b0b750ff80be36d06212337189ef368bf65fead6c9397) · Nitro JIT + ArbWasm `0x71` | [scripts/deploy-stylus-mainnet.ts](../../../scripts/deploy-stylus-mainnet.ts) |
| **GMX v2 micro-fill harness** | `pnpm execute:gmx:micro-fill --size=1` | Calibrated **$1–$20** GMX v2 increase via PolicyGuardV2 `0x5df192…` + Gate `0x71D7…` · **automatic low-OI side calibration** (balanced market leg) · Fail-Closed on `ORACLE_LAG_DEADLOCK` · `GMX_POOL_IMBALANCE_BREACH` | [scripts/execute-gmx-mainnet-micro-fill.ts](../../../scripts/execute-gmx-mainnet-micro-fill.ts) · Live: `CONFIRM_GMX_MICRO_FILL=YES BROADCAST=1 WalletA_Pkey=0x…` (alias: `WALLET_A_PRIVATE_KEY` / `MAINNET_PK` / `PRIVATE_KEY`) · EOA: `FORCE_EOA_FALLBACK=1` |
| **GMX v2 micro-fill exit** | `pnpm execute:gmx:micro-fill-decrease` | **100% MarketDecrease** close · ZeroDev AA when `ZeroDev_projectId` / `ZERODEV_PROJECT_ID` set · EOA when `FORCE_EOA_FALLBACK=1` or AA fallback | [scripts/live-gmx-decrease-execution.ts](../../../scripts/live-gmx-decrease-execution.ts) · Live: `CONFIRM_GMX_MICRO_FILL=YES BROADCAST=1` |
| **GMX GM Pool deposit** | `pnpm execute:gmx:gm-deposit` | **Verified Live** — `sendWnt → sendTokens → createDeposit` · ExchangeRouter `0x7dE39…83f1` · ETH/USDC GM `0x70d955…6336` | [scripts/execute-gmx-mainnet-gm-deposit.ts](../../../scripts/execute-gmx-mainnet-gm-deposit.ts) · Live: `CONFIRM_GMX_GM_DEPOSIT=YES BROADCAST=1 MAINNET_PK=0x…` |
| **GMX GM Pool withdraw** | `pnpm execute:gmx:gm-withdraw` | **Verified Live** — GM LP approve → GMX v2 Router `0x7452c558…` · `sendWnt → sendTokens(GM) → createWithdrawal` | [scripts/execute-gmx-mainnet-gm-withdraw.ts](../../../scripts/execute-gmx-mainnet-gm-withdraw.ts) · Live: `CONFIRM_GMX_GM_WITHDRAW=YES BROADCAST=1 MAINNET_PK=0x…` |
| **GMX ExoMesh redeploy** | `pnpm tsx scripts/deploy-policy-guard-v2-mainnet.ts` + `link-gate-policy-guard-v2.ts` | **ExoMesh live** — PolicyGuardV2 `0x5df192…` · Gate `0x71D7…` · Stylus wired | See superseded appendix for v0 bundle |
| **Pendle PT dust deposit** | `pnpm execute:pendle:dust --amount-usd=1` | PT-sUSDai · USDai→PT · **execution harness** · not soil on-chain | [0x22d7c939…82b4](https://arbiscan.io/tx/0x22d7c93994ae930d95c159ee9087c7c49e3462d95a41ddd17b70c94877cd82b4) · `CONFIRM_PENDLE_DUST=YES BROADCAST=1` |
| **Pendle PT dust redeem** | `pnpm execute:pendle:dust-exit --redeem-all` | PT→**sUSDai** full dust exit · same harness | [0x9cfbeff8…67e1](https://arbiscan.io/tx/0x9cfbeff8a08472ed4f14e659b940c3b56f0c9e0dc23bc1c42e61cc0521a867e1) · `CONFIRM_PENDLE_DUST_EXIT=YES BROADCAST=1` |

> **Pendle signer note:** Live txs signed by env key wallet `0xdBCD43979e95f386f6405B03e7eB3A094cd36690` — **not** matrix Wallet A `0xef0752df6387248B897F3A59A180af42D801960d`. Soil proof remains `pnpm demo:pendle -- --trip`.
| **HL micro-hedge harness** | `pnpm execute:hl:micro-hedge` | Wallet A session key · HL perps margin preflight · dry-run default | [scripts/execute-hl-mainnet-micro-hedge.ts](../../../scripts/execute-hl-mainnet-micro-hedge.ts) · Live: `CONFIRM_HL_MICRO_HEDGE=YES BROADCAST=1` |
| **USD.ai collateral probe** | `pnpm execute:usdai:collateral-probe` | Wallet A ETH gas (BH-25) + soil guard dry-run · optional dust self-transfer | [scripts/execute-usdai-mainnet-probe.ts](../../../scripts/execute-usdai-mainnet-probe.ts) · Live: `CONFIRM_USDAI_PROBE=YES BROADCAST=1` |

### GMX GM Pool I/O Channel (Arbitrum One · 42161) — Verified Live

> **Status:** **CLOSED (execution layer)** — Wallet B GM Pool deposit + withdraw ExchangeRouter multicall paths **broadcast and confirmed** on Arbitrum One. Async GMX keeper settlement remains protocol-native two-stage semantics; **user-side I/O channel SSOT is closed**.

| Field | Value |
|-------|-------|
| **Channel Status** | **CLOSED** — GM Pool I/O (`execute:gmx:gm-deposit` · `execute:gmx:gm-withdraw`) |
| **ExchangeRouter** | [0x7dE39FF2e232A2203196788d37e234cF8F1b83f1](https://arbiscan.io/address/0x7dE39FF2e232A2203196788d37e234cF8F1b83f1) |
| **GMX v2 Router (GM LP spender)** | [0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6](https://arbiscan.io/address/0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6) |
| **GM Deposit Multicall Tx** | [0xe3155220e464c375329838bb5ca8498226b8c8fa32c11929b7605070f7be4774](https://arbiscan.io/tx/0xe3155220e464c375329838bb5ca8498226b8c8fa32c11929b7605070f7be4774) · Block **503036082** · **Success** |
| **GM Router Approve Tx** | [0x30ec0b7a9493f0c43edb257fd40f6d6f9258401e206357f3db7574b11071b00e](https://arbiscan.io/tx/0x30ec0b7a9493f0c43edb257fd40f6d6f9258401e206357f3db7574b11071b00e) · Block **503051738** · **Success** |
| **GM Withdraw Multicall Tx** | [0xfd3601dce5c2407d371186d8a24829994547ec8810f4a20c3e798d2fb67ae410](https://arbiscan.io/tx/0xfd3601dce5c2407d371186d8a24829994547ec8810f4a20c3e798d2fb67ae410) · Block **503051752** · **Success** |
| **DepositVault** | `0xF89e77e8Dc11691C9e8757e84aaFbCD8A67d7A55` |
| **WithdrawalVault** | `0x0628D46b5D145f183AdB6Ef1f2c97eD1C4701c55` |
| **GM Market (ETH/USDC)** | `0x70d95587d40a2caf56bd97485ab3eec10bee6336` |

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

### Stylus Mainnet Deployment (Arbitrum One · 42161) — Verified

| Field | Value |
|-------|-------|
| **Contract** | `SliverVineSoilCoprocessor` · [0xc23587d6573dd134f95b02b0202ffbf84686625e](https://arbiscan.io/address/0xc23587d6573dd134f95b02b0202ffbf84686625e) |
| **Activation Tx** | [0x92079e150697717af75b0b750ff80be36d06212337189ef368bf65fead6c9397](https://arbiscan.io/tx/0x92079e150697717af75b0b750ff80be36d06212337189ef368bf65fead6c9397) |
| **Activation path** | Nitro Prover **JIT compilation** + `activateProgram` via **ArbWasm precompile `0x0000000000000000000000000000000000000071`** (`cargo stylus activate` SSOT) |
| **Toolchain** | `cargo-stylus v0.10.9` · `cargo stylus get-initcode` + viem deploy · ChainID **42161** |

### GMX Micro-Fill Live Broadcast (Arbitrum One · 42161) — Verified

> **Harness:** `pnpm execute:gmx:micro-fill --size=1` · Wallet A EOA (`WalletA_Pkey` from `.env`) · **MarketIncrease short** · Block **504625233+**

| Field | Value |
|-------|-------|
| **Wallet A (signer)** | `0xdBCD43979e95f386f6405B03e7eB3A094cd36690` |
| **Side / Notional** | **Short** · **$10** collateral (`MICRO_FILL_COLLATERAL_USD` SSOT) |
| **Router USDC Approve Tx** | [0xab349d09cef98bcb29029df83306a31556ef9e3f0dc442e60e118c2a2b37b323](https://arbiscan.io/tx/0xab349d09cef98bcb29029df83306a31556ef9e3f0dc442e60e118c2a2b37b323) · Spender `GMX_V2_ROUTER` `0x7452c558…` |
| **ExchangeRouter USDC Approve Tx** | [0x82964525a2a7ad8392090b0c1c69208159a88096a399c6b94a124a751e26adf9](https://arbiscan.io/tx/0x82964525a2a7ad8392090b0c1c69208159a88096a399c6b94a124a751e26adf9) |
| **MarketIncrease Multicall Tx** | [0xa37f52c857614ea47f2da8c6f1831fbf0f76ed39e881e716f0f077e9feab0e1a](https://arbiscan.io/tx/0xa37f52c857614ea47f2da8c6f1831fbf0f76ed39e881e716f0f077e9feab0e1a) · Block **504625233** · **Success** |
| **Dispatch mode** | **EOA** (`FORCE_EOA_FALLBACK=1`) · `sendWnt → sendTokens → createOrder` via ExchangeRouter `0x7dE39…` |
| **Probe bypass (armed run only)** | `ALLOW_STALE_ORACLE=1` · `BYPASS_SOIL_PROBE=true` — dry-run default remains **Fail-Closed** without bypass |

### GMX Micro-Fill Exit / MarketDecrease (Arbitrum One · 42161) — Verified

> **Harness:** `pnpm execute:gmx:micro-fill-decrease` · Wallet A EOA · **100% short close** · Block **504626743**

| Field | Value |
|-------|-------|
| **Wallet A (signer)** | `0xdBCD43979e95f386f6405B03e7eB3A094cd36690` |
| **Action** | **MarketDecrease** · **Short** · **$10.00** size delta (100% exit) |
| **MarketDecrease Multicall Tx (EOA)** | [0x13b1e5590119ba206d207e7950ab5aeffc8c82d547dc767630abcb865806c439](https://arbiscan.io/tx/0x13b1e5590119ba206d207e7950ab5aeffc8c82d547dc767630abcb865806c439) · Block **504626743** · **Success** |
| **MarketDecrease Tx (ZeroDev→EOA fallback)** | [0xb45b2530d9390db7a55fdb2e6e972b3f58e357d6881db146dd78756cdd5764e4](https://arbiscan.io/tx/0xb45b2530d9390db7a55fdb2e6e972b3f58e357d6881db146dd78756cdd5764e4) · Block **504628125** · **Success** · ZeroDev UserOp simulated revert → **EOA direct** |
| **MarketDecrease Tx (DataStore execution fee)** | [0xb8ba76c4a8f7ed8f1c9820bf1122d4895a81b3ca6c780590aa16d74522d242a7](https://arbiscan.io/tx/0xb8ba76c4a8f7ed8f1c9820bf1122d4895a81b3ca6c780590aa16d74522d242a7) · Block **504628529** · **Success** · `executionFee` **0.001 ETH** (floor ≥ **0.0008 ETH** via DataStore `DECREASE_ORDER_GAS_LIMIT`) |
| **MarketDecrease (100% Programmatic Close)** | [0x2e47f4fe1cc7c1579e1c450d92264c444c854f1b28a80dab31761a504c5bcb45](https://arbiscan.io/tx/0x2e47f4fe1cc7c1579e1c450d92264c444c854f1b28a80dab31761a504c5bcb45) · Block **504631270** · **Success** · Reader preflight `sizeInUsd` 30-dec · `acceptablePrice` +5% buy-back cap · **lifecycle closed** |
| **Dispatch modes** | **ZeroDev AA** (`ZeroDev_projectId` in `.env`) with **EOA fallback** · **EOA-only** via `FORCE_EOA_FALLBACK=1` |
| **Paired entry tx** | [0xa37f52c8…](https://arbiscan.io/tx/0xa37f52c857614ea47f2da8c6f1831fbf0f76ed39e881e716f0f077e9feab0e1a) · Block **504625233** |

### GMX Micro-Fill Fail-Closed Evidence (Live Interception Payload)

> **Harness:** `pnpm execute:gmx:micro-fill --size=1` on Arbitrum One (`42161`) · **no broadcast** — Soil Resistance + Root Protection tripped pre-mempool.

| Field | Value |
|-------|-------|
| **Command** | `pnpm execute:gmx:micro-fill --size=1` |
| **Network** | Arbitrum One (`42161`) |
| **Balanced Side Calibration** | Harness intelligently selected **`"short"`** leg — GM pool snapshot **$71 Long** vs **$58 Short** (low-OI side) to reduce skew before preflight |
| **Soil Resistance Trip** | `DEPTH_USD = $129 < $100,000` min requirement (`minDepthUsd` SSOT) · `SOIL_RESISTANCE_TRIP` |
| **Root Protection Trip** | `GUARD_BLOCKED:ORACLE_LAG_DEADLOCK:154000ms>30000ms` · **154 seconds** stale Chainlink oracle lag (> **30s** `ORACLE_LAG_DEADLOCK_MS`) |
| **Execution Outcome** | **Fail-Closed** — SliverVine ExoMesh **successfully intercepted** GMX v2 increase order before mempool · dual-axis block (depth + oracle lag) |
| **Capital Invariant** | **`lostUsd ≡ 0`** — **0 slippage loss** · zero stale-price impact · zero mempool exposure · no toxic fill submitted |
| **Prior Trip (pool state)** | `GMX_POOL_IMBALANCE_BREACH` also documented — shield remains active on oracle-lag · depth · pool-imbalance axes |

### Dune Telemetry Boundary (Re-confirmed)

| Partition | ChainID | Claim |
|-----------|---------|-------|
| **Sepolia — Live Event Pipeline** | `421614` | ✅ Decoded event ingest (`IntentAttested` · `RiskTripBlocked`) from Sepolia Gate [0xc66F…8959](https://sepolia.arbiscan.io/address/0xc66f96611a737c4e58706d0955594456eab88959) |
| **Arbitrum One — Contract Anchored + SQL Specs** | `42161` | ✅ Contracts anchored · DuneSQL Queries 0–0b + 1–3 **ready for ingest** · **not** claimed as live mainnet event stream |

> **Governance footnote (re-confirmed):** Bootstrap Ignition Keys (`0x1111…` / `0x2222…`) on ExoMesh Mainnet Gate `0x71D7…` are **strictly for public verification and sandbox reproducibility**. Post-launch governance rotation to production multisig via `proposeAdmin` / `acceptAdmin` is the designed authority path.

### Robinhood Live-Fire Baseline (46630 testnet · 4663 mainnet · 2026-09-21)

> **Index:** [ROBINHOOD_LIVEFIRE_ARTIFACTS.md](../../logging/ROBINHOOD_LIVEFIRE_ARTIFACTS.md) · internal runbook: `ROBINHOOD_TESTNET_LIVEFIRE_CHECKLIST.md` (repo-internal only)
> **Honesty:** `pnpm demo:ingress` = policy replay · **not** live-fire proof · Case B = decision-layer pre-sign (not EIP-1193 middleware) · Tier1 used `ALLOW_STALE_ORACLE=1` execution harness · **A-Tier2-mainnet** = stub attestation · `bridgeDeployed: false` · **not** production buffer verified

| Case | Harness | On-chain / hash | JSON log |
|------|---------|-----------------|----------|
| **A-Tier1** | `pnpm tsx scripts/execute-smart-route-live-demo.ts` · `SMART_ROUTE_SOURCE_CHAIN_ID=46630` | Tx [0xdca66358…2a2f](https://arbiscan.io/tx/0xdca66358ffb9a2463d1069722ea27dcfabe1d374dc1d5264698c74341bb02a2f) · UserOp `0xd15dbd386a95435e825bf05c0f6186a8b8601bb6ee9071f87f59d41f79416941` | [tier1](../../logging/robinhood_livefire_tier1_2026-09-21T02-02-17-204Z.json) |
| **A-Tier2** | `pnpm probe:rchain-testnet` | [0x4574c97f…fcf6](https://explorer.testnet.chain.robinhood.com/tx/0x4574c97ff91b5321c3281c535577a1a55908f4e92de8c3ecb55433e94735fcf6) · UserOp `0x1e5870ce700a5acb05e746e93b66197ce068195b38b5639ea4807b12a5c39563` | [outbound testnet](../../logging/robinhood_livefire_outbound_2026-09-21T01-49-53-777Z.json) |
| **A-Tier2-mainnet** | `pnpm probe:rchain-mainnet` | [0x02ced821…951d](https://explorer.chain.robinhood.com/tx/0x02ced8215cb1a9f6ec1b82dd39e01536991f278967d63c63dc29bde2ef6d951d) · UserOp `0x9ce020ba389e59aee46e1e3520acf2e48f760a3e76ec1f9ddac74c47c0ecbfea` | [outbound mainnet](../../logging/robinhood_livefire_outbound_2026-09-21T03-00-51-080Z.json) |
| **B1** | `assertUnidirectionalBridge` SDK probe | `AML_INBOUND_TO_ROBINHOOD_BLOCKED` · **0 broadcast** | [inbound_block](../../logging/robinhood_livefire_inbound_block_2026-09-21T01-54-27-239380566Z.json) |
| **B2** | `buildRobinhoodAuditSnapshot` | `sha256Signature` `c9896689bb638e0f500318b5d96568f75a40dd273b0a10886890ccad520bd9bb` | [inbound_audit](../../logging/robinhood_livefire_inbound_audit_2026-09-21T02-09-39-263Z.json) |
| **B3** | `pnpm probe:robinhood-inbound-treasury` | treasury inbound misuse blocked · **0 broadcast** | [inbound_treasury](../../logging/robinhood_livefire_inbound_treasury_2026-09-21T02-09-41-885Z.json) |

**Kernel / wallet:** `0xdf4c3Fe9bADCbb2Cf62c4b334aD021a34f88F913`

**Precedent (4663 mainnet Arbiscan binding):** Smart Route tx [0x4c4ca136…964a](https://arbiscan.io/tx/0x4c4ca1362d4a50d4684662e633e728401478c29dbef13f49e109e68253b5964a) · UserOp `0x7b72ee9f4dc3f32f08a5de914ecf076c243d895522ecd72d17a2f7b025bc956d` — distinct from A-Tier2-mainnet native explorer tx

### [MAINNET_LIVE_EXECUTION_EVIDENCE]

> **Harness:** `pnpm deploy:stylus:mainnet` · `pnpm execute:gmx:micro-fill --size=1` · `pnpm execute:gmx:gm-deposit` · `pnpm execute:gmx:gm-withdraw` · `pnpm tsx scripts/deploy-policy-guard-and-live-fill.ts` · ZeroDev AA: `pnpm tsx scripts/execute-zerodev-mainnet-test.ts` · Smart Route: `pnpm tsx scripts/execute-smart-route-live-demo.ts` · Live: `CONFIRM_SMART_ROUTE_DEMO=YES BROADCAST=1` · `SMART_ROUTE_SOURCE_CHAIN_ID=46630` (testnet) or default `4663` (mainnet precedent)

| Field | Value |
|-------|-------|
| **PolicyGuardV2 (ExoMesh)** | `SliverVineAgentPolicyGuardV2` · [0x5df192f9454fd02a89e768632cb5da0762a774bc](https://arbiscan.io/address/0x5df192f9454fd02a89e768632cb5da0762a774bc) · Stylus wired |
| **Gate setPolicyGuard Tx** | [0x6750785188fe72f137dbf140b70cdd3b8094df62db1d86339194245cb0dba0ba](https://arbiscan.io/tx/0x6750785188fe72f137dbf140b70cdd3b8094df62db1d86339194245cb0dba0ba) · native `setPolicyGuard` on Gate `0x71D7…` |
| **ZeroDev Kernel v3 AA Proof Tx** | [0xc7659e299e4961279f03b9cafa988dc082d7f9baf107bcd7b62812e8dfb54aad](https://arbiscan.io/tx/0xc7659e299e4961279f03b9cafa988dc082d7f9baf107bcd7b62812e8dfb54aad) |
| **Smart Route Tier1 (46630 testnet binding)** | Source `46630` → `42161` · UserOp `0xd15dbd38…6941` · Tx [0xdca66358…2a2f](https://arbiscan.io/tx/0xdca66358ffb9a2463d1069722ea27dcfabe1d374dc1d5264698c74341bb02a2f) · [JSON log](../../logging/robinhood_livefire_tier1_2026-09-21T02-02-17-204Z.json) |
| **Smart Route Precedent (4663 mainnet)** | UserOp `0x7b72ee9f…` · Tx [0x4c4ca136…964a](https://arbiscan.io/tx/0x4c4ca1362d4a50d4684662e633e728401478c29dbef13f49e109e68253b5964a) |
| **Robinhood Testnet Tier2 (46630 native tx)** | [0x4574c97f…fcf6](https://explorer.testnet.chain.robinhood.com/tx/0x4574c97ff91b5321c3281c535577a1a55908f4e92de8c3ecb55433e94735fcf6) · [JSON log](../../logging/robinhood_livefire_outbound_2026-09-21T01-49-53-777Z.json) |
| **Robinhood Mainnet Tier2 (4663 native tx)** | [0x02ced821…951d](https://explorer.chain.robinhood.com/tx/0x02ced8215cb1a9f6ec1b82dd39e01536991f278967d63c63dc29bde2ef6d951d) · [JSON log](../../logging/robinhood_livefire_outbound_2026-09-21T03-00-51-080Z.json) |
| **Smart Route Target Chain** | Arbitrum One (`42161`) |
| **Chain** | Arbitrum One (`42161`) |
| **Status** | **Verified Live** on Arbitrum One (42161) with **Fail-Closed Risk Protection** active |
| **GMX Micro-Fill Live Broadcast (`--size=1`)** | **Verified Live** — EOA short MarketIncrease · Tx [0xa37f52c8…](https://arbiscan.io/tx/0xa37f52c857614ea47f2da8c6f1831fbf0f76ed39e881e716f0f077e9feab0e1a) · Block **504625233** |
| **GMX Micro-Fill Dry-Run (`--size=1`)** | **Fail-Closed** (default) — `DEPTH_USD=$129<$100k` · `ORACLE_LAG_DEADLOCK` · **`lostUsd ≡ 0`** |
| **GMX Fill Live Attempt (prior)** | **Fail-Closed** — pre-broadcast trip `GMX_POOL_IMBALANCE_BREACH` · no toxic fill submitted · live invariant shield **confirmed active** |
| **GM Pool I/O Channel Status** | **CLOSED** — deposit + withdraw ExchangeRouter multicall **Verified Live** on `42161` |
| **GM Deposit Multicall Tx** | [0xe3155220e464c375329838bb5ca8498226b8c8fa32c11929b7605070f7be4774](https://arbiscan.io/tx/0xe3155220e464c375329838bb5ca8498226b8c8fa32c11929b7605070f7be4774) · Block **503036082** |
| **GM Router Approve Tx** | [0x30ec0b7a9493f0c43edb257fd40f6d6f9258401e206357f3db7574b11071b00e](https://arbiscan.io/tx/0x30ec0b7a9493f0c43edb257fd40f6d6f9258401e206357f3db7574b11071b00e) · Block **503051738** |
| **GM Withdraw Multicall Tx** | [0xfd3601dce5c2407d371186d8a24829994547ec8810f4a20c3e798d2fb67ae410](https://arbiscan.io/tx/0xfd3601dce5c2407d371186d8a24829994547ec8810f4a20c3e798d2fb67ae410) · Block **503051752** |
| **Notional (USD)** | `$1–$20` (CLI `--size`; default **$1** micro-fill) |

### [POLICYGUARD_MAINNET_ANCHOR]

> **Harness:** `pnpm tsx scripts/execute-smart-route-live-demo.ts` · Live: `CONFIRM_SMART_ROUTE_DEMO=YES BROADCAST=1` · `SMART_ROUTE_SOURCE_CHAIN_ID=46630` (testnet) or default `4663` (mainnet precedent)

| Field | Value |
|-------|-------|
| **PolicyGuardV2 Address (ExoMesh)** | [0x5df192f9454fd02a89e768632cb5da0762a774bc](https://arbiscan.io/address/0x5df192f9454fd02a89e768632cb5da0762a774bc) |
| **Gate setPolicyGuard Tx** | [0x6750785188fe72f137dbf140b70cdd3b8094df62db1d86339194245cb0dba0ba](https://arbiscan.io/tx/0x6750785188fe72f137dbf140b70cdd3b8094df62db1d86339194245cb0dba0ba) |
| **ZeroDev Kernel v3 AA Proof Tx** | [0xc765…4aad](https://arbiscan.io/tx/0xc7659e299e4961279f03b9cafa988dc082d7f9baf107bcd7b62812e8dfb54aad) |
| **Smart Route Tier1 (46630 testnet)** | UserOp `0xd15dbd38…6941` · Tx [0xdca66358…2a2f](https://arbiscan.io/tx/0xdca66358ffb9a2463d1069722ea27dcfabe1d374dc1d5264698c74341bb02a2f) |
| **Smart Route Precedent (4663 mainnet)** | UserOp `0x7b72ee9f…` · Tx [0x4c4c…964a](https://arbiscan.io/tx/0x4c4ca1362d4a50d4684662e633e728401478c29dbef13f49e109e68253b5964a) |
| **Smart Route Target Chain** | Arbitrum One (`42161`) |
| **GMX Micro-Fill Live Broadcast (`--size=1`)** | **Verified Live** — EOA short MarketIncrease · Tx [0xa37f52c8…](https://arbiscan.io/tx/0xa37f52c857614ea47f2da8c6f1831fbf0f76ed39e881e716f0f077e9feab0e1a) · Block **504625233** |
| **GMX Micro-Fill Dry-Run (`--size=1`)** | **Fail-Closed** (default) — `DEPTH_USD=$129<$100k` · `ORACLE_LAG_DEADLOCK` · **`lostUsd ≡ 0`** |
| **GMX Fill Live Attempt (prior)** | **Fail-Closed** — `GMX_POOL_IMBALANCE_BREACH` (pre-broadcast; shield active) |
| **Arbiscan URL (Smart Route)** | [Arbiscan Tx](https://arbiscan.io/tx/0x4c4ca1362d4a50d4684662e633e728401478c29dbef13f49e109e68253b5964a) |
| **Legacy deployments** | [03_SUPERSEDED_DEPLOYMENTS_APPENDIX.md](../../01_architecture_and_standards/01_core_specs/05_SUPERSEDED_DEPLOYMENTS_APPENDIX.md) |

