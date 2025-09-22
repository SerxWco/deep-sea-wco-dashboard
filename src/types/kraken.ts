// Kraken Watchlist types and interfaces

export interface KrakenTransaction {
  hash: string;
  timestamp: string;
  from: string;
  to: string;
  value: string;  // in wei
  amount: number; // converted to WCO
  classification: TransactionClassification;
  krakenAddress: string; // The Kraken wallet involved
}

export interface TransactionClassification {
  type: 'sell_pressure' | 'buy_pressure' | 'internal_move' | 'outflow' | 'inflow';
  label: string;
  emoji: string;
  color: string;
  description: string;
}

export interface KrakenWallet {
  address: string;
  balance: number;
  label?: string;
}

export interface UseKrakenWatchlistReturn {
  transactions: KrakenTransaction[];
  krakenWallets: KrakenWallet[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  lastUpdated: Date | null;
}

// Transaction classification mappings
export const TRANSACTION_CLASSIFICATIONS: Record<string, TransactionClassification> = {
  sell_pressure: {
    type: 'sell_pressure',
    label: 'Sell Pressure',
    emoji: '🚨',
    color: 'text-red-500',
    description: 'Kraken → Exchange (Potential Sell)',
  },
  buy_pressure: {
    type: 'buy_pressure', 
    label: 'Buy Pressure',
    emoji: '🚨',
    color: 'text-green-500',
    description: 'Exchange → Kraken (Accumulation)',
  },
  internal_move: {
    type: 'internal_move',
    label: 'Internal Move',
    emoji: '🔄',
    color: 'text-blue-500',
    description: 'Kraken ↔ Kraken Transfer',
  },
  outflow: {
    type: 'outflow',
    label: 'Outflow',
    emoji: '📤',
    color: 'text-orange-500',
    description: 'Kraken → Other Wallet',
  },
  inflow: {
    type: 'inflow',
    label: 'Inflow',
    emoji: '📥',
    color: 'text-cyan-500',
    description: 'Other Wallet → Kraken',
  },
};