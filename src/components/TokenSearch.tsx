import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, ArrowUpDown } from 'lucide-react';
import { TokenListFilters } from '@/types/token';

interface TokenSearchProps {
  filters: TokenListFilters;
  onFiltersChange: (filters: Partial<TokenListFilters>) => void;
  hasWalletConnected: boolean;
  onRefresh: () => void;
}

export const TokenSearch = ({ 
  filters, 
  onFiltersChange, 
  hasWalletConnected,
  onRefresh 
}: TokenSearchProps) => {
  return (
    <div className="glass-ocean p-6 rounded-lg space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search tokens by name, symbol, or address..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="pl-10 bg-muted/50 border-border"
          />
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2">
          <Label htmlFor="sort-by" className="text-sm text-foreground whitespace-nowrap">
            Sort by:
          </Label>
          <Select
            value={filters.sortBy}
            onValueChange={(value: 'name' | 'symbol' | 'holders') => 
              onFiltersChange({ sortBy: value })
            }
          >
            <SelectTrigger className="w-32 bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="symbol">Symbol</SelectItem>
              <SelectItem value="holders">Holders</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => 
              onFiltersChange({ 
                sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' 
              })
            }
            className="px-2"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Show Only Owned Toggle */}
        {hasWalletConnected && (
          <div className="flex items-center space-x-2">
            <Switch
              id="show-owned"
              checked={filters.showOnlyOwned}
              onCheckedChange={(checked) => onFiltersChange({ showOnlyOwned: checked })}
            />
            <Label htmlFor="show-owned" className="text-sm text-foreground">
              Show only owned tokens
            </Label>
          </div>
        )}

        {/* Refresh Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="hover-lift"
        >
          Refresh
        </Button>
      </div>
    </div>
  );
};