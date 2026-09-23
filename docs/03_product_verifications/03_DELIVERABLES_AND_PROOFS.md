# Deliverables and Proofs

> **Audience:** Buildathon judges · wallet integrators · grant evaluators · anyone asking *"Is this a half-built dApp?"*  
> **Related:** [JUDGE_BRIEF.md](../../JUDGE_BRIEF.md) · [02_CLI_DEMO_RUNBOOK.md](./02_CLI_DEMO_RUNBOOK.md) · [Adversarial Boundary Matrix](./module_a_exomesh/01_ADVERSARIAL_BOUNDARY_MATRIX.md)

---

## 1. What We Ship (Finished SKU)

SliverVine ExoMesh is a **pre-consensus intent firewall SKU** — not a consumer dApp. Integrators import the SDK; end users keep MetaMask / Rabby / ZeroDev.

| Deliverable | Type | Proof |
|-------------|------|-------|
| `@slivervine/exomesh-agentic-wallet-guard` | **Primary C-end SKU** — EIP-1193+ pre-sign guard (`withRetailGuardProvider`) · wiring → [03_WALLET_INTEGRATION_AND_INSTALL_GUIDE.md](../02_sdk_and_integrations/01_guides/03_WALLET_INTEGRATION_AND_INSTALL_GUIDE.md) | `npx vitest run tests/sdk/retail-guard-provider.test.ts` **35/35** · `pnpm demo:FW-11-ui` |
| `pkg/soil_core.wasm` (SSRC) | Reflex engine — sub-15µs warm soil path | `pnpm demo:gmx -- --trip` · Wasm unit tests |
| On-chain anchors (PolicyGuardV2, Stylus) | Deployment proof — settlement layer, not the guard runtime | [01_ON_CHAIN_MAINNET_ANCHORS.md](./shared_proofs/01_ON_CHAIN_MAINNET_ANCHORS.md) |
| SliverVine Sanctuary (Module B) | **Complement** — ERC-7540+ async vault escort | `pnpm demo:sanctuary` · `pnpm demo:ingress` |

**One-line integration:**

```ts
import { withRetailGuardProvider } from "@slivervine/exomesh-agentic-wallet-guard";
const ethereum = withRetailGuardProvider(window.ethereum, config);
// toxic calldata → throw RetailGuardRejectedError · $0 Gas · never broadcast
```

> **We ship a finished security SKU.** Demos and Vitest suites are **regression instruments** for the FW-01–16 adversarial matrix — not separate consumer apps.

**Vitest SSOT:** **254 test files | 1206 PASS clean (100%)** · `pnpm test -- --run`

### Proof lanes (engineering honesty)

