#!/usr/bin/env tsx
/** ExoMesh Agentic Guard Demo — Usage: pnpm demo:exomesh · JSON: --json · Bench: --bench · Trip: --trip */
import { INTENT_MAX_ATTEMPTS_DEFAULT } from "../src/core/wasm-intent-ffi";
import {
  __resetRetailGuardStateForTests,
  encodePermit2ApproveCalldata,
  evaluateErc7683CrossChainIntentGuard,
  evaluateRetailApproveGate,
  evaluateRetailSoilGate,
  evaluateRetailVenueAllowlist,
  isRetailGuardChannelSevered,
  parseTransactionCalldata,
  parseTypedDataPayload,
  RetailGuardRejectedError,
  SELECTOR_GMX_MULTICALL,
  UINT160_MAX,
  withRetailGuardProvider,
} from "../src/sdk/exomesh-agentic-wallet-guard";
import { BOLD, GRAY, GREEN, R, RED, YELLOW } from "./adapters/exomesh-ansi-hud";
import {
  awaitScenarioRecordingTransition,
  featureMetric,
  buildPhishingTypedData,
  crossVenueSlippagePct,
  degradedDemoConfig,
  demoConfig,
  eipTag,
  EIP1193_DEMO,
  type Eip1193ScenarioJsonResult,
  formatIntentUsd,
  isDemoJsonArgv,
  measureWasmSoilUs,
  printExomeshProofHighlights,
  printFeatureBanner,
  printChannelOpen,
  printDefenseMatrixHeader,
  printDefenseMatrixLine,
  printDuneTelemetry,
  printEip1193Ingress,
  printEip6963Discovery,
  printEipCoverageMap,
  printForwardGate,
  printScenarioEipEnhancement,
  printMainnetAnchors,
  printPayloadBox,
  printPreConsensusProofBox,
  printV8ShellOverhead,
  printProductionPlainTextWarning,
  rejectCode,
  releaseDemoStdin,
  resolveDegradedSoftThresholdPct,
  resolveIntentPrincipalUsd,
  roundWasmUs,
  wrapGuarded,
} from "./lib/eip1193-extension-helpers";
import { printOpSecFootnote } from "./lib/demo-module-banners";
import { hrtimeElapsedUs, hrtimeStart } from "./lib/demo-timing";
import { saveExomeshRunPayload } from "./lib/exomesh-run-persister";
import { isDemoTripArgv, wrapDemoExecution, type DemoEnvironment } from "./lib/demo-harness";
import {
  awaitDemoScenarioTransition,
  isDemoHudArgv,
  isDemoInteractiveArgv,
} from "./lib/demo-utils";

const RETAIL_GUARD_AGENT_ID = "retail-guard";
const SCENARIO_RULE = "═".repeat(88);

const SCENARIO_LABELS = {
  A: "🟢 ALLOW_PASSTHROUGH (Healthy Intent)",
  B: "🟡 DEGRADED_WARN (High-Slippage Warning)",
  C: "🛑 FAIL_CLOSED_INTERCEPT (Toxic Intent Interception)",
  D: "🔒 CHANNEL_SEVERED (Hot-Key Circuit Breaker)",
} as const;

type ScenarioOpts = { interactive: boolean };
type ScenarioCtxOpts = ScenarioOpts & { ctx: DemoEnvironment };

function printScenarioHeader(id: keyof typeof SCENARIO_LABELS, color: string): void {
  console.log(`\n${SCENARIO_RULE}`);
  console.log(`${color}${BOLD}Scenario ${id}: ${SCENARIO_LABELS[id]}${R}`);
  console.log(`${SCENARIO_RULE}\n`);
}

function buildGmxDepositTx() {
  return {
    from: EIP1193_DEMO.wallet,
    to: EIP1193_DEMO.gmxGmVault,
    data: SELECTOR_GMX_MULTICALL + "0".repeat(128),
  };
}

