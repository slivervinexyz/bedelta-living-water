# Hacker Profiling & Cyber-Biological Immunology Framework

> **Product:** **SliverVine ExoMesh** (Module A) · **SliverVine Sanctuary** (Module B)  
> **Frameworks:** FBI **Mindhunter** behavioral profiling (MO · signature · escalation) · **Cyber-Biological Immunology** (self-tuning honeypot inoculation · adversarial telemetry vaccine)  
> **Defense SSOT:** R01–R20 Defense Matrix · `checkSoilResistance()` · **ExoMesh Agentic Guard (EIP-1193/5792/6963+)** · **Sanctuary Async Escort (ERC-7540+)** · **Vitest:** **254 test files | 1206 PASS clean (100%)**  
> **Architecture index:** [README.md](../README.md) · [02_DEFENSE_MATRIX_AND_SSRC_CORE.md](../01_core_specs/02_DEFENSE_MATRIX_AND_SSRC_CORE.md) · [01_EIP_COMPLIANCE_AND_COMPETITIVE_MATRIX.md](../02_eip_standards/01_EIP_COMPLIANCE_AND_COMPETITIVE_MATRIX.md) · [../02_eip_standards/02_ERC7540_ASYNC_ESCORT_IMPLEMENTATION.md](../02_eip_standards/02_ERC7540_ASYNC_ESCORT_IMPLEMENTATION.md)

---

## Executive Thesis — Behavioral Profiling × Adaptive Immunology

In cyber-biological immunology, the strongest defense is **adaptive**: the system observes pathogen signatures, inoculates with controlled probes, and tightens response thresholds before infection spreads. SliverVine Protocol maps this onto Web3 defense:

| Immunology principle | SliverVine engineering analog |
|----------------------|------------------------------|
| **Pathogen signature** | Toxic calldata · MEV probes · scraper traffic · async vault drift |
| **Adaptive inoculation** | Honeypot decoys feed false telemetry to adversaries; legitimate paths **harden** `checkSoilResistance()` fuses |
| **Reflex severance** | **Sub-1.8µs** SSRC soil reflex · **p50 ~15µs** `rootProtection()` — attacker payload never reaches mempool |
| **Attempt budget fuse** | `INTENT_RING_U32` attempt budget · **4th-strike** physical hot-key severance |

**Mindhunter** adds the investigative layer: every on-chain adversary exhibits a **modus operandi (MO)** — burst retries, batch concealment, permission drift. ExoMesh does not wait for post-mortem analytics; it **profiles signatures in-process** and severs at the reflex boundary.

```text
                    MINDHUNTER (profile)           IMMUNOLOGY (counter)
                    ─────────────────              ────────────────────
Signature A Burst   → INTENT_RING_U32              → 4th-strike severance
Signature B Batch   → EIP-5792 calls[] unfold      → calldata dissection
Signature C Drift   → ERC-7540 setOperator lock      → Sanctuary zero-trust
Scraper / fork MO   → C1 honeypot 99% slippage      → decoy inoculation
MEV probe MO        → jittered soil thresholds       → adversarial telemetry vaccine
```

---

## Part I — Mindhunter Behavioral Profiling (MO & Signatures)

### Profiling Methodology

| FBI concept | SliverVine mapping |
|-------------|-------------------|
| **Modus operandi (MO)** | Repeatable attack pattern across calldata shape · timing · delegation surface |
| **Signature** | Deterministic bytecode fingerprint (u32 selector) + behavioral telemetry |
| **Escalation ladder** | ALLOW → WARN (attempt count) → SEVER (`MAX_ATTEMPTS_EXCEEDED_SEVERED`) → CHANNEL_DEAD |
| **Crime scene** | Pre-broadcast `eth_sendTransaction` / `wallet_sendCalls` — **before** Sequencer inclusion |

ExoMesh treats the **EIP-1193 provider boundary** as the behavioral interview room: every `request()` is observed; toxic MOs are classified and fail-closed at **$0 gas**.

---

### Signature A — Burst Pattern (Rapid AI Agent Retries)

**Adversary MO:** Prompt-injected or FOMO-loop agents hammer `eth_sendTransaction` in sub-second bursts — probing venue drift, approval limits, or session-key TTL before human intervention.

