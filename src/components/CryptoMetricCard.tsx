import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CryptoMetricCardProps {
  title: string;
  value: string;
  change?: {
    value: string;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function CryptoMetricCard({ 
  title, 
  value, 
  change, 
  icon, 
  className 
}: CryptoMetricCardProps) {
  return (
    <Card className={cn(
      "glass-ocean hover-lift p-6 border border-border/30", 
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
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