async function runScenarioA({ interactive }: ScenarioOpts): Promise<Eip1193ScenarioJsonResult> {
  if (interactive) {
    printScenarioHeader("A", GREEN);
    printScenarioEipEnhancement("A");
  }
  __resetRetailGuardStateForTests();
  const cfg = demoConfig();
  if (interactive) {
    printMainnetAnchors();
    printEip6963Discovery();
    printEip1193Ingress("eth_sendTransaction");
    console.log(
      `${eipTag("INTENT PAYLOAD")} Deposit ${formatIntentUsd(resolveIntentPrincipalUsd())} into GMX ETH/USDC GM Vault (${EIP1193_DEMO.gmxGmVault})`,
    );
  }
  const tx = buildGmxDepositTx();
  const wasmUs = measureWasmSoilUs(cfg);
  const soilClean = evaluateRetailSoilGate(cfg.soilQuote!, false) === null;
  const guarded = wrapGuarded({ request: async () => "0xdeadbeef" }, cfg);
  if (interactive) {
    printPayloadBox(EIP1193_DEMO.arbChainId, wasmUs, soilClean);
    const t0 = hrtimeStart();
    await guarded.request({ method: "eth_sendTransaction", params: [tx] });
    printV8ShellOverhead(hrtimeElapsedUs(t0), wasmUs);
    printChannelOpen(soilClean ? 100 : 0);
    printForwardGate();
    console.log(`\n${GREEN}${BOLD}RESULT: 🟢 EIP-1193 PASSTHROUGH ALLOWED (Pre-Consensus Verified Clean)${R}`);
    printOpSecFootnote();
  } else {
    await guarded.request({ method: "eth_sendTransaction", params: [tx] });
  }
  return { scenario: "A", status: "ALLOW_PASSTHROUGH", wasmUs: roundWasmUs(wasmUs), code: null, plainTextWarning: null };
}

async function runScenarioB({ interactive }: ScenarioOpts): Promise<Eip1193ScenarioJsonResult> {
  if (interactive) {
    printScenarioHeader("B", YELLOW);
    printScenarioEipEnhancement("B");
  }
  __resetRetailGuardStateForTests();
  const cfg = degradedDemoConfig();
  const softPct = resolveDegradedSoftThresholdPct();
  const slipPct = crossVenueSlippagePct(cfg);
  if (interactive) {
    printEip1193Ingress("eth_sendTransaction");
    console.log(
      `${YELLOW}${BOLD}[DEMO MONITOR PREVIEW] [DEGRADED WARN]${R} Slippage (${slipPct.toFixed(2)}%) exceeds soft threshold (${softPct.toFixed(2)}%) — Execution allowed with warning logged`,
    );
  }
  const tx = buildGmxDepositTx();
  const wasmUs = measureWasmSoilUs(cfg);
  const soilClean = evaluateRetailSoilGate(cfg.soilQuote!, false) === null;
  const guarded = wrapGuarded({ request: async () => "0xdegraded" }, cfg);
  if (interactive) {
    printPayloadBox(EIP1193_DEMO.arbChainId, wasmUs, soilClean);
    const t0 = hrtimeStart();
    await guarded.request({ method: "eth_sendTransaction", params: [tx] });
    printV8ShellOverhead(hrtimeElapsedUs(t0), wasmUs);
    printForwardGate();
    console.log(`\n${YELLOW}${BOLD}RESULT: 🟡 DEGRADED_WARN (High-Slippage Monitor · Passthrough Continues)${R}`);
    printOpSecFootnote();
  } else {
    await guarded.request({ method: "eth_sendTransaction", params: [tx] });
  }
  return { scenario: "B", status: "DEGRADED_WARN", wasmUs: roundWasmUs(wasmUs), code: null, plainTextWarning: null };
}

