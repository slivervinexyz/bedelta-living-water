/** Local mirror of Cloudflare KV exomesh intercept + risk-log rolling writes. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { KV_KEYS } from "../../src/services/kv-lib/keys";
import type { RiskLogEntry, RiskLogRollingRecord } from "../../src/services/kv-lib/types";
import type { ExomeshDuneTelemetryRow } from "./exomesh-dune-telemetry";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

export const EXOMESH_INTERCEPTS_MIRROR_PATH = join(ROOT, "docs/audit/exomesh-kv-intercepts.json");
export const EXOMESH_RISK_LOG_MIRROR_PATH = join(ROOT, "docs/audit/exomesh-risk-log-rolling.json");

export interface ExomeshInterceptKvRolling {
  version: 1;
  schema: "silvervine.exomesh.dune-telemetry.v1";
  kvKey: typeof KV_KEYS.EXOMESH_INTERCEPTS;
  lastUpdated: string;
  entries: ExomeshDuneTelemetryRow[];
}

const MAX_INTERCEPT_ENTRIES = 500;
const MAX_RISK_LOG_ENTRIES = 200;

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function toRiskLogEntry(row: ExomeshDuneTelemetryRow): RiskLogEntry {
  return {
    at: row.timestamp,
    level: row.status === "FAIL_CLOSED" ? "warn" : "info",
    module: "exomesh-demo",
    event: row.intercept_type,
    message: row.reason ?? row.source,
  };
}

export function appendExomeshInterceptKvMirror(
  row: ExomeshDuneTelemetryRow,
  interceptPath = EXOMESH_INTERCEPTS_MIRROR_PATH,
  riskLogPath = EXOMESH_RISK_LOG_MIRROR_PATH,
): { intercepts: ExomeshInterceptKvRolling; riskLog: RiskLogRollingRecord } {
  const prior = readJson<ExomeshInterceptKvRolling>(interceptPath, {
    version: 1,
    schema: "silvervine.exomesh.dune-telemetry.v1",
    kvKey: KV_KEYS.EXOMESH_INTERCEPTS,
    lastUpdated: row.timestamp,
    entries: [],
  });
  const intercepts: ExomeshInterceptKvRolling = {
    ...prior,
    lastUpdated: row.timestamp,
    entries: [...prior.entries, row].slice(-MAX_INTERCEPT_ENTRIES),
  };
  writeFileSync(interceptPath, `${JSON.stringify(intercepts, null, 2)}\n`, "utf8");

  const priorRisk = readJson<RiskLogRollingRecord>(riskLogPath, {
    version: 1,
    lastUpdated: row.timestamp,
    entries: [],
  });
  const riskEntry = toRiskLogEntry(row);
  const riskLog: RiskLogRollingRecord = {
    version: 1,
    lastUpdated: riskEntry.at,
    entries: [...priorRisk.entries, riskEntry].slice(-MAX_RISK_LOG_ENTRIES),
  };
  writeFileSync(riskLogPath, `${JSON.stringify(riskLog, null, 2)}\n`, "utf8");
  return { intercepts, riskLog };
}
