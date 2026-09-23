#!/usr/bin/env tsx
/** Roll up Dune CSV SSOT, emit rollup JSON, flag doc/spec drift (BH-33). */
import fs from "node:fs";
import path from "node:path";
import { collectPublicDocs } from "./fix-public-doc-links-lib";
import {
  buildRollupJson,
  rollupExomeshCsv,
  rollupSepsbCsv,
  scanPublicDocStaleKpis,
  scanSpecDocDrift,
  validateExomeshRows,
} from "./_shared/dune-reconcile-lib";
import {
  rollupOnchainCsv,
  validateOnchainRows,
} from "./_shared/dune-reconcile-onchain";
import { parseOnchainDuneCsv } from "./_shared/onchain-dune-telemetry";
import { parseDuneTelemetryCsv } from "./_shared/exomesh-dune-telemetry-cumulative";

const ROOT = path.resolve(import.meta.dirname, "..");
const EXOMESH_CSV = path.join(ROOT, "docs/audit/exomesh-dune-telemetry.csv");
const ONCHAIN_CSV = path.join(ROOT, "docs/audit/onchain-dune-telemetry.csv");
const SEPSB_CSV = path.join(ROOT, "docs/audit/sepsb-stress-telemetry.csv");
const ROLLUP_JSON = path.join(ROOT, "docs/audit/dune-telemetry-rollup.json");
const SPEC_DOC = path.join(ROOT, "docs/01_architecture_and_standards/03_telemetry_and_mo/03_DUNE_DASHBOARD_SPECIFICATION.md");

function walkMd(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".git") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkMd(p, out);
    else if (ent.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function main(): void {
  const exomeshContent = fs.readFileSync(EXOMESH_CSV, "utf8");
  const sepsbContent = fs.readFileSync(SEPSB_CSV, "utf8");
  const onchainContent = fs.existsSync(ONCHAIN_CSV)
    ? fs.readFileSync(ONCHAIN_CSV, "utf8")
    : "";
  const rows = parseDuneTelemetryCsv(exomeshContent);
  const exomesh = rollupExomeshCsv(exomeshContent, EXOMESH_CSV);
  const sepsb = rollupSepsbCsv(sepsbContent);
  const onchain = onchainContent ? rollupOnchainCsv(onchainContent) : null;
  const rollup = buildRollupJson(exomesh, sepsb, onchain ?? undefined);
  fs.writeFileSync(ROLLUP_JSON, `${JSON.stringify(rollup, null, 2)}\n`);

  const violations: string[] = [];
  violations.push(...validateExomeshRows(rows));
  if (onchainContent) {
    violations.push(...validateOnchainRows(parseOnchainDuneCsv(onchainContent)));
  }

  const dataLines = exomeshContent.split("\n").filter((l) => l.length > 0 && !l.startsWith("#"));
  const expectedRows = dataLines.length > 1 ? dataLines.length - 1 : 0;
  if (expectedRows !== exomesh.total_rows) {
    violations.push(`csv row count mismatch: parsed ${exomesh.total_rows} vs expected ${expectedRows}`);
  }

  const specText = fs.readFileSync(SPEC_DOC, "utf8");
  violations.push(...scanSpecDocDrift(specText, exomesh));

  const publicFiles = collectPublicDocs(ROOT, walkMd);
  for (const file of publicFiles) {
    const rel = path.relative(ROOT, file);
    violations.push(...scanPublicDocStaleKpis(rel, fs.readFileSync(file, "utf8")));
  }

  console.log(`Exomesh rollup: ${exomesh.total_rows} rows · fail_closed=${exomesh.fail_closed_count}`);
  console.log(
    `simulated_loss=$${exomesh.simulated_loss_prevented_usd_total} · gas_saved=$${exomesh.gas_saved_usd_total}`,
  );
  if (onchain) {
    console.log(
      `Onchain rollup: ${onchain.total_rows} rows · earliest ${onchain.date_range.earliest} · latest ${onchain.date_range.latest}`,
    );
  }
  console.log(`SEPSB: ${sepsb.case_count} cases · TPR ${sepsb.tpr_pct}%`);
  console.log(`Rollup -> ${path.relative(ROOT, ROLLUP_JSON)}`);
  console.log(`Scanned ${publicFiles.length} public markdown files`);
  console.log(`Violations: ${violations.length}`);
  violations.forEach((v) => console.error(`DRIFT ${v}`));

  process.exit(violations.length > 0 ? 1 : 0);
}

main();
