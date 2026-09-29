import type { Eip712Domain, Eip712Signer, Eip712TypedField } from "../eip712-signer";
import { chainIdHexToNumber } from "../auth";
import { unwrapHlError } from "../error-unwrap";
import { fetchWalletChainIdHex } from "./chainIdResolver";
import type { EthereumProvider } from "./types";

function buildTypedDataPayload(
  domain: Eip712Domain,
  types: Record<string, Eip712TypedField[]>,
  message: Record<string, unknown>,
): Record<string, unknown> {
  const primaryType = Object.keys(types)[0] ?? "Agent";
  return {
    domain: {
      name: domain.name,
      version: domain.version,
      chainId: domain.chainId,
      verifyingContract: domain.verifyingContract,
    },
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      ...types,
    },
    primaryType,
    message,
  };
}

/** Browser EIP-712 signer — syncs wallet chainId only for user-signed approveAgent domains. */
export function createBrowserEip712Signer(
  address: string,
  provider: EthereumProvider,
): Eip712Signer {
  return {
    async signTypedData(domain, types, message) {
      const isUserSignedDomain = domain.name === "HyperliquidSignTransaction";
      const syncedDomain: Eip712Domain = isUserSignedDomain
        ? {
            ...domain,
            chainId: chainIdHexToNumber(await fetchWalletChainIdHex(provider)),
          }
        : domain;
      const typedData = buildTypedDataPayload(syncedDomain, types, message);
      try {
        const signature = await provider.request({
          method: "eth_signTypedData_v4",
          params: [address, JSON.stringify(typedData)],
        });
        return String(signature);
      } catch (err) {
        throw new Error(unwrapHlError(err));
      }
    },
  };
}
