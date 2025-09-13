import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TokenListItem } from './TokenListItem';
import { WChainToken, TokenBalance } from '@/types/token';

interface TokenListProps {
  tokens: WChainToken[];
  balances: TokenBalance[];
  loading: boolean;
  hasWallet: boolean;
  showOnlyOwned: boolean;
}

export const TokenList = ({ tokens, balances, loading, hasWallet, showOnlyOwned }: TokenListProps) => {
  // Create a map for quick balance lookup
  const balanceMap = new Map(
    balances.map(balance => [balance.token.address.toLowerCase(), balance])
  );

  // Filter tokens based on ownership if required
  const displayTokens = showOnlyOwned && hasWallet
    ? tokens.filter(token => balanceMap.has(token.address.toLowerCase()))
    : tokens;

  if (loading) {
    return (
      <Card className="glass-ocean">
        <CardHeader>
          <CardTitle className="text-foreground">Loading Tokens...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-muted rounded-full"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-3 bg-muted rounded w-1/6"></div>
                  </div>
                  <div className="h-4 bg-muted rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayTokens.length === 0) {
    return (
      <Card className="glass-ocean">
        <CardHeader>
          <CardTitle className="text-foreground">
            {showOnlyOwned ? 'No Owned Tokens' : 'No Tokens Found'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {showOnlyOwned 
              ? 'You don\'t own any tokens yet. Connect your wallet to see your holdings.'
              : 'No tokens match your current search criteria.'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-ocean">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center justify-between">
          <span>
            {showOnlyOwned ? 'Your Tokens' : 'All W Chain Tokens'}
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {displayTokens.length} token{displayTokens.length !== 1 ? 's' : ''}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Token</TableHead>
                <TableHead className="text-muted-foreground">Contract</TableHead>
                <TableHead className="text-muted-foreground">Price</TableHead>
                <TableHead className="text-muted-foreground">
                  {hasWallet ? 'Balance' : 'Balance'}
                </TableHead>
                <TableHead className="text-muted-foreground">Holders</TableHead>
                <TableHead className="text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayTokens.map((token) => (
                <TokenListItem
                  key={token.address}
                  token={token}
                  balance={balanceMap.get(token.address.toLowerCase())}
                  hasWallet={hasWallet}
                />
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};