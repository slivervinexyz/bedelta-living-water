import type { Eip712Domain } from "../eip712-signer";
import {
  HL_EXCHANGE_DOMAIN,
  HL_L1_CHAIN_ID,
  HL_ZERO_ADDRESS,
} from "./domains";

/** Normalize wallet/API chain id to lowercase `0x` hex (e.g. `0x3e6`). */
export function normalizeChainIdHex(chainId: string | number | bigint): string {
  if (typeof chainId === "number") {
    return `0x${chainId.toString(16)}`;
  }
  if (typeof chainId === "bigint") {
    return `0x${chainId.toString(16)}`;
  }
  const trimmed = chainId.trim();
  if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
    return `0x${Number.parseInt(trimmed, 16).toString(16)}`;
  }
  return `0x${Number.parseInt(trimmed, 10).toString(16)}`;
}

export function chainIdHexToNumber(chainIdHex: string): number {
  return Number.parseInt(normalizeChainIdHex(chainIdHex), 16);
}

/** User-signed domain builder — chainId parsed from action.signatureChainId */
export function buildUserSignedDomain(signatureChainId: string): Eip712Domain {
  return {
    name: "HyperliquidSignTransaction",
    version: "1",
    chainId: chainIdHexToNumber(signatureChainId),
    verifyingContract: HL_ZERO_ADDRESS,
  };
}

/** L1 exchange domain — SDK canonical: always chainId 1337 (phantom Agent, not wallet network). */
export function buildExchangeDomain(_signatureChainId?: string): Eip712Domain {
  return {
    name: HL_EXCHANGE_DOMAIN.name,
    version: HL_EXCHANGE_DOMAIN.version,
    chainId: HL_L1_CHAIN_ID,
    verifyingContract: HL_ZERO_ADDRESS,
  };
}
