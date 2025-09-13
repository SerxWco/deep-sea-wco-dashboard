import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy } from 'lucide-react';
import { WChainToken, TokenBalance } from '@/types/token';
import { formatNumber } from '@/utils/formatters';
import { useToast } from '@/hooks/use-toast';
import { useWCOMarketData } from '@/hooks/useWCOMarketData';
import { useWChainPriceAPI } from '@/hooks/useWChainPriceAPI';

interface TokenListItemProps {
  token: WChainToken;
  balance?: TokenBalance;
  hasWallet: boolean;
}

export const TokenListItem = ({ token, balance, hasWallet }: TokenListItemProps) => {
  const { toast } = useToast();
  const { data: wcoMarketData } = useWCOMarketData();
  const { wcoPrice, wavePrice } = useWChainPriceAPI();

  const copyAddress = () => {
    navigator.clipboard.writeText(token.address);
    toast({
      title: "Address Copied",
      description: `${token.symbol} contract address copied to clipboard`,
    });
  };

  const openScanner = () => {
    window.open(`https://w-chain.com`, '_blank');
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTokenPrice = (token: WChainToken) => {
    // Check if this is WCO token
    const isWCO = token.symbol?.toUpperCase() === 'WCO' || 
                  token.name?.toLowerCase().includes('w coin') ||
                  token.name?.toLowerCase().includes('wadzcoin');
    
    // Check if this is WAVE token
    const isWAVE = token.symbol?.toUpperCase() === 'WAVE' ||
                   token.name?.toLowerCase().includes('wave');
    
    // Use W-Chain API prices first (more accurate for native tokens)
    if (isWCO && wcoPrice?.price) {
      return `$${wcoPrice.price.toFixed(6)}`;
    }
    
    if (isWAVE && wavePrice?.price) {
      return `$${wavePrice.price.toFixed(6)}`;
    }
    
    // Fallback to CoinGecko for WCO if W-Chain API unavailable
    if (isWCO && wcoMarketData?.current_price) {
      return `$${wcoMarketData.current_price.toFixed(6)}`;
    }
    
    // For other tokens, use exchange_rate if available
    if (token.exchange_rate) {
      return `$${parseFloat(token.exchange_rate).toFixed(6)}`;
    }
    
    return '--';
  };

  return (
    <TableRow className="hover:bg-muted/20 transition-ocean">
      {/* Token Info */}
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          {token.icon_url ? (
            <img 
              src={token.icon_url} 
              alt={token.symbol} 
              className="w-8 h-8 rounded-full"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {token.symbol.slice(0, 2)}
              </span>
            </div>
          )}
          <div>
            <div className="font-semibold text-foreground">{token.name}</div>
            <div className="text-sm text-muted-foreground">{token.symbol}</div>
          </div>
        </div>
      </TableCell>

      {/* Contract Address */}
      <TableCell>
        <div className="flex items-center gap-2">
          <code className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
            {formatAddress(token.address)}
          </code>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyAddress}
            className="h-6 w-6 p-0 hover:bg-muted/50"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>

      {/* Price */}
      <TableCell>
        <div className="text-sm font-medium">
          {getTokenPrice(token) !== '--' 
            ? getTokenPrice(token)
            : <span className="text-muted-foreground">--</span>
          }
        </div>
      </TableCell>

      {/* Balance */}
      <TableCell>
        {hasWallet ? (
          balance ? (
            <div>
              <div className="font-medium text-foreground">
                {formatNumber(balance.balanceInEth)} {token.symbol}
              </div>
              {balance.usdValue && (
                <div className="text-sm text-muted-foreground">
                  ≈ ${formatNumber(balance.usdValue)}
                </div>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">0</span>
          )
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>

      {/* Holders */}
      <TableCell>
        <span className="text-muted-foreground">
          {token.holders_count ? formatNumber(token.holders_count) : '-'}
        </span>
      </TableCell>

      {/* Actions */}
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          onClick={openScanner}
          className="hover-lift h-8 px-2"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};