import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const userLib = join(homedir(), ".local/lib/playwright-deps/usr/lib/x86_64-linux-gnu");
const env = { ...process.env };
if (existsSync(userLib)) {
  env.LD_LIBRARY_PATH = env.LD_LIBRARY_PATH ? `${userLib}:${env.LD_LIBRARY_PATH}` : userLib;
}

const result = spawnSync("playwright", ["test", ...process.argv.slice(2)], {
  stdio: "inherit",
  env,
});
process.exit(result.status ?? 1);
