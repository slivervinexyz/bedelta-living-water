/** Minimal browser `window.ethereum` surface for HL wallet adapters. */
export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}
