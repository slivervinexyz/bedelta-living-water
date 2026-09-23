# 05 — Product & Verifications

> **Vitest SSOT:** **254 test files | 1206 PASS clean (100%)** · `pnpm test -- --run` · `pnpm exec tsc --noEmit` **0 errors**

Unified product deliverables + verification proofs — **Module A (ExoMesh)** · **Module B (Sanctuary)** · **Shared Mainnet Proofs**.

## Hub

| # | Document | Role |
|---|----------|------|
| **01** | [01_VERIFICATION_MATRIX.md](./01_VERIFICATION_MATRIX.md) | Express entry · role routing · 30-second commands |
| **02** | [02_CLI_DEMO_RUNBOOK.md](./02_CLI_DEMO_RUNBOOK.md) | Judge demo CLI · 5-core venue `--trip` proofs |
| **03** | [03_DELIVERABLES_AND_PROOFS.md](./03_DELIVERABLES_AND_PROOFS.md) | Finished SKU · proof lanes · judge paths |
| **04** | [04_MARKET_AND_SECURITY_IMPERATIVE.md](./04_MARKET_AND_SECURITY_IMPERATIVE.md) | Market & security imperative · grant narrative |

## Module A — ExoMesh (`module_a_exomesh/`)

| # | Document | Role |
|---|----------|------|
| **01** | [01_ADVERSARIAL_BOUNDARY_MATRIX.md](./module_a_exomesh/01_ADVERSARIAL_BOUNDARY_MATRIX.md) | **FW-01–16** · 8 CAN · `pnpm demo:FW-xx` one-line verification |
| **02** | [02_ZERO_ALLOCATION_HOTPATH.md](./module_a_exomesh/02_ZERO_ALLOCATION_HOTPATH.md) | Zero-Allocation Hot-Path · SSRC benchmarks · `<16 KiB` / 10k |
| **03** | [03_ADAPTER_INTEGRATION_PROOFS.md](./module_a_exomesh/03_ADAPTER_INTEGRATION_PROOFS.md) | ExoMesh Agentic Guard · 5-core venue proofs · optional B2B appendix |

## Module B — Sanctuary (`module_b_sanctuary/`)

| # | Document | Role |
|---|----------|------|
| **01** | [01_SANCTUARY_AND_TREASURY_ESCORT_PROOFS.md](./module_b_sanctuary/01_SANCTUARY_AND_TREASURY_ESCORT_PROOFS.md) | ERC-7540+ async vault escort · Treasury ingress · Robinhood / Across AML |

## Shared Proofs (`shared_proofs/`)

| # | Document | Role |
|---|----------|------|
| **01** | [01_ON_CHAIN_MAINNET_ANCHORS.md](./shared_proofs/01_ON_CHAIN_MAINNET_ANCHORS.md) | Contract addresses · GMX invariant stack · Stylus anchors |
| **02** | [02_LIVE_FIRE_EVIDENCE.md](./shared_proofs/02_LIVE_FIRE_EVIDENCE.md) | GM I/O txs · micro-fill · mainnet live evidence · **Robinhood 46630/4663 live-fire baseline** · JSON artifacts under [docs/logging/robinhood_livefire_*](../logging/ROBINHOOD_LIVEFIRE_ARTIFACTS.md) |
| **03** | [03_CLI_ZONE_MAP.md](./shared_proofs/03_CLI_ZONE_MAP.md) | Zone A / A.1 / B / C CLI command tables (Tier 0–3) |

**Buildathon path:** [JUDGE_BRIEF.md](../../JUDGE_BRIEF.md) → `module_a_exomesh/01` (FW matrix) + `shared_proofs/03` (CLI) + `pnpm demo:FW-xx`  
**Grant path:** [PRODUCTION_WORKFLOW_DEEP_DIVE.md](../PRODUCTION_WORKFLOW_DEEP_DIVE.md) → `shared_proofs/01` + `shared_proofs/02`
