import type { Eip712Signer } from "../eip712-signer";
import { normalizeAddress } from "../crypto";
import { buildExchangeDomain, buildUserSignedDomain } from "./chain-id";
import { createL1ActionHash } from "./action-hash";
import {
  HL_AGENT_TYPES,
  HL_SESSION_KEY_AGENT_NAME,
  HL_SESSION_KEY_DELEGATION_TYPES,
  HL_USER_SIGNED_CHAIN_ID,
  type ApproveAgentAction,
  type HyperliquidChain,
  type SessionKeyAgentResult,
} from "./domains";
import { normalizeChainIdHex } from "./chain-id";
import {
  assertSigningChannelOpen,
  type SignHyperliquidActionOptions,
  type SigningGateInput,
} from "./signing-gate";

export function buildExchangeAgentMessage(args: {
  action: Record<string, unknown> | unknown[];
  nonce: number;
  isTestnet?: boolean;
  vaultAddress?: string;
  expiresAfter?: number;
}): { source: string; connectionId: string } {
  return {
    source: args.isTestnet ? "b" : "a",
    connectionId: createL1ActionHash(args),
  };
}

export async function signHyperliquidAction(
  signer: Eip712Signer,
  action: object,
  nonce: number,
  options: SignHyperliquidActionOptions = {},
): Promise<string> {
  assertSigningChannelOpen(options.gate);

  const agentMessage = buildExchangeAgentMessage({
    action: action as Record<string, unknown>,
    nonce,
    isTestnet: options.isTestnet,
    vaultAddress: options.vaultAddress,
    expiresAfter: options.expiresAfter,
  });

  return signer.signTypedData(
    buildExchangeDomain(options.signatureChainId),
    HL_AGENT_TYPES,
    agentMessage,
  );
}

export async function createSessionKeyAgent(
  masterSigner: Eip712Signer,
  agentAddress: string,
  durationMs: number,
  options: {
    isTestnet?: boolean;
    gate?: SigningGateInput;
    nonce?: number;
    agentName?: string;
    /** Wallet-active chain id hex — must match EIP-712 domain.chainId (e.g. `0x3e6`). */
    signatureChainId?: string;
  } = {},
): Promise<SessionKeyAgentResult> {
  assertSigningChannelOpen(options.gate);

  const normalizedAgent = normalizeAddress(agentAddress);
  const nonce = options.nonce ?? Date.now();
  const expiresAt = nonce + durationMs;
  const hyperliquidChain: HyperliquidChain = options.isTestnet
    ? "Testnet"
    : "Mainnet";
  const signatureChainId = normalizeChainIdHex(
    options.signatureChainId ?? HL_USER_SIGNED_CHAIN_ID,
  );

  const action: ApproveAgentAction = {
    type: "approveAgent",
    signatureChainId,
    hyperliquidChain,
    agentAddress: normalizedAgent,
    agentName:
      (options.agentName?.trim() &&
      options.agentName.trim().length >= 1 &&
      options.agentName.trim().length <= 16
        ? options.agentName.trim()
        : HL_SESSION_KEY_AGENT_NAME),
    nonce,
  };

  const domain = buildUserSignedDomain(signatureChainId);
  const approveAgentMessage = {
    hyperliquidChain: action.hyperliquidChain,
    agentAddress: action.agentAddress,
    agentName: action.agentName,
    nonce: action.nonce,
  };
  const signature = await masterSigner.signTypedData(
    domain,
    HL_SESSION_KEY_DELEGATION_TYPES,
    approveAgentMessage,
  );

  return {
    action,
    signature,
    agentAddress: normalizedAgent,
    expiresAt,
    nonce,
    hyperliquidChain,
  };
}
