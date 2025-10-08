// W-Swap trade types and interfaces

export interface WSwapTrade {
  hash: string;
  timestamp: number;
  time: Date;
  from: string;
  to: string;
  tokenSymbol: string;
  amount: number;
  type: 'buy' | 'sell';
  price: number | null;
  lpAddress: string;
  lpLabel: string;
}

export interface LPReserves {
  address: string;
  reserve0: number;
  reserve1: number;
  lastUpdate: number;
}

export interface TradeStats {
  totalVolume24h: number;
  totalTrades24h: number;
  uniqueWallets24h: number;
  largestTrade24h: WSwapTrade | null;
  buyVolume24h: number;
  sellVolume24h: number;
}

export interface WChainTokenTransaction {
  hash: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
}

export interface WChainReservesResponse {
  status: string;
  message: string;
  result?: {
    reserve0: string;
    reserve1: string;
  };
}
