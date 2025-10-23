# Using the Wallet Leaderboard

## Basic Usage

```tsx
import { useWalletLeaderboard } from '@/hooks/useWalletLeaderboard';

function MyComponent() {
  const { wallets, loading, refetch, allCategories } = useWalletLeaderboard();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      <ul>
        {wallets.map(wallet => (
          <li key={wallet.address}>
            {wallet.emoji} {wallet.category}: {wallet.balance} WCO
            {wallet.label && ` - ${wallet.label}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Filtering by Category

```tsx
const [selectedCategory, setSelectedCategory] = useState<string>('all');

const filteredWallets = selectedCategory === 'all'
  ? wallets
  : wallets.filter(w => w.category === selectedCategory);
```

## Ocean Creature Tiers

- **Kraken** 🦑 - 5M+ WCO
- **Whale** 🐋 - 1M-5M WCO
- **Shark** 🦈 - 500K-1M WCO
- **Dolphin** 🐬 - 100K-500K WCO
