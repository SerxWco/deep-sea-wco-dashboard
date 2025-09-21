import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TokenListItem } from './TokenListItem';
import { WChainToken } from '@/types/token';

interface TokenListProps {
  tokens: WChainToken[];
  loading: boolean;
  showOnlyOwned: boolean;
}

export const TokenList = ({ tokens, loading, showOnlyOwned }: TokenListProps) => {
  const displayTokens = tokens;

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
          <CardTitle className="text-foreground">No Tokens Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No tokens match your current search criteria.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-ocean">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center justify-between">
          <span>All W Chain Tokens</span>
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
                <TableHead className="text-muted-foreground">Holders</TableHead>
                <TableHead className="text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayTokens.map((token) => (
                <TokenListItem
                  key={token.address}
                  token={token}
                />
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};