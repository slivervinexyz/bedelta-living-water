# AI Agent Intent Protection — ExoMesh Agentic Guard (EIP-1193/5792/6963+)

> **License:** Apache-2.0 wrapper · proprietary reflex math compiled in [pkg/soil_core.wasm](../../../pkg/soil_core.wasm)  
> **Package:** `@slivervine/exomesh-agentic-wallet-guard`

The EIP-1193 Agentic Wallet Guard SDK is a **pre-broadcast involuntary reflex arc** for AI-assisted retail wallets. It intercepts EIP-1193 `eth_sendTransaction`, `eth_signTypedData_v4`, and [EIP-5792](https://eips.ethereum.org/EIPS/eip-5792) `wallet_sendCalls` **before** the host wallet signs — enforcing fail-closed gates with **zero on-chain gas** on rejection paths.

## Threat Model — LLM / Agent Hallucination Classes

| Hallucination class | Guard surface | SSOT mechanism |
|---------------------|---------------|----------------|
| **Atomic batch hide (wallet_sendCalls)** | EIP-5792 `wallet_sendCalls` | `evaluateEip5792WalletSendCalls` · unfold `calls[]` · `SEND_CALLS_BATCH_REJECTED` |
| **Unauthorized EIP-712 domain / verifyingContract** | `eth_signTypedData_v4` | `evaluateRetailVenueAllowlist` · `VENUE_DRIFT_REJECTED` |
| **Permit phishing (message.spender drift)** | EIP-712 Permit payloads | `allowedSpenders[]` cross-check |
| **Honeypot / toxic slippage trade** | Swap `eth_sendTransaction` | `evaluateSoilSlippagePacked` / Wasm `soil_core_eval` |
| **Infinite retry / FOMO storm** | All guarded methods | `INTENT_RING_U32` · `trackAttemptBudgetU32Pure` · channel sever |

## Architecture — Apache Wrapper vs Wasm IP Core

```text
[EIP-1193 Provider] → withRetailGuardProvider (Apache-2.0 TS)
    → calldata-parser (bitwise u32 selectors)
    → guard-engine (policy + scratch buffers)
    → wasm-adapter → pkg/soil_core.wasm (proprietary reflex math)
    → [PASS] forward to base wallet provider
    → [FAIL] RetailGuardRejectedError + plainTextWarning (0-Gas)
```

## Scratch Buffer SSOT

| Buffer | Source | Role |
|--------|--------|------|
| `SOIL_FFI_REUSABLE_BUFFER` | [wasm-soil-ffi.ts](../../../src/core/wasm-soil-ffi.ts) | Zero-alloc SSRC soil input encode |
| `INTENT_RING_U32` | [intent-core-buffers.ts](../../../src/core/intent-core-buffers.ts) | O(1) attempt budget + venue bitmask hot path |
| `CALLDATA_SCRATCH` | [calldata-parser.ts](../../../src/sdk/exomesh-agentic-wallet-guard/calldata-parser.ts) | Reusable byte view for selector / ABI decode |

---

## Related Documents

| # | Document |
|---|----------|
| — | [README.md](../README.md) |
| 01 | [01_SDK_INTEGRATION_BLUEPRINT.md](./01_SDK_INTEGRATION_BLUEPRINT.md) |
| 02 | [02_MARKET_INTELLIGENCE_AND_COMPETITOR_AUDIT.md](../02_specs_and_research/02_MARKET_INTELLIGENCE_AND_COMPETITOR_AUDIT.md) |
| 03 | [03_ARCHITECTURE_AND_MOAT.md](../02_specs_and_research/03_ARCHITECTURE_AND_MOAT.md) |
