# Contract Deployment Matrix — Mainnet & Sepolia SSOT

> **Code SSOT:** [src/config/contract-deployments.ts](../../../src/config/contract-deployments.ts) · **SDK re-exports:** [src/sdk/constants.ts](../../../src/sdk/constants.ts)  
> **Extended proofs:** [01_ON_CHAIN_MAINNET_ANCHORS.md](../../03_product_verifications/shared_proofs/01_ON_CHAIN_MAINNET_ANCHORS.md) · [SUBMISSION_GRANT_APPENDIX.md](../../00_ARB_Buildathon/SUBMISSION_GRANT_APPENDIX.md)  
> **Demo playbook:** [02_CLI_DEMO_RUNBOOK.md](../../03_product_verifications/02_CLI_DEMO_RUNBOOK.md)  
> **Legacy / superseded (audit only):** [05_SUPERSEDED_DEPLOYMENTS_APPENDIX.md](./05_SUPERSEDED_DEPLOYMENTS_APPENDIX.md)

**Updated:** 2026-09-17 · **EIP-712 domain:** `SliverVineExoMesh` v1 · **Networks:** Arbitrum One `42161` · Arbitrum Sepolia `421614`

> **Migration:** ExoMesh redeploy Sep 2026 — wire **live tables below only**. Sanctuary-era contracts remain on Arbiscan for milestone proof; SDK does **not** wire them → [superseded appendix](./05_SUPERSEDED_DEPLOYMENTS_APPENDIX.md).

---

## Network Legend

| Badge | Chain | Role |
|-------|-------|------|
| `MAINNET` | Arbitrum One `42161` | Production anchors · GMX GM I/O · PolicyGuardV2 · Stylus coprocessor |
| `SEPOLIA` | Arbitrum Sepolia `421614` | Gate telemetry · Sanctuary ingress sandbox · Module B demos |

> **Important:** Sepolia is **not** a full clone of mainnet. It intentionally ships a **lighter** on-chain stack. Off-chain ExoMesh (Wasm / SDK) runs on **both** networks without extra deploys.

---

## Live Deployments — Arbitrum One (`42161`)

