/** SSOT registry + transforms for public markdown explorer links. */
import fs from "node:fs";
import path from "node:path";
import {
  BOOTSTRAP_IGNITION_SIGNER_A,
  BOOTSTRAP_IGNITION_SIGNER_B,
  MAINNET_DEPLOYMENTS,
  MAINNET_IGNITION_TX,
  MAINNET_SUPERSEDED_DEPLOYMENTS,
  SEPOLIA_ONLY_DEPLOYMENTS,
  SEPOLIA_SUPERSEDED_DEPLOYMENTS,
  SLIVERVINE_GATE_DUAL_DEPLOY_ADDRESS,
  SLIVERVINE_GATE_MAINNET_EXOMESH_ADDRESS,
  SLIVERVINE_GATE_SEPOLIA_EXOMESH_ADDRESS,
  STYLUS_SOIL_COPROCESSOR_MAINNET,
} from "../src/config/contract-deployments";

export type ExplorerKind = "mainnet" | "sepolia";

export interface RegistryEntry {
  address: string;
  kind: ExplorerKind;
  label: "address" | "tx";
}

const LIVE_FIRE_TXS: readonly string[] = [
  MAINNET_IGNITION_TX,
  "0xa37f52c857614ea47f2da8c6f1831fbf0f76ed39e881e716f0f077e9feab0e1a",
  "0x2e47f4fe1cc7c1579e1c450d92264c444c854f1b28a80dab31761a504c5bcb45",
  "0xe3155220e464c375329838bb5ca8498226b8c8fa32c11929b7605070f7be4774",
  "0x30ec0b7a9493f0c43edb257fd40f6d6f9258401e206357f3db7574b11071b00e",
  "0xfd3601dce5c2407d371186d8a24829994547ec8810f4a20c3e798d2fb67ae410",
  "0x92079e150697717af75b0b750ff80be36d06212337189ef368bf65fead6c9397",
  "0xab349d09cef98bcb29029df83306a31556ef9e3f0dc442e60e118c2a2b37b323",
  "0x82964525a2a7ad8392090b0c1c69208159a88096a399c6b94a124a751e26adf9",
  "0x13b1e5590119ba206d207e7950ab5aeffc8c82d547dc767630abcb865806c439",
  "0xb45b2530d9390db7a55fdb2e6e972b3f58e357d6881db146dd78756cdd5764e4",
  "0xb8ba76c4a8f7ed8f1c9820bf1122d4895a81b3ca6c780590aa16d74522d242a7",
  "0x6750785188fe72f137dbf140b70cdd3b8094df62db1d86339194245cb0dba0ba",
  "0xc7659e299e4961279f03b9cafa988dc082d7f9baf107bcd7b62812e8dfb54aad",
  "0x4c4ca1362d4a50d4684662e633e728401478c29dbef13f49e109e68253b5964a",
  "0xdca66358ffb9a2463d1069722ea27dcfabe1d374dc1d5264698c74341bb02a2f",
  "0xe12714a7b26d8983c32e471180e640dfb2ff000b4e1530a34cee02169f11e816",
];

const NO_LINK = new Set([
  BOOTSTRAP_IGNITION_SIGNER_A.toLowerCase(),
  BOOTSTRAP_IGNITION_SIGNER_B.toLowerCase(),
]);

function explorerUrl(entry: RegistryEntry): string {
  const base = entry.kind === "sepolia" ? "https://sepolia.arbiscan.io" : "https://arbiscan.io";
  const path = entry.label === "tx" ? "tx" : "address";
  return `${base}/${path}/${entry.address.toLowerCase()}`;
}

