/**
 * Audit artifact chain + git SHA bindings — shared by chaos / zerodev metrics.
 */

import { execSync } from "node:child_process";

export const ARBITRUM_ONE_CHAIN_ID = 42161 as const;

export interface AuditArtifactBinding {
  timestamp: string;
  chainId: typeof ARBITRUM_ONE_CHAIN_ID;
  gitCommitHash: string;
}

export function resolveGitCommitHash(): string {
  try {
    return execSync("git rev-parse HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

export function resolveAuditArtifactBinding(at: Date = new Date()): AuditArtifactBinding {
  return {
    timestamp: at.toISOString(),
    chainId: ARBITRUM_ONE_CHAIN_ID,
    gitCommitHash: resolveGitCommitHash(),
  };
}
