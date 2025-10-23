# Price Tracking Examples

## Get WCO Price

```tsx
import { useWChainPriceAPI } from '@/hooks/useWChainPriceAPI';

function PriceDisplay() {
  const { wcoPrice, loading } = useWChainPriceAPI();

  if (loading) return <div>Loading price...</div>;

  return (
    <div>
      <h3>WCO Price</h3>
      <p>${wcoPrice?.price.toFixed(6)}</p>
      <span className={wcoPrice?.change24h >= 0 ? 'text-green-500' : 'text-red-500'}>
        {wcoPrice?.change24h >= 0 ? '+' : ''}{wcoPrice?.change24h}%
      </span>
    </div>
  );
}
```

## Get Complete Market Data

```tsx
import { useWCOMarketData } from '@/hooks/useWCOMarketData';
import { formatCurrency } from '@/utils/formatters';

function MarketOverview() {
  const { data, loading, error } = useWCOMarketData();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label>Price</label>
        <p>{formatCurrency(data?.current_price)}</p>
      </div>
      <div>
        <label>Market Cap</label>
        <p>{formatCurrency(data?.market_cap)}</p>
      </div>
      <div>
        <label>24h Volume</label>
        <p>{formatCurrency(data?.total_volume)}</p>
      </div>
      <div>
        <label>Circulating Supply</label>
        <p>{data?.circulating_supply.toLocaleString()} WCO</p>
      </div>
    </div>
  );
}
```

## Track Multiple Tokens

```tsx
import { useWChainPriceAPI } from '@/hooks/useWChainPriceAPI';
import { useOG88Price } from '@/hooks/useOG88Price';

function MultiTokenPrice() {
  const { wcoPrice, wavePrice } = useWChainPriceAPI();
  const { og88Price } = useOG88Price();

  return (
    <div>
      <TokenRow name="WCO" price={wcoPrice?.price} />
      <TokenRow name="WAVE" price={wavePrice?.price} />
      <TokenRow name="OG88" price={og88Price?.price} />
    </div>
  );
}
```

## Price Chart Integration

```tsx
import { usePriceHistory } from '@/hooks/usePriceHistory';
import { LineChart, Line } from 'recharts';

function PriceChart() {
  const { data } = usePriceHistory('WCO', '7d');

  return (
    <LineChart width={500} height={300} data={data}>
      <Line type="monotone" dataKey="price" stroke="#8884d8" />
    </LineChart>
  );
}
```
