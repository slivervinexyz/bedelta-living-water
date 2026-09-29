/** Module A / Module B SSOT taxonomy banners for CLI demos. */
import { BOLD, CYAN, GRAY, R } from "../adapters/exomesh-ansi-hud";

const BOX_W_MIN = 74;

export const MODULE_A_BANNER_LINES = [
  "🛡️ SliverVine ExoMesh · Module A",
  "Agentic Guard (EIP-1193/5792/6963+)",
  "Pre-Consensus Exoskeleton · SSRC soil_core.wasm",
  "Arbitrum Stylus Coprocessor · Zero-Allocation Hot-Path",
] as const;

export const MODULE_B_BANNER_LINES = [
  "🏛️ SliverVine Sanctuary · Module B",
  "Sanctuary Async Escort (ERC-7540+)",
  "Async Vault Selector Guard · SSRC soil_core.wasm FFI",
] as const;

export const MODULE_B_INGRESS_BANNER_LINES = [
  "🏛️ SliverVine Sanctuary · Module B",
  "Pillar Set X Treasury Ingress",
  "ERC-7683 / ERC-7579 Escort Router · SSRC soil_core.wasm FFI",
] as const;

export const OPSEC_FFI_FOOTNOTE =
  "[OpSec]: Pre-consensus hot-path logic encapsulated inside pkg/soil_core.wasm FFI boundary.";

function padBanner(text: string, width: number): string {
  const inner = ` ${text} `;
  const pad = Math.max(0, width - inner.length);
  return `${"─".repeat(Math.floor(pad / 2))}${inner}${"─".repeat(Math.ceil(pad / 2))}`;
}

function printModuleBanner(lines: readonly string[], extraLines: readonly string[] = []): void {
  const all = [...lines, ...extraLines];
  const w = Math.max(BOX_W_MIN, ...all.map((line) => line.length + 4));
  console.log(`${CYAN}┌${"─".repeat(w)}┐${R}`);
  for (const line of all) {
    console.log(`${CYAN}│${R}${BOLD}${padBanner(line, w)}${R}${CYAN}│${R}`);
  }
  console.log(`${CYAN}└${"─".repeat(w)}┘${R}`);
}

export function printModuleABanner(extraLine?: string): void {
  printModuleBanner(MODULE_A_BANNER_LINES, extraLine ? [extraLine] : []);
}

export function printModuleBBanner(): void {
  printModuleBanner(MODULE_B_BANNER_LINES);
}

export function printModuleBIngressBanner(): void {
  printModuleBanner(MODULE_B_INGRESS_BANNER_LINES);
}

export function printOpSecFootnote(): void {
  console.log(`${GRAY}${OPSEC_FFI_FOOTNOTE}${R}`);
}
