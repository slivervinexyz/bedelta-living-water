# Integration Proofs v2 (5-Core Venues · ExoMesh Agentic Guard · Optional B2B Appendix)

> **SSOT index:** [README.md](../README.md) · **Hub:** [../01_VERIFICATION_MATRIX.md](../01_VERIFICATION_MATRIX.md)  
> **Vitest baseline:** **254 test files | 1206 PASS clean (100%)**

---

## Proof Chain Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│ (a) C-End: ExoMesh Agentic Guard (EIP-1193/5792/6963+)          │
│     withRetailGuardProvider() → eth_sendTransaction intercept   │
├─────────────────────────────────────────────────────────────────┤
│ (b) 5-Core Venue Guards + Demo CLIs                             │
│     GMX · Pendle · USD.ai · HL · Variational                    │
├─────────────────────────────────────────────────────────────────┤
│ (c) Optional B2B: withExoMeshShield / verifyAgentIntent (not judge path)│
└─────────────────────────────────────────────────────────────────┘
```

**v1.1 pruned scope (SSOT):** see [§ v1.1 Pruned Scope](../01_VERIFICATION_MATRIX.md) in the verification matrix.

---

## (a) ExoMesh Agentic Guard (EIP-1193/5792/6963+) — C-End Middleware

ExoMesh ships a **universal wallet middleware** for any EIP-1193 host (dApp · wallet · AI copilot):

| Layer | Module | Behavior |
|-------|--------|----------|
| Provider wrap | [provider.ts](../../../src/sdk/exomesh-agentic-wallet-guard/provider.ts) | `withRetailGuardProvider()` — intercepts RPC before broadcast |
| Calldata parse | [calldata-parser.ts](../../../src/sdk/exomesh-agentic-wallet-guard/calldata-parser.ts) | Generic DEX selector parsing (router calldata guard — **not** a **RESERVED_ABI_V2** venue lane) |
| Guard engine | [guard-engine.ts](../../../src/sdk/exomesh-agentic-wallet-guard/guard-engine.ts) | `checkSoilResistance()` + mandate evaluation |

```bash
npx vitest run tests/sdk/retail-guard-provider.test.ts   # 35/35 PASS
```

**Integration blueprint:** [docs/02_sdk_and_integrations/01_guides/01_SDK_INTEGRATION_BLUEPRINT.md](../../02_sdk_and_integrations/01_guides/01_SDK_INTEGRATION_BLUEPRINT.md)

**Execution flow:**

```text
[ EIP-1193 Host (Wallet / dApp / AI Copilot) ]
                    │
                    ▼
        withRetailGuardProvider()  (provider.ts)
                    │
                    ▼
        evaluateTransactionIntent()  (guard-engine.ts)
                    │
                    ▼
        checkSoilResistance()  (p50 ~106µs E2E · p50 ~15µs reflex on --trip)
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
     FAIL_CLOSED           ALLOW
     (0-Gas intercept)         │
                               ▼
                    [ Wallet broadcast · Arbitrum 42161 ]
```

---

## (b) 5-Core Venue Guards + Demo CLIs

| Venue | Guard module | Demo CLI | Test |
|-------|--------------|----------|------|
| **GMX v2** | [gmx-v2-invariants.ts](../../../src/adapters/gmx/gmx-v2-invariants.ts) | `pnpm demo:gmx -- --trip` | [gmx-v2-invariants.test.ts](../../../tests/adapters/gmx-v2-invariants.test.ts) |
| **Pendle** | [pendle-pool-factory-adapter.ts](../../../src/adapters/pendle/pendle-pool-factory-adapter.ts) · USDai funding wedge (`WRONG_TOKEN_USDC_FOR_PENDLE`) | `pnpm demo:pendle -- --trip` · `pnpm preflight:venues --venue=pendle` · live harness USDai→PT-sUSDai→sUSDai | pendle adapter tests |
| **USD.ai** | [usdai-adapter.ts](../../../src/adapters/usdai/usdai-adapter.ts) | `pnpm demo:usdai -- --trip` | [usdai-adapter.test.ts](../../../tests/adapters/usdai-adapter.test.ts) |
| **Hyperliquid** | [hyperliquid-session-guard.ts](../../../src/adapters/hl/hyperliquid-session-guard.ts) | `pnpm demo:hl -- --trip` | HL session guard tests |
| **Variational** | [variational-rfq-adapter.ts](../../../src/adapters/variational-rfq-adapter.ts) | `pnpm demo:variational -- --trip` | variational RFQ tests |

```bash
pnpm demo:gmx -- --trip
pnpm demo:pendle
pnpm demo:usdai -- --trip
pnpm demo:hl -- --trip
pnpm demo:variational -- --trip
```

**Strategy loops:**

```bash
pnpm demo:perp-loop -- --trip    # Loop A: GMX / Pendle / HL / Variational
pnpm demo:spot-loop -- --trip     # Loop B: USD.ai collateral lane
```

**Venue rotation SSOT:** [02_CLI_DEMO_RUNBOOK.md](../02_CLI_DEMO_RUNBOOK.md) · `pnpm demo:{perp-loop,spot-loop}`

---

## (c) Optional B2B Agent Decorator (`withExoMeshShield`) — not judge-primary

Server-side execution hook — same soil engine · not the wallet wrap · no per-framework npm plugins:

| Layer | Module | Behavior |
|-------|--------|----------|
| Decorator | [decorator.ts](../../../src/sdk/decorator.ts) | `withExoMeshShield()` — zero-touch pre-broadcast wrapper |
| Intent verify | [agent-intent.ts](../../../src/sdk/agent-intent.ts) | `verifyAgentIntent()` — 8-dimension mandate gate |
| Demo | [agent-interceptor-demo.ts](../../../examples/agent-interceptor-demo.ts) | `pnpm demo:agent` |

```bash
pnpm demo:agent
npx vitest run tests/sdk/decorator.test.ts
```

---

## RESERVED_ABI_V2 Wasm Bitmask Holes (Protocol Bits 4–6)

Venue evaluators at protocol bits 4–6 removed; Wasm ABI v2 retains frozen holes:

| Hole | Location | Status |
|------|----------|--------|
| Protocol bits 4–6 | [risk-flags.ts](../../../src/core/risk-flags.ts) | `@deprecated RESERVED_ABI_V2` |
| Vector slots 8–19 | Wasm FFI | Frozen — no new evaluators |
| Venue indices 2–4 | Intent mandate | Removed from `VENUE_KEY_INDEX` |

See [intent-mandate.ts](../../../src/core/intent-mandate.ts) · [docs/01_architecture_and_standards/01_core_specs/02_DEFENSE_MATRIX_AND_SSRC_CORE.md](../../01_architecture_and_standards/01_core_specs/02_DEFENSE_MATRIX_AND_SSRC_CORE.md).

---

## Cross-Reference Index

| Audience | Start here |
|----------|------------|
| C-end wallet vendors | [docs/02_sdk_and_integrations/01_guides/01_SDK_INTEGRATION_BLUEPRINT.md](../../02_sdk_and_integrations/01_guides/01_SDK_INTEGRATION_BLUEPRINT.md) |
| B2B agent integrators | [src/sdk/decorator.ts](../../../src/sdk/decorator.ts) |
| Judge fast-track | `pnpm demo:gmx -- --trip` · `pnpm demo:pendle -- --trip` · `pnpm demo:variational -- --trip` · `pnpm demo:hl -- --trip` · `pnpm demo:usdai -- --trip` |
| Full CLI map | [03_CLI_ZONE_MAP.md](../shared_proofs/03_CLI_ZONE_MAP.md) |
