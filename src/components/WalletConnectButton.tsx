import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Wallet, Loader2 } from 'lucide-react';

interface WalletConnectButtonProps {
  onConnect: (walletType: 'metamask' | 'rabby') => Promise<void>;
  isConnecting: boolean;
}

export const WalletConnectButton = ({ onConnect, isConnecting }: WalletConnectButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleConnect = async (walletType: 'metamask' | 'rabby') => {
    await onConnect(walletType);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          {isConnecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wallet className="h-4 w-4" />
          )}
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Your Wallet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Button
            variant="outline"
            size="lg"
            className="w-full gap-3 h-16"
            onClick={() => handleConnect('metamask')}
            disabled={isConnecting}
          >
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              🦊
            </div>
            <div className="text-left">
              <div className="font-semibold">MetaMask</div>
              <div className="text-sm text-muted-foreground">Connect with MetaMask wallet</div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className="w-full gap-3 h-16"
            onClick={() => handleConnect('rabby')}
            disabled={isConnecting}
          >
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              🐰
            </div>
            <div className="text-left">
              <div className="font-semibold">Rabby Wallet</div>
              <div className="text-sm text-muted-foreground">Connect with Rabby wallet</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};