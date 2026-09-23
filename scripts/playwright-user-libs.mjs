import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const pkgs = [
  "libnspr4",
  "libnss3",
  "libatk1.0-0t64",
  "libatk-bridge2.0-0t64",
  "libdrm2",
  "libxkbcommon0",
  "libxcomposite1",
  "libxdamage1",
  "libxfixes3",
  "libxrandr2",
  "libgbm1",
  "libasound2t64",
  "libpango-1.0-0",
  "libcairo2",
  "libx11-6",
  "libxcb1",
  "libxext6",
  "libdbus-1-3",
];

const dest = join(homedir(), ".local/lib/playwright-deps");
const tmp = join("/tmp", "pw-libs");
if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
mkdirSync(dest, { recursive: true });

execSync(`apt-get download ${pkgs.join(" ")}`, { cwd: tmp, stdio: "inherit" });
for (const deb of readdirSync(tmp).filter((f) => f.endsWith(".deb"))) {
  execSync(`dpkg-deb -x ${deb} ${dest}`, { cwd: tmp, stdio: "inherit" });
}

console.log(`Playwright user libs ready at ${dest}`);
