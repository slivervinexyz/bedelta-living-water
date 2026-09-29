/**
 * Browser wallet EIP-712 SSOT — lightweight orchestrator (wallet micro-modules).
 */

export {
  HL_HYPEREVM_TESTNET_CHAIN_ID_HEX,
  HL_HYPEREVM_TESTNET_CHAIN_CONFIG,
  fetchWalletChainIdHex,
  ensureHyperEvmTestnetChain,
  prepareWalletForHlSigning,
  createBrowserEip712Signer,
  type EthereumProvider,
} from "./wallet";
