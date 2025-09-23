import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WalletInfo as WalletInfoType } from '@/hooks/useWalletConnection';
import { formatNumber } from '@/utils/formatters';
import { useWCOMarketData } from '@/hooks/useWCOMarketData';

interface WalletInfoProps {
  walletInfo: WalletInfoType;
  onDisconnect: () => void;
}

export const WalletInfo = ({ walletInfo, onDisconnect }: WalletInfoProps) => {
  const { toast } = useToast();
  const { data: wcoData } = useWCOMarketData();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(walletInfo.address);
    toast({
      title: 'Address Copied',
      description: 'Wallet address copied to clipboard'
    });
  };

  const openWChainScan = () => {
    window.open(`https://scan.w-chain.com/address/${walletInfo.address}`, '_blank', 'noopener,noreferrer');
  };

  const wcoUsdValue = wcoData && parseFloat(walletInfo.wcoBalance) > 0 
    ? parseFloat(walletInfo.wcoBalance) * wcoData.current_price 
    : 0;

  return (
    <div className="space-y-6">
      {/* Wallet Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Connected Wallet</CardTitle>
            <Button variant="outline" size="sm" onClick={onDisconnect}>
              <LogOut className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {formatAddress(walletInfo.address)}
            </Badge>
            <Button variant="ghost" size="sm" onClick={copyAddress}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={openWChainScan}
              className="h-8 w-8 p-0"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            WCO Balance: {formatNumber(parseFloat(walletInfo.balance))} WCO
          </div>
        </CardContent>
      </Card>

      {/* WCO Holdings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              🌊
            </div>
            WCO Holdings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold">
                {formatNumber(parseFloat(walletInfo.wcoBalance))}
              </div>
              <div className="text-sm text-muted-foreground">WCO Tokens</div>
            </div>
            
            {wcoData && (
              <div>
                <div className="text-2xl font-bold text-green-600">
                  ${formatNumber(wcoUsdValue, 2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  USD Value @ ${formatNumber(wcoData.current_price, 6)}
                </div>
              </div>
            )}
          </div>

          {parseFloat(walletInfo.wcoBalance) === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-2">🪸</div>
              <div className="font-medium">No WCO tokens found</div>
              <div className="text-sm">Get some WCO tokens to start building your ocean portfolio</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Portfolio Stats */}
      {wcoData && parseFloat(walletInfo.wcoBalance) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-lg font-semibold">
                  {wcoData.price_change_percentage_24h > 0 ? '+' : ''}
                  {formatNumber(wcoData.price_change_percentage_24h, 2)}%
                </div>
                <div className="text-sm text-muted-foreground">24h Change</div>
              </div>
              
              <div>
                <div className="text-lg font-semibold">
                  ${formatNumber(wcoData.ath, 6)}
                </div>
                <div className="text-sm text-muted-foreground">All Time High</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};