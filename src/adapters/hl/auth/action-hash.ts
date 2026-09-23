import { encode as encodeMsgpack } from "@msgpack/msgpack";
import {
  concatBytes,
  getAddressBytes,
  keccak256Hex,
  toUint64Bytes,
} from "../crypto";

type MsgpackValue =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | bigint
  | null;

function adjustForMsgpack(value: unknown): MsgpackValue {
  if (Array.isArray(value)) {
    return value.map(adjustForMsgpack);
  }
  if (typeof value === "object" && value !== null) {
    const result: Record<string, MsgpackValue> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        result[key] = adjustForMsgpack(entry);
      }
    }
    return result;
  }
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    (value >= 0x1_0000_0000 || value < -0x8000_0000)
  ) {
    return BigInt(value);
  }
  return value as MsgpackValue;
}

let lastNonce = 0;
export function generateUniqueNonce(): number {
  const now = Date.now();
  if (now <= lastNonce) {
    lastNonce += 1;
    return lastNonce;
  }
  lastNonce = now;
  return lastNonce;
}

/** Reset monotonic nonce counter — Session Key auto-healing path. */
export function resetUniqueNonceState(): void {
  lastNonce = 0;
}

export function createL1ActionHash(args: {
  action: Record<string, unknown> | unknown[];
  nonce: number;
  vaultAddress?: string;
  expiresAfter?: number;
}): string {
  const { action, nonce, vaultAddress, expiresAfter } = args;

  const actionBytes = encodeMsgpack(adjustForMsgpack(action));
  const nonceBytes = toUint64Bytes(nonce);

  const vaultMarker = vaultAddress ? new Uint8Array([1]) : new Uint8Array([0]);
  const vaultBytes = vaultAddress ? getAddressBytes(vaultAddress) : new Uint8Array();
  const expiresMarker =
    expiresAfter !== undefined ? new Uint8Array([0]) : new Uint8Array();
  const expiresBytes =
    expiresAfter !== undefined ? toUint64Bytes(expiresAfter) : new Uint8Array();

  const packed = concatBytes(
    actionBytes,
    nonceBytes,
    vaultMarker,
    vaultBytes,
    expiresMarker,
    expiresBytes,
  );

  return keccak256Hex(packed);
}
