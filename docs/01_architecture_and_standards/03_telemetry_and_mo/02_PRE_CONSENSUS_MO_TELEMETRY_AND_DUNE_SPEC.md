# Pre-Consensus MO Telemetry & Dune Specification

> **Category:** **Pre-Consensus Threat Telemetry** · **Hacker Modus Operandi (MO) Profiling**  
> **Product:** **SliverVine ExoMesh** (Module A) · **SliverVine Sanctuary** (Module B)  
> **Indexer target:** [SliverVine Protocol Master Dashboard (Dune)](https://dune.com/silvervinelabs/slivervine-protocol)  
> **Module A (ExoMesh):** off-chain pre-consensus 0-Gas firewall telemetry — **Modeled Simulation Telemetry** (577-row chaos replay · NOT Mainnet live PnL).  
> **Module B (Sanctuary):** ERC-7540+ async escort & on-chain Sepolia Gate anchors.  
> **Related:** [06_HACKER_PROFILING_AND_TOXICOLOGY.md](./01_HACKER_PROFILING_AND_TOXICOLOGY.md) · [./03_DUNE_DASHBOARD_SPECIFICATION.md](./03_DUNE_DASHBOARD_SPECIFICATION.md) · **Vitest:** **254 test files | 1206 PASS clean (100%)**

---

## 1. Category Definition — Pre-Consensus Threat Telemetry

### 1.1 Post-Mortem vs Pre-Crime — The Analytics Paradigm Shift

| Dimension | **Traditional blockchain analytics** (Autopsy Data) | **SliverVine Pre-Consensus Telemetry** (Pre-Crime Intelligence) |
|-----------|--------------------------------------------------------------|------------------------------------------------------------------------|
| **Observation point** | After tx inclusion · revert · exploit settlement | **Before** `baseProvider.request()` · **before** Sequencer queue |
| **Data type** | Mempool traces · internal tx · loss accounting | **0-Gas rejection events** · MO signature codes · severed calldata fingerprints |
| **Latency** | Minutes → days (indexer lag + forensics) | **p50 ~15µs** reflex severance · **p50 ~106µs** E2E ExoMesh Edge gate |
| **Gas economics** | Damage already priced in (revert gas · stolen funds) | **`gas_saved_wei`** — counterfactual cost **avoided** by severance |
| **Agent context** | Wallet address post-factum | **`agent_id`** hash · attempt ring slot · batch unfold depth |
| **Industry analog** | CERT incident reports · Chainalysis post-hack | **CVE-style MO registry** · Agent Resilience Benchmark |

```text
TRADITIONAL (Autopsy)                    SLIVERVINE (Pre-Crime)
─────────────────────                    ───────────────────────
[ Tx broadcast ]                         [ EIP-1193 request() ]
       │                                          │
       ▼                                          ▼
[ Mempool / Sequencer ]                  [ ExoMesh evaluateRetailRisk() ]
       │                                          │
       ▼                                    ┌─────┴─────┐
[ Revert / Exploit ]                       │           │
       │                              FAIL_CLOSED    ALLOW
       ▼                                   │           │
[ Dune: decode logs ]                      ▼           ▼
       │                            slivervine_    baseProvider
       ▼                            telemetry_      .request()
Autopsy Data                        events (0-Gas)   (rare)
```

**Thesis:** Web3 security indexers have historically measured **damage**. SliverVine ExoMesh measures **prevented damage** — forming a **Pre-Crime Threat Intelligence Index (PCTII)**: a time-series of toxic intents **intercepted** at the EIP-1193 boundary, classified by **MO signature**, and reconciled against on-chain `RiskTripBlocked` / off-chain `GET /api/grant-audit` snapshots.

### 1.2 What ExoMesh Captures (and What Never Reaches Chain)

Every guarded `request()` on `withRetailGuardProvider()` produces one of:

| Outcome | Telemetry class | On-chain footprint |
|---------|-----------------|-------------------|
| **FAIL_CLOSED** | `slivervine_telemetry_events` row · optional `RiskTripBlocked` emit | **None** (0-Gas default) · optional Sepolia Gate mirror |
| **ALLOW** | `IntentAttested` path (settlement plane) | EIP-712 attestation · UserOp broadcast |

Toxic calldata — approve drains · batch-masked `wallet_sendCalls` · ERC-7540 `setOperator` hijacks · soil trips — is parsed at **u32 selector** resolution in [calldata-parser.ts](../../../src/sdk/exomesh-agentic-wallet-guard/calldata-parser.ts) **before** any RPC forward. This is the **crime scene** for MO profiling ([06_HACKER_PROFILING_AND_TOXICOLOGY.md](./01_HACKER_PROFILING_AND_TOXICOLOGY.md)).

### 1.3 Relationship to Existing PEV (Prevented Exploit Volume)

| Layer | Schema | Role |
|-------|--------|------|
| **On-chain PEV** | `RiskTripBlocked` · `blocked_intent_notional_usd` | Settlement-plane mirror · Dune Query 1 ([DUNE_DASHBOARD_SPECIFICATION.md](./03_DUNE_DASHBOARD_SPECIFICATION.md)) |
| **Off-chain PCTII** | `slivervine_telemetry_events` (this spec) | **Granular MO taxonomy** · sub-ms Edge rejects · agent-level profiling |
| **Grant-audit KV** | `silvervine.grant-audit.dune-telemetry.v1` | Shadow-margin reconciliation · `responseRef` sha256 anchor |

PCTII is the **numerator factory** for PEV: each `mo_signature_code` row carries `notional_usd_at_risk` and `gas_saved_wei` that rollup into `SUM(blocked_intent_notional_usd)`.

---

## 2. Event-Bus & Ingest Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Edge Worker / SDK — withRetailGuardProvider()                             │
│   evaluateRetailRisk() → RetailGuardRejectedError | ALLOW                 │
└───────────────────────────────┬─────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Telemetry Emitter (event-bus)                                           │
│   recordPreConsensusMoEvent()  ← NEW (spec v1)                          │
│   recordTelemetrySoilTrip()    ← existing counter                       │
└───────────────────────────────┬─────────────────────────────────────────┘
                                ▼
┌──────────────────────┐   ┌──────────────────────┐   ┌─────────────────┐
│ KV / Analytics Bus   │   │ GET /api/grant-audit │   │ Sepolia Gate    │
│ slivervine_telemetry │   │ duneTelemetry block  │   │ RiskTripBlocked │
│ _events batch        │   │ responseRef sha256   │   │ (optional emit) │
└──────────┬───────────┘   └──────────┬───────────┘   └────────┬────────┘
           │                          │                        │
           └──────────────────────────┼────────────────────────┘
                                      ▼
                         Dune Indexer / Spell (`dune.silvervinelabs.*`)
                                      ▼
                         PCTII Dashboard · MO heatmaps · PEV rollup
```

**Existing anchors today:**

| Component | SSOT | Status |
|-----------|------|--------|
| Soil trip counter | [telemetry-analytics-core.ts](../../../src/services/telemetry-analytics-lib/telemetry-analytics-core.ts) | ✅ Live (in-process) |
| Grant-audit Dune block | [grant-audit-dune-telemetry.ts](../../../src/routes/grant-audit-lib/grant-audit-dune-telemetry.ts) | ✅ Live (`GET /api/grant-audit`) |
| Demo MO → Dune reason map | [eip1193-extension-helpers.ts](../../../examples/lib/eip1193-extension-helpers.ts) `mapDuneTelemetryReason()` | ✅ Demo harness |
| Sepolia event emitter | [scripts/emit-sepolia-telemetry-events.ts](../../../scripts/emit-sepolia-telemetry-events.ts) | ✅ Q1 probe |
| **`slivervine_telemetry_events`** | This document | 📋 **Spec v1** (schema SSOT) |

---

## 3. Dune Table Schema — `slivervine_telemetry_events`

### 3.1 Table Definition

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `event_id` | `STRING` | ✅ | `sha256:` hex — deterministic id (see §3.3) |
| `schema_version` | `STRING` | ✅ | `"silvervine.telemetry.events.v1"` |
| `timestamp` | `TIMESTAMP` | ✅ | ISO-8601 UTC · Edge monotonic clock (`MonotonicTimeSSOT`) |
| `block_epoch` | `BIGINT` | ✅ | Unix seconds — deterministic replay anchor |
| `chain_id` | `INTEGER` | ✅ | `42161` · `421614` · `0` (off-chain-only Edge) |
| `agent_id` | `STRING` | ✅ | `sha256:` hex of normalized wallet / agent provider identity |
| `mo_signature_code` | `STRING` | ✅ | Fail-closed reason code (§4.1) |
| `vector_type` | `STRING` | ✅ | MO taxonomy bucket (§4.2) |
| `mindhunter_signature` | `STRING` | ○ | `SIG_A_BURST` · `SIG_B_BATCH` · `SIG_C_DRIFT` · `SIG_HONEYPOT` · `SIG_SOIL` |
| `eip1193_method` | `STRING` | ○ | `eth_sendTransaction` · `eth_signTypedData_v4` · `wallet_sendCalls` |
| `selector_u32` | `STRING` | ○ | `0x` + 8 hex — calldata fingerprint when present |
| `venue_bit` | `INTEGER` | ○ | Resolved venue bitmask at intercept |
| `intent_ring_attempts` | `INTEGER` | ○ | `INTENT_RING_U32` attempt count at severance |
| `eval_latency_us` | `DOUBLE` | ○ | Wall-clock eval (ERC-7683 guard pattern) |
| `wasm_latency_us` | `DOUBLE` | ○ | `soil_core` warm path when Wasm invoked |
| `notional_usd_at_risk` | `DOUBLE` | ○ | Estimated USD exposure prevented (PEV input) |
| `gas_saved_wei` | `BIGINT` | ✅ | Counterfactual gas **not spent** (§3.2) |
| `gas_price_wei` | `BIGINT` | ○ | Base fee snapshot used in `gas_saved_wei` calc |
| `estimated_gas_units` | `INTEGER` | ○ | Model gas limit for tx class (§3.2) |
| `gate_action_code` | `INTEGER` | ✅ | `0` PASS · `1` FAIL_CLOSED · `2` EMERGENCY (mirrors [gate-telemetry-types.ts](../../../src/core/gate-telemetry-types.ts)) |
| `plain_text_warning` | `STRING` | ○ | Retail user alert (no secrets) |
| `response_ref` | `STRING` | ○ | Parent grant-audit / batch sha256 for reconciliation |

### 3.2 `gas_saved_wei` — Calculation SSOT

Pre-consensus severance means **`baseProvider.request()` is never invoked** — the wallet never signs a doomed broadcast. `gas_saved_wei` is the **counterfactual on-chain cost avoided**, not a refund.

**Formula (default model):**

$$
\text{gas\_saved\_wei} = \text{gas\_price\_wei} \times \text{estimated\_gas\_units}
$$

| Tx class | `estimated_gas_units` default | Notes |
|----------|------------------------------|-------|
| ERC-20 `approve` | `65_000` | Standard approve broadcast |
| DEX `swap` (router) | `350_000` | Uniswap/GMX-class swap |
| ERC-7540 `requestDeposit` | `180_000` | Async vault request |
| EIP-5792 `wallet_sendCalls` batch | `Σ gas(call_i)` | Sum per unfolded call |
| `eth_signTypedData_v4` permit | `0` | Off-chain sign only — **gas_saved = 0** (no broadcast) |

**`gas_price_wei` source priority:**

1. Live Arbitrum base fee from [arbitrum-gas-guard.ts](../../../src/services/risk/arbitrum-gas-guard.ts) snapshot at intercept
2. Fallback: `2_000_000_000` wei (2 gwei) — conservative Arbitrum One estimate

**Invariant:**

$$
\text{FAIL\_CLOSED} \implies \text{actual\_tx\_gas\_wei} = 0 \quad \land \quad \text{gas\_saved\_wei} \geq 0
$$

**PEV linkage:**

$$
\text{notional\_usd\_at\_risk} \approx \text{token\_amount} \times \text{spot\_usd} \quad \Rightarrow \quad \text{PEV} = \sum \text{notional\_usd\_at\_risk} \; \text{where} \; \text{gate\_action\_code} = 1
$$

### 3.3 Deterministic `event_id` & `agent_id`

```typescript
// Spec — mirrors deriveTripEvtHash() in eip1193-extension-helpers.ts
event_id   = sha256(`${schema_version}:${agent_id}:${mo_signature_code}:${block_epoch}:${selector_u32 ?? "0x0"}`)
agent_id   = sha256(`retail:${walletAddress.trim().toLowerCase()}`)
             // parity: hashRetailWalletSlotIndex() uses same normalized wallet
```

**Privacy rule:** Raw wallet addresses are **never** written to Dune. Only `agent_id` hashes and optional truncated `0x` prefix (`0xabcd…`) in human dashboards.

### 3.4 JSON Payload (Event-Bus Wire Format)

Emitted by Edge Worker / SDK telemetry hook on every `RetailGuardRejectedError`:

```json
{
  "schema_version": "silvervine.telemetry.events.v1",
  "timestamp": "2026-09-12T04:39:00.000Z",
  "block_epoch": 1757654340,
  "chain_id": 42161,
  "agent_id": "sha256:a1b2c3…",
  "mo_signature_code": "ERC7540_OPERATOR_REJECTED",
  "vector_type": "OPERATOR_HIJACK",
  "mindhunter_signature": "SIG_C_DRIFT",
  "eip1193_method": "eth_sendTransaction",
  "selector_u32": "0x9cc233d6",
  "venue_bit": 4,
  "intent_ring_attempts": 1,
  "eval_latency_us": 42.5,
  "wasm_latency_us": 1.2,
  "notional_usd_at_risk": 12500.0,
  "gas_saved_wei": "630000000000000",
  "gas_price_wei": "2000000000",
  "estimated_gas_units": 180000,
  "gate_action_code": 1,
  "plain_text_warning": "ALERT: ERC-7540 async vault operator 0xbbbb… is not whitelisted — setOperator blocked (0-Gas).",
  "response_ref": "sha256:…"
}
```

---

## 4. MO Signature Taxonomy

### 4.1 `mo_signature_code` — Complete Registry

Sourced from [RetailGuardReasonCode](../../../src/sdk/exomesh-agentic-wallet-guard/types.ts) · soil trip reasons · ERC-7683 · honeypot gates.

| `mo_signature_code` | `vector_type` | `mindhunter_signature` | Intercept SSOT |
|---------------------|---------------|------------------------|----------------|
| `MAX_ATTEMPTS_EXCEEDED_SEVERED` | `BURST_RETRY` | `SIG_A_BURST` | [intent-core-ring.ts](../../../src/core/intent-core-ring.ts) |
| `CHANNEL_SEVERED` | `BURST_RETRY` | `SIG_A_BURST` | [guard-engine.ts](../../../src/sdk/exomesh-agentic-wallet-guard/guard-engine.ts) |
| `SEND_CALLS_BATCH_REJECTED` | `BATCH_MASKING` | `SIG_B_BATCH` | [eip5792-send-calls.ts](../../../src/sdk/exomesh-agentic-wallet-guard/eip5792-send-calls.ts) |
| `UNAUTHORIZED_SPENDER_REJECTED` | `APPROVE_ABUSE` | `SIG_SOIL` | [guard-engine.ts](../../../src/sdk/exomesh-agentic-wallet-guard/guard-engine.ts) · calldata-parser |
| `VENUE_DRIFT_REJECTED` | `VENUE_DRIFT` | `SIG_SOIL` | [intent-mandate.ts](../../../src/core/intent-mandate.ts) |
| `SLIPPAGE_EXCEEDED` | `SLIPPAGE_DRIFT` | `SIG_SOIL` | [soil-resistance-math.ts](../../../src/core/soil-resistance-math.ts) |
| `DEPTH_INSUFFICIENT` | `SLIPPAGE_DRIFT` | `SIG_SOIL` | [wasm-adapter.ts](../../../src/sdk/exomesh-agentic-wallet-guard/wasm-adapter.ts) |
| `ERC7540_OPERATOR_REJECTED` | `OPERATOR_HIJACK` | `SIG_C_DRIFT` | [erc7540-async-escort.ts](../../../src/sdk/exomesh-agentic-wallet-guard/erc7540-async-escort.ts) |
| `ERC7540_ASYNC_SLIPPAGE_DRIFT` | `SLIPPAGE_DRIFT` | `SIG_C_DRIFT` | `evalAsyncVaultDriftBps()` |
| `RPC_TRANSPORT_SYNC_FAILED` | `TRANSPORT_ANOMALY` | `SIG_HONEYPOT` | [transport-stream.ts](../../../src/sdk/exomesh-agentic-wallet-guard/transport-stream.ts) |
| `SOLVER_MEV_SUSPECT` | `SLIPPAGE_DRIFT` | `SIG_B_BATCH` | [erc7683-intent-guard.ts](../../../src/sdk/exomesh-agentic-wallet-guard/erc7683-intent-guard.ts) |
| `SLIPPAGE_OVERSHOOT` | `SLIPPAGE_DRIFT` | `SIG_B_BATCH` | [erc7683-intent-guard.ts](../../../src/sdk/exomesh-agentic-wallet-guard/erc7683-intent-guard.ts) |
| `PENDLE_ORACLE_STALE` | `STALE_ORACLE` | `SIG_SOIL` | [pendle-pool-factory-adapter.ts](../../../src/adapters/pendle/pendle-pool-factory-adapter.ts) |
| `USD_AI_DEPEG_ORACLE_TRIP` | `STALE_ORACLE` | `SIG_SOIL` | [usdai-adapter.ts](../../../src/adapters/usdai/usdai-adapter.ts) |
| `HONEYPOT_ACTIVE` | `HONEYPOT_PROBE` | `SIG_HONEYPOT` | [rpc-fetch-gate-eval.ts](../../../src/services/defense/rpc-fetch-gate-lib/rpc-fetch-gate-eval.ts) |
| `SOIL_RESISTANCE_TRIP` | `SLIPPAGE_DRIFT` | `SIG_SOIL` | `checkSoilResistance()` |

### 4.2 `vector_type` — Dune Facet Dimensions

| `vector_type` | Definition | Primary threat actor |
|---------------|------------|---------------------|
| `BATCH_MASKING` | Toxic intent concealed in EIP-5792 `calls[]` | Agent framework · smart-wallet batch APIs |
| `SLIPPAGE_DRIFT` | Cross-venue · async vault · solver MEV overshoot | MEV searchers · async vault arbitrageurs |
| `OPERATOR_HIJACK` | ERC-7540 `setOperator` / `controller` delegation | Vault grooming attacks |
| `STALE_ORACLE` | Oracle lag · peg drift · timestamp regression | Oracle manipulation · RWA decoupling |
| `BURST_RETRY` | Rapid-fire retry storms | Prompt-injected AI agents |
| `APPROVE_ABUSE` | Infinite / toxic ERC-20 · Permit2 approvals | Phishing · drainer contracts |
| `VENUE_DRIFT` | Unauthorized contract / venue hop | Cross-venue phishing |
| `HONEYPOT_PROBE` | Unauthenticated RPC / scraper / trap host hits | Forked frontends · copycat dashboards |
| `TRANSPORT_ANOMALY` | RPC transport bitmark / sync lag tamper | Infrastructure attackers |

### 4.3 Mindhunter Signature → Chaos Level Map

| Mindhunter sig | Chaos tier | Dune panel suggestion |
|----------------|------------|----------------------|
| `SIG_A_BURST` | C2 | `mo_heatmap` — attempts vs severance rate |
| `SIG_B_BATCH` | C2 | `batch_masking_ratio` — `wallet_sendCalls` / total rejects |
| `SIG_C_DRIFT` | C3 | `operator_hijack_blocks` — Sanctuary ERC-7540 |
| `SIG_HONEYPOT` | C1 | `honeypot_probe_count` — trap host hits |
| `SIG_SOIL` | C3 | `soil_trip_by_venue` — GMX · Pendle · USD.ai lanes |

---

## 5. Dune SQL — PCTII Query Pack

### 5.1 Pre-Crime Threat Intelligence Index (Daily)

```sql
-- PCTII — Pre-Consensus Threat Intelligence Index (daily rollup)
-- Source table: dune.silvervinelabs.slivervine_telemetry_events (spell ingest)
SELECT
  date_trunc('day', timestamp) AS day,
  COUNT(*) AS pre_consensus_rejects,
  COUNT(DISTINCT agent_id) AS unique_agents_profiled,
  SUM(CAST(gas_saved_wei AS DECIMAL(38,0))) AS total_gas_saved_wei,
  SUM(notional_usd_at_risk) AS prevented_notional_usd,
  approx_percentile(eval_latency_us, 0.5) AS p50_eval_latency_us
FROM dune.silvervinelabs.slivervine_telemetry_events
WHERE gate_action_code = 1  -- FAIL_CLOSED
GROUP BY 1
ORDER BY 1 DESC;
```

### 5.2 MO Signature Heatmap

```sql
SELECT
  mo_signature_code,
  vector_type,
  mindhunter_signature,
  COUNT(*) AS event_count,
  SUM(notional_usd_at_risk) AS usd_at_risk,
  SUM(CAST(gas_saved_wei AS DECIMAL(38,0))) AS gas_saved_wei
FROM dune.silvervinelabs.slivervine_telemetry_events
WHERE timestamp >= now() - interval '7' day
GROUP BY 1, 2, 3
ORDER BY event_count DESC;
```

### 5.3 PCTII → PEV Reconciliation

```sql
-- Reconcile off-chain PCTII with on-chain RiskTripBlocked PEV
WITH off_chain AS (
  SELECT
    date_trunc('day', timestamp) AS day,
    SUM(notional_usd_at_risk) AS pctii_usd
  FROM dune.silvervinelabs.slivervine_telemetry_events
  WHERE gate_action_code = 1
  GROUP BY 1
),
on_chain AS (
  SELECT
    date_trunc('day', block_time) AS day,
    SUM(blocked_intent_notional_usd) AS pev_usd
  FROM dune.silvervinelabs.result_sanctuary_risk_trips
  WHERE evt_name = 'RiskTripBlocked'
  GROUP BY 1
)
SELECT
  COALESCE(o.day, c.day) AS day,
  o.pctii_usd,
  c.pev_usd,
  ABS(COALESCE(o.pctii_usd, 0) - COALESCE(c.pev_usd, 0)) AS reconciliation_delta_usd
FROM off_chain o
FULL OUTER JOIN on_chain c ON o.day = c.day
ORDER BY 1 DESC;
```

---

## 6. Industry Impact — CVE-Style Intelligence & Agent Resilience

### 6.1 CVE-Style Toxic Intent Profiling for AI Agents

Traditional CVEs describe **vulnerable software versions**. SliverVine introduces **MO-CVE** (Modus Operandi CVE) — a standardized identifier for **toxic intent patterns** observed at the pre-consensus boundary:

| MO-CVE ID | Pattern | `mo_signature_code` | Mitigation |
|-----------|---------|---------------------|------------|
| **MO-CVE-2026-0001** | EIP-5792 batch concealment | `SEND_CALLS_BATCH_REJECTED` | [eip5792-send-calls.ts](../../../src/sdk/exomesh-agentic-wallet-guard/eip5792-send-calls.ts) unfold |
| **MO-CVE-2026-0002** | Agent retry storm (4th-strike) | `MAX_ATTEMPTS_EXCEEDED_SEVERED` | `INTENT_RING_U32` severance |
| **MO-CVE-2026-0003** | ERC-7540 operator hijack | `ERC7540_OPERATOR_REJECTED` | Sanctuary whitelist lock |
| **MO-CVE-2026-0004** | Async vault rate drift | `ERC7540_ASYNC_SLIPPAGE_DRIFT` | `evalAsyncVaultDriftBps()` |
| **MO-CVE-2026-0005** | Cross-chain solver MEV | `SOLVER_MEV_SUSPECT` | [erc7683-intent-guard.ts](../../../src/sdk/exomesh-agentic-wallet-guard/erc7683-intent-guard.ts) |
| **MO-CVE-2026-0006** | Honeypot scraper probe | `HONEYPOT_ACTIVE` | 99% synthetic slippage decoy |

**Publication surface:** Dune public dashboard · `GET /api/grant-audit` MO counters · future `GET /api/telemetry/mo-registry` (roadmap).

### 6.2 Agent Resilience Benchmark (ARB) — Arbitrum Foundation for Agent Safety

SliverVine proposes **ARB** as a cross-framework safety score derived from PCTII telemetry:

$$
\text{ARB\_score} = 100 \times \left(1 - \frac{\text{toxic\_attempts}}{\text{total\_guarded\_requests}}\right) \times \left(1 - \frac{\text{p50\_eval\_latency\_us}}{10{,}000}\right)
$$

| ARB tier | Score | Meaning |
|----------|-------|---------|
| **ARB-A** | ≥ 95 | Agent framework with ExoMesh guard · <5% toxic attempt rate |
| **ARB-B** | 80–94 | Partial guard coverage · measurable MO signatures |
| **ARB-C** | < 80 | High toxic attempt rate · no pre-consensus intercept |

**Benchmark dimensions (Dune panels):**

1. **Toxic attempt rate** — `COUNT(FAIL_CLOSED) / COUNT(all events)`
2. **MO diversity** — `COUNT(DISTINCT mo_signature_code)` per `agent_id`
3. **Gas saved efficiency** — `SUM(gas_saved_wei) / COUNT(FAIL_CLOSED)`
4. **Severance latency** — `p50(eval_latency_us)` · `p50(wasm_latency_us)`
5. **Batch masking exposure** — `vector_type = 'BATCH_MASKING'` share

**Arbitrum alignment:** ARB scores computed per `chain_id = 42161` provide a **native L2 agent safety leaderboard** — complementing existing sequencer health metrics with **pre-Sequencer intent hygiene**.

### 6.3 Competitive Positioning vs Industry Analytics

| Vendor class | Data plane | SliverVine PCTII advantage |
|--------------|------------|---------------------------|
| **Block explorers** | Post-inclusion tx | 0-Gas rejects invisible |
| **MEV dashboards** | Mempool / builder | Pre-mempool intercept |
| **Gauntlet / Chaos Labs** | Parameter governance | **μs-latency** reflex · per-intent MO |
| **Wallet drainer DBs** | Known scam addresses | **Behavioral** MO — novel calldata shapes |
| **AI agent frameworks** | No standard safety metric | **ARB score** from PCTII |

---

## 7. Verification & Honest Boundaries

### 7.1 What Is Live Today

| Capability | Status |
|------------|--------|
| Pre-consensus 0-Gas severance | ✅ [retail-guard-provider.test.ts](../../../tests/sdk/retail-guard-provider.test.ts) **35/35** |
| Soil trip counter | ✅ [telemetry-analytics-core.ts](../../../src/services/telemetry-analytics-lib/telemetry-analytics-core.ts) |
| Grant-audit Dune reconciliation | ✅ [grant-audit-dune-telemetry.test.ts](../../../tests/api/grant-audit-dune-telemetry.test.ts) |
| Sepolia `RiskTripBlocked` emitter | ✅ [scripts/emit-sepolia-telemetry-events.ts](../../../scripts/emit-sepolia-telemetry-events.ts) |
| Dune dashboard (Sepolia PEV) | ✅ [SliverVine Protocol Master Dashboard (Dune)](https://dune.com/silvervinelabs/slivervine-protocol) |
| **`slivervine_telemetry_events` spell ingest** | 📋 Spec v1 — schema defined; spell deployment roadmap |
| Arbitrum One `42161` business-event ingest | ⏳ Pre-compiled SQL · awaits indexer activation |

### 7.2 Disclosure Rules (Evaluator / Allocator)

1. **`gas_saved_wei`** is **counterfactual** — not on-chain refunds. Label dashboards **"Prevented Gas (Model)"**.
2. **`notional_usd_at_risk`** feeds PEV — use same reconciliation discipline as [DUNE_DASHBOARD_SPECIFICATION.md](./03_DUNE_DASHBOARD_SPECIFICATION.md).
3. **Simulated benchmark** ([telemetry-analytics-core.ts](../../../src/services/telemetry-analytics-lib/telemetry-analytics-core.ts) `isSimulatedBenchmark: true`) is **not** live mainnet P&L — separate from PCTII.
4. **No wallet PII** in Dune — `agent_id` hashes only.

### 7.3 Verification Commands

```bash
# MO Signature A/B — retail guard + EIP-5792 batch
npx vitest run tests/sdk/retail-guard-provider.test.ts
npx vitest run tests/sdk/eip5792-send-calls.test.ts

# MO Signature C — ERC-7540 operator hijack [Sanctuary]
pnpm demo:sanctuary

# Honeypot C1 — trap host decoy
npx vitest run tests/defense/rpc-whitelist.test.ts

# Grant-audit Dune reconciliation
npx vitest run tests/api/grant-audit-dune-telemetry.test.ts

# Demo MO telemetry emit
pnpm demo:exomesh -- --json

# Sepolia on-chain mirror (optional)
pnpm tsx scripts/emit-sepolia-telemetry-events.ts
```

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [06_HACKER_PROFILING_AND_TOXICOLOGY.md](./01_HACKER_PROFILING_AND_TOXICOLOGY.md) | Mindhunter MO · Cyber-Biological Immunology framework |
| [./03_DUNE_DASHBOARD_SPECIFICATION.md](./03_DUNE_DASHBOARD_SPECIFICATION.md) | PEV · Query 0–3 · Sepolia ingest |
| [01_EIP_COMPLIANCE_AND_COMPETITIVE_MATRIX.md](../02_eip_standards/01_EIP_COMPLIANCE_AND_COMPETITIVE_MATRIX.md) | ExoMesh competitive matrix |
| [../02_eip_standards/02_ERC7540_ASYNC_ESCORT_IMPLEMENTATION.md](../02_eip_standards/02_ERC7540_ASYNC_ESCORT_IMPLEMENTATION.md) | Sanctuary async vault MO |
| [03_RISK_MITIGATION_AND_DISCLAIMER_FRAMEWORK.md](../01_core_specs/04_RISK_MITIGATION_AND_DISCLAIMER_FRAMEWORK.md) | modeled risk spectrum (§0.1) · PEV disclaimers |

---

**Category one-liner:** **Pre-Consensus Threat Telemetry** turns 0-Gas rejections into structured MO intelligence — a Pre-Crime index indexed on Dune, benchmarked by ARB.
