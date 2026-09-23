/** viem-backed EIP-712 signer — Worker-safe (no ethers Wallet bundle). */
import type { Address, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Eip712Signer, Eip712TypedField } from "./eip712-signer";

function resolvePrimaryType(types: Record<string, Eip712TypedField[]>): string {
  const keys = Object.keys(types).filter((key) => key !== "EIP712Domain");
  if (keys.length !== 1) {
    throw new Error(`EIP-712 primaryType ambiguous: ${keys.join(", ")}`);
  }
  return keys[0]!;
}

export interface ViemEip712Signer extends Eip712Signer {
  address: Address;
}

export function createViemEip712Signer(privateKey: Hex): ViemEip712Signer {
  const account = privateKeyToAccount(privateKey);
  return {
    address: account.address,
    signTypedData: async (domain, types, message) =>
      account.signTypedData({
        domain: {
          name: domain.name,
          version: domain.version,
          chainId: domain.chainId,
          verifyingContract: domain.verifyingContract as Address,
        },
        types,
        primaryType: resolvePrimaryType(types),
        message,
      }),
  };
}
