# Sanctuary & Treasury Escort Proofs (Module B)

> **SSOT index:** [README.md](../README.md) · **Hub:** [../01_VERIFICATION_MATRIX.md](../01_VERIFICATION_MATRIX.md)  
> **Deep spec:** [02_ERC7540_ASYNC_ESCORT_IMPLEMENTATION.md](../../01_architecture_and_standards/02_eip_standards/02_ERC7540_ASYNC_ESCORT_IMPLEMENTATION.md) · **CLI HUD:** [02_CLI_DEMO_RUNBOOK.md](../02_CLI_DEMO_RUNBOOK.md)

**SliverVine Sanctuary (Module B)** — **Sanctuary Async Escort (ERC-7540+)** · Treasury Escort Router · Robinhood / Across compliance ingress. Complements Module A ExoMesh pre-consensus guard; does **not** replace EIP-1193 wallet wrap.

---

## Proof Chain Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│ (a) ERC-7540+ Async Vault Escort — pre-sign selector guard      │
│     requestDeposit · requestRedeem · setOperator                │
├─────────────────────────────────────────────────────────────────┤
│ (b) Treasury Escort Router — bridge capital state machine       │
│     IN_FLIGHT → SETTLED · lostUsd ≡ $0 · inbound AML block      │
├─────────────────────────────────────────────────────────────────┤
│ (c) Robinhood / Across reference ingress (46630/4663)           │
│     outbound escort · inbound FAIL_CLOSED · live-fire appendix  │
└─────────────────────────────────────────────────────────────────┘
```

---

## (a) ERC-7540+ Async Vault Escort

Selector-level pre-broadcast policy on async vault calldata — **0-Gas fail-closed** on reject.

| Layer | Module | Behavior |
|-------|--------|----------|
| Escort engine | [erc7540-async-escort.ts](../../../src/sdk/exomesh-agentic-wallet-guard/erc7540-async-escort.ts) | Operator whitelist · Pending→Claimable drift fuse |
| Ingress | `evaluateErc7540FromParsedCalldata()` via ExoMesh `evaluateRetailRisk()` | Wired into EIP-1193 middleware stack |
| Demo CLI | [sanctuary-demo.ts](../../../examples/sanctuary-demo.ts) | Scenario A–C matrix · `pnpm demo:sanctuary` (alias `pnpm demo:escort`) |

**Guarded selectors:**

| Selector | Function | Sanctuary action |
|----------|----------|------------------|
| `0xb2d9f201` | `requestDeposit` | Controller whitelist + async drift |
| `0x710e20f1` | `requestRedeem` | Controller whitelist + async drift |
| `0x9cc233d6` | `setOperator` | Operator whitelist (approve path only) |

```bash
pnpm demo:sanctuary                    # ERC-7540+ Scenario A–C (interactive · --json)
pnpm demo:FW-14                        # FW-14 adversarial boundary row
npx vitest run tests/erc7540-async-escort.test.ts   # 3/3 PASS
```

**Reject codes:** `ERC7540_OPERATOR_REJECTED` · `ERC7540_ASYNC_SLIPPAGE_DRIFT` — see [§7 Reject Codes](../../01_architecture_and_standards/02_eip_standards/02_ERC7540_ASYNC_ESCORT_IMPLEMENTATION.md).

---

## (b) Treasury Escort Router & Compliance Ingress

Venue-agnostic unidirectional AML escort — honest `IN_FLIGHT_BRIDGE_CAPITAL` accounting · **`lostUsd ≡ $0`** invariant.

| Layer | Module | Behavior |
|-------|--------|----------|
| Escort router | [treasury-escort-router.ts](../../../src/adapters/robinhood/treasury-escort-router.ts) | RWA → Arbitrum GM quote · in-flight capital gate |
| Ingress bridge | [across-ingress-bridge.ts](../../../src/adapters/across-ingress-bridge.ts) | Across/Robinhood AML inbound block |
| On-chain switch | [IngressSafetySwitch.sol](../../../contracts/IngressSafetySwitch.sol) | Sepolia anchor · oracle flush + blacklist |

```bash
pnpm demo:ingress                      # Scenario A–C treasury HUD (interactive · --json)
npx vitest run tests/adapters/treasury-escort-router.test.ts   # 6/6 PASS
```

**Ingress scenario matrix (policy replay):**

| Scenario | Route | Expected |
|----------|-------|----------|
| **A** | Robinhood → Arbitrum bridge settle | `IN_FLIGHT` → `SETTLED` · deployable NAV · `lostUsd ≡ $0` |
| **B** | Direct Robinhood → HL | **BLOCKED** — topology policy only |
| **C** | Inbound AML to Robinhood | **FAIL_CLOSED** — reverse yield path rejected |

> **Honesty:** `pnpm demo:ingress` = policy replay — **not** on-chain live-fire. Execution harness txs are separate from guard proof.

---

## (c) Robinhood / Across Live-Fire Baseline

Permissioned chains (Robinhood Chain 46630/4663) are **supported ingress examples**, not product identity. Center of gravity remains **Arbitrum One (42161)**.

| Proof class | Document / harness |
|-------------|-------------------|
| Live-fire JSON artifacts | [ROBINHOOD_LIVEFIRE_ARTIFACTS.md](../../logging/ROBINHOOD_LIVEFIRE_ARTIFACTS.md) |
| Tier1/Tier2 outbound txs | `pnpm tsx scripts/execute-smart-route-live-demo.ts` |
| Testnet / mainnet probes | `pnpm probe:rchain-testnet` · `pnpm probe:rchain-mainnet` |
| Inbound treasury AML probe | `pnpm probe:robinhood-inbound-treasury` |

**FW-14 linkage:** ERC-7540 operator hijack — `pnpm demo:FW-14` · `pnpm demo:sanctuary` — see [01_ADVERSARIAL_BOUNDARY_MATRIX.md](../module_a_exomesh/01_ADVERSARIAL_BOUNDARY_MATRIX.md).

---

## Cross-Reference Index

| Audience | Start here |
|----------|------------|
| ERC-7540 deep dive | [02_ERC7540_ASYNC_ESCORT_IMPLEMENTATION.md](../../01_architecture_and_standards/02_eip_standards/02_ERC7540_ASYNC_ESCORT_IMPLEMENTATION.md) |
| CLI box HUD samples | [02_CLI_DEMO_RUNBOOK.md § Sanctuary / Ingress](../02_CLI_DEMO_RUNBOOK.md) |
| Judge Dual Pillar 120s | `pnpm demo:sanctuary -- --non-interactive` · `pnpm demo:ingress -- --non-interactive` |
| Live mainnet execution (≠ guard) | [02_LIVE_FIRE_EVIDENCE.md](../shared_proofs/02_LIVE_FIRE_EVIDENCE.md) |
| Full CLI zone map | [03_CLI_ZONE_MAP.md](../shared_proofs/03_CLI_ZONE_MAP.md) |
