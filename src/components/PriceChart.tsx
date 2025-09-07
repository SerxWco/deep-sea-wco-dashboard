import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

// Mock data for the price chart
const priceData = [
  { time: "00:00", price: 0.0821 },
  { time: "04:00", price: 0.0834 },
  { time: "08:00", price: 0.0798 },
  { time: "12:00", price: 0.0856 },
  { time: "16:00", price: 0.0847 },
  { time: "20:00", price: 0.0863 },
  { time: "24:00", price: 0.0847 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-ocean p-3 rounded-lg border border-border/30">
        <p className="text-foreground font-medium">Time: {label}</p>
        <p className="text-accent">
          Price: ${payload[0].value.toFixed(4)}
        </p>
      </div>
    );
  }
  return null;
};

export function PriceChart() {
  return (
    <Card className="glass-ocean p-6 border border-border/30 hover-lift">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-2">
          WCO Price Performance
        </h2>
        <p className="text-muted-foreground text-sm">
          24-hour price movement with aqua glow visualization
        </p>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={priceData}>
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              domain={['dataMin - 0.001', 'dataMax + 0.001']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="hsl(var(--accent))" 
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2, r: 4 }}
              activeDot={{ 
                r: 6, 
                fill: 'hsl(var(--accent))',
                stroke: 'hsl(var(--background))',
                strokeWidth: 2,
                style: { filter: 'drop-shadow(0 0 8px hsl(var(--accent)))' }
              }}
              style={{
                filter: 'drop-shadow(0 0 4px hsl(var(--accent) / 0.5))'
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex justify-between items-center text-sm">
        <span className="text-muted-foreground">Last updated: Just now</span>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
          <span className="text-accent font-medium">Live Data</span>
        </div>
      </div>
    </Card>
  );
}