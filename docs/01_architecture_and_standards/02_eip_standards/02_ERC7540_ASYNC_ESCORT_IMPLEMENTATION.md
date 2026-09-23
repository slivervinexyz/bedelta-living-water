# Sanctuary Async Escort (ERC-7540+) — Technical Specification

> **Product:** **SliverVine Sanctuary** (Module B) — **Sanctuary Async Escort (ERC-7540+)** · Treasury escort · async vault selector guard · Robinhood / Across compliance ingress  
> **Complement:** **SliverVine ExoMesh** (Module A) — **ExoMesh Agentic Guard (EIP-1193/5792/6963+)** pre-consensus Wasm reflex  
> **Standards compliance (Tier 1 `[Final]`):** SliverVine Protocol is **100% compliant** with standard [ERC-7540](https://eips.ethereum.org/EIPS/eip-7540) and [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) / [EIP-5792](https://eips.ethereum.org/EIPS/eip-5792) specs, while extending them into **0-Gas pre-consensus security supersets** (ExoMesh & Sanctuary). See [3-Tier Taxonomy](./01_EIP_COMPLIANCE_AND_COMPETITIVE_MATRIX.md).
> **Standard:** [ERC-7540](https://eips.ethereum.org/EIPS/eip-7540) — Asynchronous Tokenized Vault Standard (extends [ERC-4626](https://eips.ethereum.org/EIPS/eip-4626))  
> **Verification:** `pnpm demo:sanctuary` → Scenario A–C Matrix `[Sanctuary]` (`demo:escort` alias) · CLI: [examples/sanctuary-demo.ts](../../../examples/sanctuary-demo.ts)

---

## Executive Summary

**SliverVine Sanctuary** ships **Sanctuary Async Escort (ERC-7540+)** — a **selector-level ERC-7540 Async Vault Escort Extension**, not a full vault implementation, but a **pre-broadcast fail-closed policy layer** that intercepts `eth_sendTransaction` calldata **before** Arbitrum Sequencer ingress.

Standard DeFi safety tooling (synchronous ERC-4626 share math, instant-redeem slippage oracles, post-tx analytics) **cannot see** the **Pending → Claimable** delay window where operator delegation and exchange-rate drift create a **zero-trust attack surface**. Sanctuary closes that window with:

1. **Operator whitelist lock** on `setOperator` (`0x9cc233d6`) and `controller` on `requestDeposit` / `requestRedeem`
2. **Vectorized async drift gate** via `evalAsyncVaultDriftBps` — BigInt-safe bps math on `|request − claimable|`
3. **0-Gas rejection** — `RetailGuardRejectedError` thrown locally; `baseProvider.request()` never invoked on trip

```text
[ Agent / Wallet Intent: requestDeposit · requestRedeem · setOperator ]
        │
        ▼  ← Sanctuary intercept (pre-Sequencer · 0-Gas on reject)
┌────────────────────────────────────────────────────────────────────┐
│ calldata-parser (u32 selector) → erc7540-async-escort.ts            │
│   · OPERATOR_REJECTED        — non-whitelisted operator/controller  │
│   · ASYNC_SLIPPAGE_DRIFT     — Pending→Claimable bps > maxBps      │
└───────────────────────────────┬────────────────────────────────────┘
                                ▼  (PASS only)
              [ Vault contract · async settlement · claim phase ]
```

**SSOT:** [src/sdk/exomesh-agentic-wallet-guard/erc7540-async-escort.ts](../../../src/sdk/exomesh-agentic-wallet-guard/erc7540-async-escort.ts)  
**Ingress:** `evaluateErc7540FromParsedCalldata()` via `evaluateRetailRisk()` in ExoMesh EIP-1193 middleware  
**Wiki:** [01_EIP_COMPLIANCE_AND_COMPETITIVE_MATRIX.md](./01_EIP_COMPLIANCE_AND_COMPETITIVE_MATRIX.md)

---

## 1. ERC-4626 (Synchronous) vs ERC-7540 (Asynchronous) — Why Standard Safety Tools Fail

| Dimension | **ERC-4626 (synchronous)** | **ERC-7540 (asynchronous)** | **Standard DeFi tool gap** |
|-----------|------------------------------|-------------------------------|----------------------------|
| **Deposit / redeem flow** | `deposit()` / `redeem()` — shares minted or assets returned **in same tx** | `requestDeposit()` / `requestRedeem()` → **Pending** state → later **Claimable** → `deposit()` / `redeem()` claim | Slippage oracles bound to **instant** `previewDeposit` / `previewRedeem` — blind to **inter-tx drift** |
| **Rate snapshot** | Exchange rate fixed at call time | Request rate at **request time**; claim rate at **claim time** — **two timestamps** | MEV / NAV / yield shocks between request and claim are **invisible** to sync guards |
| **Operator model** | N/A (single-step ERC-4626) | `setOperator(address,bool)` delegates **controller** rights on pending requests | No ERC-4626 equivalent — wallet approve-guards miss `0x9cc233d6` entirely |
| **Safety window** | Sub-block (same inclusion) | **Minutes to days** (keeper / epoch settlement) | Post-mortem dashboards detect loss **after** claim — **no pre-broadcast abort** |
| **Gas on bad intent** | Revert burns gas at execution | Malicious `setOperator` or drifted request still costs gas if broadcast | Wallets forward tx blindly; bundlers queue before policy runs |

### The Pending → Claimable Death Window

```text
ERC-4626 (sync)                    ERC-7540 (async)
─────────────                      ───────────────────────────────────
  deposit()                            requestDeposit(assets, controller, owner)
      │                                        │
      ▼                                        ▼
  shares minted                          [ PENDING ]
  (same block)                               │
                                             │  ← ATTACK WINDOW
                                             │     · operator hijack
                                             │     · NAV / yield drift
                                             │     · solver / keeper delay
                                             ▼
                                       [ CLAIMABLE ]
                                             │
                                             ▼
                                       deposit(assets, receiver)  // claim
```

**Industry default:** Portfolio trackers, ERC-4626 share-price widgets, and swap slippage guards evaluate **spot** state. They do not model **async state machines** where the economic outcome is determined **between** `request*` and `claim*`.

**Sanctuary implementation:** Policy runs at **request broadcast time** — before the vault enters Pending — using:

- **Operator/controller whitelist** (`allowedOperators` · fallback `allowedSpenders`)
- **Declared async quote** (`erc7540AsyncQuote` or `resolveErc7540Quote`) comparing **request amount** vs **expected claimable amount**

Rejected requests never reach the vault — **$0 gas** on `FAIL_CLOSED`.

---

## 2. Operator Hijacking — `setOperator` (`0x9cc233d6`)

### Attack Surface

[ERC-7540](https://eips.ethereum.org/EIPS/eip-7540) grants **operators** the right to act on behalf of an **owner** for async requests. A single `setOperator(malicious, true)` call can:

1. **Delegate claim rights** to an attacker-controlled address before the honest user claims
2. **Redirect Pending → Claimable** settlement to a drainer contract
3. **Bypass** ERC-20 `approve` guards — no token approval selector involved; pure vault admin surface

| Selector | Function | Calldata shape | Risk |
|----------|----------|----------------|------|
| `0x9cc233d6` | `setOperator(address operator, bool approved)` | operator + bool word | **Irreversible delegation** if approved=true |
| `0xb2d9f201` | `requestDeposit(uint256,address controller,address owner)` | controller param | Non-whitelisted **controller** routes pending deposit |
| `0x710e20f1` | `requestRedeem(uint256,address controller,address owner)` | controller param | Non-whitelisted **controller** routes pending redeem |

Prompt-injected agent wallets may emit `setOperator` hidden inside [EIP-5792](https://eips.ethereum.org/EIPS/eip-5792) `wallet_sendCalls` batches — Sanctuary inherits ExoMesh batch unfold; operator guard applies per unfolded call.

### Sanctuary Zero-Trust Operator Lock

```typescript
// erc7540-async-escort.ts — fail-closed operator policy
if (parsed.kind === "erc7540_set_operator") {
  return parsed.approved && !isAllowedOperator(parsed.operator, config)
    ? rejectOperator(parsed.operator)   // ERC7540_OPERATOR_REJECTED
    : null;
}
if (!isAllowedOperator(parsed.controller, config)) return rejectOperator(parsed.controller);
```

| Policy | Behavior |
|--------|----------|
| **`allowedOperators`** | Explicit ERC-7540 operator whitelist (primary) |
| **`allowedSpenders` fallback** | Reuses retail approve allowlist for operator addresses |
| **`approved === false`** | Revocation always allowed (de-approval path) |
| **`approved === true` + unknown operator** | `ERC7540_OPERATOR_REJECTED` · 0-Gas · plain-text user alert |

**Reject code:** `ERC7540_OPERATOR_REJECTED`  
**User alert:** `ALERT: ERC-7540 async vault operator {addr} is not whitelisted — setOperator blocked (0-Gas).`

**Verification:** `pnpm demo:sanctuary` Scenario B — malicious `setOperator(MALICIOUS, true)` → **REJECT** before mock provider receives `request()`.

---

## 3. Async Rate Drift Equation — Vectorized `evalAsyncVaultDriftBps`

### Standard Slippage vs Async Vault Drift

| Check type | Formula (typical) | Applies when | Blind spot |
|------------|-------------------|--------------|------------|
| **DEX swap slippage** | `abs(spot − exec) / spot` at fill time | Same-tx swap | N/A for async vaults |
| **ERC-4626 preview** | `convertToAssets(shares)` at call time | Sync deposit/redeem | No Pending state |
| **Sanctuary async drift** | `abs(claimable − request) × 10,000 / request` bps | **Pre-broadcast** `requestDeposit` / `requestRedeem` | — |

### Sanctuary SSOT (BigInt-safe · fail-closed)

Implementation: [src/core/soil-resistance-math.ts](../../../src/core/soil-resistance-math.ts)

```typescript
const ASYNC_VAULT_BPS = 10_000n;

/** Trip when |claim − request| × 10000 > maxBps × request — fail-closed if request ≤ 0. */
export function evalAsyncVaultDrift(requestRate: bigint, claimRate: bigint, maxBps: number): boolean {
  if (requestRate <= 0n || !Number.isFinite(maxBps) || maxBps < 0) return true;
  const delta = claimRate > requestRate ? claimRate - requestRate : requestRate - claimRate;
  return delta * ASYNC_VAULT_BPS > BigInt(maxBps | 0) * requestRate;
}

export function evalAsyncVaultDriftBps(requestRate: bigint, claimRate: bigint): number {
  if (requestRate <= 0n) return Number.POSITIVE_INFINITY;
  const delta = claimRate > requestRate ? claimRate - requestRate : requestRate - claimRate;
  return Number((delta * ASYNC_VAULT_BPS) / requestRate);
}
```

**Trip inequality (reject when true):**

$$
\left| \text{claimable} - \text{request} \right| \times 10{,}000 > \text{maxBps} \times \text{request}
$$

**Observed drift (bps):**

$$
\text{driftBps} = \frac{\left| \text{claimable} - \text{request} \right| \times 10{,}000}{\text{request}}
$$

| Property | Sanctuary | Typical float slippage check |
|----------|-----------|------------------------------|
| **Arithmetic** | `bigint` — no IEEE-754 precision loss on wei-scale amounts | `number` — unsafe at 18-decimal wei |
| **Invalid request** | `request ≤ 0` → **fail-closed trip** (`true`) | Often unhandled |
| **Default ceiling** | `erc7540MaxSlippageBps = 50` (0.50%) | Ad-hoc per protocol |
| **Quote source** | `config.erc7540AsyncQuote` or `resolveErc7540Quote(kind, amount, vault)` | Static oracle only |

**Escort wiring** ([erc7540-async-escort.ts](../../../src/sdk/exomesh-agentic-wallet-guard/erc7540-async-escort.ts)):

```typescript
const maxBps = quote.maxSlippageBps ?? config.erc7540MaxSlippageBps ?? 50;
if (!evalAsyncVaultDrift(quote.requestAmountWei, quote.claimableAmountWei, maxBps)) return null; // PASS
return rejectSlippage(evalAsyncVaultDriftBps(...), maxBps); // ERC7540_ASYNC_SLIPPAGE_DRIFT
```

**Worked example (from Vitest harness):**

| Field | Value |
|-------|-------|
| `requestAmountWei` | `1_000_000` |
| `claimableAmountWei` | `800_000` |
| `driftBps` | `(200_000 × 10_000) / 1_000_000` = **2000 bps** |
| `maxBps` | `50` |
| **Verdict** | **REJECT** — `ERC7540_ASYNC_SLIPPAGE_DRIFT` · `base.calls.length === 0` |

---

## 4. Venue Alignment — Pendle · GMX · USD.ai / sUSDai

Sanctuary ERC-7540 escort is **selector-level protection** for async vault flows across the **5-Core Venue Matrix** — it does **not** replace ExoMesh soil resistance; it **complements** it for vault-specific async semantics.

| Venue | Async vault exposure | Pending → Claimable risk | Sanctuary guard |
|-----------------|---------------------|--------------------------|-----------------|
| **Pendle Finance** | PT/YT rolls · yield-token async deposit/redemption paths · controller delegation on vault adapters | Operator hijack before PT claim · implied-yield drift between request and settle | `setOperator` lock · drift bps gate on `requestDeposit` / `requestRedeem` · pairs with ExoMesh `agentic-auto-roll-gate` for roll actions |
| **GMX v2** | GM liquidity pool async deposit/redemption (ERC-7540-class share mechanics) · keeper-settled windows **3–5 min** | NAV drift during GM async window · non-whitelisted controller on pool vault | Operator whitelist on GM vault `controller` · `erc7540MaxSlippageBps` caps Pending→Claimable exchange-rate slip |
| **USD.ai / sUSDai** | RWA yield-bearing **async** share vaults · sUSDai peg-sensitive claim rate | GPU-oracle / NAV decoupling during async delay · `USD_AI_DEPEG_ORACLE_TRIP` class drift | Async drift gate surfaces peg slip **before** broadcast · operator lock prevents delegated claim to attacker |

```text
                    ExoMesh (Module A)              Sanctuary (Module B)
                    ─────────────────              ────────────────────
Pendle PT/YT roll   soil · venue · intent ring     ERC-7540 operator + async bps
GMX GM deposit      cross-venue slippage · depth    ERC-7540 controller + async bps
USD.ai sUSDai       PROTO_USDAI lane · depeg fuse   ERC-7540 async rate drift
```

**Design rule:** ExoMesh answers *"Is this venue / soil / intent safe right now?"* Sanctuary answers *"Is this async vault request safe across the Pending→Claimable window?"* Both must PASS for broadcast.

---

## 5. Master Comparison Matrix (Judge Brief)

| # | Concern | **Industry default** | **SliverVine Sanctuary** | Gas on reject | SSOT | Proof |
|---|---------|---------------------|---------------------------|---------------|------|-------|
| **1** | Sync vs async vault model | ERC-4626 instant `deposit`/`redeem` guards only | ERC-7540 **selector escort** on `request*` + `setOperator` | **$0** | [erc7540-async-escort.ts](../../../src/sdk/exomesh-agentic-wallet-guard/erc7540-async-escort.ts) | `pnpm demo:sanctuary` |
| **2** | Operator hijack (`0x9cc233d6`) | No wallet-level `setOperator` policy | **Zero-trust** `allowedOperators` whitelist · fail-closed on `approved=true` | **$0** | [calldata-parser.ts](../../../src/sdk/exomesh-agentic-wallet-guard/calldata-parser.ts) + escort | malicious operator REJECT test |
| **3** | Pending→Claimable drift | Post-claim analytics · float slippage | **`evalAsyncVaultDriftBps`** BigInt bps · default 50 bps ceiling | **$0** | [soil-resistance-math.ts](../../../src/core/soil-resistance-math.ts) | 20% drift REJECT test |
| **4** | EIP-5792 batch bypass | `wallet_sendCalls` skips send-tx guards | ExoMesh unfolds `calls[]` → escort runs per call | **$0** | [eip5792-send-calls.ts](../../../src/sdk/exomesh-agentic-wallet-guard/eip5792-send-calls.ts) | 3/3 Vitest |
| **5** | Pendle / GMX / USD.ai | Per-protocol dashboards | Unified selector guard + venue config (`allowedVenues` + operators) | **$0** | Retail Guard config | `pnpm demo:sanctuary` |

---

## 6. Integration & Configuration

### Retail Guard config surface

```typescript
interface RetailGuardConfig {
  allowedOperators?: readonly string[];     // ERC-7540 operator/controller whitelist
  erc7540MaxSlippageBps?: number;           // default 50 bps
  erc7540AsyncQuote?: {
    requestAmountWei: bigint;
    claimableAmountWei: bigint;
    maxSlippageBps?: number;
  };
  resolveErc7540Quote?: (
    kind: "deposit" | "redeem",
    amountWei: bigint,
    vault: string,
  ) => Erc7540AsyncQuote | null;
}
```

### Guarded selectors (u32 hot-path dispatch)

| Selector | Function | Sanctuary action |
|----------|----------|------------------|
| `0xb2d9f201` | `requestDeposit` | Controller whitelist + async drift |
| `0x710e20f1` | `requestRedeem` | Controller whitelist + async drift |
| `0x9cc233d6` | `setOperator` | Operator whitelist (approve path only) |

### Verification commands

```bash
# Sanctuary ERC-7540 escort interactive CLI (Scenario A–C)
pnpm demo:sanctuary              # alias: pnpm demo:escort

# Treasury bridge escort HUD
pnpm demo:ingress

# Full regression (includes escort + ExoMesh stack)
pnpm test -- --run
```

**Unit test SSOT:** `npx vitest run tests/erc7540-async-escort.test.ts` **3/3 PASS** · [tests/erc7540-async-escort.test.ts](../../../tests/erc7540-async-escort.test.ts)

---

## 7. Reject Codes & User Alerts

| Code | Trigger | User-facing alert |
|------|---------|-------------------|
| `ERC7540_OPERATOR_REJECTED` | `setOperator` or `controller` not in `allowedOperators` / `allowedSpenders` | Operator not whitelisted — setOperator blocked (0-Gas) |
| `ERC7540_ASYNC_SLIPPAGE_DRIFT` | `evalAsyncVaultDrift` trip — drift bps > `erc7540MaxSlippageBps` | Pending→Claimable drift exceeds limit — request blocked (0-Gas) |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [./01_EIP_COMPLIANCE_AND_COMPETITIVE_MATRIX.md](./01_EIP_COMPLIANCE_AND_COMPETITIVE_MATRIX.md) | ERC-7540 wiki entry · ExoMesh competitive matrix |
| [../../02_sdk_and_integrations/01_guides/01_SDK_INTEGRATION_BLUEPRINT.md](../../02_sdk_and_integrations/01_guides/01_SDK_INTEGRATION_BLUEPRINT.md) | EIP-1193 integration · escort config |
| [../../03_product_verifications/01_VERIFICATION_MATRIX.md](../../03_product_verifications/01_VERIFICATION_MATRIX.md) | Tier 0 `[Sanctuary]` CLI zone |
| [../../00_ARB_Buildathon/SUBMISSION.md](../../00_ARB_Buildathon/SUBMISSION.md) | Buildathon Module B complement |

---

**Sanctuary one-liner:** Async vaults introduce a **second timestamp** between request and claim. Sanctuary severs toxic operators and rate drift **before** the vault ever enters Pending — at **zero gas**.
