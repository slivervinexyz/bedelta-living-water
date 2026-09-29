#!/usr/bin/env tsx
/**
 * Measure Worker bundle size via `wrangler deploy --dry-run` (production minify).
 * Entry SSOT: wrangler.toml `main` (src/worker-entry.ts).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUTDIR = "dist-worker";
const OUTDIR_PROBE = "dist-worker-probe";
const ENTRY_BASENAME = "worker-entry.js";
const TOTAL_UPLOAD_RE = /Total Upload:\s+([\d.]+)\s+KiB\s+\/\s+gzip:\s+([\d.]+)\s+KiB/;
const BUNDLE_GZIP_LIMIT_KIB = 150.0 as const;
const LEAN_RAW_WARN_KIB = 285.0 as const;
const LEAN_GZIP_WARN_KIB = 71.0 as const;
const MODULE_MARKER_RE = /^\/\/ ((?:src|node_modules)\/[^\n]+)/gm;

function run(cmd: string, args: string[]): {
  ok: boolean;
  status: number | null;
  stdout: string;
  stderr: string;
} {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, WRANGLER_WRITE_LOGS: "false" },
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function kiB(bytes: number): number {
  return Math.round((bytes / 1024) * 100) / 100;
}

function analyzeImportDrivers(source: string): { path: string; kiB: number }[] {
  const markers: { idx: number; path: string }[] = [];
  let match: RegExpExecArray | null;
  MODULE_MARKER_RE.lastIndex = 0;
  while ((match = MODULE_MARKER_RE.exec(source)) !== null) {
    markers.push({ idx: match.index, path: match[1] });
  }
  const sizes = new Map<string, number>();
  for (let i = 0; i < markers.length; i++) {
    const end = i + 1 < markers.length ? markers[i + 1].idx : source.length;
    const bytes = end - markers[i].idx;
    const bucket = markers[i].path.startsWith("node_modules/")
      ? markers[i].path.replace(/\/node_modules\/[^/]+\/[^/]+\/(.+)$/, "node_modules/$1").split("/").slice(0, 4).join("/")
      : markers[i].path;
    sizes.set(bucket, (sizes.get(bucket) ?? 0) + bytes);
  }
  return [...sizes.entries()]
    .map(([path, bytes]) => ({ path, kiB: kiB(bytes) }))
    .sort((a, b) => b.kiB - a.kiB)
    .slice(0, 12);
}

function main(): void {
  const full = process.argv.includes("--full");
  if (full || !existsSync(join(ROOT, "dist", "index.html"))) {
    console.log("[bundle:measure] building static assets…");
    const spa = run("pnpm", ["run", "build:assets"]);
    if (!spa.ok) {
      console.error(spa.stderr || spa.stdout);
      process.exit(spa.status ?? 1);
    }
  }

  console.log("[bundle:measure] import driver probe (unminified)…");
  const probe = run("pnpm", ["exec", "wrangler", "deploy", "--dry-run", "--outdir", OUTDIR_PROBE]);
  const probePath = join(ROOT, OUTDIR_PROBE, ENTRY_BASENAME);
  const drivers = probe.ok && existsSync(probePath)
    ? analyzeImportDrivers(readFileSync(probePath, "utf8"))
    : [];

  console.log("[bundle:measure] wrangler dry-run (minify + tree-shake)…");
  const bundle = run("pnpm", [
    "exec",
    "wrangler",
    "deploy",
    "--dry-run",
    "--minify",
    "--outdir",
    OUTDIR,
  ]);
  const combined = `${bundle.stdout}\n${bundle.stderr}`;
  if (!bundle.ok) {
    console.error(combined);
    process.exit(bundle.status ?? 1);
  }

  const entryPath = join(ROOT, OUTDIR, ENTRY_BASENAME);
  if (!existsSync(entryPath)) {
    console.error(`[bundle:measure] missing ${OUTDIR}/${ENTRY_BASENAME}`);
    process.exit(1);
  }

  const raw = readFileSync(entryPath);
  const gzipBytes = gzipSync(raw).length;
  const upload = combined.match(TOTAL_UPLOAD_RE);
  const rawKiB = kiB(statSync(entryPath).size);
  const gzipKiB = kiB(gzipBytes);

  const report = {
    measuredAt: new Date().toISOString(),
    entry: "src/worker-entry.ts",
    artifact: `${OUTDIR}/${ENTRY_BASENAME}`,
    minify: true,
    treeShaking: true,
    rawKiB,
    gzipKiB,
    wranglerTotalUploadKiB: upload ? Number(upload[1]) : null,
    wranglerTotalGzipKiB: upload ? Number(upload[2]) : null,
    limitKiB: BUNDLE_GZIP_LIMIT_KIB,
    leanWarnRawKiB: LEAN_RAW_WARN_KIB,
    leanWarnGzipKiB: LEAN_GZIP_WARN_KIB,
    pass: gzipKiB <= BUNDLE_GZIP_LIMIT_KIB,
    topImportDriversKiB: drivers,
  };

  console.log(JSON.stringify(report, null, 2));
  console.log("[bundle:measure] top import drivers (KiB):");
  for (const row of drivers) {
    console.log(`  ${row.kiB.toFixed(2).padStart(7)}  ${row.path}`);
  }

  if (rawKiB > LEAN_RAW_WARN_KIB || gzipKiB > LEAN_GZIP_WARN_KIB) {
    console.warn(
      `[bundle:measure] LEAN_WARN — raw=${rawKiB} KiB (>${LEAN_RAW_WARN_KIB}) gzip=${gzipKiB} KiB (>${LEAN_GZIP_WARN_KIB})`,
    );
  }
  if (!report.pass) {
    console.error(`[bundle:measure] FAIL — ${gzipKiB} KiB > ${BUNDLE_GZIP_LIMIT_KIB} KiB`);
    process.exit(1);
  }
}

main();