async function runScenarioC({ interactive, ctx }: ScenarioCtxOpts): Promise<Eip1193ScenarioJsonResult> {
  if (interactive) {
    printScenarioHeader("C", RED);
    printScenarioEipEnhancement("C");
  }
  __resetRetailGuardStateForTests();
  const principalUsd = resolveIntentPrincipalUsd();
  const cfg = demoConfig();
  const typedData = buildPhishingTypedData();
  if (interactive) {
    printEip1193Ingress("eth_signTypedData_v4");
    console.log(
      `${eipTag("INTENT VALUATION")} Phishing Cross-Venue Route | Attempted Exposure: ${formatIntentUsd(principalUsd)}`,
    );
  }

  const td = parseTypedDataPayload([EIP1193_DEMO.wallet, typedData]);
  const eip712 = evaluateRetailVenueAllowlist(td.verifyingContract ?? EIP1193_DEMO.malicious, cfg);
  const permit2Parsed = parseTransactionCalldata({
    to: EIP1193_DEMO.permit2,
    data: encodePermit2ApproveCalldata(EIP1193_DEMO.usdc, EIP1193_DEMO.malicious, UINT160_MAX),
  });
  const permit2 =
    permit2Parsed?.kind === "permit2_approve"
      ? evaluateRetailApproveGate(
          {
            kind: "approve",
            token: permit2Parsed.token,
            spender: permit2Parsed.spender,
            amountWei: permit2Parsed.amountWei,
            infinite: permit2Parsed.infinite,
          },
          cfg,
        )
      : null;
  const erc7683 = evaluateErc7683CrossChainIntentGuard(
    {
      originChainId: EIP1193_DEMO.arbChainId,
      destinationChainId: 10,
      inputAmount: BigInt(Math.round(principalUsd * 1e6)),
      minOutputAmount: BigInt(Math.round(principalUsd * 999)),
      quotedOutputAmount: BigInt(Math.round(principalUsd * 1e6)),
      solverFeeBps: 100,
      maxSlippageBps: 10,
      deadlineSec: 9_999_999_999,
      nowSec: Math.floor(ctx.nowMs / 1000),
    },
    cfg.soilQuote,
  );

  if (interactive) {
    printDefenseMatrixHeader();
    if (eip712) printDefenseMatrixLine("EIP-712 GUARD", "Phishing Attack: VerifyingContract Mismatch!", eip712.code, "├");
    if (permit2) printDefenseMatrixLine("PERMIT2 GUARD", "Infinite Approve Blocked for Untrusted Spender!", permit2.code, "├");
    if (!erc7683.passed) {
      console.log(
        `├── ${eipTag("ERC-7683 GATE")} Cross-Chain Solver MEV Bps (${featureMetric(`${erc7683.solverMevBps.toFixed(0)}bps`)}) > Safety Limit! · ${rejectCode(erc7683.code ?? "FAIL")}`,
      );
    }
    printDefenseMatrixLine("PRE-CONSENSUS", "0-Gas Wasm Intercept armed for toxic EIP-712 ingress", undefined, "└");
  }

  const guarded = wrapGuarded({ request: async () => "0x0" }, cfg);
  const wasmReflexUs = Math.min(measureWasmSoilUs(cfg), erc7683.evalLatencyUs);
  const t0 = hrtimeStart();
  let thrown: RetailGuardRejectedError | null = null;
  try {
    await guarded.request({ method: "eth_signTypedData_v4", params: [EIP1193_DEMO.wallet, typedData] });
  } catch (err) {
    if (err instanceof RetailGuardRejectedError) thrown = err;
    else throw err;
  }
  if (!thrown) throw new Error("SCENARIO_C_EXPECTED_FAIL_CLOSED");

  const wasmUs = roundWasmUs(Math.min(wasmReflexUs, hrtimeElapsedUs(t0)));
  if (interactive) {
    printProductionPlainTextWarning(thrown.plainTextWarning, thrown.code);
    printPreConsensusProofBox(wasmUs, principalUsd);
    printDuneTelemetry(RETAIL_GUARD_AGENT_ID, thrown.code, ctx.nowMs);
    console.log(
      `\n${RED}${BOLD}RESULT: 🛑 FAIL_CLOSED_INTERCEPT (${featureMetric("0-Gas")} Intercepted BEFORE RPC Ingress)${R}`,
    );
    printOpSecFootnote();
  }
  return {
    scenario: "C",
    status: "FAIL_CLOSED",
    wasmUs,
    code: thrown.code,
    plainTextWarning: thrown.plainTextWarning,
    plainTextWarnings: [thrown.plainTextWarning],
    reasonCodes: [thrown.code],
  };
}

