import { TokenBalance } from '@/types/token';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatCurrency } from '@/utils/formatters';
import { useWCOMarketData } from '@/hooks/useWCOMarketData';
import { useWChainPriceAPI } from '@/hooks/useWChainPriceAPI';

interface TokenHoldingsProps {
  balances: TokenBalance[];
  loading: boolean;
}

export const TokenHoldings = ({ balances, loading }: TokenHoldingsProps) => {
  const { data: wcoMarketData } = useWCOMarketData();
  const { wcoPrice, wavePrice } = useWChainPriceAPI();

  const getTokenPrice = (token: any): number => {
    // Check if this is WCO token
    const isWCO = token.symbol?.toUpperCase() === 'WCO' || 
                  token.name?.toLowerCase().includes('w coin') ||
                  token.name?.toLowerCase().includes('wadzcoin');
    
    // Check if this is WAVE token
    const isWAVE = token.symbol?.toUpperCase() === 'WAVE' ||
                   token.name?.toLowerCase().includes('wave');
    
    // Use W-Chain API prices first (more accurate for native tokens)
    if (isWCO && wcoPrice?.price) {
      return wcoPrice.price;
    }
    
    if (isWAVE && wavePrice?.price) {
      return wavePrice.price;
    }
    
    // Fallback to CoinGecko for WCO if W-Chain API unavailable
    if (isWCO && wcoMarketData?.current_price) {
      return wcoMarketData.current_price;
    }
    
    // For other tokens, use exchange_rate if available
    if (token.exchange_rate) {
      return parseFloat(token.exchange_rate);
    }
    
    return 0;
  };

  const getTokenUsdValue = (tokenBalance: TokenBalance) => {
    const priceValue = getTokenPrice(tokenBalance.token);
    if (typeof priceValue === 'number' && priceValue > 0) {
      return priceValue * tokenBalance.balanceInEth;
    }
    return tokenBalance.usdValue || 0;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Token Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
                <div className="h-4 bg-muted rounded w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (balances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Token Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-2">🪙</div>
            <p>No token holdings found</p>
            <p className="text-sm mt-1">Your W Chain token balances will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Token Holdings
          <Badge variant="secondary">
            {balances.length} token{balances.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">USD Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.map((tokenBalance) => (
                <TableRow key={tokenBalance.token.address}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={tokenBalance.token.icon_url || undefined} alt={tokenBalance.token.symbol} />
                        <AvatarFallback className="text-xs">
                          {tokenBalance.token.symbol.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{tokenBalance.token.name}</div>
                        <div className="text-sm text-muted-foreground">{tokenBalance.token.symbol}</div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-sm font-medium">
                      {(() => {
                        const price = getTokenPrice(tokenBalance.token);
                        return typeof price === 'number' && price > 0 
                          ? `$${price.toFixed(6)}` 
                          : <span className="text-muted-foreground">--</span>;
                      })()}
                    </div>
                  </TableCell>

                  <TableCell className="text-right font-medium">
                    {formatNumber(parseFloat(tokenBalance.formattedBalance), 4)}
                  </TableCell>

                  <TableCell className="text-right font-medium">
                    <div className="text-sm">
                      {(() => {
                        const usdValue = getTokenUsdValue(tokenBalance);
                        return usdValue > 0 
                          ? formatCurrency(usdValue)
                          : <span className="text-muted-foreground">--</span>;
                      })()}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};