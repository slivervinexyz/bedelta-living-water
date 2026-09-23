import { existsSync, readFileSync } from "node:fs";
import {
  HARD_STOP_LOSS_PCT,
  MAX_ORDER_CLIP_USD,
  MICRO_CAPITAL_USD,
  STALE_THRESHOLD_MS,
} from "../src/config/risk-parameters";
import { maskHex } from "./_shared/mainnet-env";
import {
  EXPECTED_CRON,
  EXPECTED_DOMAIN,
  EXPECTED_WORKER,
  type CheckRow,
  WRANGLER_JSONC_PATH,
  WRANGLER_TOML_PATH,
} from "./check-mainnet-env.types";

export { maskHex };

export function checkWorkerSsot(rows: CheckRow[]): number {
  let fail = 0;

  if (existsSync(WRANGLER_JSONC_PATH)) {
    rows.push({
      check: "wrangler.jsonc",
      status: "FAIL",
      detail: "legacy dual-config present — remove to clear deadlock",
    });
    fail += 1;
  } else {
    rows.push({
      check: "wrangler.jsonc",
      status: "PASS",
      detail: "absent (deprecated)",
    });
  }

  if (!existsSync(WRANGLER_TOML_PATH)) {
    rows.push({
      check: "wrangler.toml",
      status: "FAIL",
      detail: "missing sole Worker SSOT",
    });
    return fail + 1;
  }

  const toml = readFileSync(WRANGLER_TOML_PATH, "utf8");
  const name = toml.match(/^\s*name\s*=\s*"([^"]+)"/m)?.[1] ?? "";
  const cron =
    toml.match(/^\s*crons\s*=\s*\[\s*"([^"]+)"\s*\]/m)?.[1] ??
    toml.match(/crons\s*=\s*\[\s*"([^"]+)"/)?.[1] ??
    "";
  const domainOk = toml.includes(EXPECTED_DOMAIN);

  rows.push({
    check: "Worker name",
    status: name === EXPECTED_WORKER ? "PASS" : "FAIL",
    detail: name || "(empty)",
  });
  if (name !== EXPECTED_WORKER) fail += 1;

  rows.push({
    check: "Custom domain",
    status: domainOk ? "PASS" : "FAIL",
    detail: EXPECTED_DOMAIN,
  });
  if (!domainOk) fail += 1;

  rows.push({
    check: "Cron trigger",
    status: cron === EXPECTED_CRON ? "PASS" : "FAIL",
    detail: cron
      ? `${cron} (expect ${EXPECTED_CRON} · HL funding epoch)`
      : `(missing — expect ${EXPECTED_CRON})`,
  });
  if (cron !== EXPECTED_CRON) fail += 1;

  rows.push({
    check: "Worker SSOT",
    status: fail === 0 ? "PASS" : "FAIL",
    detail: "wrangler.toml sole config → bedelta-living-water",
  });

  return fail;
}

export function printReport(rows: CheckRow[]): void {
  const width = Math.max(...rows.map((r) => r.check.length), 12);
  console.log("");
  console.log("═══ MAINNET PRE-FLIGHT ═══");
  for (const row of rows) {
    const mark =
      row.status === "PASS" ? "✓" : row.status === "WARN" ? "!" : "✗";
    console.log(
      `${mark} ${row.status.padEnd(4)}  ${row.check.padEnd(width)}  ${row.detail}`,
    );
  }
  const failed = rows.filter((r) => r.status === "FAIL").length;
  console.log("─────────────────────────");
  console.log(
    failed === 0
      ? "RESULT: ALL CHECKS PASS — mainnet env ready"
      : `RESULT: ${failed} CHECK(S) FAILED — abort mainnet`,
  );
  console.log("");
}

export function checkSessionPk(rows: CheckRow[], pk: string): boolean {
  if (!pk) {
    rows.push({
      check: "HYPERLIQUID_MAINNET_SESSION_PK",
      status: "FAIL",
      detail: "missing",
    });
    return false;
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) {
    rows.push({
      check: "HYPERLIQUID_MAINNET_SESSION_PK",
      status: "FAIL",
      detail: "invalid — expect 0x + 64 hex chars",
    });
    return false;
  }
  rows.push({
    check: "HYPERLIQUID_MAINNET_SESSION_PK",
    status: "PASS",
    detail: `format OK (${maskHex(pk)})`,
  });
  return true;
}

export function checkUserAddress(rows: CheckRow[], addr: string): boolean {
  if (!addr) {
    rows.push({
      check: "HYPERLIQUID_MAINNET_USER_ADDRESS",
      status: "FAIL",
      detail: "missing",
    });
    return false;
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    rows.push({
      check: "HYPERLIQUID_MAINNET_USER_ADDRESS",
      status: "FAIL",
      detail: "invalid — expect 0x + 40 hex (master wallet)",
    });
    return false;
  }
  rows.push({
    check: "HYPERLIQUID_MAINNET_USER_ADDRESS",
    status: "PASS",
    detail: maskHex(addr),
  });
  return true;
}

export function checkRiskEnvelope(rows: CheckRow[]): boolean {
  const clipOk = MAX_ORDER_CLIP_USD === 30;
  const hardStopOk = HARD_STOP_LOSS_PCT === 0.015;
  const envelopeOk = clipOk && hardStopOk && MICRO_CAPITAL_USD === 300;

  rows.push({
    check: "MICRO_CAPITAL_USD",
    status: MICRO_CAPITAL_USD === 300 ? "PASS" : "FAIL",
    detail: String(MICRO_CAPITAL_USD),
  });
  rows.push({
    check: "MAX_ORDER_CLIP_USD",
    status: clipOk ? "PASS" : "FAIL",
    detail: String(MAX_ORDER_CLIP_USD),
  });
  rows.push({
    check: "HARD_STOP_LOSS_PCT",
    status: hardStopOk ? "PASS" : "FAIL",
    detail: String(HARD_STOP_LOSS_PCT),
  });
  rows.push({
    check: "STALE_THRESHOLD_MS",
    status: STALE_THRESHOLD_MS === 500 ? "PASS" : "FAIL",
    detail: String(STALE_THRESHOLD_MS),
  });
  rows.push({
    check: "$300 Risk Envelope",
    status: envelopeOk ? "PASS" : "FAIL",
    detail: envelopeOk
      ? "active (clip=$30 · hard-stop=1.5%)"
      : "misconfigured",
  });

  return envelopeOk;
}
