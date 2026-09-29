import { afterEach, beforeEach, vi } from "vitest";
import { SAFE_TRADING_TIME } from "./tests/helpers/system-time";
import { seedSafeArbitrumProbes } from "./tests/helpers/arbitrum-probe-seed";
import { __resetSequencerGuardCacheForTests } from "./src/services/risk/sequencer-guard";
import { __resetSoftConfirmationGuardForTests } from "./src/services/risk/soft-confirmation-guard";

function managesOwnTimers(filepath: string): boolean {
  const normalized = filepath.replace(/\\/g, "/");
  return (
    normalized.includes("/hl/websocket.test.ts") ||
    normalized.includes("/verify-5tx.test.ts")
  );
}

function managesOwnArbitrumProbes(filepath: string): boolean {
  const normalized = filepath.replace(/\\/g, "/");
  return (
    normalized.includes("/sequencer-guard.test.ts") ||
    normalized.includes("/soft-confirmation-guard.test.ts")
  );
}

beforeEach((ctx) => {
  if (managesOwnTimers(ctx.task.file.filepath)) return;

  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(SAFE_TRADING_TIME);

  if (!managesOwnArbitrumProbes(ctx.task.file.filepath)) {
    seedSafeArbitrumProbes(SAFE_TRADING_TIME.getTime());
  }
});

afterEach((ctx) => {
  if (managesOwnTimers(ctx.task.file.filepath)) return;

  vi.useRealTimers();

  if (!managesOwnArbitrumProbes(ctx.task.file.filepath)) {
    __resetSequencerGuardCacheForTests();
    __resetSoftConfirmationGuardForTests();
  }
});
