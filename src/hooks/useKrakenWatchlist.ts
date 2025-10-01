import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWalletLeaderboard, EXCHANGE_WALLETS } from './useWalletLeaderboard';
import { 
  KrakenTransaction, 
  KrakenWallet, 
  UseKrakenWatchlistReturn, 
  TRANSACTION_CLASSIFICATIONS,
  TransactionClassification 
} from '@/types/kraken';

const KRAKEN_MIN_BALANCE = 5000000;
const LARGE_TRANSACTION_THRESHOLD = 1000000;

export const useKrakenWatchlist = (): UseKrakenWatchlistReturn => {
  const { wallets, loading: walletsLoading } = useWalletLeaderboard();
  const [krakenWallets, setKrakenWallets] = useState<KrakenWallet[]>([]);

  useEffect(() => {
    if (!walletsLoading && wallets.length > 0) {
      const krakens = wallets
        .filter(wallet => wallet.balance >= KRAKEN_MIN_BALANCE)
        .map(wallet => ({
          address: wallet.address,
          balance: wallet.balance,
          label: wallet.label || `${wallet.emoji} ${wallet.category}`,
        }));
      setKrakenWallets(krakens);
    }
  }, [wallets, walletsLoading]);

  const classifyTransaction = (
    from: string,
    to: string,
    krakenWallets: KrakenWallet[]
  ): TransactionClassification => {
    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();

    const exchangeAddresses = Object.keys(EXCHANGE_WALLETS).map(addr => addr.toLowerCase());
    const krakenAddresses = krakenWallets.map(k => k.address.toLowerCase());

    const fromIsExchange = exchangeAddresses.includes(fromLower);
    const toIsExchange = exchangeAddresses.includes(toLower);
    const fromIsKraken = krakenAddresses.includes(fromLower);
    const toIsKraken = krakenAddresses.includes(toLower);

    if (fromIsKraken && toIsExchange) {
      return TRANSACTION_CLASSIFICATIONS.sell_pressure;
    }
    if (fromIsExchange && toIsKraken) {
      return TRANSACTION_CLASSIFICATIONS.buy_pressure;
    }
    if (fromIsKraken && toIsKraken) {
      return TRANSACTION_CLASSIFICATIONS.internal_move;
    }
    if (fromIsKraken) {
      return TRANSACTION_CLASSIFICATIONS.outflow;
    }
    if (toIsKraken) {
      return TRANSACTION_CLASSIFICATIONS.inflow;
    }

    return TRANSACTION_CLASSIFICATIONS.outflow;
  };

  const { data: transactions = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['krakenWatchlist', krakenWallets.map(k => k.address).join(',')],
    queryFn: async (): Promise<KrakenTransaction[]> => {
      if (krakenWallets.length === 0) {
        return [];
      }

      const allTransactions: KrakenTransaction[] = [];
      const CONCURRENT_REQUESTS = 3;
      let currentIndex = 0;

      const worker = async () => {
        while (currentIndex < krakenWallets.length) {
          const krakenWallet = krakenWallets[currentIndex++];
          
          try {
            const response = await fetch(
              `https://api.w-chain.com/api/transactions?address=${krakenWallet.address}&limit=50`
            );
            
            if (!response.ok) continue;
            
            const data = await response.json();
            const walletTransactions = data.transactions || [];
            
            const largeTransactions = walletTransactions
              .filter((tx: any) => {
                const value = parseFloat(tx.value || '0');
                return value >= LARGE_TRANSACTION_THRESHOLD;
              })
              .map((tx: any) => {
                const classification = classifyTransaction(tx.from, tx.to, krakenWallets);
                return {
                  hash: tx.hash,
                  from: tx.from,
                  to: tx.to,
                  value: parseFloat(tx.value || '0'),
                  timestamp: tx.timestamp,
                  classification,
                  krakenWallet: krakenWallet.address,
                  krakenLabel: krakenWallet.label,
                };
              });
            
            allTransactions.push(...largeTransactions);
          } catch (err) {
            console.warn(`Failed to fetch transactions for ${krakenWallet.address}:`, err);
          }
        }
      };

      await Promise.all(Array(CONCURRENT_REQUESTS).fill(null).map(() => worker()));

      const uniqueTransactions = Array.from(
        new Map(allTransactions.map(tx => [tx.hash, tx])).values()
      );

      return uniqueTransactions.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    },
    enabled: krakenWallets.length > 0,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
  });

  const error = queryError ? String(queryError) : null;
  const lastUpdated = transactions.length > 0 ? new Date() : null;

  return {
    transactions,
    krakenWallets,
    loading: loading || walletsLoading,
    error,
    refetch,
    lastUpdated,
  };
};
