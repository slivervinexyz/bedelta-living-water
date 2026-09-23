#!/usr/bin/env tsx
/** Read-only audit: no [`text`](url); SSOT gate addresses linked; relative md links resolve. */
import fs from "node:fs";
import path from "node:path";
import {
  buildRegistry,
  collectAnchorMap,
  collectPublicDocs,
  findPandocHeaderIds,
} from "./fix-public-doc-links-lib";
import {
  SLIVERVINE_GATE_MAINNET_EXOMESH_ADDRESS,
  SLIVERVINE_GATE_SEPOLIA_EXOMESH_ADDRESS,
} from "../src/config/contract-deployments.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const JUDGE_FILES = ["JUDGE_BRIEF.md", "README.md", "docs/00_ARB_Buildathon/SUBMISSION.md"] as const;
const SSOT_ADDR_RE = /`0x([a-fA-F0-9]{40})`/g;
const WRAPPED_MD_LINK_RE = /`\[[^\`]+\]\(/g;
const TRUNCATED_BACKTICK_RE = /`(0x[a-fA-F0-9]{4,8}…[a-fA-F0-9]{4})`/gi;
const MD_LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;
const ARBISCAN_LINK_RE = /\[([^\]]*)\]\((https:\/\/arbiscan\.io\/(address|tx)\/(0x[a-fA-F0-9]+))\)/gi;
const SKIP_LINK = /^(?:https?:|mailto:|#)/i;
const INTERNAL_DOC_LINK_RE =
  /docs\/internal\/|]\(\.\.\/internal\/|]\(\.\.\/\.\.\/internal\//;
const STAGING_PRIORITY_RE = /\bP[0-3]\b/;
const STAGING_PHASE_RE = /\bPhase\s+[A-D0-9]/;
const STAGING_ALLOWLIST_RE = /P99|Two-Phase/i;
const BANNED_JARGON_RE = /Memory Isolation|Memory Engine|Heap Isolation|Zero-GC|zero-GC|zero-gc/i;

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

function collectAllMdFiles(): string[] {
  const out: string[] = [];
  for (const rel of ["README.md", "JUDGE_BRIEF.md", "SECURITY.md"]) {
    const p = path.join(ROOT, rel);
    if (fs.existsSync(p)) out.push(p);
  }
  walkMd(ROOT, out);
  walkMd(path.join(ROOT, "docs"), out);
  return [...new Set(out)].sort();
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

type LinkResolve =
  | { kind: "skip" }
  | { kind: "out_of_root"; abs: string }
  | { kind: "resolved"; abs: string };

function resolveLinkTarget(sourceFile: string, href: string): LinkResolve {
  const raw = href.trim();
  if (!raw || SKIP_LINK.test(raw)) return { kind: "skip" };
  const [filePart] = raw.split("#");
  if (!filePart) return { kind: "skip" };
  const abs = path.resolve(path.dirname(sourceFile), filePart);
  const inRoot = abs === ROOT || abs.startsWith(`${ROOT}${path.sep}`);
  if (!inRoot) return { kind: "out_of_root", abs };
  return { kind: "resolved", abs };
}

function auditDeadLinks(files: string[]): { dead: string[]; outOfRoot: string[] } {
  const dead: string[] = [];
  const outOfRoot: string[] = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(ROOT, file);
    for (const m of text.matchAll(MD_LINK_RE)) {
      const href = m[2];
      const line = lineOf(text, m.index ?? 0);
      const target = resolveLinkTarget(file, href);
      if (target.kind === "skip") continue;
      if (target.kind === "out_of_root") {
        outOfRoot.push(`${rel}:${line} -> ${href} (${path.relative(ROOT, target.abs)})`);
        continue;
      }
      if (!fs.existsSync(target.abs)) {
        dead.push(`${rel}:${line} -> ${href} (${path.relative(ROOT, target.abs)})`);
      }
    }
  }
  return { dead, outOfRoot };
}

function auditDeadAnchors(
  files: string[],
  anchorMap: Map<string, Set<string>>,
): string[] {
  const dead: string[] = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    for (const m of text.matchAll(MD_LINK_RE)) {
      const href = m[2].trim();
      const line = lineOf(text, m.index ?? 0);
      if (/^(?:https?:|mailto:)/i.test(href)) continue;
      const hashIdx = href.indexOf("#");
      if (hashIdx < 0) continue;
      const filePart = href.slice(0, hashIdx);
      const frag = href.slice(hashIdx + 1);
      if (!frag) continue;
      const targetRel = filePart
        ? path.relative(ROOT, path.resolve(path.dirname(file), filePart)).replace(/\\/g, "/")
        : rel;
      if (filePart) {
        const abs = path.resolve(path.dirname(file), filePart);
        if (!fs.existsSync(abs)) continue;
        if (!abs.endsWith(".md")) continue;
      }
      const anchors = anchorMap.get(targetRel);
      if (!anchors?.has(frag)) {
        dead.push(`${rel}:${line} -> ${href} (missing #${frag} in ${targetRel})`);
      }
    }
  }
  return dead;
}

