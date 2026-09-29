import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HL_INFO_URL } from "../../src/config/constants";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ROOT = join(__dirname, "../..");
export const OUT = join(ROOT, "docs/0802_Weapon_Comparison_Log.md");
export const COIN = "ETH";
export const NOTIONAL = 100_000;
export const LOOKBACK_MS = 30 * 86_400_000;
export const DEGRADE = 30;
export { HL_INFO_URL };
