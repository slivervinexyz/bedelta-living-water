# Pendle Yield Shield API Specification

> **Document:** 05 — Pendle Yield Shield APIs  
> **Branch:** `feat/pendle-yield-shield-apis`  
> **Source:** [src/services/api/pendle-shield/](../../../src/services/api/pendle-shield/)  
> **Verification:** `npx vitest run tests/services/api/pendle-shield.test.ts`

---

## Scope

This specification covers **Option 2** (Cross-Venue Shadow Margin Guard) and **Option 3** (Agentic Auto-Roll Safety Gate). **Option 1** is intentionally deferred to preserve product-line expansion capacity.

> **Arbitrum Fixed Yield (42161):** Production Pendle PT paths target **USD.AI** markets — **USDai** deposit input · **sUSDai** redeem output. USDC is **not** accepted on the Arbitrum Fixed Yield deposit path (`WRONG_TOKEN_USDC_FOR_PENDLE`). Registry SSOT: PT-sUSDai / PT-USDai Oct 2026 markets in [pendle-pt-registry.ts](../../../src/adapters/pendle/pendle-pt-registry.ts).

| Option | Status | Module |
|--------|--------|--------|
| **1** | ⏳ Reserved | Future yield-router primitive (not in this branch) |
| **2** | ✅ Live | [shadow-margin-guard.ts](../../../src/services/api/pendle-shield/shadow-margin-guard.ts) |
| **3** | ✅ Live | [agentic-auto-roll-gate.ts](../../../src/services/api/pendle-shield/agentic-auto-roll-gate.ts) |
| **4–XXX** | 📋 Roadmap | Modular expansion primitives (see §Roadmap) |

---

## Option 2 — Cross-Venue Shadow Margin Guard

### Purpose

Bind **Pendle PT collateral health** with **GMX v2** margin exposure and optional **Hyperliquid** hedge stress. Fail-closed before broadcast; powered by `evaluatePendleGmxCrossGuardFromRegistry` and optional `checkSoilResistance()` SSRC soil lane.

### Endpoint

`POST /api/pendle-shield/shadow-margin`

### Request Schema

```json
{
  "marketKeyOrAddress": "PT-eETH",
  "gmxPos": {
    "collateralAmount": 100,
    "collateralTokenPriceUsd": 3500,
    "sizeNotionalUsd": 50000,
    "intent": "open"
  },
  "hlHedge": {
    "perpNotionalUsd": 100000,
    "marginUsedUsd": 10000,
    "unrealizedPnlUsd": -2000,
    "intent": "open"
  },
  "assetUsdPrice": 3500,
  "useOracle": false,
  "soil": {
    "symbol": "ETH",
    "hlSpot": 3500,
    "hlPerp": 3500,
    "dydxPerp": 3500,
    "depthUsd": 200000,
    "disableThresholdJitter": true
  }
}
```

### Response Schema

```json
{
  "ok": true,
  "api": "pendle-shield/shadow-margin",
  "option": 2,
  "result": {
    "passed": true,
    "effectiveScore": 42,
    "shadowMarginUsd": 185420.5,
    "dynamicLtv": 0.27,
    "action": "PASS_GREENLIGHT",
    "hlStressBps": 120,
    "hlHedgeBufferUsd": 500,
    "crossVenueShadowMarginUsd": 185920.5,
    "soilTripped": false,
    "soilReasons": [],
    "registrySymbol": "PT-eETH"
  }
}
```

### Action Codes

| Action | Meaning |
|--------|---------|
| `PASS_GREENLIGHT` | Cross-venue margin within policy |
| `FAIL_CLOSED_BLOCK` | Shadow margin underwater or HL stress breach |
| `EMERGENCY_DELEVERAGE_ALLOWED` | De-leverage intent greenlit under stress |

---

## Option 3 — Agentic Auto-Roll Safety Gate

### Purpose

**0-Gas pre-consensus** gate for AI agents executing automated PT/YT roll actions. Blocks hallucinated yield parameters, invalid market keys, backward rolls, and retry storms via `INTENT_RING_U32` attempt budget.

### Endpoint

`POST /api/pendle-shield/auto-roll`

### Request Schema

