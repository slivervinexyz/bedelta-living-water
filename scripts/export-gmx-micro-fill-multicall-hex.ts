#!/usr/bin/env tsx
/** Export GMX micro-fill ExchangeRouter.multicall hex for Foundry fork trace tests. */
import { mkdirSync, writeFileSync } from "node:fs";
import { getAddress } from "viem";
import { buildGmxRouterMulticall } from "../src/services/adapters/gmx-micro-fill-multicall";
import { stripGmxOnChainMetadata } from "../src/services/adapters/gmx-create-order-encode";
import {
  GMX_USDC_ARBITRUM,
  MICRO_FILL_COLLATERAL_USDC,
  MICRO_FILL_SIZE_DELTA_USD_30,
} from "../src/services/adapters/gmx-micro-fill-constants";
import { GMX_ZERO_REFERRAL_CODE } from "../src/services/adapters/gmx-v2-order-payload-constants";
import type { GmxV2UnsignedOrderPayload } from "../src/services/adapters/gmx-v2-adapter.types";

const USER = getAddress("0xbd65d785Dac74EBa9efFdB357b2dC52fCC26EC7F");
const MARKET = getAddress("0x70d95587d40A2caf56bd97485aB3Eec10Bee6336");

const payload: GmxV2UnsignedOrderPayload = stripGmxOnChainMetadata({
  addresses: {
    receiver: USER,
    cancellationReceiver: "0x0000000000000000000000000000000000000000",
    callbackContract: "0x0000000000000000000000000000000000000000",
    uiFeeReceiver: "0x0000000000000000000000000000000000000000",
    market: MARKET,
    initialCollateralToken: GMX_USDC_ARBITRUM,
    swapPath: [],
  },
  numbers: {
    sizeDeltaUsd: MICRO_FILL_SIZE_DELTA_USD_30.toString(),
    initialCollateralDeltaAmount: MICRO_FILL_COLLATERAL_USDC.toString(),
    triggerPrice: "0",
    acceptablePrice: "2500425272181237",
    executionFee: "1000000000000000",
    callbackGasLimit: "0",
    minOutputAmount: "0",
    validFromTime: "0",
  },
  orderType: 2,
  decreasePositionSwapType: 0,
  isLong: true,
  shouldUnwrapNativeToken: false,
  autoCancel: false,
  referralCode: GMX_ZERO_REFERRAL_CODE,
  dataList: [],
});

const router = buildGmxRouterMulticall(payload);
const fixture = {
  eoa: USER,
  router: "0x7dE39FF2e232A2203196788d37e234cF8F1b83f1",
  multicallData: router.data,
  msgValue: router.value.toString(),
  calls: router.calls,
  executionFee: router.executionFee.toString(),
  collateral: router.collateral.toString(),
};
const out = "contracts/test/fixtures/gmx-micro-fill-multicall.json";
mkdirSync("contracts/test/fixtures", { recursive: true });
writeFileSync(out, `${JSON.stringify(fixture, null, 2)}\n`);
console.log(`[export-gmx-multicall] wrote ${out}`);
