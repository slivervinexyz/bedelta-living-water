# Market Intelligence & Competitor Audit — ExoMesh Agentic Guard (EIP-1193/5792/6963+)

> **Document:** 02 — Market Intelligence Whitepaper  
> **Package:** `@slivervine/exomesh-agentic-wallet-guard` · **License:** Apache-2.0  
> **Buildathon role:** Primary **C-End Middleware** deliverable for Arbitrum Open House

---

## Executive Summary

The Wallet Guard SDK occupies a **structural gap** between server-side transaction simulators (Blockaid, Blowfish, WalletConnect Scan) and on-chain post-sign defenses. It delivers **mandate enforcement pre-consensus** — before EIP-1193 signing — with **zero on-chain gas** on rejection paths and sub-millisecond reflex latency in-browser.

---

## Competitive Matrix — Server Simulation vs. Edge Pre-Consensus Reflex

| Dimension | Blockaid / Blowfish / WC Scan | EIP-1193 Agentic Wallet Guard |
|-----------|-------------------------------|----------------------------------------|
| **Execution locus** | Remote SaaS / RPC simulation farm | In-browser EIP-1193 middleware |
| **Latency** | 200–800 ms round-trip | **< 0.014 ms** policy reflex (u32 ring + scratch) |
| **Gas on reject** | User may already have signed | **0-Gas** — tx never broadcast |
| **Trust model** | Third party sees full calldata graph | Self-hosted policy + optional [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) |
| **Agent / LLM binding** | Post-hoc warning after intent formed | **Pre-consensus** `INTENT_RING_U32` retry severance |
| **Offline** | Requires network | TS fallbacks when Wasm unavailable |
| **Distribution** | API key / vendor contract | **Apache-2.0** drop-in middleware |

**Positioning thesis:** Simulators answer *what will this tx do on-chain?* The Wallet Guard answers *is this invocation allowed under the user's declared mandate?* — a reflex arc, not a retrospective audit.

---

## AI Threat Landscape

| Threat class | Attack vector | Wallet Guard response | SSOT |
|--------------|---------------|----------------------|------|
| **Hallucinated spender** | LLM emits wrong `approve` target | `evaluateRetailApproveGate` · infinite block | `allowedSpenders[]` |
| **Prompt-injected venue** | Agent swaps to unapproved router | `evaluateRetailVenueAllowlist` | `VENUE_DRIFT_REJECTED` |
| **EIP-712 domain drift** | Phishing `verifyingContract` | Venue allowlist on typed data | `eth_signTypedData_v4` gate |
| **Honeypot slippage** | Toxic pool / shallow depth | `evaluateRetailSoilGate` | `SLIPPAGE_EXCEEDED` |
| **FOMO retry storm** | 4th rapid submit spam | `INTENT_RING_U32` channel sever | `MAX_ATTEMPTS_EXCEEDED_SEVERED` |
| **Permit2 phishing** | `0x2a0886f7` / `0x87517c45` calldata | `parseTransactionCalldata` | `UNAUTHORIZED_SPENDER_REJECTED` |

See [04_AI_INTENT_PROTECTION_MODEL.md](../01_guides/02_EXOMESH_PROVIDER_GUARD_SPEC.md) for the full threat model.

---

## Robinhood Chain Strategic Fit

| Layer | Role | Wallet Guard integration |
|-------|------|------------------------|
| **Robinhood Chain (46630 / 4663)** | Permissioned institutional ingress | Reference escort adapter — outbound-only to Arbitrum One (`42161`) |
| **Arbitrum One** | Primary execution anchor | GMX v2 · Gate domain · soil lane SSOT |
| **C-End wallets** | Retail + agentic copilots | EIP-1193 wrap via `withRetailGuardProvider` · EIP-6963 `announceGuardedProvider` |

The SDK is **chain-agnostic at the EIP-1193 layer** — any EVM wallet injecting `window.ethereum` can adopt the guard without migrating to a proprietary chain. Robinhood Chain remains the **compliance ingress reference**, not the middleware runtime requirement.

---

## Grant & Technical Positioning

### Buildathon Narrative

1. **Problem:** AI agents and retail wallets sign toxic calldata before any server simulation can warn.
2. **Solution:** Apache-2.0 EIP-1193 middleware with Wasm-accelerated reflex core ([pkg/soil_core.wasm](../../../pkg/soil_core.wasm)).
3. **Proof:** `npx vitest run tests/sdk/` → **48/48 PASS** · Permit2 · EIP-6963 · intent ring severance.

### Dual-Brand Positioning

| Brand | Audience | Positioning |
|-------|----------|-------|
| **EIP-1193 Agentic Wallet Guard** | Grant reviewers · brokerage pilots | Involuntary reflex arc for 50M+ retail wallets |
| **ExoMesh Agentic Guard (EIP-1193/5792/6963+)** | Wallet vendors · dApp integrators | Omni-chain middleware under Apache-2.0 |

### IP Boundary

| Layer | License | Distribution |
|-------|---------|--------------|
| TypeScript wrapper · calldata parser · policy gates | **Apache-2.0** | Open SDK · ecosystem adoption |
| [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) reflex math | Proprietary | Edge hot-path execution |

---

## TAM & Wedge Metrics

| Metric | Estimate | Source |
|--------|----------|--------|
| EVM wallet injectors (MetaMask-class) | 100M+ monthly active | Industry baseline |
| AI agent wallet frameworks (2026) | ElizaOS · LangChain · Virtuals · custom copilots | ExoMesh **EIP-1193 middleware** (`withRetailGuardProvider`) · optional server-side B2B hook |
| Pre-consensus intercept TAM | Every `eth_sendTransaction` + `eth_signTypedData_v4` + `wallet_sendCalls` | **ExoMesh Agentic Guard (EIP-1193/5792/6963+)** surface |
| Wasm bundle budget | **< 28 KiB** · warm **< 60 µs** | [pkg/soil_core.wasm](../../../pkg/soil_core.wasm) SSOT |

---

## Related Documents

| # | Document |
|---|----------|
| 01 | [01_SDK_INTEGRATION_BLUEPRINT.md](../01_guides/01_SDK_INTEGRATION_BLUEPRINT.md) |
| 03 | [03_ARCHITECTURE_AND_MOAT.md](./03_ARCHITECTURE_AND_MOAT.md) |
| 04 | [04_AI_INTENT_PROTECTION_MODEL.md](../01_guides/02_EXOMESH_PROVIDER_GUARD_SPEC.md) |
| — | [../00_ARB_Buildathon/SUBMISSION.md](../../00_ARB_Buildathon/SUBMISSION.md) |

---

*SilverVine Labs · Market Intelligence SSOT · 2026-09-10*
