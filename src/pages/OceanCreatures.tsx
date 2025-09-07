import { WalletLeaderboard } from '@/components/WalletLeaderboard';

export default function OceanCreatures() {
  return (
    <div className="min-h-screen bg-ocean-gradient p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            🌊 Ocean Creatures
          </h1>
          <p className="text-lg text-muted-foreground">
            Explore the depths of WCO whale activity and wallet rankings
          </p>
        </div>

        {/* Leaderboard */}
        <WalletLeaderboard />
      </div>
    </div>
  );
}