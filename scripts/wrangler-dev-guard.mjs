#!/usr/bin/env node
/**
 * Wrangler dev supervisor — catches Node-level unhandled errors and auto-restarts
 * wrangler when miniflare reports transient proxy disconnects (exit code 1).
 */
import { spawn } from "node:child_process";

let shuttingDown = false;
let restartTimer = null;

process.on("unhandledRejection", (reason, promise) => {
  console.error("[dev-guard] Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[dev-guard] Uncaught Exception:", err);
});

function shutdown(code = 0) {
  shuttingDown = true;
  if (restartTimer) clearTimeout(restartTimer);
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

function startWrangler() {
  const extraArgs = process.argv.slice(2);
  const child = spawn("pnpm", ["exec", "wrangler", "dev", ...extraArgs], {
    stdio: "inherit",
    shell: false,
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown || signal === "SIGINT" || signal === "SIGTERM") {
      shutdown(0);
      return;
    }
    if (code === 0) {
      shutdown(0);
      return;
    }
    console.warn(
      `[dev-guard] wrangler exited (code=${code ?? "null"}); restarting in 1s…`,
    );
    restartTimer = setTimeout(startWrangler, 1_000);
  });
}

startWrangler();
