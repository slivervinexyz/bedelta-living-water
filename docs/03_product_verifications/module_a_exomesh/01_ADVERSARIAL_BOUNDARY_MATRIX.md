# Adversarial Boundary Matrix (FW-01-FW-16)

> **Judge summary (TL;DR):** [JUDGE_BRIEF.md](../../../JUDGE_BRIEF.md) -- CAN + GAP + 2 bounded PARTIAL only.

Engineering-honest firewall audit -- **only claim rows with runnable Vitest/demo proof**.

> **Status legend:** **CAN** = demo-ready (Vitest/CLI) | **PARTIAL** = proven path + documented gap | **GAP** = not claimed in v1.0.
> **Coverage snapshot:** **8 demo-ready | 7 bounded partial | 1 acknowledged gap** (FW-08).
> **Planned hardening** = Post-Grant / V1.5 Roadmap -- not v1.0 freeze deliverables.

## Industry Taxonomy Alignment (Informative)

**Informative alignment only** -- not certification, not a substitute for Vitest/demo proof below. Covers **execution-layer / pre-consensus** controls only; does **not** cover LLM prompt layer, MCP skill audit, or agent sandbox isolation. No vendor or jurisdiction model-policy claims (US/EU/CN).

| Industry taxonomy | Threat (plain English) | SliverVine mapping | SSOT status | Proof |
|-------------------|------------------------|--------------------|-------------|-------|
| [OWASP LLM06](https://genai.owasp.org/llmrisk/llm06-excessive-agency/) | Agent executes high-impact financial actions without bounds | FW-11, FW-12, FW-13 | **CAN** | `pnpm demo:FW-11` · `FW-12` · `FW-13` |
| [OWASP LLM01](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) (execution boundary only) | Malicious intent reaches signing pipeline | FW-04, FW-13 | **CAN** | `pnpm demo:FW-04` · `intent-drift.test.ts` |
| Third-party data / oracle trust (informative; not a specific OWASP row) | Stale or poisoned external market/RPC inputs | FW-01, FW-04 | **CAN** | `pnpm demo:FW-01` · `FW-04` |
| [Agentic SAMM](https://github.com/scadastrangelove/asamm) -- runtime enforcement slice | Deterministic execution integrity at action boundary | `checkSoilResistance()` · `withRetailGuardProvider()` | **CAN** (subset) | `retail-guard-provider.test.ts` **35/35** |

**Out of v1.0 scope (explicit non-claims):** LLM input / system-prompt classifiers · MCP / agent-skill static audit · agent execution sandbox / egress proxy · full OWASP LLM Top 10 / ASAMM L1-L3 programme maturity · mempool cancel guarantees (FW-08 **GAP**).

> Cloud LLM guardrails (~200ms-2s API) operate at the **cerebrum**; ExoMesh operates at the **pre-sign reflex arc** (p50 ~15us Wasm, 0-Gas fail-closed). Different layer -- complementary, not competing. Ecosystem map (not compliance checklist): [awesome-ai-security-tools](https://github.com/scadastrangelove/awesome-ai-security-tools).

| ID | Attack vector | Status | Primary proof | Known gap | Planned hardening (Post-Grant / V1.5) |
|----|---------------|--------|---------------|-----------|---------------------------------------|
| **FW-01** | Stale oracle / delayed feed | **CAN** | `pnpm demo:FW-01` · `pendle-market-oracle.test.ts` | GMX `reduceOnly` skips oracle-lag by design; nominal fast path may skip full probe | Disable fast path in high vol; force `at`/`fetchedAtMs` on soil input |
| **FW-02** | Async race (R20 sever vs in-flight sign) | **CAN** | `pnpm demo:FW-02` · `session-key-gates.test.ts` (incl. sever race) · `signing-sever-latch.ts` | No full async signing queue (optional V1.5) | Optional Fireblocks-style `requestId` queue |
| **FW-03** | Flash liquidity spoofing | PARTIAL | `clock-monotonicity.test.ts` | Single `depthUsd` snapshot; no same-block spoof test | Depth ring buffer; N consecutive low-depth gate |
| **FW-04** | RPC poisoning / defense DOS | **CAN** | `pnpm demo:FW-04` · `cross-venue-fail-safe.test.ts` | Fail-closed = halt signing (security > availability); sponsorship ledger fail-open | Optional degraded **reduceOnly-only** lane |
| **FW-05** | Session key scope escalation | PARTIAL | `fool-proof-guard.test.ts` · `session-key-gates.test.ts` | Retail path `contractTarget` still optional; TYPE-4 on-chain hook not shipped | TYPE-4 on-chain hook (V1.5 Track A) |
| **FW-06** | SystemState desync | PARTIAL | `system-state.test.ts` | Memory + probe only; restart clears R20; no per-tick reconcile | `reconcilePositionsFromHl()`; restart KV hydrate |
| **FW-07** | Cascading deadlock / cancel-only | PARTIAL | `pnpm demo:gmx -- --trip` · `pendle-gmx-cross-guard.test.ts` | **Pre-trip** reduce/close green only; **post-R17/R20 sever blocks all signing** | `reduceOnlyEmergencyLane` (post-sever cancel/decrease) |
| **FW-08** | Priority fee & cancel lag | **GAP** | `chase-engine.test.ts` (dry-run only) | No mempool priority escalation / live cancel-vs-liquidation proof | `CancelEscalationPolicy` -- cancel-only fee multiplier |
| **FW-09** | Micro-slippage bleeding | PARTIAL | `effective-max-sl.test.ts` | R17 is UTC daily; no sub-threshold cross-time bleed test | `rollingSlippageBudgetUsd` (1h/4h window) |
| **FW-10** | R17 00:00 UTC reset injection | **CAN** | `pnpm demo:FW-10` · `unlock-reauthorization.test.ts` (midnight injection) · `gateway-lock-hud.test.ts` | No live operator HUD UI render proof | Optional HUD badge component (V1.5) |
| **FW-11** | Permit2 / EIP-712 approval phishing | **CAN** | `pnpm demo:FW-11` · `retail-guard-provider.test.ts` (**35/35**) | Trusted-spender allowlist permits infinite approve by design | Spender reputation oracle; per-token cap |
| **FW-12** | EIP-5792 batched-call smuggling | **CAN** | `pnpm demo:FW-12` · `eip5792-send-calls.test.ts` (**3/3**) | No cross-batch intent correlation; call-order MEV unassessed | Batch-level soil aggregate; call-order dependency graph |
| **FW-13** | AI retry-storm / 4th-strike sever | **CAN** | `pnpm demo:FW-13` · `retail-guard-provider.test.ts` · `intent-drift.test.ts` | Per-intent ring budget only; 5 RPS isolate caps Wasm DoS | Session-level cumulative retry budget; exponential backoff |
| **FW-14** | ERC-7540 async vault operator hijack | **CAN** | `pnpm demo:FW-14` · `erc7540-async-escort.test.ts` | Async quote requires caller injection; no on-chain pending reconcile | Auto-fetch claimable from vault; pending-state KV reconcile |
| **FW-15** | EIP-7702 delegation hijack | PARTIAL | `eip7702-auth-guard.test.ts` (**3/3**) | SDK primitive only -- not auto-wired into default `withRetailGuardProvider` | Hook `wallet_signAuthorization`; Kernel v4 adapter (V1.5 onboarding) |
| **FW-16** | MEV / sandwich extraction | PARTIAL | `exomesh-sdk-bridge-armor.test.ts` · `funding-epoch-guard.test.ts` | B2B armor threshold only; **no live mempool sandwich proof** | UM-03 Counter-MEV pilot + private relay (V1.5) |

**Judge one-liner:** Pre-sign soil + R17/R20 severance are demoable; reduce/close green light applies **before** trip only; post-sever recovery requires master re-auth -- we do **not** claim mempool cancel or sandwich guarantees.

## 8 CAN one-line verification

```bash
pnpm demo:FW-01   # Stale oracle / delayed feed
pnpm demo:FW-02   # Async race (R20 sever vs in-flight sign)
pnpm demo:FW-04   # RPC poisoning / defense DOS
pnpm demo:FW-10   # R17 00:00 UTC reset injection
pnpm demo:FW-11   # Permit2 / EIP-712 approval phishing
pnpm demo:FW-12   # EIP-5792 batched-call smuggling
pnpm demo:FW-13   # AI retry-storm / 4th-strike sever (CLI trip; extended: intent-drift.test.ts)
pnpm demo:FW-14   # ERC-7540 async vault operator hijack
```

## Judge demo minimum set (extended / supplementary)

```bash
pnpm demo:gmx -- --trip
pnpm demo:sanctuary
npx vitest run tests/guards/pendle-gmx-cross-guard.test.ts
npx vitest run tests/adapters/pendle-market-oracle.test.ts
npx vitest run tests/services/cross-venue-fail-safe.test.ts
npx vitest run tests/services/session-key-gates.test.ts
npx vitest run tests/services/gateway-lock-hud.test.ts
npx vitest run tests/sdk/retail-guard-provider.test.ts
npx vitest run tests/erc7540-async-escort.test.ts
npx vitest run tests/sdk/eip7702-auth-guard.test.ts
npx vitest run tests/rootProtectionService.test.ts
```

Related: [03_CLI_ZONE_MAP.md](../shared_proofs/03_CLI_ZONE_MAP.md) · [01_VERIFICATION_MATRIX.md](../01_VERIFICATION_MATRIX.md)
