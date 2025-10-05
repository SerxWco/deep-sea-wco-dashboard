import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';

export default function AdminCache() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshCache = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('refresh-leaderboard-cache');
      
      if (error) throw error;
      
      toast.success('Wallet cache refreshed successfully!', {
        description: `Loaded ${data?.totalHolders || 0} wallets`,
      });
    } catch (error) {
      console.error('Cache refresh error:', error);
      toast.error('Failed to refresh cache', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-ocean-gradient p-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>🔧 Admin: Wallet Cache Management</CardTitle>
            <CardDescription>
              Manually trigger the wallet leaderboard cache refresh
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will fetch all wallets from the W-Chain API and populate the leaderboard cache.
              This process takes ~1-2 minutes to complete.
            </p>
            
            <Button 
              onClick={handleRefreshCache} 
              disabled={isRefreshing}
              className="w-full"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing Cache...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Wallet Cache
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
