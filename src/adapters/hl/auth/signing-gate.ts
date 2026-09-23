import { HardlockError } from "../../../services/risk-control";

export interface SigningGateInput {
  hardlock?: boolean;
  signingChannelOpen?: boolean;
  criHardlock?: boolean;
  soilResistanceTripped?: boolean;
  symbol?: string;
}

export interface SignHyperliquidActionOptions {
  isTestnet?: boolean;
  vaultAddress?: string;
  expiresAfter?: number;
  gate?: SigningGateInput;
  /** Wallet-active chain id hex — browser EIP-712 must match eth_chainId (e.g. `0x3e6`). */
  signatureChainId?: string;
}

export class SigningChannelLockedError extends Error {
  readonly code = "SIGNING_CHANNEL_LOCKED" as const;
  readonly httpStatus = 403 as const;
  readonly reason:
    | "HARDLOCK"
    | "SOIL_RESISTANCE"
    | "SIGNING_CHANNEL_CLOSED";

  constructor(
    message: string,
    reason: SigningChannelLockedError["reason"],
  ) {
    super(message);
    this.name = "SigningChannelLockedError";
    this.reason = reason;
  }
}

export function isSigningChannelLocked(gate: SigningGateInput = {}): boolean {
  if (gate.soilResistanceTripped) return true;
  if (gate.hardlock || gate.criHardlock) return true;
  if (gate.signingChannelOpen === false) return true;
  return false;
}

export function assertSigningChannelOpen(gate: SigningGateInput = {}): void {
  const symbol = gate.symbol ?? "HL_AUTH";

  if (gate.soilResistanceTripped) {
    throw new SigningChannelLockedError(
      "checkSoilResistance() trip — signing channel blocked (ping/depth/slippage fuse)",
      "SOIL_RESISTANCE",
    );
  }

  if (gate.hardlock || gate.criHardlock) {
    throw new HardlockError(
      "vineWrapProtection() hardlock — Session Key signing channel severed (R17/R20)",
      {
        level: "error",
        module: "risk-control",
        event: "CRI_HARDLOCK",
        symbol,
        timestamp: new Date().toISOString(),
        message: "Signing blocked under R20 physical deadlock",
        details: { signingChannelOpen: false },
      },
    );
  }

  if (gate.signingChannelOpen === false) {
    throw new SigningChannelLockedError(
      "Signing channel closed — hardlock active",
      "SIGNING_CHANNEL_CLOSED",
    );
  }
}
