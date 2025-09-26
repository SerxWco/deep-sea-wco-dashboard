import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Clock, TrendingUp, TrendingDown, ArrowRightLeft, ExternalLink } from 'lucide-react';
import { useKrakenWatchlist } from '@/hooks/useKrakenWatchlist';
import { KrakenTransaction } from '@/types/kraken';
import { formatNumber } from '@/utils/formatters';
import { WalletDetailsModal } from '@/components/WalletDetailsModal';
import { TransactionDetailsModal } from '@/components/TransactionDetailsModal';

export const KrakenWatchlist = () => {
  const { transactions, krakenWallets, loading, error, refetch, lastUpdated } = useKrakenWatchlist();
  const [timeFilter, setTimeFilter] = useState<'24h' | '48h' | 'all'>('24h');
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);

  // Filter transactions by time
  const filteredTransactions = transactions.filter(tx => {
    if (timeFilter === 'all') return true;
    
    const hours = timeFilter === '24h' ? 24 : 48;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return new Date(tx.timestamp) > cutoff;
  });

  // Helper functions for explorer links
  const getAddressExplorerUrl = (address: string): string => {
    return `https://scan.w-chain.com/address/${address}`;
  };

  const getTxExplorerUrl = (hash: string): string => {
    return `https://scan.w-chain.com/tx/${hash}`;
  };

  // Format address for display
  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format timestamp
  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
  };

  // Get classification icon
  const getClassificationIcon = (type: string) => {
    switch (type) {
      case 'sell_pressure':
        return <TrendingDown className="w-4 h-4" />;
      case 'buy_pressure':
        return <TrendingUp className="w-4 h-4" />;
      case 'internal_move':
        return <ArrowRightLeft className="w-4 h-4" />;
      default:
        return <ArrowRightLeft className="w-4 h-4" />;
    }
  };

  // Get row background color based on classification
  const getRowColor = (classification: KrakenTransaction['classification']) => {
    switch (classification.type) {
      case 'sell_pressure':
        return 'border-l-4 border-l-destructive bg-destructive/5';
      case 'buy_pressure':
        return 'border-l-4 border-l-green-500 bg-green-500/5';
      case 'internal_move':
        return 'border-l-4 border-l-primary bg-primary/5';
      case 'outflow':
        return 'border-l-4 border-l-orange-500 bg-orange-500/5';
      case 'inflow':
        return 'border-l-4 border-l-cyan-500 bg-cyan-500/5';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span className="text-lg text-muted-foreground">Loading Kraken activity...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={refetch} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            🦑 Kraken Watchlist
          </h1>
          <p className="text-muted-foreground">
            Tracking large movements from wallets holding ≥5M WCO
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={refetch}
            variant="outline"
            size="sm"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{krakenWallets.length}</div>
            <p className="text-sm text-muted-foreground">Active Krakens</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{filteredTransactions.length}</div>
            <p className="text-sm text-muted-foreground">Large Movements</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-500">
              {filteredTransactions.filter(tx => tx.classification.type === 'buy_pressure').length}
            </div>
            <p className="text-sm text-muted-foreground">Buy Pressure</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">
              {filteredTransactions.filter(tx => tx.classification.type === 'sell_pressure').length}
            </div>
            <p className="text-sm text-muted-foreground">Sell Pressure</p>
          </CardContent>
        </Card>
      </div>

      {/* Time Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Show:</span>
        {['24h', '48h', 'all'].map(period => (
          <Button
            key={period}
            variant={timeFilter === period ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeFilter(period as '24h' | '48h' | 'all')}
          >
            {period === 'all' ? 'All Time' : period.toUpperCase()}
          </Button>
        ))}
      </div>

      {/* Watchlist Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Live Activity Feed</span>
            {lastUpdated && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No large Kraken movements in the selected time period.</p>
              <p className="text-sm mt-2">Movements ≥1M WCO will appear here.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredTransactions.map((tx, index) => (
                <div
                  key={tx.hash}
                  className={`p-4 ${getRowColor(tx.classification)} ${
                    index !== filteredTransactions.length - 1 ? 'border-b' : ''
                  } hover:bg-muted/50 transition-colors`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getClassificationIcon(tx.classification.type)}
                        <Badge variant="outline" className={tx.classification.color}>
                          {tx.classification.emoji} {tx.classification.label}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        [{formatTime(tx.timestamp)} UTC]
                      </div>
                    </div>
                    
                    <div className="text-sm font-mono">
                      <button
                        onClick={() => setSelectedWallet(tx.from)}
                        className="text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
                      >
                        {formatAddress(tx.from)}
                        <ExternalLink className="w-3 h-3" />
                      </button>
                      <span className="mx-2 text-muted-foreground">→</span>
                      <button
                        onClick={() => setSelectedWallet(tx.to)}
                        className="text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
                      >
                        {formatAddress(tx.to)}
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="text-lg font-bold text-primary">
                        {formatNumber(tx.amount)} WCO
                      </div>
                      <button
                        onClick={() => setSelectedTransaction(tx.hash)}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 font-mono"
                        title="View transaction details"
                      >
                        {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {tx.classification.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="text-center text-xs text-muted-foreground">
        💡 Kraken wallets hold ≥5M WCO • Only showing transactions ≥1M WCO
      </div>

      {/* Modals */}
      <WalletDetailsModal
        isOpen={selectedWallet !== null}
        onClose={() => setSelectedWallet(null)}
        address={selectedWallet}
      />
      <TransactionDetailsModal
        isOpen={selectedTransaction !== null}
        onClose={() => setSelectedTransaction(null)}
        hash={selectedTransaction}
      />
    </div>
  );
};