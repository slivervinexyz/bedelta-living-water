import { normalizeChainIdHex } from "../auth";
import { unwrapHlError } from "../error-unwrap";
import type { EthereumProvider } from "./types";

/** HyperEVM Testnet chain id (998). */
export const HL_HYPEREVM_TESTNET_CHAIN_ID_HEX = "0x3e6" as const;

export const HL_HYPEREVM_TESTNET_CHAIN_CONFIG = {
  chainId: HL_HYPEREVM_TESTNET_CHAIN_ID_HEX,
  chainName: "Hyperliquid Testnet",
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
  rpcUrls: ["https://rpc.hyperliquid-testnet.xyz/evm"] as const,
  blockExplorerUrls: ["https://app.hyperliquid-testnet.xyz/explorer"] as const,
};

function isChainNotAddedError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  return (err as { code?: number }).code === 4902;
}

/** Read active wallet network — must match EIP-712 user-signed domain.chainId. */
export async function fetchWalletChainIdHex(
  provider: EthereumProvider,
): Promise<string> {
  const currentChainId = await provider.request({ method: "eth_chainId" });
  return normalizeChainIdHex(String(currentChainId));
}

/** Switch (or add) wallet to HyperEVM Testnet before EIP-712 user-signed actions. */
export async function ensureHyperEvmTestnetChain(
  provider: EthereumProvider,
): Promise<string> {
  let chainIdHex = await fetchWalletChainIdHex(provider);
  if (chainIdHex === HL_HYPEREVM_TESTNET_CHAIN_ID_HEX) return chainIdHex;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: HL_HYPEREVM_TESTNET_CHAIN_ID_HEX }],
    });
  } catch (err) {
    if (isChainNotAddedError(err)) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [HL_HYPEREVM_TESTNET_CHAIN_CONFIG],
      });
    } else {
      throw new Error(unwrapHlError(err));
    }
  }

  chainIdHex = await fetchWalletChainIdHex(provider);
  if (chainIdHex !== HL_HYPEREVM_TESTNET_CHAIN_ID_HEX) {
    throw new Error(
      "Wallet network switch failed — expected HyperEVM Testnet chainId 998 (0x3e6)",
    );
  }
  return chainIdHex;
}

/** Ensure HyperEVM Testnet + return active chain id hex for EIP-712 domain injection. */
export async function prepareWalletForHlSigning(
  provider: EthereumProvider,
): Promise<string> {
  return ensureHyperEvmTestnetChain(provider);
}
