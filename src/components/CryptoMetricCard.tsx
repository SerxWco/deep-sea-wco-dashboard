import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CryptoMetricCardProps {
  title: string;
  value: string;
  change?: {
    value: string;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  className?: string;
  tooltip?: string;
}

export function CryptoMetricCard({ 
  title, 
  value, 
  change, 
  icon, 
  className,
  tooltip
}: CryptoMetricCardProps) {
  return (
    <Card className={cn(
      "glass-ocean hover-lift p-6 border border-border/30", 
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </h3>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help transition-colors" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {icon && (
          <div className="text-accent">
            {icon}
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <p className="text-2xl font-bold text-foreground">
          {value}
        </p>
        
        {change && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            change.isPositive ? "text-success" : "text-destructive"
          )}>
            {change.isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span>{change.value}</span>
          </div>
        )}
      </div>
    </Card>
  );
}