**Behavioral tells:**

- Monotonic `INTENT_SLOT_ATTEMPTS` increment on same wallet slot
- Venue bit unchanged · allowed mask unchanged · only timing differs
- Often co-occurs with LLM tool-call retry storms (~1–10 s CoT loop)

**ExoMesh counter — `INTENT_RING_U32` bitwise 4th-strike severance:**

```text
slot[offset + ATTEMPTS]:  0 → 1 → 2 → 3 → 4  (default maxAttempts = 3)
                                              ↑
                                    4th attempt: INTENT_FLAG_SEVER_CHANNEL
                                    → MAX_ATTEMPTS_EXCEEDED_SEVERED
                                    → channelSevered = true (guard-engine.ts)
                                    → baseProvider.request() NEVER called again
```

| Property | Value |
|----------|-------|
| **Buffer** | Pre-allocated `Uint32Array` · 256 slots × 4 words · **<16 KiB** / 10k iter (**Zero-Allocation Hot-Path**) |
| **Hot-path eval** | `trackAttemptBudgetU32Pure()` · `evaluateIntentGateU32Pure()` |
| **Wasm parity** | `intent_core_evaluate_gate` via [wasm-adapter.ts](../../../src/sdk/exomesh-agentic-wallet-guard/wasm-adapter.ts) |
| **Reject code** | `MAX_ATTEMPTS_EXCEEDED_SEVERED` · `CHANNEL_SEVERED` |
| **Chaos tier** | **C2** — [retail-guard-provider.test.ts](../../../tests/sdk/retail-guard-provider.test.ts) **35/35** |

**Mindhunter read:** Burst MO = **disorganized escalation** — the system profiles attempt velocity and applies **physical deadlock** (R20) before the 4th toxic broadcast.

**SSOT:** [intent-core-ring.ts](../../../src/core/intent-core-ring.ts) · [guard-engine.ts](../../../src/sdk/exomesh-agentic-wallet-guard/guard-engine.ts)

---

### Signature B — Batch Masking (EIP-5792 `calls[]` Concealment)