export function buildRegistry(): { all: RegistryEntry[]; byKey: Map<string, RegistryEntry> } {
  const all: RegistryEntry[] = [];
  const byKey = new Map<string, RegistryEntry>();
  const add = (entry: RegistryEntry): void => {
    if (entry.label === "address" && NO_LINK.has(entry.address.toLowerCase())) return;
    all.push(entry);
    byKey.set(entry.address.toLowerCase(), entry);
  };
  const addAddr = (address: string, kind: ExplorerKind): void =>
    add({ address, kind, label: "address" });

  for (const d of MAINNET_SUPERSEDED_DEPLOYMENTS) addAddr(d.address, "mainnet");
  for (const d of SEPOLIA_SUPERSEDED_DEPLOYMENTS) addAddr(d.address, "sepolia");
  for (const d of MAINNET_DEPLOYMENTS) addAddr(d.address, "mainnet");
  for (const d of SEPOLIA_ONLY_DEPLOYMENTS) addAddr(d.address, "sepolia");
  addAddr(SLIVERVINE_GATE_MAINNET_EXOMESH_ADDRESS, "mainnet");
  addAddr(SLIVERVINE_GATE_SEPOLIA_EXOMESH_ADDRESS, "sepolia");
  addAddr(STYLUS_SOIL_COPROCESSOR_MAINNET, "mainnet");
  addAddr(SLIVERVINE_GATE_DUAL_DEPLOY_ADDRESS, "mainnet");
  for (const tx of LIVE_FIRE_TXS) add({ address: tx, kind: "mainnet", label: "tx" });
  return { all, byKey };
}

export function truncatedLabel(address: string): string {
  const a = address.toLowerCase();
  return `0x${a.slice(2, 6)}…${a.slice(-4)}`;
}

export function fixBacktickLinks(text: string): string {
  let out = text.replace(/\[`([^`]+)`\]\(([^)]+)\)/g, "[$1]($2)");
  out = out.replace(/`(\[[^\`]+\]\([^)]+\))`/g, "$1");
  out = out.replace(/\[([^\[]*?)\s*\[([^\]]+)\]\(([^)]+)\)\]\(([^)]+)\)/g, (_, pre, label, url) => {
    const prefix = pre.endsWith(" ") ? pre : pre ? `${pre} ` : "";
    return `[${prefix}${label}](${url})`;
  });
  return out;
}

function inCodeFence(lines: string[], index: number): boolean {
  let open = false;
  for (let i = 0; i < index; i++) {
    if (lines[i].trimStart().startsWith("```")) open = !open;
  }
  return open;
}

function sepoliaHint(line: string): boolean {
  return /sepolia|421614|sepolia\.arbiscan/i.test(line);
}

function mainnetHint(line: string): boolean {
  return /mainnet|42161|(?<!sepolia\.)arbiscan\.io/i.test(line);
}

function normalizeHex(hex: string): string {
  const h = hex.startsWith("0x") ? hex : `0x${hex}`;
  return h.toLowerCase();
}

function resolveEntry(hex: string, all: RegistryEntry[], line: string): RegistryEntry | undefined {
  const key = normalizeHex(hex);
  const matches = all.filter((e) => e.label === "address" && e.address.toLowerCase() === key);
  if (matches.length === 0) {
    return all.find((e) => e.label === "tx" && e.address.toLowerCase() === key);
  }
  if (matches.length === 1) return matches[0];
  if (sepoliaHint(line)) return matches.find((e) => e.kind === "sepolia") ?? matches[0];
  if (mainnetHint(line)) return matches.find((e) => e.kind === "mainnet") ?? matches[0];
  return matches.find((e) => e.kind === "mainnet") ?? matches[0];
}

