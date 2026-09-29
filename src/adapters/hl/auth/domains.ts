import type { Eip712Domain, Eip712TypedField } from "../eip712-signer";

/** Hyperliquid verifying contract placeholder (always zero address) */
export const HL_ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;

/** L1 phantom-agent domain chain id — fixed by Hyperliquid, not wallet network */
export const HL_L1_CHAIN_ID = 1337;

/** Default user-signed chain id (Arbitrum Sepolia) used for wallet EIP-712 signing */
export const HL_USER_SIGNED_CHAIN_ID = "0x66eee" as const;

/** HyperEVM Testnet wallet chain id (998) — used in approveAgent signatureChainId only. */
export const HL_HYPEREVM_TESTNET_CHAIN_HEX = "0x3e6" as const;

/** EIP-712 domain for L1 exchange actions (phantom Agent) */
export const HL_EXCHANGE_DOMAIN: Eip712Domain = {
  name: "Exchange",
  version: "1",
  chainId: HL_L1_CHAIN_ID,
  verifyingContract: HL_ZERO_ADDRESS,
};

/** Phantom Agent typed data for L1 exchange actions */
export const HL_AGENT_TYPES: Record<string, Eip712TypedField[]> = {
  Agent: [
    { name: "source", type: "string" },
    { name: "connectionId", type: "bytes32" },
  ],
};

/** Agent authorization (approveAgent) — master wallet authorizes session-key agent */
export const HL_APPROVE_AGENT_TYPES: Record<string, Eip712TypedField[]> = {
  "HyperliquidTransaction:ApproveAgent": [
    { name: "hyperliquidChain", type: "string" },
    { name: "agentAddress", type: "address" },
    { name: "agentName", type: "string" },
    { name: "nonce", type: "uint64" },
  ],
};

/** Session-key delegation uses the same ApproveAgent envelope with a fixed agent name (HL max 16 chars) */
export const HL_SESSION_KEY_AGENT_NAME = "BeDeltaAgent" as const;

export const HL_SESSION_KEY_DELEGATION_TYPES = HL_APPROVE_AGENT_TYPES;

export type HyperliquidChain = "Mainnet" | "Testnet";

export interface ApproveAgentAction {
  type: "approveAgent";
  signatureChainId: string;
  hyperliquidChain: HyperliquidChain;
  agentAddress: string;
  agentName: string;
  nonce: number;
}

export interface SessionKeyAgentResult {
  action: ApproveAgentAction;
  signature: string;
  agentAddress: string;
  expiresAt: number;
  nonce: number;
  hyperliquidChain: HyperliquidChain;
}
