import { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useWalletLeaderboard, WalletData, CategoryInfo } from '@/hooks/useWalletLeaderboard';
import { useWCOMarketData } from '@/hooks/useWCOMarketData';
import { formatCurrency, formatNumber } from '@/utils/formatters';

export function WalletLeaderboard() {
  const { wallets, loading, error, refetch, allCategories } = useWalletLeaderboard();
  const { data: marketData } = useWCOMarketData();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  const wcoPrice = marketData?.current_price || 0;

  const filteredAndSortedWallets = useMemo(() => {
    let filtered = wallets;
    
    if (searchTerm) {
      filtered = wallets.filter(wallet => 
        wallet.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered.sort((a, b) => {
      return sortOrder === 'desc' ? b.balance - a.balance : a.balance - b.balance;
    });
  }, [wallets, searchTerm, sortOrder]);

  const groupedWallets = useMemo(() => {
    // Initialize all categories with empty arrays
    const groups: Record<string, { wallets: WalletData[]; categoryInfo: CategoryInfo }> = {};
    
    allCategories.forEach(categoryInfo => {
      groups[categoryInfo.name] = {
        wallets: [],
        categoryInfo
      };
    });
    
    // Fill with actual wallet data
    filteredAndSortedWallets.forEach(wallet => {
      if (groups[wallet.category]) {
        groups[wallet.category].wallets.push(wallet);
      }
    });

    return groups;
  }, [filteredAndSortedWallets, allCategories]);

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  if (loading) {
    return (
      <Card className="w-full bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-md border-border/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading leaderboard...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-md border-border/20">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="text-destructive mb-4">Error: {error}</div>
            <Button onClick={refetch} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-md border-border/20">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
          🌊 Ocean Leaderboard
        </CardTitle>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search wallet address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background/50 border-border/30"
            />
          </div>
          
          <Button 
            variant="outline" 
            onClick={toggleSort}
            className="flex items-center gap-2 bg-background/50 border-border/30"
          >
            {sortOrder === 'desc' ? (
              <>
                <ArrowDown className="w-4 h-4" />
                High to Low
              </>
            ) : (
              <>
                <ArrowUp className="w-4 h-4" />
                Low to High
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-0">
        <div className="space-y-4">
          {allCategories.map((categoryInfo) => {
            const categoryData = groupedWallets[categoryInfo.name];
            const categoryWallets = categoryData?.wallets || [];
            const hasWallets = categoryWallets.length > 0;
            
            return (
              <Collapsible
                key={categoryInfo.name}
                open={openCategories[categoryInfo.name]}
                onOpenChange={() => toggleCategory(categoryInfo.name)}
              >
                <CollapsibleTrigger asChild>
                  <Card className={`cursor-pointer transition-all duration-200 bg-gradient-to-r from-background/60 to-background/30 border-border/30 ${
                    hasWallets 
                      ? 'hover:bg-accent/50 hover:shadow-md' 
                      : 'opacity-60 hover:opacity-80'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{categoryInfo.emoji}</span>
                          <span className="font-semibold text-lg">{categoryInfo.name}</span>
                        </div>
                        <Badge 
                          variant={hasWallets ? "default" : "secondary"} 
                          className={hasWallets ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}
                        >
                          {categoryWallets.length} wallet{categoryWallets.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleTrigger>

                {hasWallets && (
                  <CollapsibleContent className="mt-2">
                    <div className="space-y-2 ml-4">
                      {categoryWallets.map((wallet, index) => (
                        <Card key={wallet.address} className="bg-background/40 border-border/20">
                          <CardContent className="p-4">
                             <div className="flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                 <span className="text-muted-foreground font-mono text-sm">
                                   #{index + 1}
                                 </span>
                                 <div>
                                   <div className="font-mono text-sm">
                                     {formatAddress(wallet.address)}
                                   </div>
                                   <div className="text-xs text-muted-foreground">
                                     {wallet.txCount.toLocaleString()} txns
                                   </div>
                                 </div>
                               </div>
                               
                               <div className="text-right">
                                 <div className="font-semibold">
                                   {formatNumber(wallet.balance)} WCO
                                 </div>
                                 <div className="text-sm text-muted-foreground">
                                   {formatCurrency(wallet.balance * wcoPrice)}
                                 </div>
                               </div>
                             </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CollapsibleContent>
                )}
              </Collapsible>
            );
          })}
        </div>

        {wallets.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'No wallets found matching your search.' : 'No wallet data available.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}