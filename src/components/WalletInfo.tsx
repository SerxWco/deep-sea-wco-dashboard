import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WalletInfo as WalletInfoType } from '@/hooks/useWalletConnection';
import { formatNumber } from '@/utils/formatters';

interface WalletInfoProps {
  walletInfo: WalletInfoType;
  onDisconnect: () => void;
}

export const WalletInfo = ({ walletInfo, onDisconnect }: WalletInfoProps) => {
  const { toast } = useToast();

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

  return (
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
  );
};