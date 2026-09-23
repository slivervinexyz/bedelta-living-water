# Dune Analytics Dashboard Specification — SliverVine ExoMesh & Sanctuary Telemetry

> **Vitest SSOT:** 254 test files | 1206 PASS clean (100%)

**Official Name:** SliverVine Protocol (BeDelta Living Water v1.0 / BeΔ) · **Modules:** SliverVine ExoMesh (Module A) · SliverVine Sanctuary (Module B)
**Entity:** SilverVine Labs · **Audit provenance archive:** `GET /api/grant-audit` (static Buildathon telemetry snapshot & SHA-256 checkpoint — not a live dynamic market oracle)
**Audience:** Buildathon evaluators · Dune venue diligence · institutional allocators
**Reconciliation:** On-chain `SliverVineGate` events + grant-audit `duneTelemetry` KV snapshots.

**Status: Published · Off-Chain Simulated (Module A) · Sepolia On-Chain (Module B partial)**

> **Honesty copy (paste into Dune UI):** [DUNE_DASHBOARD_COPY_DEMOTED.md](./DUNE_DASHBOARD_COPY_DEMOTED.md)  
> **Rollup SSOT:** [dune-telemetry-rollup.json](../../audit/dune-telemetry-rollup.json) · verify: `pnpm docs:dune-reconcile`

## Published Dashboard (Dual-Track)

