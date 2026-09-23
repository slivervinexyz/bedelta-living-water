# Docs Five-Folder Link-Dependency Matrix

> **Generated:** 2026-09-23 · Public repo cleanup SSOT  
> **Scope:** `docs/audit/` · `docs/logging/` · `docs/research/` · `docs/sdk/` · `docs/telemetry/`

## Legend

| Action | Meaning |
|--------|---------|
| **KEEP** | Public anchor, script SSOT, or judge evidence — committed |
| **REMOVE** | Unreferenced staging — deleted in cleanup pass |
| **GITIGNORE** | Runtime generator output — not committed |

## docs/audit/

| File | Action | Referenced by |
|------|--------|---------------|
| SYSTEM_METRICS_SSOT.json | KEEP | README · JUDGE_BRIEF · tests |
| SEPSB_BENCHMARK_SSOT.json | KEEP | README · JUDGE_BRIEF |
| SEPSB_CORPUS_SNAPSHOT.json | KEEP | README · JUDGE_BRIEF |
| exomesh-dune-telemetry.csv | KEEP | JUDGE_BRIEF · SUBMISSION · docs:dune-reconcile |
| onchain-dune-telemetry.csv | KEEP | JUDGE_BRIEF · SYSTEM_METRICS_SSOT |
| sepsb-stress-telemetry.csv | KEEP | JUDGE_BRIEF |
| dune-telemetry-rollup.json | KEEP | SUBMISSION · DUNE spec |
| HISTORICAL_BLACKSWAN_BACKTEST_SSOT.json | KEEP | SYSTEM_METRICS_SSOT |
| game_theory_simulation_results.json | KEEP | SUBMISSION_GRANT_APPENDIX · demo video |
| negative-proofs-artifact.json | KEEP | verify-negative-proofs scripts |
| CODEBASE_FREEZE.json | KEEP | codebase-freeze.test.ts |
| static-analysis-report.json | KEEP | GRANT_PROPOSAL |
| security-scorecard.json | KEEP | GRANT_PROPOSAL · audit:security |
| slither.json | KEEP | audit:slither |
| chaos-blackswan-metrics.json | KEEP | chaos-blackswan scripts |
| zerodev-aa-metrics.json | KEEP | zerodev-smoke |
| stylus-onchain-tx-manifest.jsonl | KEEP | stylus-telemetry-emit |
| exomesh-dune-telemetry.csv.meta.json | KEEP | export-dune |
| exomesh-kv-intercepts.json | KEEP | demo mirror · tests (baseline) |
| exomesh-risk-log-rolling.json | KEEP | demo mirror · tests (baseline) |
| live-96h-telemetry.json | GITIGNORE | telemetry:96h output |
| DOCS_FIVE_FOLDER_LINK_MATRIX.md | KEEP | This matrix |
| PRE_PUBLIC_RELEASE_REPORT.md | REMOVE | Pre-release meta · internal path refs |

## docs/logging/

| File | Action | Referenced by |
|------|--------|---------------|
| ROBINHOOD_LIVEFIRE_ARTIFACTS.md | KEEP | JUDGE_BRIEF · VERIFICATION_MATRIX |
| robinhood_livefire_tier1_*.json | KEEP | JUDGE_BRIEF · index |
| robinhood_livefire_outbound_*01-49-53*.json | KEEP | Tier2 testnet |
| robinhood_livefire_outbound_*03-00-51*.json | KEEP | Tier2 mainnet |
| robinhood_livefire_inbound_block_*.json | KEEP | B1 |
| robinhood_livefire_inbound_audit_*.json | KEEP | B2 |
| robinhood_livefire_inbound_treasury_*.json | KEEP | B3 |
| last_exomesh_run.json | KEEP | demo persister |
| last_sanctuary_run.json | KEEP | demo persister |
| last_ingress_run.json | KEEP | demo persister |
| robinhood_livefire_tier1_dryrun_*.json | REMOVE | Superseded dry-run |
| robinhood_livefire_outbound_*03-01-17*.json | REMOVE | Duplicate outbound |
| 0909_E2E_ARB_NATIVE_EXECUTION.md | REMOVE | Old staging |
| last_delta_neutral_run.json | GITIGNORE | Runtime only |
| last_e2e_run.json | GITIGNORE | Runtime only |
| *dryrun*.json | GITIGNORE | Future dry-runs |

## docs/research/

| File | Action | Referenced by |
|------|--------|---------------|
| COMPETITOR_ANALYSIS_AND_BENCHMARK.md | REMOVE | Internal R&D · pre-public purge |

## docs/sdk/

| File | Action | Referenced by |
|------|--------|---------------|
| README.md | KEEP | Legacy redirect stub |

## docs/telemetry/

| File | Action | Referenced by |
|------|--------|---------------|
| game_theory_simulation_results.json | REMOVE | Duplicate of docs/audit/ copy |
