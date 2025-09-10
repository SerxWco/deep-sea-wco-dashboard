import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AddCustomTokenFormProps {
  onAddToken: (contractAddress: string) => Promise<void>;
  loading: boolean;
}

export const AddCustomTokenForm = ({ onAddToken, loading }: AddCustomTokenFormProps) => {
  const [contractAddress, setContractAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contractAddress.trim()) {
      setError('Please enter a contract address');
      return;
    }

    try {
      setIsAdding(true);
      setError(null);
      
      await onAddToken(contractAddress.trim());
      
      setContractAddress('');
      toast.success('Token added successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add token';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Custom Token
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Enter contract address (0x...)"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              disabled={loading || isAdding}
              className="font-mono"
            />
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            type="submit" 
            disabled={loading || isAdding || !contractAddress.trim()}
            className="w-full"
          >
            {isAdding ? 'Adding Token...' : 'Add Token'}
          </Button>
        </form>
        
        <div className="mt-4 text-sm text-muted-foreground">
          <p>💡 Enter the contract address of any ERC-20 token to add it to your portfolio</p>
          <p className="mt-1">Only tokens with a positive balance will be displayed</p>
        </div>
      </CardContent>
    </Card>
  );
};