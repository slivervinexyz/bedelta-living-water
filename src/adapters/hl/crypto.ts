/**
 * Workers-safe crypto primitives for Hyperliquid L1 hashing & signature parsing.
 * Replaces ethers keccak256 / concat / Signature.from on the hot path.
 */

import { keccak_256 } from "@noble/hashes/sha3";

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function keccak256Hex(data: Uint8Array): string {
  const hash = keccak_256(data);
  return `0x${bytesToHex(hash)}`;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (normalized.length % 2 !== 0) {
    throw new Error(`Invalid hex length: ${hex}`);
  }
  const out = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Minimal address validation — 20-byte EVM address */
export function normalizeAddress(address: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error(`Invalid EVM address: ${address}`);
  }
  return address.toLowerCase();
}

export function getAddressBytes(address: string): Uint8Array {
  return hexToBytes(normalizeAddress(address));
}

export function splitHyperliquidSignature(signature: string): {
  r: string;
  s: string;
  v: number;
} {
  const hex = signature.startsWith("0x") ? signature.slice(2) : signature;
  if (hex.length !== 130) {
    throw new Error(`Invalid Hyperliquid signature length: ${signature.length}`);
  }
  return {
    r: `0x${hex.slice(0, 64)}`,
    s: `0x${hex.slice(64, 128)}`,
    v: Number.parseInt(hex.slice(128, 130), 16),
  };
}

export function toUint64Bytes(n: bigint | number): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(n));
  return bytes;
}
