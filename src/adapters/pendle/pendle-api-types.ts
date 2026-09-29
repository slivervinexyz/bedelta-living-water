/** Pendle Core API v2 market shapes — discovery SSOT. */

export interface PendleApiMarketDetails {
  liquidity: number;
  totalTvl: number;
  impliedApy: number;
  underlyingApy: number;
  feeRate: number;
}

export interface PendleApiMarket {
  name: string;
  protocol: string;
  address: string;
  expiry: string;
  pt: string;
  yt: string;
  sy: string;
  underlyingAsset: string;
  accountingAsset: string;
  inputTokens: string[];
  outputTokens: string[];
  details: PendleApiMarketDetails;
  chainId: number;
  categoryIds?: string[];
  isVolatile?: boolean;
}

export interface PendleApiMarketsResponse {
  total: number;
  limit: number;
  skip: number;
  results: PendleApiMarket[];
}

export interface PendleConvertTokenAmount {
  token: string;
  amount: string;
}

export interface PendleConvertTx {
  to: string;
  data: string;
  from?: string;
}

export interface PendleConvertRoute {
  tx: PendleConvertTx;
  requiredApprovals?: PendleConvertTokenAmount[];
  contractParamInfo?: { method: string };
}

export interface PendleConvertResponse {
  action: string;
  routes: PendleConvertRoute[];
  requiredApprovals?: PendleConvertTokenAmount[];
}
