/**
 * EIP-712 signer surface — decouple HL execution from ethers bundle in Workers.
 */
export interface Eip712TypedField {
  name: string;
  type: string;
}

export interface Eip712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

export interface Eip712Signer {
  signTypedData(
    domain: Eip712Domain,
    types: Record<string, Eip712TypedField[]>,
    message: Record<string, unknown>,
  ): Promise<string>;
}
