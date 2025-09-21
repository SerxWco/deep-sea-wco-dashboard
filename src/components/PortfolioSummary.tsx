import { TokenBalance } from '@/types/token';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { useWCOMarketData } from '@/hooks/useWCOMarketData';
import { useWChainPriceAPI } from '@/hooks/useWChainPriceAPI';
import { useOG88Price } from '@/hooks/useOG88Price';

interface PortfolioSummaryProps {
  balances: TokenBalance[];
  walletAddress: string;
  onRefresh: () => void;
  loading: boolean;
}

export const PortfolioSummary = ({ 
  balances, 
  walletAddress, 
  onRefresh, 
  loading 
}: PortfolioSummaryProps) => {
  const { data: wcoMarketData } = useWCOMarketData();
  const { wcoPrice, wavePrice } = useWChainPriceAPI();
  const { og88Price } = useOG88Price();

  const getTokenPrice = (token: any): number => {
    const isWCO = token.symbol?.toUpperCase() === 'WCO' || 
                  token.name?.toLowerCase().includes('w coin') ||
                  token.name?.toLowerCase().includes('wadzcoin');
    const isWAVE = token.symbol?.toUpperCase() === 'WAVE' ||
                   token.name?.toLowerCase().includes('wave');
    const isOG88 = token.address?.toLowerCase() === '0xd1841fc048b488d92fdf73624a2128d10a847e88';

    if (isWCO && wcoPrice?.price) return wcoPrice.price;
    if (isWAVE && wavePrice?.price) return wavePrice.price;
    if (isOG88 && og88Price?.price) return og88Price.price;
    if (isWCO && wcoMarketData?.current_price) return wcoMarketData.current_price;
    if (token.exchange_rate) return parseFloat(token.exchange_rate);
    return 0;
  };

  const getTokenUsdValue = (tokenBalance: TokenBalance) => {
    const priceValue = getTokenPrice(tokenBalance.token);
    if (typeof priceValue === 'number' && priceValue > 0) {
      return priceValue * tokenBalance.balanceInEth;
    }
    return tokenBalance.usdValue || 0;
  };

  const totalUsdValue = balances.reduce((sum, balance) => sum + getTokenUsdValue(balance), 0);

  return (
    <div className="grid grid-cols-1 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">
            {totalUsdValue > 0 ? formatCurrency(totalUsdValue) : '$0.00'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalUsdValue > 0 ? 'Total USD Value' : 'Connect wallet to see balance'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};