| Lane | Command / artifact | Role |
|------|-------------------|------|
| **1 — Authoritative** | `npx vitest run tests/sdk/retail-guard-provider.test.ts` | FW-11 approve gate (**35/35**) — same SDK as production wrap |
| **2 — Visual harness** | `pnpm demo:FW-11-ui` · optional `pnpm test:e2e` | Mock EIP-1193 (`eth_accounts` stub) — **not** MetaMask · `preferWasm: false` |
| **3 — Integration sample** | `src/extension/` · `pnpm build:extension` | Load-unpacked MV3 scaffold — **not** Chrome Web Store · wiring → [03_WALLET_INTEGRATION_AND_INSTALL_GUIDE.md](../02_sdk_and_integrations/01_guides/03_WALLET_INTEGRATION_AND_INSTALL_GUIDE.md) Path C |
| **4 — Wasm depth** | `pnpm demo:gmx -- --trip` | `soil_core.wasm` soil path — **not** required for FW-11 click demo |
| **5 — Dune (optional)** | [Operational Shield](https://dune.com/silvervinelabs/slivervine-protocol) · [SEPSB](https://dune.com/silvervinelabs/slivervine-sepsb-stress) | Off-chain **simulated** telemetry appendix — verify `pnpm docs:dune-reconcile` · not judge primary proof |

---

## 2. What We Are NOT

- **Not a consumer dApp** — we do not ask users to "install SliverVine Protocol" or switch wallets.
- **Not a Blockaid-class server scanner** — we enforce policy **client-side** at the EIP-1193 signing boundary (0-Gas on reject; no 200–800ms API round-trip).
- **Not claiming execution = guard** — GMX/Pendle mainnet fills prove *settlement capability*; guard failure modes are proven via SDK tests and `--trip` CLI demos. See [02_LIVE_FIRE_EVIDENCE.md](./shared_proofs/02_LIVE_FIRE_EVIDENCE.md) (*execution ≠ guard*).
- **Not claiming FW-11-ui uses `soil_core.wasm`** — browser demo uses TS approve gate (`preferWasm: false` + browser wasm shim).
- **Not a Chrome Web Store SKU** — `src/extension/` is a wallet-integration **sample scaffold** only.
- **Not a substitute for a 30s submission video** — `demo:FW-11-ui` is a local judge visual; recorded SKU reel remains separate.

---

## 3. Why So Many Demos?

A single firewall must defend **many attack surfaces**. Each runnable demo maps to a row in the [Adversarial Boundary Matrix (FW-01–FW-16)](./module_a_exomesh/01_ADVERSARIAL_BOUNDARY_MATRIX.md):

| Attack surface | FW ID | Typical proof |
|----------------|-------|---------------|
| Permit2 / infinite approve phishing | FW-11 | `pnpm demo:FW-11` · `pnpm demo:FW-11-ui` |
| EIP-5792 batch smuggling | FW-12 | `pnpm demo:FW-12` |
| AI retry-storm / 4th-strike sever | FW-13 | `pnpm demo:FW-13` · `demo:exomesh` Scenario D |
| Stale oracle / delayed feed | FW-01 | `pnpm demo:FW-01` |
| RPC poisoning / defense DOS | FW-04 | `pnpm demo:FW-04` |
| 5-venue soil / slippage drift | Scenario B | `pnpm demo:gmx -- --trip` · venue matrix |
| ERC-7540 operator hijack | FW-14 | `pnpm demo:FW-14` · `pnpm demo:sanctuary` |

**We would prefer fewer entrypoints** — but removing demos would leave FW rows unproven. The compromise:

- **Judges:** 60-second path (Module A) · 120-second Dual Pillar path (Module A + B) below.
- **Auditors / CI:** full Tier 1–3 matrix in [02_CLI_DEMO_RUNBOOK.md](./02_CLI_DEMO_RUNBOOK.md).

```text
 ONE firewall SKU
      │
      ├── FW-11 UI / 35-35 tests     (retail approve gate)
      ├── demo:exomesh --json        (Scenario A–D matrix)
      ├── demo:gmx --trip            (soil Wasm depth)
      └── FW-01..16 matrix           (full adversarial regression)
```

---

## 4. Judge Paths

### 4a. Judge 60s — Live terminal (Module A · minimal)

Run at the booth or in a live review. **No browser.** Interactive ENTER pauses OK (~90–120s).

```bash
pnpm demo:exomesh
pnpm demo:gmx -- --trip
pnpm demo:pendle -- --trip  # 5-Core matrix also includes usdai · hl · variational — see README § 5-Core Venue Execution Matrix
npx vitest run tests/sdk/retail-guard-provider.test.ts
# ODA map: steps 1–3 → Act gate · step 4 → Inspect
# Expected: Tests  35 passed (35)
```

→ Full table: [JUDGE_BRIEF.md § Judge 60s](../../JUDGE_BRIEF.md) · Optional ODA one-liner: [JUDGE_BRIEF § Agent Harness ODA](../../JUDGE_BRIEF.md)

### 4b. Dual Pillar 120s — Demo video (Module A + B)

HackQuest **Demo Video (120s)** · terminal only · use **`--non-interactive`** to skip ENTER pauses.

```bash
pnpm demo:exomesh -- --non-interactive
pnpm demo:gmx -- --trip
npx vitest run tests/sdk/retail-guard-provider.test.ts
pnpm demo:sanctuary -- --non-interactive
pnpm demo:ingress -- --non-interactive   # full A-C incl AML — NOT --trip
```

→ Full table: [JUDGE_BRIEF.md § Dual Pillar 120s](../../JUDGE_BRIEF.md)

**Optional depth (one line each):**

| Command | Proves |
|---------|--------|
| `pnpm demo:FW-11-ui` | Mock browser toast harness (not 120s primary path) |
| `pnpm demo:exomesh -- --json` | Structured FAIL_CLOSED export (CI / Dune) |
| `pnpm test:e2e` | Automated FW-11-ui click → intercept toast (Playwright) |
| `pnpm demo:FW-11` | Alias for retail-guard **35/35** |

---

## 5. Full Regression (optional — not judge-required)

For auditors and CI only:

- [02_CLI_DEMO_RUNBOOK.md](./02_CLI_DEMO_RUNBOOK.md) — Tier 0–3 · Zone A/B venue loops
- [01_VERIFICATION_MATRIX.md](./01_VERIFICATION_MATRIX.md) — express verification hub
- `pnpm test -- --run` — **254 files / 1206 PASS** full regression

**Appendix demos** (`pnpm demo:delta-neutral`, live mainnet tx hashes) demonstrate *execution workflows* — they are **not** the primary guard proof path.