| Contract | Address | Role |
|----------|---------|------|
| **SliverVineGate** (ExoMesh) | [0x71D7d26f98110c5DE3df0fCbddCf2A3A2BC6e2f1](https://arbiscan.io/address/0x71d7d26f98110c5de3df0fcbddcf2a3a2bc6e2f1) | EIP-712 consume-once attestation · domain `SliverVineExoMesh` |
| **SliverVineAgentPolicyGuardV2** | [0x5df192f9454fd02a89e768632cb5da0762a774bc](https://arbiscan.io/address/0x5df192f9454fd02a89e768632cb5da0762a774bc) | ERC-8196 + GMX wire invariants · **Stylus wired** |
| **SliverVineRiskOracleV2** | [0xc7f577ac7e1270e6e99e1b700301c25e98df2456](https://arbiscan.io/address/0xc7f577ac7e1270e6e99e1b700301c25e98df2456) | Risk oracle feed for PolicyGuardV2 |
| **GmxSoilMatrixSwitch** | [0xd840ad013d3be8a363d537a80d5ea8700f7a34c4](https://arbiscan.io/address/0xd840ad013d3be8a363d537a80d5ea8700f7a34c4) | Defense matrix single-SLOAD bitmap |
| **SliverVineSoilCoprocessor** (Stylus) | [0xc23587d6573dd134f95b02b0202ffbf84686625e](https://arbiscan.io/address/0xc23587d6573dd134f95b02b0202ffbf84686625e) | On-chain soil coprocessor (Engine A) · **mainnet only** |

**Deploy harness:** `SliverVineGate/script/DeployArbitrumOneGate.s.sol` · `scripts/deploy-policy-guard-v2-mainnet.ts` · `scripts/link-gate-policy-guard-v2.ts` · `scripts/deploy-stylus-mainnet.ts`

**domainSeparator (Gate):** `0xf866d2f8ccb8e567fac3e781b816a26a7fe86fbf15453c23a1594f0987a8233c`

### Embedded libraries (no separate deploy)

| Module | Role |
|--------|------|
| `GmxRiskInvariantLib` | Pure Solidity GMX wire invariants inside PolicyGuardV2 bytecode |
| `GmxMulticallDecodeLib` | GMX multicall decode helpers |

---

## Live Deployments — Arbitrum Sepolia (`421614`)

| Contract | Address | Role |
|----------|---------|------|
| **SliverVineGate** (ExoMesh) | [0xc66F96611a737c4e58706D0955594456eAb88959](https://sepolia.arbiscan.io/address/0xc66f96611a737c4e58706d0955594456eab88959) | EIP-712 consume-once attestation · domain `SliverVineExoMesh` |
| **SliverVineRiskOracle** | [0x6CA7eA722F139F3C23280ebc973caff3B17d8fEa](https://sepolia.arbiscan.io/address/0x6ca7ea722f139f3c23280ebc973caff3b17d8fea) | EIP-712 offline risk report · `STATUS_SHUTDOWN` flush |
| **IngressSafetySwitch** | [0xc1Eb1624A3A93e969De57466b1CDbD0e0189D192](https://sepolia.arbiscan.io/address/0xc1eb1624a3a93e969de57466b1cdbd0e0189d192) | Pillar Set X compliance · async escort ingress |
| **Sepolia deployer / admin** | `0xbd65d785Dac74EBa9efFdB357b2dC52fCC26EC7F` | Forge broadcast signer |

**Deploy harness:** `scripts/deploy-sepolia-gate.sol`

**domainSeparator (Gate):** `0x411948a5917ff9bb6a62735a498edc0e1b9f64f5a7d1366863a72a539aaadae3`

**Sepolia does NOT deploy:** PolicyGuardV2 · GmxSoilMatrixSwitch · RiskOracleV2 · Stylus Soil Coprocessor

---

## Demo Playbook — Do You Need Full Mainnet on Sepolia?

**No.** The product demo is **layered by design**.

| What you demo | Needs on-chain? | Network | Command / path |
|---------------|-----------------|---------|----------------|
| **Module A — ExoMesh 0-Gas intercept** | ❌ Off-chain only | Any (no RPC) | `pnpm demo:exomesh` · `pnpm demo:gmx -- --trip` · Vitest SDK |
| **Module A — AI agent severance** | ❌ Off-chain only | Any | `pnpm demo:agent -- --trip` |
| **Module B — Sanctuary ERC-7540 escort** | ❌ Off-chain logic | Any | `pnpm demo:sanctuary` |
| **Module B — Ingress AML escort** | ❌ Off-chain logic | Any | `pnpm demo:ingress` |
| **On-chain Gate telemetry** | ✅ Sepolia Gate only | **421614** | `npx tsx scripts/emit-sepolia-telemetry-events.ts` |
| **Dune `IntentAttested` / `RiskTripBlocked`** | ✅ Sepolia Gate | **421614** | Same script with `BROADCAST=1` |
| **Sanctuary ingress (on-chain switch)** | ✅ Sepolia Oracle + Switch | **421614** | Custom script / cast against live addresses |
| **GMX micro-fill + PolicyGuard + Stylus** | ✅ Full mainnet stack | **42161** | `pnpm execute:gmx:micro-fill` (armed live) |

### Mental model

```text
Judge / grant demo (recommended)
├── 90% story: off-chain ExoMesh     → pnpm demo:exomesh  (you already did this ✓)
├── 10% on-chain proof (Sepolia):   → emit-sepolia-telemetry-events
└── optional production capstone:   → mainnet micro-fill (small $, not required for narrative)

Sepolia alone CANNOT replay GMX+PolicyGuard+Stylus — that path is mainnet-only by design.
You do NOT need to redeploy mainnet contracts onto Sepolia to prove Module A.
```

---

## Module Mapping

| Module | Off-chain | Sepolia on-chain | Mainnet on-chain |
|--------|-----------|------------------|------------------|
| **A — ExoMesh** | Wasm · SDK · Worker | Gate (attestation / events) | Gate · PolicyGuardV2 · Stylus |
| **B — Sanctuary** | ERC-7540 demos | IngressSwitch · RiskOracle | (ingress mainnet TBD) |

---

## Environment Variables (RPC SSOT)

| Variable | Network | Purpose |
|----------|---------|---------|
| `ARB_MAINNET_RPC_URL` | `42161` | Mainnet deploy / GMX GM scripts |
| `ARB_SEPOLIA_RPC_URL` | `421614` | Sepolia Gate telemetry · stabilizer demos |
| `MAINNET_PK` / `PRIVATE_KEY` | both | Armed broadcast (`BROADCAST=1` + confirm flags) |
| `SLIVERVINE_GATE_ADDRESS` | override | Optional Worker env → `gate-domain-fingerprint.ts` |

See [.env.example](../../../.env.example) for full RPC / WSS placeholders.

---

## Verification Commands

```bash
pnpm exec tsc --noEmit
npx vitest run tests/config/contract-deployments.test.ts
cd SliverVineGate && forge test
pnpm deploy:stylus:mainnet          # dry-run Stylus preflight (mainnet)
ARB_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc \
  npx tsx scripts/emit-sepolia-telemetry-events.ts   # Sepolia Gate telemetry read
```
