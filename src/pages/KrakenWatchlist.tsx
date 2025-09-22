import { KrakenWatchlist } from '@/components/KrakenWatchlist';

export default function KrakenWatchlistPage() {
  return (
    <div className="min-h-screen bg-ocean-gradient p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <KrakenWatchlist />
      </div>
    </div>
  );
}