// W Chain token interfaces and types

export interface WChainToken {
  address: string;
  name: string;
  symbol: string;
  decimals: string;
  total_supply?: string;
  circulating_market_cap?: string | null;
  holders_count?: number;
  exchange_rate?: string | null;
  type: string;
  icon_url?: string | null;
}

export interface TokenBalance {
  token: WChainToken;
  balance: string;
  formattedBalance: string;
  balanceInEth: number;
  usdValue?: number;
}

export interface TokenListFilters {
  search: string;
  showOnlyOwned: boolean;
  sortBy: 'name' | 'symbol' | 'balance' | 'holders' | 'price' | 'usd_value';
  sortOrder: 'asc' | 'desc';
}

export interface WChainTokensResponse {
  items: WChainToken[];
  next_page_params: {
    items_count: number;
    token_name: string;
    token_type: string;
    fiat_value: string;
    circulating_market_cap: string;
    holder_count: number;
  } | null;
}