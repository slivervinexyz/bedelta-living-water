# Dune Dashboard Copy — Honesty Demotion (Paste-Ready)

> **Audience:** Manual paste into [Dune Operational Shield](https://dune.com/silvervinelabs/slivervine-protocol) and [SEPSB Stress Matrix](https://dune.com/silvervinelabs/slivervine-sepsb-stress) text widgets.  
> **SSOT rollup:** `docs/audit/dune-telemetry-rollup.json` · verify: `pnpm docs:dune-reconcile`  
> **Judge primary proof:** [01_DELIVERABLES_AND_PROOFS.md](../../03_product_verifications/03_DELIVERABLES_AND_PROOFS.md) — `35/35` + `demo:FW-11-ui` (not Dune counters).

---

## Operational Shield (`/slivervine-protocol`)

### Dashboard title

```
SliverVine ExoMesh — Off-Chain Simulated Intercept Telemetry
```

### Dashboard subtitle

```
Counterfactual pre-consensus replay · NOT Arbitrum One 42161 live ingest
```

### Methodology text panel (paste as-is)

```
DATA SOURCE
This dashboard ingests Module A off-chain telemetry exported via `pnpm export:dune` and uploaded to Dune as `dataset_exomesh_intercepts` (schema: silvervine.exomesh.dune-telemetry.v1). Rows are cumulative replays from chaos matrix, demo harness, and grant-audit shadow-margin fixtures — not a live mainnet event stream.

ECONOMICS DISCLAIMER
`simulated_loss_prevented_usd` is a modeled counterfactual notional — what toxic intent volume would have been at risk if broadcast had proceeded. It is NOT realized PnL, NOT on-chain PEV, and NOT interchangeable with Radar backtest totals ($1.33M) or SEPSB benchmark panels.

JUDGE VERIFICATION PATH
Authoritative FW-11 approve-gate proof: `npx vitest run tests/sdk/retail-guard-provider.test.ts` (35/35) and `pnpm demo:FW-11-ui`. Reconcile CSV totals before trusting counters: `pnpm docs:dune-reconcile`.
```

### Counter widget titles (rename in Dune UI)

| Old (demote) | New title |
|--------------|-----------|
| Total Capital Protected | **Simulated Counterfactual Loss (USD)** |
| Total L2 Gas Saved | **Simulated L2 Gas Avoided (USD)** |
| Total Fail-Closed Intercepts | **Fail-Closed Intercepts (off-chain CSV)** |

### Footer (fill from rollup JSON after `pnpm docs:dune-reconcile`)

```
SSOT: docs/audit/exomesh-dune-telemetry.csv
sha256: {csv_sha256}
rows: {total_rows} · fail_closed: {fail_closed_count}
simulated_loss_usd: {simulated_loss_prevented_usd_total}
gas_saved_usd: {gas_saved_usd_total}
verify: pnpm docs:dune-reconcile · export: pnpm export:dune
```

### Donut chart (4-Moat breakdown)

Enable full legend labels for `intercept_type`:

- `SOIL_RESISTANCE_TRIP`
- `HONEYPOT_DECOY`
- `OBSERVATORY_HAIRCUT`
- `MAX_ATTEMPTS_SEVERED`

Subtitle: `Off-chain intercept_type distribution · simulated replay`

---

## SEPSB Stress Matrix (`/slivervine-sepsb-stress`)

### Dashboard title

```
SEPSB Golden Corpus Replay — Pre-Consensus Wasm Benchmark
```

### Dashboard subtitle

```
Fixed toxic vectors · NOT production intercept rate
```

### Disclaimer text panel

```
SEPSB (SliverVine ExoMesh Pre-Consensus Security Benchmark) replays deterministic golden vectors from SEPSB_CORPUS_SNAPSHOT.json via `pnpm audit:sepsb`.

100% TPR / 0% FPR applies to this fixed corpus only — not a measured live interception rate on Arbitrum One.

Do NOT merge SEPSB latency panels with Operational Shield $ counters or Radar historical_backtest ($1.33M simulated).
```

### Hardware table columns (replace pipe-delimited blob)

| cpu_model | cores | arch | os | node_version | last_audit_timestamp |
|-----------|-------|------|-----|--------------|----------------------|
| Intel(R) Core(TM) Ultra 7 155H | 22 | x64 | linux | v22.23.1 | 2026-09-15 03:25:27 UTC |

---

## Post-paste checklist (manual)

1. `pnpm export:dune` — refresh CSV SSOT
2. `pnpm docs:dune-reconcile` — exit 0; copy values from `docs/audit/dune-telemetry-rollup.json`
3. Re-upload `exomesh-dune-telemetry.csv` to Dune `dataset_exomesh_intercepts`
4. Paste demoted copy above into text widgets; rename counter titles
5. Run dashboard — counters must match rollup JSON (not stale live values)
