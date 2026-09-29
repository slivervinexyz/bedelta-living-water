/**
 * Hyperliquid L1 authentication — EIP-712 signing for exchange actions,
 * session-key (agent) delegation, and agent authorization.
 *
 * Hashing uses Workers-safe @noble/hashes; signing accepts injectable Eip712Signer.
 */

export { splitHyperliquidSignature } from "./crypto";
export type { Eip712Signer } from "./eip712-signer";
export { createViemEip712Signer } from "./viem-eip712-signer";
export type { ViemEip712Signer } from "./viem-eip712-signer";

export * from "./auth/domains";
export * from "./auth/chain-id";
export * from "./auth/signing-gate";
export * from "./auth/action-hash";
export * from "./auth/session-key";
export * from "./auth/sign-action";