function auditBannedJargon(files: string[]): string[] {
  const hits: string[] = [];
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    if (rel.startsWith(`docs${path.sep}internal${path.sep}`)) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const [i, line] of text.split("\n").entries()) {
      if (line.trimStart().startsWith("<!--")) continue;
      if (BANNED_JARGON_RE.test(line)) hits.push(`${rel}:${i + 1}`);
    }
  }
  return hits;
}

function auditStagingJargon(files: string[]): string[] {
  const hits: string[] = [];
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    if (rel.startsWith(`docs${path.sep}internal${path.sep}`)) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const [i, line] of text.split("\n").entries()) {
      if (STAGING_ALLOWLIST_RE.test(line)) continue;
      if (STAGING_PRIORITY_RE.test(line) || STAGING_PHASE_RE.test(line)) {
        hits.push(`${rel}:${i + 1}`);
      }
    }
  }
  return hits;
}

function auditInternalDocLinks(files: string[]): string[] {
  const leaks: string[] = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    if (!INTERNAL_DOC_LINK_RE.test(text)) continue;
    const rel = path.relative(ROOT, file);
    for (const [i, line] of text.split("\n").entries()) {
      if (INTERNAL_DOC_LINK_RE.test(line)) {
        leaks.push(`${rel}:${i + 1}`);
      }
    }
  }
  return leaks;
}

function hasExplorerLink(text: string, address: string): boolean {
  const lower = address.toLowerCase();
  return (
    text.includes(`arbiscan.io/address/${lower}`) ||
    text.includes(`sepolia.arbiscan.io/address/${lower}`)
  );
}

function registryTruncatedHit(
  truncated: string,
  registry: ReturnType<typeof buildRegistry>,
): boolean {
  const m = /^0x([a-fA-F0-9]{4,8})…([a-fA-F0-9]{4})$/i.exec(truncated);
  if (!m) return false;
  return registry.all.some(
    (e) =>
      e.label === "address" &&
      e.address.toLowerCase().startsWith(`0x${m[1].toLowerCase()}`) &&
      e.address.toLowerCase().endsWith(m[2].toLowerCase()),
  );
}