```json
{
  "action": "PT_ROLL_FORWARD",
  "agentId": "eliza-agent-001",
  "sourceMarketKeyOrAddress": "PT-eETH",
  "targetMarketKeyOrAddress": "PT-sUSDai-2026-10-15",
  "rollAmountPt": 10.5,
  "agentImpliedYieldBps": 420,
  "oracleImpliedYieldBps": 430
}
```

### Supported Actions

| Action | Description |
|--------|-------------|
| `PT_ROLL_FORWARD` | Roll PT into later maturity market |
| `YT_SELL_AND_ROLL` | Sell YT leg and roll PT forward |
| `PT_MERGE_AND_ROLL` | Merge PT and roll to next epoch |

### Response Schema (pass)

```json
{
  "ok": true,
  "api": "pendle-shield/auto-roll",
  "option": 3,
  "verdict": {
    "passed": true,
    "zeroGasBlocked": false,
    "attempts": 1,
    "channelSevered": false,
    "yieldDriftBps": 10,
    "daysToTargetMaturity": 400
  }
}
```

### Response Schema (fail — HTTP 422)

```json
{
  "ok": false,
  "api": "pendle-shield/auto-roll",
  "option": 3,
  "verdict": {
    "passed": false,
    "zeroGasBlocked": true,
    "code": "YIELD_DRIFT_REJECTED",
    "message": "YIELD_DRIFT_REJECTED",
    "attempts": 2,
    "channelSevered": false,
    "yieldDriftBps": 350,
    "daysToTargetMaturity": 0
  }
}
```

### Reject Codes

| Code | Trigger |
|------|---------|
| `UNKNOWN_SOURCE_MARKET` | Source PT not in Arbitrum registry |
| `UNKNOWN_TARGET_MARKET` | Target PT not in registry |
| `ROLL_BACKWARD_REJECTED` | Target maturity ≤ source maturity |
| `YIELD_DRIFT_REJECTED` | Agent vs oracle yield drift > 200 bps |
| `EXPIRY_FAIL_CLOSED` | Target near expiry + elevated jitter |
| `HALLUCINATED_AMOUNT` | Non-positive `rollAmountPt` |
| `MAX_ATTEMPTS_EXCEEDED_SEVERED` | Intent ring retry storm severance |

---

## Wasm & Soil Integration

| Layer | Binding |
|-------|---------|
| **Shadow margin** | `checkSoilResistance({ pendleCrossGuard })` · [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) slippage lane |
| **Auto-roll** | `INTENT_RING_U32` · `trackAttemptBudgetU32Pure` · `evaluatePendlePtExpiryRisk` |
| **Registry SSOT** | [src/adapters/pendle/pendle-pt-registry.ts](../../../src/adapters/pendle/pendle-pt-registry.ts) |

---

## Roadmap — Options 4 to XXX (Modular Expansion)

Future Pendle Yield Shield primitives are designed as **independent API modules** under [src/services/api/pendle-shield/](../../../src/services/api/pendle-shield):

| Option | Planned primitive | Integration surface |
|--------|-------------------|---------------------|
| **4** | PT liquidity exit simulator | `checkSoilResistance` depth lane |
| **5** | YT convexity stress meter | Wasm six-lane risk vector |
| **6** | Cross-chain PT bridge escrow guard | Robinhood Chain ingress adapter |
| **7** | Agent pool-factory mandate gate | `validateAIPoolSelection()` |
| **8+** | TEE oracle attestation binding | ERC-8196 policy guard |
| **XXX** | Plugin slot — `pendle-shield/extensions/` | Apache-2.0 middleware hooks |

Each future option ships as: `{name}.ts` + Vitest probe + row in this document + `POST /api/pendle-shield/{name}` route.

---

## Related Documents

| # | Document |
|---|----------|
| — | [README.md](../README.md) |
| 01 | [01_SDK_INTEGRATION_BLUEPRINT.md](../01_guides/01_SDK_INTEGRATION_BLUEPRINT.md) |
| 03 | [03_ARCHITECTURE_AND_MOAT.md](./03_ARCHITECTURE_AND_MOAT.md) |
| — | [../../01_architecture_and_standards/01_core_specs/02_DEFENSE_MATRIX_AND_SSRC_CORE.md](../../01_architecture_and_standards/01_core_specs/02_DEFENSE_MATRIX_AND_SSRC_CORE.md) |

---

*SilverVine Labs · Pendle Yield Shield API SSOT · 2026-09-10*
