/** GMX micro-fill collateral allowance — EOA + Kernel call encoding. */
import { createPublicClient, type Hex } from "viem";
import type { Chain } from "viem/chains";
import { ensureGmxCollateralAllowance } from "../src/services/adapters/gmx-micro-fill-router-encode";
import { resolveBufferedEip1559Fees } from "./gmx-micro-fill-gas";

export type KernelCall = { to: Hex; value: bigint; data: Hex };

export async function ensureTokenAllowance(input: {
  client: ReturnType<typeof createPublicClient>;
  token: Hex;
  owner: Hex;
  required: bigint;
  pk: Hex;
  chain: Chain;
  rpc: string;
}): Promise<Hex | null> {
  const { approveTx } = await ensureGmxCollateralAllowance({
    client: input.client,
    owner: input.owner,
    token: input.token,
    required: input.required,
    pk: input.pk,
    chain: input.chain,
    rpc: input.rpc,
    resolveFees: () => resolveBufferedEip1559Fees(input.client),
  });
  return approveTx;
}

export async function ensureCollateralAllowanceForOwner(input: {
  client: ReturnType<typeof createPublicClient>;
  owner: Hex;
  token: Hex;
  required: bigint;
  pk?: Hex;
  chain: Chain;
  rpc: string;
}): Promise<KernelCall | null> {
  const { approveTx, approveCall } = await ensureGmxCollateralAllowance({
    client: input.client,
    owner: input.owner,
    token: input.token,
    required: input.required,
    pk: input.pk,
    chain: input.chain,
    rpc: input.rpc,
    resolveFees: () => resolveBufferedEip1559Fees(input.client),
  });
  if (approveTx) return null;
  return approveCall;
}
