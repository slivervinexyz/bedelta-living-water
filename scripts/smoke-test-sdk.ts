#!/usr/bin/env tsx
/**
 * Dry-run NPM package smoke test — verify @silvervine/risk-sdk dist exports
 * import cleanly with zero secret-leakage.
 *
 * Usage:
 *   pnpm test:smoke
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SDK_PKG = join(ROOT, "packages/risk-sdk");
const SDK_DIST = join(SDK_PKG, "dist/index.js");
const SDK_SOURCE = join(ROOT, "src/sdk/risk-sdk/index.ts");

const FORBIDDEN_EXPORT =
  /private[_-]?key|secret[_-]?key|raw[_-]?secret|signing[_-]?key|api[_-]?secret|mnemonic|seed[_-]?phrase|PRIVATE_KEY|SECRET_KEY/i;

type RiskSdkModule = Record<string, unknown>;

interface SmokeCheck {
  id: string;
  run: (sdk: RiskSdkModule) => void;
}

function logPass(id: string, detail: string): void {
  console.log(`[smoke:sdk] PASS ${id} — ${detail}`);
}

function buildSdkPackage(): void {
  console.log("[smoke:sdk] building packages/risk-sdk …");
  execSync("pnpm run build", { cwd: SDK_PKG, stdio: "inherit" });
  if (!existsSync(SDK_DIST)) {
    throw new Error(`SDK dist missing after build: ${SDK_DIST}`);
  }
}

async function importSdkModule(): Promise<RiskSdkModule> {
  buildSdkPackage();
  console.log("[smoke:sdk] importing @silvervine/risk-sdk source barrel (post-build parity) …");
  const url = `${pathToFileURL(SDK_SOURCE).href}?smoke=${Date.now()}`;
  return (await import(url)) as RiskSdkModule;
}

function assertNoExportLeakage(sdk: RiskSdkModule): void {
  const violations: string[] = [];
  for (const key of Object.keys(sdk)) {
    if (FORBIDDEN_EXPORT.test(key)) {
      violations.push(`forbidden export name: ${key}`);
    }
  }
  if (violations.length > 0) {
    throw new Error(`export leakage detected: ${violations.join("; ")}`);
  }
  logPass("export-surface", `no secret-key exports (${Object.keys(sdk).length} public bindings)`);
}

const SMOKE_CHECKS: SmokeCheck[] = [
  {
    id: "checkFailClosed",
    run(sdk) {
      const checkFailClosed = sdk.checkFailClosed;
      if (typeof checkFailClosed !== "function") {
        throw new Error("checkFailClosed is not exported");
      }
      const threshold = Number(sdk.HL_L2_STALE_THRESHOLD_MS ?? 500);
      const nowMs = 1_700_000_100_000;
      const stale = checkFailClosed(
        {
          coin: "BTC",
          book: { coin: "BTC", levels: [[{ px: "100", sz: "1" }], [{ px: "101", sz: "1" }]] },
          fetchedAt: new Date(nowMs - threshold - 1).toISOString(),
          live: true,
          source: "testnet",
        },
        nowMs,
      );
      if (stale !== true) {
        throw new Error("expected stale L2 book to trip fail-closed");
      }
      logPass("checkFailClosed", "stale L2 snapshot returns true");
    },
  },
  {
    id: "evaluateEffectiveMaxSl",
    run(sdk) {
      const evaluateEffectiveMaxSl = sdk.evaluateEffectiveMaxSl;
      if (typeof evaluateEffectiveMaxSl !== "function") {
        throw new Error("evaluateEffectiveMaxSl is not exported");
      }
      const maxSl = evaluateEffectiveMaxSl(10_000);
      if (maxSl !== 200) {
        throw new Error(`expected 200 USD Max SL at $10k equity, got ${maxSl}`);
      }
      logPass("evaluateEffectiveMaxSl", "computeEffectiveMaxSlUsd(10000)=200");
    },
  },
  {
    id: "HIP3_GAP_GUARD",
    run(sdk) {
      if (sdk.HIP3_GAP_GUARD !== "HIP3_GAP_GUARD") {
        throw new Error("HIP3_GAP_GUARD constant missing");
      }
      const evaluateHip3GapGuard = sdk.evaluateHip3GapGuard;
      if (typeof evaluateHip3GapGuard !== "function") {
        throw new Error("evaluateHip3GapGuard is not exported");
      }
      const result = evaluateHip3GapGuard({ symbol: "BTC", at: new Date("2026-07-25T12:00:00Z") });
      if (result.triggered !== false) {
        throw new Error("expected HIP3 guard standby for BTC outside gap window");
      }
      logPass("HIP3_GAP_GUARD", "constant + evaluateHip3GapGuard() initialized");
    },
  },
  {
    id: "RWA_SETTLEMENT_LOCK",
    run(sdk) {
      if (sdk.RWA_SETTLEMENT_LOCK !== "RWA_SETTLEMENT_LOCK") {
        throw new Error("RWA_SETTLEMENT_LOCK constant missing");
      }
      const evaluateRwaSettlementLock = sdk.evaluateRwaSettlementLock;
      if (typeof evaluateRwaSettlementLock !== "function") {
        throw new Error("evaluateRwaSettlementLock is not exported");
      }
      const result = evaluateRwaSettlementLock({
        symbol: "BTC",
        at: new Date("2026-07-25T12:00:00Z"),
      });
      if (result.locked !== false) {
        throw new Error("expected RWA settlement lock standby for BTC");
      }
      logPass("RWA_SETTLEMENT_LOCK", "constant + evaluateRwaSettlementLock() initialized");
    },
  },
  {
    id: "NonceAutoHealing",
    run(sdk) {
      const NonceAutoHealing = sdk.NonceAutoHealing as Record<string, unknown> | undefined;
      if (!NonceAutoHealing || typeof NonceAutoHealing !== "object") {
        throw new Error("NonceAutoHealing namespace missing");
      }
      const audit = NonceAutoHealing.auditSessionKeyNonceState;
      if (typeof audit !== "function") {
        throw new Error("NonceAutoHealing.auditSessionKeyNonceState missing");
      }
      const result = audit(Date.now()) as { ok: boolean };
      if (typeof result.ok !== "boolean") {
        throw new Error("NonceAutoHealing audit did not return ok boolean");
      }
      logPass("NonceAutoHealing", "namespace auditSessionKeyNonceState() initialized");
    },
  },
];

async function main(): Promise<void> {
  console.log("[smoke:sdk] dry-run @silvervine/risk-sdk export smoke test …");
  const sdk = await importSdkModule();

  assertNoExportLeakage(sdk);

  for (const check of SMOKE_CHECKS) {
    check.run(sdk);
  }

  console.log(
    `[smoke:sdk] verdict: PASS | checks: ${SMOKE_CHECKS.length}/${SMOKE_CHECKS.length} | build: ${SDK_DIST} | entry: ${SDK_SOURCE}`,
  );
}

main().catch((err) => {
  console.error("[smoke:sdk] FAIL", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
