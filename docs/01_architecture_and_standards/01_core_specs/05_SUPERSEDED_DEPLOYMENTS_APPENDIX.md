# Superseded On-Chain Deployments (Audit Appendix)

> **Audience:** Arbiscan diligence · grant milestone receipts · indexer reconciliation.  
> **Do not wire** these addresses in SDK, Worker, or new integrations.  
> **Live SSOT:** [03_CONTRACT_DEPLOYMENT_MATRIX.md](./03_CONTRACT_DEPLOYMENT_MATRIX.md) · [src/config/contract-deployments.ts](../../../src/config/contract-deployments.ts)

**Migration (2026-09-17):** ExoMesh redeploy · EIP-712 domain `SliverVineExoMesh`. Contracts below remain **immutable on-chain** from earlier Sanctuary-era deploys; they are listed here so reviewers can reconcile Arbiscan without confusing them with live anchors.

---

## Superseded contract addresses

| Contract | Address | Network | Notes |
|----------|---------|---------|-------|
| SliverVineGate (Sanctuary) | [0xb174118bC0B84e8D6D59EEF2339e29bF7FCf8BF1](https://arbiscan.io/address/0xb174118bc0b84e8d6d59eef2339e29bf7fcf8bf1) | 42161 + 421614 | Legacy dual-deploy · domain `SliverVineExoMesh` |
| PolicyGuardV2 v0 | [0xfd98cadb7018f692ec58cd4359e0c0399f4f8781](https://arbiscan.io/address/0xfd98cadb7018f692ec58cd4359e0c0399f4f8781) | 42161 | `stylusCoprocessor=0` |
| GatePolicyLink v0 | [0xe4ef5350963241c49a29e72a4cf093208cd19af0](https://arbiscan.io/address/0xe4ef5350963241c49a29e72a4cf093208cd19af0) | 42161 | Sanctuary Gate binding helper |
| GmxSoilMatrixSwitch v0 | [0x4129aee97e68aa3712c56fe9ec48bf369782f99b](https://arbiscan.io/address/0x4129aee97e68aa3712c56fe9ec48bf369782f99b) | 42161 | |
| RiskOracleV2 v0 | [0xfadb14759a3d3c7e976697de61bf62627f14ec93](https://arbiscan.io/address/0xfadb14759a3d3c7e976697de61bf62627f14ec93) | 42161 | |
| PolicyGuard v1 | [0xc66f96611a737c4e58706d0955594456eab88959](https://sepolia.arbiscan.io/address/0xc66f96611a737c4e58706d0955594456eab88959) | 42161 | Mainnet only (≠ Sepolia ExoMesh Gate same hex) |
| PolicyGuard v0 | [0x3e4298e2b8d4e30396a54c1817eb71c9272ffb4b](https://sepolia.arbiscan.io/address/0x3e4298e2b8d4e30396a54c1817eb71c9272ffb4b) | 42161 | |
| RiskOracle v0 (Sepolia) | [0x3FFa2539f502682E8145e6Eb427ff78d258D53a4](https://sepolia.arbiscan.io/address/0x3ffa2539f502682e8145e6eb427ff78d258d53a4) | 421614 | |
| IngressSafetySwitch v0 (Sepolia) | [0x3E4298e2b8d4e30396A54C1817Eb71c9272Ffb4B](https://sepolia.arbiscan.io/address/0x3e4298e2b8d4e30396a54c1817eb71c9272ffb4b) | 421614 | |

---

## Milestone & deploy receipts

| Event | Tx / block | Notes |
|-------|------------|-------|
| **M6 Sanctuary Gate ignition** | [Tx [0x54c153…b0c6](https://arbiscan.io/tx/0x54c153e9a41f704b5eb0ae554eac593d1110d62bd826ff094e72f2bd60c1b0c6)](https://arbiscan.io/tx/0x54c153e9a41f704b5eb0ae554eac593d1110d62bd826ff094e72f2bd60c1b0c6) | Created Gate `0xb174…` on 42161 |
| **GMX invariant stack v0 bundle** | blocks **503074231–503074255** | OracleV2 `0xfadb…` · Matrix `0x4129…` · PolicyGuardV2 `0xfd98…` |
| **Sanctuary Gate ↔ PolicyGuardV2 link** | [setPolicyGuard `0x1b158a4a…`](https://arbiscan.io/tx/0x1b158a4a40409e39215b76b5b12693c2802b49b190ecc0be97c986f167b9a182) | Via PolicyLink `0xe4ef…` on Sanctuary Gate |
| **ExoMesh Gate ↔ PolicyGuardV2 link** | [setPolicyGuard `0x67507851…`](https://arbiscan.io/tx/0x6750785188fe72f137dbf140b70cdd3b8094df62db1d86339194245cb0dba0ba) | Native setter on Gate `0x71D7…` (**live**) |

---

## GMX invariant stack v0 deploy txs (superseded stack)

| Contract | Deploy Tx |
|----------|-----------|
| RiskOracleV2 v0 | [0x8f5d79e5…](https://arbiscan.io/tx/0x8f5d79e538ed65f863b1fdfc10d2dacf387b07c5cb7b3eb127afa835a27686ab) |
| GmxSoilMatrixSwitch v0 | [0x6790c2b8…](https://arbiscan.io/tx/0x6790c2b8ea23ba02640c87f06e774f093061d3d98b462caa9bd84f48a24d63ab) |
| PolicyGuardV2 v0 | [0xcd520602…](https://arbiscan.io/tx/0xcd520602a277c0781038552d5692f5ad43076a8928f5e7384e695642f980306a) |
