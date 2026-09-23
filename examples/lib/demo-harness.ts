/** Universal anti-fragile CLI demo harness — offline-first, safe clock, clean exits. */
import { __resetArbitrumGasGuardForTests } from "../../src/services/risk/arbitrum-gas-guard";
import {
  __resetSequencerGuardCacheForTests,
} from "../../src/services/risk/sequencer-guard";
import { __resetSoftConfirmationGuardForTests } from "../../src/services/risk/soft-confirmation-guard";
import { seedSafeArbitrumProbes } from "../../tests/helpers/arbitrum-probe-seed";
import { ensureSoilWasm } from "../../src/sdk/soil-wasm";
import { recordDemoCliTelemetry } from "./demo-telemetry";
import { hrtimeElapsedUs, hrtimeStart } from "./demo-timing";
import {
  handleDemoExit,
  initDemoEnvironmentClock,
  IS_LIVINGWATER_MODE,
  IS_TRIP_MODE,
  parseTripMode,
} from "./demo-utils";

export {
  getDemoSafeTimestamp,
  handleDemoExit,
  initDemoEnvironmentClock,
  IS_LIVINGWATER_MODE,
  IS_TRIP_MODE,
  muteLibraryConsole,
  parseTripMode,
  printExoMeshGuardInterceptionBanner,
} from "./demo-utils";

export interface DemoEnvironment {
  nowMs: number;
  at: Date;
  restoreConsole: () => void;
  livingwater: boolean;
}

export interface DemoRunResult {
  tripped: boolean;
  reason?: string;
  reflexLatencyUs?: number;
  /** Suppress CITADEL GUARD intercept banner (e.g. pure --json stdout). */
  suppressInterceptBanner?: boolean;
}

const GRAY = "\x1b[90m";
const YELLOW = "\x1b[33;1m";
const R = "\x1b[0m";

const DEMO_ENV_DEFAULTS: Record<string, string> = {
  EXOMESH_DEMO_MODE: "1",
  EXOMESH_OFFLINE_FIRST: "1",
};

const DEMO_SESSION_PK = `0x${"11".repeat(32)}`;
const DEMO_WALLET = `0x${"22".repeat(20)}`;

const INTERCEPTION_MARKERS = [
  "FAIL_CLOSED",
  "SOIL_FUSE",
  "_TRIP",
  "BRIDGE_TIMEOUT",
  "DEPEG",
  "BLOCKED",
  "INTERCEPT",
  "AML_INBOUND",
  "PRICE_IMPACT",
  "MANDATORY_COOLDOWN",
  "SPREAD_BREACH",
  "YIELD_DRIFT",
];

export function isDemoTripArgv(argv: readonly string[] = process.argv): boolean {
  return parseTripMode(argv);
}

export function demoErrorReason(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function isDemoInterceptionError(err: unknown): boolean {
  const msg = demoErrorReason(err);
  return INTERCEPTION_MARKERS.some((m) => msg.includes(m));
}

export function withDemoSoil<T extends { at?: Date }>(soil: T, at: Date): T {
  return { ...soil, at };
}

function injectDemoEnvFallbacks(): void {
  for (const [key, value] of Object.entries(DEMO_ENV_DEFAULTS)) {
    if (!process.env[key]) process.env[key] = value;
  }
  if (!process.env.HL_TESTNET_PRIVATE_KEY && !process.env.HYPERLIQUID_MAINNET_SESSION_PK) {
    process.env.HL_TESTNET_PRIVATE_KEY = DEMO_SESSION_PK;
  }
  if (!process.env.HYPERLIQUID_MAINNET_USER_ADDRESS) {
    process.env.HYPERLIQUID_MAINNET_USER_ADDRESS = DEMO_WALLET;
  }
}

export function ensureDemoWasmSoft(): boolean {
  const ok = ensureSoilWasm();
  if (!ok) console.log(`${YELLOW}[demo] soil_core.wasm offline — TS soil fallback${R}`);
  return ok;
}

export function seedDemoNetworkProbes(nowMs: number): void {
  __resetArbitrumGasGuardForTests();
  __resetSequencerGuardCacheForTests();
  __resetSoftConfirmationGuardForTests();
  seedSafeArbitrumProbes(nowMs);
}

export function initDemoEnvironment(): DemoEnvironment {
  const { nowMs, at, restoreConsole } = initDemoEnvironmentClock();
  if (!IS_LIVINGWATER_MODE) {
    injectDemoEnvFallbacks();
    seedDemoNetworkProbes(nowMs);
  }
  return { nowMs, at, restoreConsole, livingwater: IS_LIVINGWATER_MODE };
}

function finalizeDemoTelemetry(
  ctx: DemoEnvironment,
  tripped: boolean,
  reason: string,
  reflexLatencyUs?: number,
): void {
  if (ctx.livingwater) return;
  recordDemoCliTelemetry({
    tripped,
    reason,
    reflexLatencyUs,
  });
}

export function wrapDemoExecution(
  fn: (ctx: DemoEnvironment) => Promise<DemoRunResult | void> | DemoRunResult | void,
): void {
  const ctx = initDemoEnvironment();
  void (async () => {
    const t0 = hrtimeStart();
    try {
      const result = await fn(ctx);
      const tripped = result?.tripped === true;
      const reason = result?.reason ?? (tripped ? "FAIL_CLOSED" : "ALLOW_PASSTHROUGH");
      const reflexLatencyUs = result?.reflexLatencyUs ?? hrtimeElapsedUs(t0);
      finalizeDemoTelemetry(ctx, tripped, reason, reflexLatencyUs);
      if (tripped && !result?.suppressInterceptBanner) handleDemoExit(true, reason);
      process.exit(0);
    } catch (err) {
      if (isDemoInterceptionError(err)) {
        const reason = demoErrorReason(err);
        finalizeDemoTelemetry(ctx, true, reason, hrtimeElapsedUs(t0));
        handleDemoExit(true, reason);
        return;
      }
      console.error(`${GRAY}[demo] fatal:${R} ${demoErrorReason(err)}`);
      process.exit(1);
    } finally {
      ctx.restoreConsole();
    }
  })();
}