async function runScenarioD({ interactive }: ScenarioOpts): Promise<Eip1193ScenarioJsonResult> {
  if (interactive) {
    printScenarioHeader("D", RED);
    printScenarioEipEnhancement("D");
  }
  __resetRetailGuardStateForTests();
  const cfg = demoConfig({ maxAttempts: INTENT_MAX_ATTEMPTS_DEFAULT });
  const wasmUs = roundWasmUs(measureWasmSoilUs(cfg));
  if (interactive) printEip1193Ingress("eth_sendTransaction");
  const guarded = withRetailGuardProvider({ request: async () => "0x1" }, cfg);
  const params = [{ from: EIP1193_DEMO.wallet, to: EIP1193_DEMO.gmxGmVault, value: "0x0" }];
  for (let i = 0; i < INTENT_MAX_ATTEMPTS_DEFAULT; i++) {
    await guarded.request({ method: "eth_sendTransaction", params });
  }
  let severErr: RetailGuardRejectedError | null = null;
  try {
    await guarded.request({ method: "eth_sendTransaction", params });
  } catch (err) {
    if (err instanceof RetailGuardRejectedError) severErr = err;
    else throw err;
  }
  if (!severErr) throw new Error("SCENARIO_D_EXPECTED_SEVER_REJECT");
  let channelErr: RetailGuardRejectedError | null = null;
  try {
    await guarded.request({ method: "eth_sendTransaction", params });
  } catch (err) {
    if (err instanceof RetailGuardRejectedError) channelErr = err;
    else throw err;
  }
  if (!channelErr) throw new Error("SCENARIO_D_EXPECTED_CHANNEL_REJECT");

  if (interactive) {
    printProductionPlainTextWarning(severErr.plainTextWarning, severErr.code);
    if (channelErr.plainTextWarning !== severErr.plainTextWarning) {
      printProductionPlainTextWarning(channelErr.plainTextWarning, channelErr.code);
    }
    const attemptN = INTENT_MAX_ATTEMPTS_DEFAULT + 1;
    console.log(
      `${RED}${BOLD}[CIRCUIT BREAKER]${R} R17 Hot Key Signature Channel SEVERED — All subsequent signing requests hard-blocked (${featureMetric("0-Gas")})`,
    );
    console.log(
      `${eipTag("CHANNEL SEVER")} ${attemptN}th Rapid Attack Attempt -> EIP-712 Signature Channel ${RED}${BOLD}SEVERED${R} (${rejectCode(severErr.code)})`,
    );
    console.log(
      `  ${eipTag("CHANNEL STATE")} isRetailGuardChannelSevered=${isRetailGuardChannelSevered()} · follow-up=${rejectCode(channelErr.code)}`,
    );
    printOpSecFootnote();
    console.log(`\n${RED}${BOLD}RESULT: 🔒 CHANNEL_SEVERED (Signature Pipeline Permanently Closed · Gate ${EIP1193_DEMO.slivervineGate})${R}`);
  }
  return {
    scenario: "D",
    status: "CHANNEL_SEVERED",
    wasmUs,
    code: channelErr.code,
    plainTextWarning: channelErr.plainTextWarning,
    plainTextWarnings: [severErr.plainTextWarning, channelErr.plainTextWarning],
    reasonCodes: [severErr.code, channelErr.code],
  };
}

async function runScenarioMatrix(ctx: DemoEnvironment, showHud: boolean): Promise<Eip1193ScenarioJsonResult[]> {
  const results: Eip1193ScenarioJsonResult[] = [];
  const trip = isDemoTripArgv();
  const pauseBetween = isDemoInteractiveArgv();

  if (!trip) {
    results.push(await runScenarioA({ interactive: showHud }));
    if (pauseBetween) await awaitScenarioRecordingTransition("B");
    results.push(await runScenarioB({ interactive: showHud }));
    if (pauseBetween) await awaitScenarioRecordingTransition("C");
  }

  results.push(await runScenarioC({ interactive: showHud, ctx }));
  if (pauseBetween) await awaitScenarioRecordingTransition("D");
  results.push(await runScenarioD({ interactive: showHud }));
  return results;
}

wrapDemoExecution(async (ctx) => {
  const jsonMode = isDemoJsonArgv();
  const showHud = isDemoHudArgv();
  const pauseBetween = isDemoInteractiveArgv();
  if (showHud) {
    printFeatureBanner();
    printExomeshProofHighlights();
  }
  if (pauseBetween) await awaitDemoScenarioTransition("A", "begin");
  const results = await runScenarioMatrix(ctx, showHud);
  const failClosed = results.find((r) => r.status === "FAIL_CLOSED" || r.status === "CHANNEL_SEVERED");

  if (jsonMode) {
    saveExomeshRunPayload(results);
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
    releaseDemoStdin();
    return failClosed
      ? {
          tripped: true,
          reason: failClosed.code ?? "FAIL_CLOSED",
          reflexLatencyUs: failClosed.wasmUs,
          suppressInterceptBanner: true,
        }
      : { tripped: false, reason: "ALLOW_PASSTHROUGH", suppressInterceptBanner: true };
  }

  if (!isDemoTripArgv()) {
    console.log("");
    printEipCoverageMap();
    console.log(
      `\n${GREEN}${BOLD}RESULT: ✅ ExoMesh Agentic Guard Matrix Complete — Scenarios A–D Replayed (ALLOW · WARN · INTERCEPT · SEVER)${R}\n`,
    );
  }
  releaseDemoStdin();
  return failClosed
    ? {
        tripped: true,
        reason: failClosed.code ?? "FAIL_CLOSED",
        reflexLatencyUs: failClosed.wasmUs,
      }
    : { tripped: false, reason: "ALLOW_PASSTHROUGH" };
});