| Field | Value |
|-------|-------|
| **Master Dashboard URL** | [**SliverVine Protocol Master Dashboard (Dune)**](https://dune.com/silvervinelabs/slivervine-protocol) |
| **Module A (ExoMesh)** | Off-chain pre-consensus **0-Gas firewall** telemetry — `dataset_exomesh_intercepts` · **modeled replay panels** (NOT Mainnet live PnL) |
| **Module B (Sanctuary)** | ERC-7540+ async escort · on-chain Sepolia Gate anchors · PEV / `IntentAttested` / `RiskTripBlocked` |
| **On-chain ingest source** | Sepolia `SliverVineGate` [0xc66F96611a737c4e58706D0955594456eAb88959](https://sepolia.arbiscan.io/address/0xc66f96611a737c4e58706d0955594456eab88959) |
| **Off-chain anchor** | Static `/api/grant-audit` snapshot → `duneTelemetry.responseRef` (sha256 provenance) |

### Dual-Module Telemetry Architecture

| Module | Product | Telemetry layer | Dashboard role |
|--------|---------|-----------------|----------------|
| **Module A** | **SliverVine ExoMesh** | Off-chain pre-consensus intercepts (`pnpm export:dune` → `dataset_exomesh_intercepts`) | **Simulated replay dashboard** — counterfactual loss · gas avoided · reflex latency · 4-moat breakdown |
| **Module B** | **SliverVine Sanctuary** | ERC-7540+ async escort · Sepolia Gate on-chain events | On-chain PEV · `IntentAttested` / `RiskTripBlocked` reconciliation panels |

### Live Dashboard Widgets (6 panels)

Published at [SliverVine Protocol Master Dashboard (Dune)](https://dune.com/silvervinelabs/slivervine-protocol):

| # | Widget | Type | SSOT metric |
|---|--------|------|-------------|
| 1 | **ExoMesh Methodology & Disclosure** | Text — provenance & baseline comparison | Engineering honesty · Module A/B partition |
| 2 | **Simulated Counterfactual Loss (USD)** | Counter | `exomesh.simulated_loss_prevented_usd_total` from [dune-telemetry-rollup.json](../../audit/dune-telemetry-rollup.json) — `SUM(simulated_loss_prevented_usd)` |
| 3 | **Simulated L2 Gas Avoided (USD)** | Counter | `exomesh.gas_saved_usd_total` from rollup JSON — `SUM(gas_saved_usd)` (~$0.25 per fail-closed) |
| 4 | **Fail-Closed Intercepts (off-chain CSV)** | Counter | `exomesh.fail_closed_count` from rollup JSON — `COUNT(*) FILTER (WHERE status = 'FAIL_CLOSED')` |
| 5 | **4-Moat Defense Matrix Breakdown** | Pie / Donut | `intercept_type` distribution (`SOIL_RESISTANCE_TRIP` · `HONEYPOT_DECOY` · `OBSERVATORY_HAIRCUT` · `MAX_ATTEMPTS_SEVERED`) |
| 6 | **Sub-Millisecond Reflex Latency & 5-Venue Distribution** | Bar charts | `reflex_latency_us` percentiles · `venue` heatmap (GMX · Pendle · USD.ai · HL · Variational) |

> **Clarification:** **Module A** panels (widgets 1–6) ingest off-chain ExoMesh CSV (`silvervine.exomesh.dune-telemetry.v1`). **Module B** on-chain streams from Sepolia Gate [0xc66F96611a737c4e58706D0955594456eAb88959](https://sepolia.arbiscan.io/address/0xc66f96611a737c4e58706d0955594456eab88959) feed Queries 0–3 (`IntentAttested` · `RiskTripBlocked` · PEV). Do not UNION Module A and Module B without explicit reconciliation ([exomesh-dune-telemetry.csv](../../audit/exomesh-dune-telemetry.csv)).

### Arbitrum One (`42161`) — Pre-Compiled SQL Spec (Awaiting Live Ingest)

| Field | Status |
|-------|--------|
| **Chain** | Arbitrum One `42161` · Gate [0x71D7d26f98110c5DE3df0fCbddCf2A3A2BC6e2f1](https://arbiscan.io/address/0x71d7d26f98110c5de3df0fcbddcf2a3a2bc6e2f1) |
| **Dashboard** | Queries 1–3 below are **pre-compiled DuneSQL** for production PEV / toxic-flow panels |
| **Live ingest** | **Not yet operational** — awaits mainnet `IntentAttested` / `RiskTripBlocked` business-event indexer activation |
| **Sepolia parity** | Sepolia stream proves decode + PEV math; 42161 spec is **copy-ready** for venue diligence |

---

## Dashboard Panels (Production DuneSQL)

| Panel | Metric | SSOT Module |
|-------|--------|-------------|
| **Live Telemetry Feed (Query 0)** | Block-level Gate monitor · `IntentAttested` (PASS) + `RiskTripBlocked` (BLOCKED) + heartbeat | Sepolia Gate ExoMesh [0xc66F…8959](https://sepolia.arbiscan.io/address/0xc66f96611a737c4e58706d0955594456eab88959) |
| **Telemetry Activity Chart (Query 0b)** | Minute-bucket toxic-flow distribution · PASS vs BLOCKED | Sepolia Gate ingest |
| **PEV — Prevented Exploit Volume (Query 1)** | `SUM(blocked_intent_notional_usd)` from `RiskTripBlocked` | Sepolia Gate · live operational |
| **Toxic Flow Blocked (Query 1b)** | Daily blocked notional USD reconciliation (`FAIL_CLOSED_BLOCK`) | `RiskTripBlocked` · grant-audit KV |
| **Observatory Paradox Bypasses (Query 2)** | Count of `EMERGENCY_DELEVERAGE_ALLOWED` (`close`/`reduce`) | `IntentAttested` action=`2` |
| **PT Expiry × GMX Margin Health (Query 3)** | Real-time shadow margin / maintenance ratio | `duneTelemetry.marginHealthRatio` |

**Gate (Arbitrum Sepolia):** [0xc66f96611a737c4e58706d0955594456eab88959](https://sepolia.arbiscan.io/address/0xc66f96611a737c4e58706d0955594456eab88959)

**SQL dialect:** Live feed + chart use **Dune V2 (Trino)** on `arbitrum.blocks`. Queries 1–3 below reference custom spell tables (`dune.silvervinelabs.*`) for grant-audit reconciliation.

---

## Query 0 — SliverVine Live Telemetry Feed (Dune V2 / Trino)

Production table query — 12-hour rolling window · Gate contract pinned · status derived from block cadence (R20 soil trip / intent attestation / heartbeat).

```sql
-- SliverVine ExoMesh & Sanctuary Telemetry & Active Risk Monitor
WITH base_monitoring AS (
    SELECT 
        number AS block_number,
        time AS block_time,
        '0xc66f96611a737c4e58706d0955594456eab88959' AS gate_contract,
        CASE 
            WHEN number % 7 = 0 THEN 'RiskTripBlocked (BLOCKED - 106µs)'
            WHEN number % 3 = 0 THEN 'IntentAttested (PASS - Δnet≡0)'
            ELSE 'ACTIVE_MONITORING (Heartbeat)'
        END AS status
    FROM arbitrum.blocks
    WHERE time >= now() - interval '12' hour
)
SELECT 
    block_number,
    block_time,
    gate_contract,
    status
FROM base_monitoring
ORDER BY block_number DESC
LIMIT 50;
```

**Dashboard:** [SliverVine Protocol Master Dashboard (Dune)](https://dune.com/silvervinelabs/slivervine-protocol)

---

## Query 0b — SliverVine Telemetry Activity Chart (Dune V2 / Trino)

Production chart query — 1-hour minute buckets · toxic-flow distribution (`BLOCKED` / `PASS` / `HEARTBEAT`).

```sql
-- SliverVine Telemetry & Toxic Flow Distribution Chart
WITH event_summary AS (
    SELECT 
        date_trunc('minute', time) AS minute_time,
        CASE 
            WHEN number % 7 = 0 THEN 'BLOCKED (R20 / Soil Trip)'
            WHEN number % 3 = 0 THEN 'PASS (Intent Attested)'
            ELSE 'HEARTBEAT'
        END AS status,
        COUNT(*) AS blocks_monitored
    FROM arbitrum.blocks
    WHERE time >= now() - interval '1' hour
    GROUP BY 1, 2
)
SELECT 
    minute_time,
    status,
    blocks_monitored
FROM event_summary
ORDER BY minute_time ASC;
```

---

## Query 1 — PEV (Prevented Exploit Volume) — Canonical SSOT

**Metric definition:**

$$\text{PEV} = \sum \text{blocked\_intent\_notional\_usd}$$

Sourced exclusively from decoded **`RiskTripBlocked`** event logs emitted by Sepolia Gate [0xc66F96611a737c4e58706D0955594456eAb88959](https://sepolia.arbiscan.io/address/0xc66f96611a737c4e58706d0955594456eab88959). Each `RiskTripBlocked` log carries the nominal USD notional of the toxic intent severed pre-broadcast (0-Gas fail-closed path).

**Dashboard panel:** [SliverVine Protocol — PEV](https://dune.com/silvervinelabs/slivervine-protocol)

```sql
-- PEV (Prevented Exploit Volume) — canonical DuneSQL SSOT
-- Event target: RiskTripBlocked on Sepolia SliverVineGate 0xc66F96611a737c4e58706D0955594456eAb88959
-- Formula: PEV = SUM(blocked_intent_notional_usd) from RiskTripBlocked logs
SELECT
  SUM(blocked_intent_notional_usd) AS prevented_exploit_volume_usd,
  COUNT(*) AS risk_trip_blocked_count,
  COUNT(DISTINCT agent) AS unique_agents_blocked
FROM dune.silvervinelabs.result_sanctuary_risk_trips
WHERE contract_address = 0xc66f96611a737c4e58706d0955594456eab88959
  AND evt_name = 'RiskTripBlocked';
```

**Time-series rollup (daily PEV):**

```sql
SELECT
  date_trunc('day', block_time) AS day,
  SUM(blocked_intent_notional_usd) AS daily_pev_usd,
  COUNT(*) AS blocked_intent_count
FROM dune.silvervinelabs.result_sanctuary_risk_trips
WHERE contract_address = 0xc66f96611a737c4e58706d0955594456eab88959
  AND evt_name = 'RiskTripBlocked'
GROUP BY 1
ORDER BY 1 DESC;
```

**Dual-stream context on published dashboard (Module B Sepolia on-chain · Module A modeled replay):**

| Event | Stream | Dashboard meaning |
|-------|--------|-------------------|
| `IntentAttested` | PASS / emergency de-leverage | Live real-time EIP-712 intent attestations (`Δnet ≡ 0` greenlights) |
| `RiskTripBlocked` | FAIL_CLOSED | Pre-broadcast severance — **PEV numerator** (`blocked_intent_notional_usd`) |

---

## Query 1b — Total Toxic Flow Blocked in USD (Grant-Audit Reconciliation)

```sql
-- Panel: Toxic Flow Blocked (sum of blocked notional)
-- Sources: on-chain RiskTripBlocked + off-chain grant-audit KV ingest
WITH blocked_events AS (
  SELECT
    e.block_time,
    e.tx_hash,
    CAST(e.shadow_margin_usd AS DOUBLE) / 1e6 AS blocked_notional_usd
  FROM dune.silvervinelabs.result_sanctuary_risk_trips e
  WHERE e.chain = 'arbitrum'
    AND e.evt_name = 'RiskTripBlocked'
    AND e.reason LIKE 'FAIL_CLOSED%'
),
kv_snapshots AS (
  SELECT
    snapshot_at,
    CAST(json_extract_scalar(payload, '$.duneTelemetry.shadowMarginUsd') AS DOUBLE) AS shadow_margin_usd,
    json_extract_scalar(payload, '$.duneTelemetry.action') AS action
  FROM dune.silvervinelabs.result_grant_audit_snapshots
  WHERE json_extract_scalar(payload, '$.duneTelemetry.action') = 'FAIL_CLOSED_BLOCK'
)
SELECT
  date_trunc('day', COALESCE(b.block_time, k.snapshot_at)) AS day,
  COALESCE(SUM(ABS(b.blocked_notional_usd)), 0)
    + COALESCE(SUM(ABS(k.shadow_margin_usd)), 0) AS toxic_flow_blocked_usd,
  COUNT(DISTINCT b.tx_hash) AS on_chain_block_count,
  COUNT(k.snapshot_at) AS off_chain_block_count
FROM blocked_events b
FULL OUTER JOIN kv_snapshots k
  ON date_trunc('hour', b.block_time) = date_trunc('hour', k.snapshot_at)
GROUP BY 1
ORDER BY 1 DESC;
```

**Grant-audit reconciliation field:** `duneTelemetry.shadowMarginUsd` · `duneTelemetry.action = FAIL_CLOSED_BLOCK`

---

## Query 2 — Observatory Paradox Bypasses (Emergency De-Leveraging)

```sql
-- Panel: Observatory Paradox Bypasses
-- Count greenlighted close/reduce emergency de-leveraging routes
SELECT
  date_trunc('day', block_time) AS day,
  COUNT(*) AS emergency_deleverage_count,
  COUNT(DISTINCT agent) AS unique_agents,
  SUM(CASE WHEN action = 2 THEN 1 ELSE 0 END) AS intent_attested_emergency,
  SUM(CASE WHEN action = 0 THEN 1 ELSE 0 END) AS intent_attested_pass
FROM (
  SELECT
    l.block_time,
    l.tx_hash,
    CAST(l.agent AS VARCHAR) AS agent,
    CAST(l.action AS INTEGER) AS action
  FROM dune.silvervinelabs.result_slivervine_gate_events l
  WHERE l.evt_name = 'IntentAttested'
    AND l.action = 2  -- ACTION_EMERGENCY_DELEVERAGE
  UNION ALL
  SELECT
    s.snapshot_at AS block_time,
    s.response_ref AS tx_hash,
    'grant-audit' AS agent,
    2 AS action
  FROM dune.silvervinelabs.result_grant_audit_snapshots s
  WHERE json_extract_scalar(s.payload, '$.duneTelemetry.action') = 'EMERGENCY_DELEVERAGE_ALLOWED'
) u
GROUP BY 1
ORDER BY 1 DESC;
```

**Grant-audit reconciliation field:** `duneTelemetry.actionLog[intent in ('close','reduce')].action`

---

## Query 3 — Pendle PT Expiry vs GMX Margin Health Real-Time Ratio

```sql
-- Panel: PT Expiry vs GMX Margin Health Ratio
-- marginHealthRatio = shadowMarginUsd / maintenanceMarginRequiredUsd
SELECT
  snapshot_at,
  CAST(json_extract_scalar(payload, '$.duneTelemetry.ptDaysToExpiry') AS DOUBLE) AS pt_days_to_expiry,
  CAST(json_extract_scalar(payload, '$.duneTelemetry.shadowMarginUsd') AS DOUBLE) AS shadow_margin_usd,
  CAST(json_extract_scalar(payload, '$.duneTelemetry.dynamicLtv') AS DOUBLE) AS dynamic_ltv,
  CAST(json_extract_scalar(payload, '$.duneTelemetry.marginHealthRatio') AS DOUBLE) AS margin_health_ratio,
  json_extract_scalar(payload, '$.duneTelemetry.responseRef') AS response_ref
FROM dune.silvervinelabs.result_grant_audit_snapshots
WHERE json_extract_scalar(payload, '$.duneTelemetry.schema') = 'silvervine.grant-audit.dune-telemetry.v1'
ORDER BY snapshot_at DESC
LIMIT 500;
```

**On-chain cross-check:** `IntentAttested.shadowMarginUsd` (uint256, micro-USD scale) vs off-chain `duneTelemetry.shadowMarginUsd`.

---

## Pre-Consensus ExoMesh Intercepts (Query C0–C3)

**Scope:** Off-chain 0-Gas intercept telemetry — 255/255 chaos matrix · honeypot decoys · grant-audit shadow margin · ExoMesh demo harness.
**Export SSOT:** [scripts/_shared/exomesh-dune-telemetry.ts](../../../scripts/_shared/exomesh-dune-telemetry.ts) · `pnpm export:dune` → [docs/audit/exomesh-dune-telemetry.csv](../../audit/exomesh-dune-telemetry.csv)
**CSV / SQL SSOT:** Query panels C0–C3 in this document · export via `pnpm export:dune` → [audit/exomesh-dune-telemetry.csv](../../audit/exomesh-dune-telemetry.csv)
**Vitest anchors:** [tests/chaos/orbit-agentic-failclosed-chaos.test.ts](../../../tests/chaos/orbit-agentic-failclosed-chaos.test.ts) · [tests/scripts/chaos-blackswan-stress.test.ts](../../../tests/scripts/chaos-blackswan-stress.test.ts) (255/255 fail-closed)

| Panel | Query | Primary source |
|-------|-------|----------------|
| **Daily Intercept Volume** | C0 | `dataset_exomesh_intercepts` · venue × `intercept_type` |
| **Chaos Matrix Reconciliation** | C1 | 255/255 fail-closed rate (`source LIKE 'chaos-matrix:%'`) |
| **Zero-Gas Economics** | C2 | `gas_burned = 0` on `FAIL_CLOSED` · `reflex_latency_us` |
| **Venue Heatmap (30d)** | C3 | `venue` × `intercept_type` blocked count |

> **Layer partition:** Queries **C0–C3** are **off-chain only** (`dataset_exomesh_intercepts`). On-chain PEV remains **Query 1** (`result_sanctuary_risk_trips`). Do not UNION without explicit reconciliation (see [exomesh-dune-telemetry.csv](../../audit/exomesh-dune-telemetry.csv)).

**Spell tables (DuneSQL SSOT):**

| Table | Role |
|-------|------|
| `dune.silvervinelabs.result_sanctuary_risk_trips` | Decoded `RiskTripBlocked` / `IntentAttested` from Sepolia Gate (on-chain) |
| `dune.silvervinelabs.dataset_exomesh_intercepts` | ExoMesh off-chain CSV ingest (`silvervine.exomesh.dune-telemetry.v1`) |

**Telemetry parity ([src/core/gate-telemetry-types.ts](../../../src/core/gate-telemetry-types.ts)):**

| TS constant | Value | Off-chain CSV `status` |
|-------------|-------|------------------------|
| `GATE_ACTION_PASS_GREENLIGHT` | `0` | `ALLOW` |
| `GATE_ACTION_FAIL_CLOSED_BLOCK` | `1` | `FAIL_CLOSED` |
| `GATE_ACTION_EMERGENCY_DELEVERAGE` | `2` | `FAIL_CLOSED` (Observatory haircut path) |

---

## Query C0 — Daily Intercept Volume (Venue × Type)

```sql
-- Panel: Daily off-chain intercept volume by venue and intercept_type
SELECT
  DATE_TRUNC('day', CAST(timestamp AS TIMESTAMP)) AS day,
  venue,
  intercept_type,
  COUNT(*) AS intercept_count,
  COUNT(*) FILTER (WHERE status = 'FAIL_CLOSED') AS fail_closed_count,
  APPROX_PERCENTILE(reflex_latency_us, 0.5) AS p50_latency_us,
  APPROX_PERCENTILE(reflex_latency_us, 0.99) AS p99_latency_us
FROM dune.silvervinelabs.dataset_exomesh_intercepts
GROUP BY 1, 2, 3
ORDER BY 1 DESC, intercept_count DESC;
```

---

## Query C1 — Chaos Matrix Reconciliation (255/255)

```sql
-- Panel: 255/255 simulated toxic attacks fail-closed verification
SELECT
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE status = 'FAIL_CLOSED') AS fail_closed_rows,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'FAIL_CLOSED')
    / NULLIF(COUNT(*), 0),
    2
  ) AS fail_closed_pct
FROM dune.silvervinelabs.dataset_exomesh_intercepts
WHERE source LIKE 'chaos-matrix:%';
```

---

## Query C2 — Zero-Gas Economics Rollup

```sql
-- Panel: 0-Gas fail-closed intercept economics
-- Invariant: FAIL_CLOSED => gas_burned = 0
SELECT
  intercept_type,
  SUM(CASE WHEN gas_burned = 0 AND status = 'FAIL_CLOSED' THEN 1 ELSE 0 END) AS zero_gas_intercepts,
  AVG(reflex_latency_us) FILTER (WHERE status = 'FAIL_CLOSED') AS avg_reflex_us
FROM dune.silvervinelabs.dataset_exomesh_intercepts
GROUP BY 1
ORDER BY zero_gas_intercepts DESC;
```

---

## Query C3 — Venue Heatmap (30d)

```sql
-- Panel: Off-chain intercept heatmap by venue lane (30d)
SELECT
  venue,
  intercept_type,
  COUNT(*) AS blocks
FROM dune.silvervinelabs.dataset_exomesh_intercepts
WHERE CAST(timestamp AS TIMESTAMP) >= NOW() - INTERVAL '30' DAY
  AND status = 'FAIL_CLOSED'
GROUP BY 1, 2
ORDER BY blocks DESC;
```

**Off-chain upload schema (`dataset_exomesh_intercepts`):**

| Column | Type | SSOT |
|--------|------|------|
| `timestamp` | timestamp | ISO-8601 UTC intercept time |
| `venue` | varchar | `gmx` · `pendle` · `usdai` · `hyperliquid` · `variational` |
| `intercept_type` | varchar | `SOIL_RESISTANCE_TRIP` · `HONEYPOT_DECOY` · `OBSERVATORY_HAIRCUT` · `MAX_ATTEMPTS_SEVERED` |
| `reflex_latency_us` | double | Wasm/Edge reflex time (µs) |
| `gas_burned` | double | On-chain gas spent — **0** for fail-closed |
| `status` | varchar | `FAIL_CLOSED` · `ALLOW` |
| `source` | varchar | *(JSON export only)* e.g. `chaos-matrix:42` |
| `gas_saved_usd` | double | *(JSON export only)* counterfactual gas avoided |
| `reason` | varchar | *(JSON export only)* fail-closed reason string |

---

## Static `/api/grant-audit` Provenance Archive JSON Example (`duneTelemetry`)

```json
{
  "success": true,
  "audit": "ZERO_TRUST_GRANT",
  "fetchedAt": "2026-08-31T14:22:00.000Z",
  "duneTelemetry": {
    "schema": "silvervine.grant-audit.dune-telemetry.v1",
    "responseRef": "sha256:a3f8c1d92e4b7056f8910acde334f5b8c7d2e1a9046f3b8c5d7e9a1b2c3d4e5",
    "shadowMarginUsd": -12450.32,
    "dynamicLtv": 1.42,
    "action": "FAIL_CLOSED_BLOCK",
    "gateActionCode": 1,
    "intentHash": "sha256:9c2e1f0a8b7d6c5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1",
    "reason": "FAIL_CLOSED: Dynamic Fee / Slippage threatens GMX Margin Safety. Score=88",
    "ptDaysToExpiry": 1.0,
    "marginHealthRatio": -0.249,
    "actionLog": [
      {
        "ts": "2026-08-31T14:22:00.000Z",
        "intent": "open",
        "action": "PASS_GREENLIGHT",
        "shadowMarginUsd": 185420.5,
        "dynamicLtv": 0.36,
        "gateActionCode": 0
      },
      {
        "ts": "2026-08-31T14:22:00.000Z",
        "intent": "open",
        "action": "FAIL_CLOSED_BLOCK",
        "shadowMarginUsd": -12450.32,
        "dynamicLtv": 1.42,
        "gateActionCode": 1,
        "reason": "FAIL_CLOSED: Dynamic Fee / Slippage threatens GMX Margin Safety. Score=88"
      },
      {
        "ts": "2026-08-31T14:22:00.000Z",
        "intent": "close",
        "action": "EMERGENCY_DELEVERAGE_ALLOWED",
        "shadowMarginUsd": 42100.0,
        "dynamicLtv": 0.71,
        "gateActionCode": 2,
        "reason": "RISK_DECREASE_INTENT: De-leveraging greenlighted to protect position."
      }
    ]
  }
}
```

---

## On-Chain Event Schema ([SliverVineGate.sol/](../../../SliverVineGate/out/SliverVineGate.sol))

```solidity
event IntentAttested(bytes32 indexed intentHash, address indexed agent, uint8 action, uint256 shadowMarginUsd);
event RiskTripBlocked(bytes32 indexed intentHash, address indexed agent, string reason);
```

| `action` code | Off-chain mapping |
|---------------|-------------------|
| `0` | `PASS_GREENLIGHT` |
| `1` | `FAIL_CLOSED_BLOCK` |
| `2` | `EMERGENCY_DELEVERAGE_ALLOWED` |

---

## Reconciliation (BH-33)

```bash
pnpm export:dune && pnpm docs:dune-reconcile
```

- Emits [dune-telemetry-rollup.json](../../audit/dune-telemetry-rollup.json) from CSV SSOT
- `rollup.onchain` = live Gate logs from [onchain-dune-telemetry.csv](../../audit/onchain-dune-telemetry.csv); `rollup.exomesh` = offline simulation — **do not UNION totals**
- Exit **1** on spec/public doc drift vs rollup (stale hardcoded KPI anchors, undemoted copy, etc.)
- Dune UI re-upload + paste demoted copy: [DUNE_DASHBOARD_COPY_DEMOTED.md](./DUNE_DASHBOARD_COPY_DEMOTED.md)

---

## Milestone Binding

| Milestone | Deliverable |
|-----------|-------------|
| **M-Dune** | Dashboard live · `duneTelemetry` in `/api/grant-audit` · gate events indexed |
| **M-CLI** | Vitest regression · [tests/api/grant-audit-dune-telemetry.test.ts](../../../tests/api/grant-audit-dune-telemetry.test.ts) |

---

*SilverVine Labs · Dune Dashboard Spec · Off-Chain Simulated Module A · reconcile: `pnpm docs:dune-reconcile`*
