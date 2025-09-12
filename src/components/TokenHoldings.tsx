import { TokenBalance } from '@/types/token';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { formatNumber } from '@/utils/formatters';
import { toast } from 'sonner';
import { useWCOMarketData } from '@/hooks/useWCOMarketData';

interface TokenHoldingsProps {
  balances: TokenBalance[];
  loading: boolean;
}

export const TokenHoldings = ({ balances, loading }: TokenHoldingsProps) => {
  const { data: wcoMarketData } = useWCOMarketData();

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success('Contract address copied to clipboard');
  };

  const openExplorer = (address: string) => {
    window.open(`https://w-chain.com`, '_blank');
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTokenPrice = (token: any) => {
    // Check if this is WCO token
    const isWCO = token.symbol?.toUpperCase() === 'WCO' || 
                  token.name?.toLowerCase().includes('w coin') ||
                  token.name?.toLowerCase().includes('wadzcoin');
    
    if (isWCO && wcoMarketData?.current_price) {
      return `$${wcoMarketData.current_price.toFixed(6)}`;
    }
    
    // For other tokens, use exchange_rate if available
    if (token.exchange_rate) {
      return `$${parseFloat(token.exchange_rate).toFixed(6)}`;
    }
    
    return '--';
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
                <TableHead>Contract</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.map(({ token, formattedBalance }) => (
                <TableRow key={token.address}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={token.icon_url || undefined} alt={token.symbol} />
                        <AvatarFallback className="text-xs">
                          {token.symbol.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{token.name}</div>
                        <div className="text-sm text-muted-foreground">{token.symbol}</div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground">
                        {formatAddress(token.address)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-muted"
                        onClick={() => copyAddress(token.address)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-sm font-medium">
                      {getTokenPrice(token) !== '--' 
                        ? getTokenPrice(token)
                        : <span className="text-muted-foreground">--</span>
                      }
                    </div>
                  </TableCell>

                  <TableCell className="text-right font-medium">
                    {formatNumber(parseFloat(formattedBalance), 4)}
                  </TableCell>

                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-muted"
                      onClick={() => openExplorer(token.address)}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
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