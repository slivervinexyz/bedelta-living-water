#!/usr/bin/env tsx
import path from "node:path";
import {
  generateVitestScopedSsot,
  writeVitestScopedSsot,
} from "./_shared/vitest-scoped-ssot-lib";

const ROOT = path.resolve(import.meta.dirname, "..");

function main(): void {
  const ssot = generateVitestScopedSsot(ROOT);
  writeVitestScopedSsot(ROOT, ssot);
  const sdk = ssot.suites["tests/sdk/"];
  console.log(
    `Wrote ${ssot.suites ? Object.keys(ssot.suites).length : 0} suite entries · tests/sdk/ = ${sdk?.tests}/${sdk?.tests} (${sdk?.files} files)`,
  );
}

main();
