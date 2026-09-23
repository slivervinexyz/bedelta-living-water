/** CLI help, guard validation, and auditor diagnostics for test-gmx-v2-execution.ts */
import {
  buildArbitrumGasGuardMetrics,
  getArbitrumGasGuardReason,
  isArbitrumGasGuardBlocked,
} from "../src/services/risk/arbitrum-gas-guard";
import {
  getSequencerUnsafeReason,
  isSequencerSafe,
} from "../src/services/risk/sequencer-guard";

export const DEFAULT_SYMBOL = "ETH";
export const DEFAULT_SIZE_USD = 100;
export const DEFAULT_SIDE = "short" as const;

export const AUDITOR_ORACLE_LAG_NOTE =
  "LIVE_DEFENSE_ACTIVE: Arbitrum Chainlink Oracle Lag exceeded 30s limit. Capital protected. Append '--allow-stale-oracle' to dry-run payload generation during chain lag." as const;

export interface GmxV2ExecutionCliOpts {
  liveRead: boolean;
  allowStaleOracle: boolean;
  reduceOnly: boolean;
  withdraw: boolean;
  symbol: string;
  sizeUsd: number;
  side: "long" | "short";
}

export type GmxV2ExecutionPath = "increase-deposit" | "decrease" | "withdraw";

export function resolveGmxV2ExecutionPath(cli: GmxV2ExecutionCliOpts): GmxV2ExecutionPath {
  if (cli.withdraw) return "withdraw";
  if (cli.reduceOnly) return "decrease";
  return "increase-deposit";
}

export function parseGmxV2ExecutionCli(argv: string[]): GmxV2ExecutionCliOpts {
  const liveRead = argv.includes("--live-read");
  const envAllow =
    process.env.ALLOW_STALE_ORACLE === "1" || process.env.ALLOW_STALE_ORACLE === "true";
  const allowStaleOracle = argv.includes("--allow-stale-oracle") || envAllow;
  const reduceOnly = argv.includes("--reduce-only");
  const withdraw = argv.includes("--withdraw");
  if (reduceOnly && withdraw) {
    throw new Error("INVALID_CLI_FLAGS: --reduce-only and --withdraw are mutually exclusive");
  }
  const symbol = argv.find((a, i) => argv[i - 1] === "--symbol") ?? DEFAULT_SYMBOL;
  const sizeRaw = argv.find((a, i) => argv[i - 1] === "--size");
  const sideRaw = argv.find((a, i) => argv[i - 1] === "--side") ?? DEFAULT_SIDE;
  const sizeUsd = sizeRaw ? Number.parseFloat(sizeRaw) : DEFAULT_SIZE_USD;
  const side = sideRaw === "long" ? "long" : "short";
  if (!Number.isFinite(sizeUsd) || sizeUsd <= 0) throw new Error("INVALID_SIZE_USD");
  return {
    liveRead,
    allowStaleOracle,
    reduceOnly,
    withdraw,
    symbol: symbol.toUpperCase(),
    sizeUsd,
    side,
  };
}

export function isGmxV2ExecutionHelpRequested(argv: string[]): boolean {
  return argv.includes("--help") || argv.includes("-h");
}

export function printGmxV2ExecutionHelp(): void {
  console.log(
    [
      "GMX v2 Arbitrum One — ExoMesh guard-gated payload test",
      "",
      "Usage:",
      "  pnpm exec tsx scripts/test-gmx-v2-execution.ts [options]",
      "",
      "Options:",
      "  --live-read            Direct Arbitrum One RPC live read; export payloads to docs/audit/",
      "  --allow-stale-oracle   Bypass ExoMesh Oracle Lag deadlock (dry-run / Sepolia; also ALLOW_STALE_ORACLE=1)",
      "  --reduce-only          Dry-run MarketDecrease unsigned order payload (position unwind)",
      "  --withdraw             Dry-run GM Pool withdrawal unsigned payload (liquidity un-stake)",
      "  --symbol <SYMBOL>      Market symbol (default: ETH)",
      "  --size <USD>           Order size in USD (default: 100)",
      "  --side <long|short>    Hedge side (default: short)",
      "  -h, --help             Show this manual",
      "",
      "Examples:",
      "  npx tsx scripts/test-gmx-v2-execution.ts --live-read",
      "  npx tsx scripts/test-gmx-v2-execution.ts --reduce-only --size 250",
      "  npx tsx scripts/test-gmx-v2-execution.ts --withdraw --size 100",
      "  npx tsx scripts/test-gmx-v2-execution.ts --live-read --allow-stale-oracle",
    ].join("\n"),
  );
}

export function resolveOracleLagAuditorNote(
  reasons: readonly string[],
  gas: ReturnType<typeof buildArbitrumGasGuardMetrics>,
): string | undefined {
  const oracleLagBlock =
    gas?.oracleLagDeadlock === true || reasons.some((r) => r.includes("ORACLE_LAG"));
  return oracleLagBlock ? AUDITOR_ORACLE_LAG_NOTE : undefined;
}

export function validateGmxExecutionGuards(allowStaleOracle: boolean): {
  ok: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (!isSequencerSafe()) reasons.push(getSequencerUnsafeReason() ?? "ARBITRUM_SEQUENCER_UNSAFE");
  if (isArbitrumGasGuardBlocked()) {
    const reason = getArbitrumGasGuardReason();
    const metrics = buildArbitrumGasGuardMetrics();
    if (allowStaleOracle && metrics?.oracleLagDeadlock) {
      console.error("[BYPASS_WARNING] Oracle lag check bypassed via --allow-stale-oracle");
      const remaining = reason?.split("|").filter((part) => !part.includes("ORACLE_LAG")) ?? [];
      if (remaining.length) reasons.push(...remaining);
    } else {
      reasons.push(reason ?? "ARBITRUM_GAS_GUARD_BLOCKED");
    }
  }
  return { ok: reasons.length === 0, reasons };
}