function main(): void {
  const publicFiles = collectPublicDocs(ROOT, walkMd);
  const allMdFiles = collectAllMdFiles();
  const registry = buildRegistry();
  const ssotKeys = new Set(
    registry.all.filter((e) => e.label === "address").map((e) => e.address.toLowerCase()),
  );
  let backtickLinks = 0;
  let wrappedLinks = 0;
  let sepoliaHostMismatches = 0;
  const unlinked: string[] = [];
  const { dead: deadLinks, outOfRoot: outOfRootLinks } = auditDeadLinks(allMdFiles);
  const anchorMap = collectAnchorMap(allMdFiles, ROOT);
  const deadAnchors = auditDeadAnchors(allMdFiles, anchorMap);
  const internalDocLinks = auditInternalDocLinks(publicFiles);
  const stagingJargon = auditStagingJargon(allMdFiles);
  const bannedJargon = auditBannedJargon(allMdFiles);
  const pandocHeaderIds: string[] = [];
  for (const file of allMdFiles) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    pandocHeaderIds.push(...findPandocHeaderIds(fs.readFileSync(file, "utf8"), rel));
  }

  for (const file of publicFiles) {
    const rel = path.relative(ROOT, file);
    const text = fs.readFileSync(file, "utf8");
    const labelHits = text.match(/\[`[^`]+`\]\(/g);
    backtickLinks += labelHits?.length ?? 0;
    if (labelHits?.length) console.error(`BACKTICK_LINK ${rel}: ${labelHits.length}`);

    const wrappedHits = text.match(WRAPPED_MD_LINK_RE);
    wrappedLinks += wrappedHits?.length ?? 0;
    if (wrappedHits?.length) console.error(`WRAPPED_LINK ${rel}: ${wrappedHits.length}`);

    for (const m of text.matchAll(TRUNCATED_BACKTICK_RE)) {
      if (registryTruncatedHit(m[1], registry)) {
        unlinked.push(`${rel}: unlinked truncated SSOT address ${m[0]}`);
      }
    }

    for (const m of text.matchAll(ARBISCAN_LINK_RE)) {
      const addr = m[4].toLowerCase();
      const entry = registry.byKey.get(addr);
      if (entry?.kind === "sepolia") {
        sepoliaHostMismatches++;
        console.error(`SEPOLIA_HOST ${rel}: ${m[2]} (${addr})`);
      }
    }

    if (!JUDGE_FILES.includes(rel as (typeof JUDGE_FILES)[number])) continue;
    for (const [addr, label] of [
      [SLIVERVINE_GATE_MAINNET_EXOMESH_ADDRESS, "Gate mainnet"],
      [SLIVERVINE_GATE_SEPOLIA_EXOMESH_ADDRESS, "Gate sepolia"],
    ] as const) {
      if (text.includes(addr) && !hasExplorerLink(text, addr)) {
        unlinked.push(`${rel}: ${label}`);
      }
    }
    for (const m of text.matchAll(SSOT_ADDR_RE)) {
      if (ssotKeys.has(m[1].toLowerCase())) {
        unlinked.push(`${rel}: plain backtick SSOT address ${m[0]}`);
      }
    }
  }

  console.log(`Scanned ${publicFiles.length} public markdown files`);
  console.log(`Scanned ${allMdFiles.length} total markdown files for dead links`);
  console.log(`Backtick-in-link violations: ${backtickLinks}`);
  console.log(`Wrapped-markdown-link violations: ${wrappedLinks}`);
  console.log(`Sepolia host mismatches: ${sepoliaHostMismatches}`);
  console.log(`Dead relative links: ${deadLinks.length}`);
  console.log(`Dead anchor links: ${deadAnchors.length}`);
  console.log(`Out-of-root relative links: ${outOfRootLinks.length}`);
  console.log(`Internal doc link leaks: ${internalDocLinks.length}`);
  console.log(`Staging jargon violations: ${stagingJargon.length}`);
  console.log(`Banned jargon violations: ${bannedJargon.length}`);
  console.log(`Pandoc header-id violations: ${pandocHeaderIds.length}`);
  console.log(`Registry entries: ${registry.all.length}`);
  deadLinks.forEach((d) => console.error(`DEAD_LINK ${d}`));
  deadAnchors.forEach((d) => console.error(`DEAD_ANCHOR ${d}`));
  outOfRootLinks.forEach((d) => console.error(`OUT_OF_ROOT ${d}`));
  internalDocLinks.forEach((l) => console.error(`INTERNAL_DOC_LINK ${l}`));
  stagingJargon.forEach((l) => console.error(`STAGING_JARGON ${l}`));
  bannedJargon.forEach((l) => console.error(`BANNED_JARGON ${l}`));
  pandocHeaderIds.forEach((l) => console.error(`PANDOC_HEADER_ID ${l}`));
  unlinked.forEach((u) => console.error(`UNLINKED ${u}`));

  process.exit(
    backtickLinks > 0 ||
      wrappedLinks > 0 ||
      sepoliaHostMismatches > 0 ||
      unlinked.length > 0 ||
      deadLinks.length > 0 ||
      deadAnchors.length > 0 ||
      outOfRootLinks.length > 0 ||
      internalDocLinks.length > 0 ||
      stagingJargon.length > 0 ||
      bannedJargon.length > 0 ||
      pandocHeaderIds.length > 0
      ? 1
      : 0,
  );
}

main();
