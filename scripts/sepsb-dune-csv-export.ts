/** SEPSB stress telemetry → Dune-compatible CSV flatten export. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { BenchmarkEnvironment } from "../src/utils/hardware-detector";
import { detectBenchmarkEnvironment } from "../src/utils/hardware-detector";
import { evaluateSepsbCase } from "./sepsb-benchmark-eval";
import type { SepsbCaseResult, SepsbCorpusCase, SepsbCorpusFile, SepsbCoreVenue } from "./sepsb-benchmark-types";
import { measureSepsbReflexLatencyUs } from "./sepsb-reflex-latency";

export const SEPSB_STRESS_CSV_PATH = "docs/audit/sepsb-stress-telemetry.csv";
const CSV_HEADER =
  "case_id,set_type,venue,expected_verdict,actual_verdict,is_correct,reflex_latency_us,tpr_rate,fpr_rate,hardware_spec,timestamp";

export interface SepsbDuneCsvInput {
  timestamp: string;
  toxicFile: SepsbCorpusFile;
  benignFile: SepsbCorpusFile;
  toxicResults: SepsbCaseResult[];
  benignResults: SepsbCaseResult[];
  tprRate: number;
  fprRate: number;
  env: BenchmarkEnvironment;
}

const CORE_VENUES = new Set<SepsbCoreVenue>(["gmx", "pendle", "usdai", "hyperliquid", "variational"]);

function resolveVenue(caseRow: SepsbCorpusCase): SepsbCoreVenue {
  if (CORE_VENUES.has(caseRow.venue)) return caseRow.venue;
  throw new Error(`SEPSB_CORPUS_INVALID_VENUE:${caseRow.id}:${caseRow.venue}`);
}

function formatRatePct(rate: number): string {
  return rate.toFixed(1);
}

export function formatHardwareSpec(env: BenchmarkEnvironment): string {
  return `${env.cpuModel}|${env.cpuCores}c|${env.arch}|${env.platform}|${env.nodeVersion}`;
}

function csvCell(value: string | number | boolean): string {
  const raw = String(value);
  return raw.includes(",") || raw.includes('"') ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function evaluateSepsbCorpus(file: SepsbCorpusFile): SepsbCaseResult[] {
  return file.cases.map((caseRow) => {
    const venue = resolveVenue(caseRow);
    const { actual, detail } = evaluateSepsbCase(caseRow);
    const reflexLatencyUs = measureSepsbReflexLatencyUs(caseRow, venue);
    return {
      id: caseRow.id,
      category: caseRow.category,
      expected: caseRow.expected,
      actual,
      pass: actual === caseRow.expected,
      observatoryParadox: caseRow.observatoryParadox,
      detail,
      setType: file.label,
      venue: resolveVenue(caseRow),
      reflexLatencyUs,
    };
  });
}

export function exportSepsbDuneCsv(input: SepsbDuneCsvInput, outPath: string): void {
  const hardwareSpec = formatHardwareSpec(input.env);
  const tpr = formatRatePct(input.tprRate);
  const fpr = formatRatePct(input.fprRate);
  const rows: string[] = [CSV_HEADER];

  for (const file of [input.toxicFile, input.benignFile]) {
    const results = file.label === "toxic" ? input.toxicResults : input.benignResults;
    for (let i = 0; i < file.cases.length; i++) {
      const caseRow = file.cases[i]!;
      const result = results[i]!;
      rows.push(
        [
          csvCell(caseRow.id),
          csvCell(file.label),
          csvCell(result.venue ?? resolveVenue(caseRow)),
          csvCell(caseRow.expected),
          csvCell(result.actual),
          csvCell(result.pass),
          csvCell(result.reflexLatencyUs ?? 0),
          csvCell(tpr),
          csvCell(fpr),
          csvCell(hardwareSpec),
          csvCell(input.timestamp),
        ].join(","),
      );
    }
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${rows.join("\n")}\n`);
}

export function writeSepsbStressTelemetryCsv(root: string): string {
  const toxicPath = join(root, "tests/p0/corpus/toxic-set.json");
  const benignPath = join(root, "tests/p0/corpus/benign-set.json");
  const toxicFile = JSON.parse(readFileSync(toxicPath, "utf8")) as SepsbCorpusFile;
  const benignFile = JSON.parse(readFileSync(benignPath, "utf8")) as SepsbCorpusFile;
  const env = detectBenchmarkEnvironment();
  const toxic = evaluateSepsbCorpus(toxicFile);
  const benign = evaluateSepsbCorpus(benignFile);
  const tp = toxic.filter((r) => r.actual === "block").length;
  const fp = benign.filter((r) => r.actual === "block").length;
  const tpr = toxic.length ? (tp / toxic.length) * 100 : 100;
  const fpr = benign.length ? (fp / benign.length) * 100 : 0;
  const outPath = join(root, SEPSB_STRESS_CSV_PATH);
  exportSepsbDuneCsv(
    { timestamp: env.detectedAt, toxicFile, benignFile, toxicResults: toxic, benignResults: benign, tprRate: tpr, fprRate: fpr, env },
    outPath,
  );
  return outPath;
}