**Adversary MO:** Hide toxic selectors (approve · Permit2 · malicious swap · `setOperator`) inside [EIP-5792](https://eips.ethereum.org/EIPS/eip-5792) `wallet_sendCalls` atomic batches — bypassing guards that only hook `eth_sendTransaction`.

**Behavioral tells:**

- Single `wallet_sendCalls` RPC with `calls.length > 1`
- Legitimate-looking first call · toxic payload in index ≥ 1
- Agent frameworks (Coinbase Smart Wallet · modern injectors) default to batch API

**ExoMesh counter — direct pointer unfold (Zero-Allocation Hot-Path batch dissection):**

```typescript
// eip5792-send-calls.ts — reuse TX_PARAMS pointer; no per-call array alloc
for (let i = 0; i < len; i++) {
  TX_PARAMS[0] = tx;  // in-place envelope bind
  const reject = evaluateRetailRisk(config, "eth_sendTransaction", TX_PARAMS, SKIP_OPTS);
  if (reject) return reject;  // 0-Gas · entire batch aborted
  venueBits |= resolveVenueBitFromContract(tx.to, config.contractVenueIndex);
}
return evaluateRetailIntentGate(config, venueBits);  // ONE ring attempt per batch
```

| Layer | Mechanism |
|-------|-----------|
| **Calldata dissection** | [calldata-parser.ts](../../../src/sdk/exomesh-agentic-wallet-guard/calldata-parser.ts) · [calldata-hex.ts](../../../src/sdk/exomesh-agentic-wallet-guard/calldata-hex.ts) — u32 selector dispatch on `CALLDATA_SCRATCH` |
| **Wasm FFI** | [wasm-adapter.ts](../../../src/sdk/exomesh-agentic-wallet-guard/wasm-adapter.ts) — `DataView` on Wasm linear memory · `BIGINT_U32_LUT` (zero per-gate `BigInt` alloc) |
| **Transport entangle** | `bindTransportStreamScratch()` XOR-bind on scratch selector bytes — anti-fork probe |
| **Intent budget** | Entire batch consumes **one** `INTENT_RING_U32` attempt (not N) |

**Mindhunter read:** Batch masking = **organized crime** MO — concealment via structure. ExoMesh **unwraps** the batch like unpacking a layered dead-drop: each `calls[i]` is individually risk-evaluated; first trip kills the whole batch.

**Chaos tier:** **C2** — [eip5792-send-calls.test.ts](../../../tests/sdk/eip5792-send-calls.test.ts) **3/3** · `pnpm demo:exomesh` Scenario D

**SSOT:** [eip5792-send-calls.ts](../../../src/sdk/exomesh-agentic-wallet-guard/eip5792-send-calls.ts) · [calldata-hex.ts](../../../src/sdk/exomesh-agentic-wallet-guard/calldata-hex.ts)

---

### Signature C — Permission Drift (Subversive `setOperator` Delegation)

**Adversary MO:** Delegate async vault **controller** or **operator** rights to attacker address via ERC-7540 `setOperator(address,bool)` (`0x9cc233d6`) — no ERC-20 `approve` trail · claim hijack during Pending → Claimable window.

**Behavioral tells:**

- Selector `0x9cc233d6` on vault contract `to`
- `approved = true` for non-whitelisted operator
- `requestDeposit` / `requestRedeem` with foreign `controller` param
- Often chained after Signature B batch masking

**Sanctuary counter — selector-level fail-closed lock:**

| Path | Policy |
|------|--------|
| `setOperator(op, true)` | `op ∉ allowedOperators` → `ERC7540_OPERATOR_REJECTED` |
| `requestDeposit` / `requestRedeem` | `controller ∉ allowedOperators` → `ERC7540_OPERATOR_REJECTED` |
| Async drift | `abs(claim − request) × 10⁴ / request > maxBps` → `ERC7540_ASYNC_SLIPPAGE_DRIFT` |

**Mindhunter read:** Permission drift = **grooming** MO — establish trust delegation before extraction. Sanctuary applies **zero-trust operator whitelist** at broadcast time; revocation (`approved=false`) always allowed.

**Chaos tier: C3 — `pnpm demo:sanctuary` (`demo:escort` alias) `[Sanctuary]` · unit SSOT: [erc7540-async-escort.test.ts](../../../tests/erc7540-async-escort.test.ts) 3/3**

**SSOT:** [erc7540-async-escort.ts](../../../src/sdk/exomesh-agentic-wallet-guard/erc7540-async-escort.ts) · [ERC7540_ASYNC_ESCORT_IMPLEMENTATION.md](../02_eip_standards/02_ERC7540_ASYNC_ESCORT_IMPLEMENTATION.md)

---

### Signature Matrix — Mindhunter × ExoMesh × Sanctuary

| Signature | MO class | Primary surface | Detection | Severance | Module | Gas on trip |
|-----------|----------|-----------------|-----------|-----------|--------|-------------|
| **A — Burst** | Disorganized escalation | `eth_sendTransaction` retry storm | `INTENT_SLOT_ATTEMPTS` > 3 | `severSigningChannel()` | ExoMesh | **$0** |
| **B — Batch** | Organized concealment | `wallet_sendCalls` `calls[]` | Per-call `evaluateRetailRisk()` unfold | Whole-batch `RetailGuardRejectedError` | ExoMesh | **$0** |
| **C — Drift** | Grooming / delegation | ERC-7540 `setOperator` · `controller` | u32 selector `0x9cc233d6` | Operator whitelist + async bps gate | Sanctuary | **$0** |

---

## Part II — Cyber-Biological Immunology (Honeypot Trap Hosts)

### Adversarial Telemetry Inoculation

The immune system does not merely **block** pathogens — it **studies** them to refine antibodies. SliverVine applies the same inversion to adversarial traffic:

1. **Feed decoys** to unauthenticated scrapers (false antigen for the attacker)
2. **Harvest probe telemetry** to tighten legitimate-user thresholds (vaccine for the protocol)
3. **Never expose production venue state** to unauthenticated RPC consumers

```text
[ Unauthenticated scraper / forked frontend ]
        │
        ▼
evaluateRpcDefenseGate(url) ──► isHoneyPotHost(host)?
        │                              │
        │ NO (authenticated)           │ YES
        ▼                              ▼
Production RPC allowlist          HONEYPOT_ACTIVE
real venue RTT                    HONEYPOT_SIMULATED_SLIPPAGE = 0.99 (99%)
                                  HoneyPotCircuitBreakError
                                  sub-1ms fail-closed
```

---

### Decoy Inoculation — Chaos Level C1

**Immunology analog:** Controlled antigen exposure to hostile reconnaissance — adversaries ingest **worthless decoy telemetry** while production state remains sealed.

| Property | Implementation |
|----------|----------------|
| **Trap hosts** | `api.santenmoku-scraper.trap` · `gmx-arbitrum-router.santenmoku-scraper.trap` ([rpc-allowlist-hosts.ts](../../../src/services/defense/rpc-allowlist-hosts.ts)) |
| **Gate eval** | `evaluateRpcDefenseGate()` · `isRpcDefenseAuthenticated()` ([rpc-fetch-gate-eval.ts](../../../src/services/defense/rpc-fetch-gate-lib/rpc-fetch-gate-eval.ts)) |
| **Decoy payload** | `HONEYPOT_SIMULATED_SLIPPAGE = 0.99` — **99% synthetic slippage** lock |
| **Status code** | `HONEYPOT_STATUS_CODE = 0x99` · `HONEYPOT_ACTIVE` |
| **Latency** | **< 1 ms** — no real venue round-trip |
| **OpSec framing** | Externally presents as RPC transport / nonce sync anomaly — not labeled "honeypot" in user-facing copy |

**Adversary outcome:** Forked dashboards · unauthenticated scrapers · copycat frontends ingest **worthless decoy telemetry** — production `SystemState` and venue quotes remain sealed behind session-authenticated paths.

**Verification:** `npx vitest run tests/defense/rpc-whitelist.test.ts` · retail guard honeypot swap/depth trips in [retail-guard-provider.test.ts](../../../tests/sdk/retail-guard-provider.test.ts)

---

### Adversarial Telemetry Inoculation — Dynamic `checkSoilResistance()` Sensitivity

**Immunology analog:** Controlled pathogen exposure builds adaptive immunity. SliverVine exposes the **soil fuse** to controlled adversarial probes so production thresholds **harden** rather than static-decay.

| Ingress signal | Vaccine mechanism | SSOT |
|----------------|-------------------|------|
| **MEV / toxic calldata probes** | `collectExternalSoilFlags()` — GMX price impact · cross-spread · Pendle oracle gates OR into `tripFlags` | [soil-resistance.ts](../../../src/services/risk-control-lib/soil-resistance.ts) |
| **Anti-gaming jitter** | `resolveJitteredSoilThresholds()` — ±2–5 bps random walk on `slippageFuse` / `minDepthUsd` prevents threshold-sniping | [soil-resistance-jitter.ts](../../../src/core/soil-resistance-jitter.ts) |
| **Protocol mask propagation** | `seedProtocolMaskScratch()` → external flags → `commitProtocolMaskScratch()` — cross-isolate trip memory | [protocol-mask-sync.ts](../../../src/core/protocol-mask-sync.ts) |
| **Trip severance feedback** | `applySoilTripSeverance(true)` on mandate trip — signing channel tightens on observed toxic pattern | [risk-severance.ts](../../../src/core/risk-severance.ts) |
| **Honeypot retail path** | Swap/depth honeypot fuses in Retail Guard — `SLIPPAGE_EXCEEDED` / `DEPTH_INSUFFICIENT` at 99% synthetic lanes | [guard-engine.ts](../../../src/sdk/exomesh-agentic-wallet-guard/guard-engine.ts) |

**Core reflex equation** (unchanged semantics · jittered thresholds):

$$
\text{trip} \iff \text{crossVenueSlippage} > \text{slippageFuse}_{\text{jittered}} \;\lor\; \text{depthUsd} < \text{minDepthUsd}_{\text{jittered}} \;\lor\; \text{externalFlags} \neq 0
$$

**Design rule:** Toxic ingress is **never** executed on-chain. It is **observed**, **classified**, and **fed back** into threshold tightening — the vaccine is **calibrated sensitivity**, not counter-attack transactions.

---

### Chaos Level C1–C3 — Immunology Test Grid

| Level | Immunology phase | Target MO | Verification |
|-------|------------------|-----------|--------------|
| **C1** | Decoy inoculation | Unauthenticated RPC scrapers | [tests/defense/rpc-whitelist.test.ts](../../../tests/defense/rpc-whitelist.test.ts) `[ExoMesh]` |
| **C2** | Reflex severance vs batch concealment | Burst retry + `wallet_sendCalls` masking | [retail-guard-provider.test.ts](../../../tests/sdk/retail-guard-provider.test.ts) **35/35** · [eip5792-send-calls.test.ts](../../../tests/sdk/eip5792-send-calls.test.ts) **3/3** |
| **C3** | Sanctuary async-vault lock | Oracle lag · de-peg · ERC-7540 drift | `pnpm demo:sanctuary` · `pnpm demo:usdai -- --trip` |

> **Honest boundary:** C1–C3 are **in-process Mini-Chaos** proofs. Large-scale K8s / Sequencer outage chaos is **NOT RUN** — disclosed in [01_VERIFICATION_MATRIX.md](../../03_product_verifications/01_VERIFICATION_MATRIX.md).

---

## Part III — Sub-1.8µs ReflexCore Severance (ExoMesh Reflex Arc)

### Pre-Consensus Severance Before Mempool Ingress

ExoMesh occupies **Temporal Tier T3** — the only execution class that operates at **microsecond** scale **before** Arbitrum Sequencer / bundler ingress:

```text
T1  On-chain settlement (≥ 1 block · ~250 ms Arbitrum)
T2  Bundler / mempool queue (50–500 ms+)
T3  ExoMesh pre-consensus reflex ← SSRC SEVERANCE
    ├─ Pure invariant math     ~0.5–1.1 µs
    ├─ SSRC soil_core warm     < 1.8 µs (demo wasmUs lane)
    ├─ ReflexCore severance    p50 ~15 µs (FAIL_CLOSED)
    └─ E2E ExoMesh Edge gate   p50 ~106 µs (ALLOW path)
```

| Stage | Action | Attacker visibility |
|-------|--------|---------------------|
| **1. Intercept** | `withRetailGuardProvider().request()` | Payload enters profiling |
| **2. Profile** | Signatures A/B/C classification | MO matched to ring / batch / operator rules |
| **3. Evaluate** | `checkSoilResistance()` + `evaluateRetailRisk()` | SSRC bitmask parallel eval |
| **4. Sever** | `RetailGuardRejectedError` · `rootProtection()` | **Signing channel dead** · **$0 gas** |
| **5. (never reached)** | `baseProvider.request()` → Sequencer | Payload **never** in mempool |

### 0-Gas Pre-Consensus Invariant

$$
\text{FAIL\_CLOSED} \implies \text{baseProvider.request()} \text{ is NEVER invoked}
$$

Every reject path in Signatures A · B · C · C1 honeypot · C3 async drift satisfies this invariant — verified by `expect(base.calls).toHaveLength(0)` patterns across Retail Guard Vitest.

---

## Part IV — Unified Defense Architecture Map

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ MINDHUNTER PROFILING LAYER (behavioral MO)                               │
│  Sig-A Burst ──► INTENT_RING_U32 ──► 4th-strike sever                  │
│  Sig-B Batch ──► eip5792 calls[] unfold ──► per-tx risk + 1 ring debit   │
│  Sig-C Drift ──► ERC-7540 operator lock ──► Sanctuary async bps        │
└───────────────────────────────┬─────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ IMMUNOLOGY LAYER (adversarial ingress)                                   │
│  C1 Honeypot ──► 99% synthetic slippage decoy                            │
│  Vaccine ──► jittered thresholds + protocol mask + trip severance        │
└───────────────────────────────┬─────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ REFLEXCORE (SSRC) · ExoMesh T3 reflex                                    │
│  soil_core.wasm < 1.8µs · rootProtection p50 ~15µs · 0-Gas sever       │
└───────────────────────────────┬─────────────────────────────────────────┘
                                ▼
              [ Arbitrum Sequencer — only PASS intents arrive ]
```

---

## Master Reference Table

| Framework layer | Concept | Implementation anchor | Reject / trip signal | Verify |
|-----------------|---------|----------------------|----------------------|--------|
| **Mindhunter** | Signature A — Burst | [intent-core-ring.ts](../../../src/core/intent-core-ring.ts) | `MAX_ATTEMPTS_EXCEEDED_SEVERED` | [intent-sinking-audit.test.ts](../../../tests/core/intent-sinking-audit.test.ts) **11/11** |
| **Mindhunter** | Signature B — Batch | [eip5792-send-calls.ts](../../../src/sdk/exomesh-agentic-wallet-guard/eip5792-send-calls.ts) | `SEND_CALLS_BATCH_REJECTED` · per-call codes | [eip5792-send-calls.test.ts](../../../tests/sdk/eip5792-send-calls.test.ts) **3/3** |
| **Mindhunter** | Signature C — Drift | [erc7540-async-escort.ts](../../../src/sdk/exomesh-agentic-wallet-guard/erc7540-async-escort.ts) | `ERC7540_OPERATOR_REJECTED` | `pnpm demo:sanctuary` |
| **Immunology** | Decoy inoculation C1 | [rpc-fetch-gate-eval.ts](../../../src/services/defense/rpc-fetch-gate-lib/rpc-fetch-gate-eval.ts) | `HONEYPOT_ACTIVE` · 99% slippage | [rpc-whitelist.test.ts](../../../tests/defense/rpc-whitelist.test.ts) |
| **Immunology** | Adversarial telemetry vaccine | [soil-resistance-jitter.ts](../../../src/core/soil-resistance-jitter.ts) | Jittered `slippageFuse` · mask commit | [protocol-mask-sync.test.ts](../../../tests/core/protocol-mask-sync.test.ts) |
| **ReflexCore (SSRC)** | Sub-1.8µs reflex | [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) | `SOIL_TRIPPED` · `rootProtection()` | `pnpm demo:gmx -- --trip` |

---

## Verification Commands (60-Second Judge Pack)

```bash
# Mindhunter Signature A — Zero-Allocation Hot-Path ring slab
npx vitest run tests/core/intent-sinking-audit.test.ts

# Mindhunter Signature B — EIP-5792 batch unfold
npx vitest run tests/sdk/eip5792-send-calls.test.ts

# Mindhunter Signature C — ERC-7540 operator lock [Sanctuary]
pnpm demo:sanctuary

# Immunology C1 — honeypot trap hosts
npx vitest run tests/defense/rpc-whitelist.test.ts

# ReflexCore (SSRC) — live FAIL_CLOSED severance
pnpm demo:gmx -- --trip
pnpm demo:exomesh -- --trip

# Full regression
pnpm test -- --run   # 254 files · 1206 PASS
```

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [02_DEFENSE_MATRIX_AND_SSRC_CORE.md](../01_core_specs/02_DEFENSE_MATRIX_AND_SSRC_CORE.md) | R01–R20 matrix · Zero-Allocation Hot-Path ring slab · SSRC moats |
| [01_EIP_COMPLIANCE_AND_COMPETITIVE_MATRIX.md](../02_eip_standards/01_EIP_COMPLIANCE_AND_COMPETITIVE_MATRIX.md) | ExoMesh competitive matrix · EIP compliance |
| [../02_eip_standards/02_ERC7540_ASYNC_ESCORT_IMPLEMENTATION.md](../02_eip_standards/02_ERC7540_ASYNC_ESCORT_IMPLEMENTATION.md) | Sanctuary ERC-7540 deep dive |
| [Yellow Paper §Ingress](../01_core_specs/01_SYSTEM_TOPOLOGY_AND_YELLOW_PAPER.md) | Honeypot RPC · legacy vs engineered standards |
| [03_RISK_MITIGATION_AND_DISCLAIMER_FRAMEWORK.md](../01_core_specs/04_RISK_MITIGATION_AND_DISCLAIMER_FRAMEWORK.md) | modeled risk spectrum (§0.1) · fail-closed boundaries |

---

**Framework one-liner:** Mindhunter profiles the attacker's **MO**; Cyber-Biological Immunology **inoculates** with honeypot decoys and adversarial telemetry vaccines; ExoMesh + **ReflexCore (SSRC)** sever at sub-1.8µs — cutting access before the mempool ever sees the payload.
