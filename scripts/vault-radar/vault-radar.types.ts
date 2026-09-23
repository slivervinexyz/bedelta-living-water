export const HL_STATS_VAULTS_URL =
  "https://stats-data.hyperliquid.xyz/Mainnet/vaults" as const;

export interface PublicContactTags {
  twitter?: string;
  discord?: string;
  telegram?: string;
  websites: string[];
  rawHandles: string[];
}

export interface DepthProbe {
  coin: string;
  depthUsd: number;
  latencyMs: number;
  stale: boolean;
  failClosedWouldTrip: boolean;
}

export interface VaultLeadCore {
  vaultAddress: string;
  vaultName: string;
  leaderAddress: string;
  leaderDisplayName: string;
  tvlUsd: number;
  apr: number;
  isClosed: boolean;
  vulnerability: string;
  riskScore: number;
  tradeFrequencyScore: number;
  dayDrawdownUsd: number;
  weekDrawdownUsd: number;
  depthMismatchRatio: number;
  estimatedSlippageExposureUsd: number;
  estimatedLossSavedByFailClosedUsd: number;
  depthProbes: DepthProbe[];
  contacts: PublicContactTags;
  description?: string;
  coldOutreachHook: string;
}

export interface StatsVaultEntry {
  apr: number;
  pnls: Array<[string, string[]]>;
  summary: {
    name: string;
    vaultAddress: string;
    leader: string;
    tvl: string;
    isClosed: boolean;
  };
}

export interface VaultDetails {
  name: string;
  vaultAddress: string;
  leader: string;
  description?: string;
  apr?: number;
  isClosed?: boolean;
  portfolio?: Array<
    [
      string,
      {
        accountValueHistory?: Array<[number, string]>;
        pnlHistory?: Array<[number, string]>;
        vlm?: string;
      },
    ]
  >;
}

export interface HlL2Level {
  px: string;
  sz: string;
}

export interface HlL2Book {
  coin: string;
  levels: [HlL2Level[], HlL2Level[]];
  time?: number;
}
