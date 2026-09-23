#!/usr/bin/env tsx
/** Sanctuary Async Escort (ERC-7540+) — Usage: pnpm demo:sanctuary · JSON: pnpm demo:sanctuary -- --json */
import {
  ERC7540_CODES,
  computeErc7540SlippageDriftBps,
  encodeErc7540RequestDepositCalldata,
  encodeErc7540SetOperatorCalldata,
  evaluateErc7540AsyncEscortGuard,
  parseTransactionCalldata,
  type ParsedErc7540,
  type RetailGuardConfig,
} from "../src/sdk/exomesh-agentic-wallet-guard";
import { GREEN, RED } from "./adapters/exomesh-ansi-hud";
import { roundWasmUs } from "./lib/eip1193-extension-helpers";
import { ensureDemoWasmSoft, wrapDemoExecution } from "./lib/demo-harness";
import {
  captureDemoBenchmark,
  measureProbe,
  measureSync,
  type DemoBenchmarkSnapshot,
} from "./lib/demo-timing";
import {
  awaitDemoScenarioTransition,
  isDemoHudArgv,
  isDemoInteractiveArgv,
  isDemoJsonArgv,
  releaseDemoStdin,
} from "./lib/demo-utils";
import {
  awaitSanctuaryScenarioTransition,
  printSanctuaryBanner,
  printSanctuaryMatrixComplete,
  printSanctuaryProofHighlights,
  printSanctuaryScenario,
  SANCTUARY_SCENARIO_TITLES,
} from "./lib/sanctuary-demo-hud";
import {
  buildSanctuaryRunPayload,
  saveSanctuaryRunPayload,
  type SanctuaryScenarioJsonResult,
} from "./lib/sanctuary-run-persister";

const WALLET = "0x1111111111111111111111111111111111111111";
const VAULT = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const TRUSTED_OPERATOR = "0xdddddddddddddddddddddddddddddddddddddddd";
const MALICIOUS = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

type ScenarioOpts = { interactive: boolean };

function requireErc7540(parsed: ReturnType<typeof parseTransactionCalldata>): ParsedErc7540 {
  if (!parsed) {
    if (isDemoJsonArgv()) process.exit(1);
    console.error(`${RED}parse failed\x1b[0m`);
    process.exit(1);
  }
  return parsed as ParsedErc7540;
}

function baseConfig(overrides: Partial<RetailGuardConfig> = {}): RetailGuardConfig {
  return {
    walletAddress: WALLET,
    allowedOperators: [TRUSTED_OPERATOR.toLowerCase()],
    allowedVenues: [VAULT.toLowerCase()],
    erc7540MaxSlippageBps: 50,
    ...overrides,
  };
}

function captureSanctuaryBenchmark(): DemoBenchmarkSnapshot {
  const passCfg = baseConfig({
    erc7540AsyncQuote: { requestAmountWei: 1_000_000n, claimableAmountWei: 999_800n, maxSlippageBps: 50 },
  });
  const depositData = encodeErc7540RequestDepositCalldata(1_000_000n, TRUSTED_OPERATOR, WALLET);
  const operatorData = encodeErc7540SetOperatorCalldata(MALICIOUS, true);
  const driftCfg = baseConfig({
    erc7540AsyncQuote: { requestAmountWei: 1_000_000n, claimableAmountWei: 800_000n, maxSlippageBps: 50 },
  });
  const depositParsed = () => requireErc7540(parseTransactionCalldata({ to: VAULT, data: depositData }));
  const evalDeposit = () => evaluateErc7540AsyncEscortGuard(depositParsed(), passCfg);
  const evalOperator = () =>
    evaluateErc7540AsyncEscortGuard(
      requireErc7540(parseTransactionCalldata({ to: VAULT, data: operatorData })),
      baseConfig(),
    );
  const evalDrift = () => evaluateErc7540AsyncEscortGuard(depositParsed(), driftCfg);
  const stackE2e = () => { evalDeposit(); evalOperator(); evalDrift(); };
  const pureDrift = () => computeErc7540SlippageDriftBps(1_000_000n, 999_800n);
  return captureDemoBenchmark({
    warmup: () => { pureDrift(); stackE2e(); },
    pureInvariant: pureDrift,
    fullMatrix: evalDeposit,
    e2eHarness: stackE2e,
  });
}

function evalScenario(
  parsed: ParsedErc7540,
  cfg: RetailGuardConfig,
): { wasmUs: number; reject: ReturnType<typeof evaluateErc7540AsyncEscortGuard> } {
  const wasmUs = measureProbe(() => evaluateErc7540AsyncEscortGuard(parsed, cfg));
  const { value: reject } = measureSync(() => evaluateErc7540AsyncEscortGuard(parsed, cfg));
  return { wasmUs, reject };
}

