import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ROOT = join(__dirname, "..");
export const ENV_PRODUCTION_PATH = join(ROOT, ".env.production");
export const WRANGLER_TOML_PATH = join(ROOT, "wrangler.toml");
export const WRANGLER_JSONC_PATH = join(ROOT, "wrangler.jsonc");

export const SESSION_PK_RE = /^0x[0-9a-fA-F]{64}$/;
export const MASTER_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
export const EXPECTED_WORKER = "bedelta-living-water";
export const EXPECTED_DOMAIN = "bedeltawater.slivervine.xyz";
export const EXPECTED_CRON = "0 * * * *";

export type CheckRow = {
  check: string;
  status: "PASS" | "FAIL" | "WARN";
  detail: string;
};
