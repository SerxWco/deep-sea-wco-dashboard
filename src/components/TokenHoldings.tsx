import { TokenBalance, TokenListFilters } from '@/types/token';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatNumber, formatCurrency } from '@/utils/formatters';
import { useWCOMarketData } from '@/hooks/useWCOMarketData';
import { useWChainPriceAPI } from '@/hooks/useWChainPriceAPI';
import { useOG88Price } from '@/hooks/useOG88Price';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useState, useMemo } from 'react';

interface TokenHoldingsProps {
  balances: TokenBalance[];
  loading: boolean;
}

export const TokenHoldings = ({ balances, loading }: TokenHoldingsProps) => {
  const { data: wcoMarketData } = useWCOMarketData();
  const { wcoPrice, wavePrice } = useWChainPriceAPI();
  const { og88Price } = useOG88Price();
  
  const [sortBy, setSortBy] = useState<TokenListFilters['sortBy']>('usd_value');
  const [sortOrder, setSortOrder] = useState<TokenListFilters['sortOrder']>('desc');

  const getTokenPrice = (token: any): number => {
    // Check if this is WCO token
    const isWCO = token.symbol?.toUpperCase() === 'WCO' || 
                  token.name?.toLowerCase().includes('w coin') ||
                  token.name?.toLowerCase().includes('wadzcoin');
    
    // Check if this is WAVE token
    const isWAVE = token.symbol?.toUpperCase() === 'WAVE' ||
                   token.name?.toLowerCase().includes('wave');
    
    // Check if this is OG88 token (by contract address)
    const isOG88 = token.address?.toLowerCase() === '0xd1841fc048b488d92fdf73624a2128d10a847e88';
    
    // Use W-Chain API prices first (more accurate for native tokens)
    if (isWCO && wcoPrice?.price) {
      return wcoPrice.price;
    }
    
    if (isWAVE && wavePrice?.price) {
      return wavePrice.price;
    }
    
    // Use OG88 price from Railway API
    if (isOG88 && og88Price?.price) {
      return og88Price.price;
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

  const handleSort = (column: TokenListFilters['sortBy']) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const sortedBalances = useMemo(() => {
    return [...balances].sort((a, b) => {
      let valueA: number | string = 0;
      let valueB: number | string = 0;

      switch (sortBy) {
        case 'name':
          valueA = a.token.name.toLowerCase();
          valueB = b.token.name.toLowerCase();
          break;
        case 'symbol':
          valueA = a.token.symbol.toLowerCase();
          valueB = b.token.symbol.toLowerCase();
          break;
        case 'balance':
          valueA = a.balanceInEth;
          valueB = b.balanceInEth;
          break;
        case 'price':
          valueA = getTokenPrice(a.token);
          valueB = getTokenPrice(b.token);
          break;
        case 'usd_value':
          valueA = getTokenUsdValue(a);
          valueB = getTokenUsdValue(b);
          break;
        case 'holders':
          valueA = a.token.holders_count || 0;
          valueB = b.token.holders_count || 0;
          break;
        default:
          return 0;
      }

      if (typeof valueA === 'string') {
        return sortOrder === 'asc' 
          ? valueA.localeCompare(valueB as string)
          : (valueB as string).localeCompare(valueA);
      } else {
        return sortOrder === 'asc' 
          ? (valueA as number) - (valueB as number)
          : (valueB as number) - (valueA as number);
      }
    });
  }, [balances, sortBy, sortOrder, wcoPrice, wavePrice, og88Price, wcoMarketData]);

  const getSortIcon = (column: TokenListFilters['sortBy']) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
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
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold text-left justify-start"
                    onClick={() => handleSort('name')}
                  >
                    Token
                    {getSortIcon('name')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold text-left justify-start"
                    onClick={() => handleSort('price')}
                  >
                    Price
                    {getSortIcon('price')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold text-right justify-end"
                    onClick={() => handleSort('balance')}
                  >
                    Balance
                    {getSortIcon('balance')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold text-right justify-end"
                    onClick={() => handleSort('usd_value')}
                  >
                    USD Value
                    {getSortIcon('usd_value')}
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBalances.map((tokenBalance) => (
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