function runScenarioA({ interactive }: ScenarioOpts): SanctuaryScenarioJsonResult {
  const amountWei = 1_000_000n;
  const claimableWei = 999_800n;
  const driftBps = computeErc7540SlippageDriftBps(amountWei, claimableWei);
  const data = encodeErc7540RequestDepositCalldata(amountWei, TRUSTED_OPERATOR, WALLET);
  const cfg = baseConfig({
    erc7540AsyncQuote: { requestAmountWei: amountWei, claimableAmountWei: claimableWei, maxSlippageBps: 50 },
  });
  const parsed = requireErc7540(parseTransactionCalldata({ to: VAULT, data }));
  const { wasmUs, reject } = evalScenario(parsed, cfg);
  if (interactive) {
    printSanctuaryScenario({
      id: "A",
      title: SANCTUARY_SCENARIO_TITLES.A,
      frameColor: GREEN,
      detailLines: [
        `target=${VAULT} · amount=${amountWei} wei · operator=${TRUSTED_OPERATOR}`,
        `Pending→Claimable: ${amountWei} → ${claimableWei} wei · drift=${driftBps} bps (≤50)`,
      ],
      wasmUs,
      pass: reject === null,
      resultLine: "ALLOW_DEPOSIT · escort_clear=true · 0-Gas pre-consensus passthrough",
    });
  }
  return {
    scenario: "A",
    status: "ALLOW_DEPOSIT",
    wasmUs: roundWasmUs(wasmUs),
    code: reject?.code ?? null,
    driftBps,
    selector: "requestDeposit(0xb2d9f201)",
  };
}

function runScenarioB({ interactive }: ScenarioOpts): SanctuaryScenarioJsonResult {
  const data = encodeErc7540SetOperatorCalldata(MALICIOUS, true);
  const parsed = requireErc7540(parseTransactionCalldata({ to: VAULT, data }));
  const { wasmUs, reject } = evalScenario(parsed, baseConfig());
  if (reject?.code !== ERC7540_CODES.OPERATOR_REJECTED) process.exit(1);
  if (interactive) {
    printSanctuaryScenario({
      id: "B",
      title: SANCTUARY_SCENARIO_TITLES.B,
      frameColor: RED,
      detailLines: [
        `target=${VAULT} · operator=${MALICIOUS} · approved=true`,
        `whitelist=${TRUSTED_OPERATOR} · 0xbbbb… ∉ allowedOperators`,
      ],
      wasmUs,
      pass: false,
      gateLine: "0-Gas intercept · operator not in allowedOperators",
      resultLine: `${reject.code} · malicious setOperator blocked before broadcast`,
    });
  }
  return {
    scenario: "B",
    status: "REJECT_OPERATOR",
    wasmUs: roundWasmUs(wasmUs),
    code: reject.code,
    operator: MALICIOUS,
    selector: "setOperator(0x9cc233d6)",
  };
}

function runScenarioC({ interactive }: ScenarioOpts): SanctuaryScenarioJsonResult {
  const amountWei = 1_000_000n;
  const claimableWei = 800_000n;
  const driftBps = computeErc7540SlippageDriftBps(amountWei, claimableWei);
  const data = encodeErc7540RequestDepositCalldata(amountWei, TRUSTED_OPERATOR, WALLET);
  const cfg = baseConfig({
    erc7540AsyncQuote: { requestAmountWei: amountWei, claimableAmountWei: claimableWei, maxSlippageBps: 50 },
  });
  const parsed = requireErc7540(parseTransactionCalldata({ to: VAULT, data }));
  const { wasmUs, reject } = evalScenario(parsed, cfg);
  if (reject?.code !== ERC7540_CODES.ASYNC_SLIPPAGE_DRIFT) process.exit(1);
  if (interactive) {
    printSanctuaryScenario({
      id: "C",
      title: SANCTUARY_SCENARIO_TITLES.C,
      frameColor: RED,
      detailLines: [
        `target=${VAULT} · selector=requestDeposit(0xb2d9f201)`,
        `Pending→Claimable: ${amountWei} → ${claimableWei} wei · drift=${driftBps} bps (>50)`,
      ],
      wasmUs,
      pass: false,
      gateLine: "async vault drift fail-closed · Pending→Claimable slip exceeds erc7540MaxSlippageBps",
      resultLine: `${reject.code} · high-slippage requestDeposit rejected (0-Gas)`,
    });
  }
  return {
    scenario: "C",
    status: "REJECT_SLIPPAGE",
    wasmUs: roundWasmUs(wasmUs),
    code: reject.code,
    driftBps,
    selector: "requestDeposit(0xb2d9f201)",
  };
}

wrapDemoExecution(async (ctx) => {
  const jsonMode = isDemoJsonArgv();
  const showHud = isDemoHudArgv();
  const pauseBetween = isDemoInteractiveArgv();
  ensureDemoWasmSoft();
  const benchmark = captureSanctuaryBenchmark();
  benchmark.pureInvariantUs = measureProbe(() => computeErc7540SlippageDriftBps(1_000_000n, 999_800n));

  if (showHud) {
    printSanctuaryBanner();
    printSanctuaryProofHighlights();
  }
  if (pauseBetween) await awaitDemoScenarioTransition("A", "begin");

  const results: SanctuaryScenarioJsonResult[] = [];
  results.push(runScenarioA({ interactive: showHud }));
  if (pauseBetween) await awaitSanctuaryScenarioTransition("B");
  results.push(runScenarioB({ interactive: showHud }));
  if (pauseBetween) await awaitSanctuaryScenarioTransition("C");
  results.push(runScenarioC({ interactive: showHud }));

  const payload = buildSanctuaryRunPayload(results, benchmark);

  if (jsonMode) {
    saveSanctuaryRunPayload(payload);
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    releaseDemoStdin();
    return { tripped: false, suppressInterceptBanner: true };
  }

  printSanctuaryMatrixComplete();
  saveSanctuaryRunPayload(payload);
  releaseDemoStdin();
});
