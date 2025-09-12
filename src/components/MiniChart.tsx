import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface MiniChartProps {
  data: number[];
  color?: string;
  height?: number;
}

export function MiniChart({ 
  data, 
  color = "hsl(var(--primary))", 
  height = 40 
}: MiniChartProps) {
  // Convert array to chart data format
  const chartData = data.map((value, index) => ({
    index,
    value
  }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 2, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}