function replacePlainHex(line: string, all: RegistryEntry[]): string {
  let out = line.replace(/`(0x[a-fA-F0-9]{4,8}…[a-fA-F0-9]{4})`/gi, (full, truncated) => {
    const m = /^0x([a-fA-F0-9]{4,8})…([a-fA-F0-9]{4})$/i.exec(truncated);
    if (!m) return full;
    const hit = all.find(
      (e) =>
        e.address.toLowerCase().startsWith(`0x${m[1].toLowerCase()}`) &&
        e.address.toLowerCase().endsWith(m[2].toLowerCase()),
    );
    if (!hit) return full;
    return `[${truncated}](${explorerUrl(hit)})`;
  });

  out = out.replace(/`0x([a-fA-F0-9]{40})`/g, (full, hex) => {
    const entry = resolveEntry(hex, all, line);
    if (!entry || entry.label !== "address") return full;
    return `[${full.slice(1, -1)}](${explorerUrl(entry)})`;
  });

  out = out.replace(/`0x([a-fA-F0-9]{64})`/g, (full, hex) => {
    const entry = all.find((e) => e.address.toLowerCase() === normalizeHex(hex));
    if (!entry) return full;
    return `[${truncatedLabel(entry.address)}](${explorerUrl(entry)})`;
  });

  out = out.replace(/(?<!\[)(?<!\()(?<![\w/])0x([a-fA-F0-9]{40})(?![\w/])/g, (match, hex) => {
    if (line.includes(`/${hex.toLowerCase()}`)) return match;
    const entry = resolveEntry(hex, all, line);
    if (!entry || entry.label !== "address") return match;
    return `[${match}](${explorerUrl(entry)})`;
  });

  out = out.replace(/(?<!\[)(?<!\()0x([a-fA-F0-9]{4,8})…([a-fA-F0-9]{4})(?!\))/gi, (match, pre, suf) => {
    const hit = all.find(
      (e) =>
        e.address.toLowerCase().startsWith(`0x${pre.toLowerCase()}`) &&
        e.address.toLowerCase().endsWith(suf.toLowerCase()),
    );
    if (!hit) return match;
    return `[${match}](${explorerUrl(hit)})`;
  });

  return out;
}

export function fixSepoliaExplorerUrls(
  text: string,
  registry: { byKey: Map<string, RegistryEntry> },
): string {
  return text.replace(
    /https:\/\/arbiscan\.io\/(address|tx)\/(0x[a-fA-F0-9]+)/gi,
    (full, path, addr) => {
      const entry = registry.byKey.get(addr.toLowerCase());
      if (!entry || entry.kind !== "sepolia") return full;
      return `https://sepolia.arbiscan.io/${path}/${addr.toLowerCase()}`;
    },
  );
}

export function fixExplorerLinks(
  text: string,
  registry: { all: RegistryEntry[]; byKey: Map<string, RegistryEntry> },
): string {
  const lines = text.split("\n");
  const linked = lines
    .map((line, i) => (inCodeFence(lines, i) ? line : replacePlainHex(line, registry.all)))
    .join("\n");
  return fixSepoliaExplorerUrls(linked, registry);
}

export function isPublicDoc(relPosix: string): boolean {
  if (!relPosix.endsWith(".md")) return false;
  if (relPosix.startsWith("docs/internal/")) return false;
  if (relPosix.startsWith("docs/logging/")) return false;
  return true;
}

export function collectPublicDocs(root: string, walk: (dir: string, out: string[]) => string[]): string[] {
  const set = new Set<string>();
  for (const rel of ["README.md", "JUDGE_BRIEF.md", "SECURITY.md"]) {
    set.add(`${root}/${rel}`);
  }
  walk(`${root}/docs`, []).forEach((f) => set.add(f));
  return [...set].filter((f) => isPublicDoc(f.slice(root.length + 1).replace(/\\/g, "/"))).sort();
}

/** GitHub-style heading slug: em-dash → hyphen, strip punctuation, collapse hyphens. */
export function githubHeadingSlug(raw: string): string {
  const stripped = raw.replace(/\{#([^}]+)\}/, "").replace(/[\u2014\u2013]/g, "-");
  return stripped
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Collect GitHub-portable anchor IDs: heading auto-slugs + `<a id>` / `<a name>`.
 * Pandoc `{#id}` is intentionally ignored (not rendered on GitHub / VS Code).
 */
export function collectAnchors(text: string): Set<string> {
  const ids = new Set<string>();
  for (const line of text.split("\n")) {
    const hm = line.match(/^#{1,6}\s+(.+)/);
    if (hm) ids.add(githubHeadingSlug(hm[1]));
    const am = line.match(/<a\s+(?:id|name)="([^"]+)"/i);
    if (am) ids.add(am[1]);
  }
  return ids;
}

/** Lines with Pandoc `{#id}` header attributes (non-portable). */
export function findPandocHeaderIds(text: string, rel: string): string[] {
  const hits: string[] = [];
  for (const [i, line] of text.split("\n").entries()) {
    if (/^#{1,6}\s+.+\{#[^}]+\}/.test(line)) hits.push(`${rel}:${i + 1}`);
  }
  return hits;
}

export function collectAnchorMap(files: string[], root: string): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    map.set(rel, collectAnchors(fs.readFileSync(file, "utf8")));
  }
  return map;
}
