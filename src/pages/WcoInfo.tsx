import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Building2, Coins, BarChart3, FileText, RefreshCw } from "lucide-react";
import { DailyReportGenerator } from "@/components/DailyReportGenerator";
import { useWCOMarketData } from "@/hooks/useWCOMarketData";
import { useWChainNetworkStats } from "@/hooks/useWChainNetworkStats";
import { useWalletLeaderboard } from "@/hooks/useWalletLeaderboard";
import { useWCOBurnTracker } from "@/hooks/useWCOBurnTracker";
import { useWCOSupplyInfo } from "@/hooks/useWCOSupplyInfo";
import { saveDailyMetrics, getDailyComparison } from "@/utils/dailyComparisons";
import coinmarketBanner from "@/assets/coinmarket-banner.webp";
import coingeckoBanner from "@/assets/coingecko-banner.webp";
import bitmartLogo from "@/assets/bitmart-logo.webp";
import mexcLogo from "@/assets/mexc-logo.webp";
import bitrueLogo from "@/assets/bitrue-logo.webp";

export default function WcoInfo() {
  const { data, loading } = useWCOMarketData();
  const { totalFetched: totalHolders, loading: holdersLoading } = useWalletLeaderboard();
  const { data: networkStats, loading: networkLoading } = useWChainNetworkStats(totalHolders);
  const { data: burnData, loading: burnLoading } = useWCOBurnTracker();
  const { data: supplyData, loading: supplyLoading } = useWCOSupplyInfo();
  
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const [dailyComparison, setDailyComparison] = useState<any>(null);

  // Calculate daily comparison data asynchronously
  useEffect(() => {
    const fetchComparison = async () => {
      if (data && networkStats && burnData && supplyData) {
        const comparison = await getDailyComparison({
          totalHolders,
          transactions24h: networkStats.transactions24h,
          wcoMoved24h: networkStats.wcoMoved24h,
          activeWallets: networkStats.activeWallets,
          averageTransactionSize: networkStats.averageTransactionSize,
          networkActivityRate: networkStats.networkActivityRate,
          marketCap: data.market_cap,
          circulatingSupply: parseFloat(supplyData.summary.circulating_supply_wco),
          wcoBurntTotal: burnData.totalBurnt,
          wcoBurnt24h: burnData.burnt24h || 0
        });
        setDailyComparison(comparison);
      }
    };

    fetchComparison();
  }, [data, networkStats, burnData, supplyData, totalHolders]);

  // Save daily metrics when data is available
  useEffect(() => {
    if (data && networkStats && burnData && supplyData && !loading && !networkLoading && !burnLoading && !supplyLoading) {
      saveDailyMetrics({
        totalHolders,
        transactions24h: networkStats.transactions24h,
        wcoMoved24h: networkStats.wcoMoved24h,
        activeWallets: networkStats.activeWallets,
        averageTransactionSize: networkStats.averageTransactionSize,
        networkActivityRate: networkStats.networkActivityRate,
        marketCap: data.market_cap,
        circulatingSupply: parseFloat(supplyData.summary.circulating_supply_wco),
        wcoBurntTotal: burnData.totalBurnt,
        wcoBurnt24h: burnData.burnt24h || 0
      });
    }
  }, [data, networkStats, burnData, supplyData, totalHolders, loading, networkLoading, burnLoading, supplyLoading]);

  // Generate report data
  const getReportData = () => {
    if (!data || !networkStats || !burnData || !supplyData) return null;
    
    return {
      totalHolders,
      holdersChange: dailyComparison?.totalHolders?.change || 0,
      transactions24h: networkStats.transactions24h,
      transactionsChange: dailyComparison?.transactions24h?.change || 0,
      wcoMoved24h: networkStats.wcoMoved24h,
      wcoMovedChange: dailyComparison?.wcoMoved24h?.change || 0,
      circulatingSupply: parseFloat(supplyData.summary.circulating_supply_wco),
      circulatingSupplyChange: dailyComparison?.circulatingSupply?.change || 0,
      marketCap: data.market_cap,
      marketCapChange: dailyComparison?.marketCap?.change || 0,
      wcoBurnt: burnData.totalBurnt,
      wcoBurntChange: dailyComparison?.wcoBurntTotal?.change || 0
    };
  };
  
  const exchanges = [
    {
      name: "Bitrue",
      type: "CEX",
      url: "https://www.bitrue.com/referral/landing?cn=600000&inviteCode=LHLAAG",
      icon: Building2,
      logo: bitrueLogo,
      hasLogo: true
    },
    {
      name: "MEXC",
      type: "CEX", 
      url: "https://promote.mexc.com/r/0HfW8sQC",
      icon: Building2,
      logo: mexcLogo,
      hasLogo: true
    },
    {
      name: "BitMart",
      type: "CEX",
      url: "https://www.bitmart.com/invite/Pdc9we/es",
      icon: Building2,
      logo: bitmartLogo,
      hasLogo: true
    },
    {
      name: "W-Swap",
      type: "DEX",
      url: "https://w-swap.com",
      icon: Coins,
      hasLogo: false
    }
  ];

  const marketData = [
    {
      name: "CoinMarketCap",
      url: "https://coinmarketcap.com/currencies/wadzchain-coin/",
      icon: BarChart3,
      description: "Real-time market data and analytics",
      hasBanner: true
    },
    {
      name: "CoinGecko", 
      url: "https://www.coingecko.com/en/coins/w-coin",
      icon: BarChart3,
      description: "Market insights and price tracking",
      hasBanner: true
    }
  ];

  const additionalInfo = [
    {
      name: "Tokenomics",
      url: "https://w-chain.com/wchain-tokenomics/",
      icon: FileText,
      description: "Complete tokenomics and distribution details"
    }
  ];

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              WCO Information
            </h1>
            {(loading || networkLoading || burnLoading || supplyLoading || holdersLoading) && (
              <RefreshCw className="h-5 w-5 text-accent animate-spin" />
            )}
          </div>
          
          <Button 
            onClick={() => setShowReportGenerator(true)}
            className="flex items-center gap-2"
            variant="outline"
            disabled={!data || !networkStats || !burnData || !supplyData}
          >
            <FileText className="h-4 w-4" />
            Generate Daily Report
          </Button>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Learn about W Coin (WCO) and where to buy it
        </p>
      </div>

      {/* About WCO */}
      <Card className="glass-ocean rounded-2xl border-border/30">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">About WCO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            WCO is the main utility coin for the W Chain Hybrid Blockchain, enabling fast, low-cost transactions, staking, and governance. Its hybrid architecture combines the advantages of public and private blockchains, making WCO a vital solution for businesses and users seeking secure and efficient blockchain applications.
          </p>
          <p>
            WCO, part of the W Chain ecosystem, integrates blockchain and conventional technology to offer a secure, scalable, and high-performance platform for consumers, developers, and companies.
          </p>
          <p>
            For developers, blockchain enthusiasts, and businesses, W Coin opens the door to decentralized finance (DeFi), frictionless payments, and powerful blockchain solutions. The W Chain Hybrid Blockchain's native cryptocurrency, W Coin (WCO), powers the next generation of decentralized apps, payments, and business solutions.
          </p>
          
          <div className="pt-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="group-hover:bg-primary/10 transition-colors duration-300"
              onClick={() => window.open('https://w-chain.com/products/wco/', '_blank', 'noopener,noreferrer')}
            >
              Learn More <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Where to Buy */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground text-center">Where to Buy WCO</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {exchanges.map((exchange) => {
            const IconComponent = exchange.icon;
            return (
              <Card key={exchange.name} className="glass-ocean rounded-xl border-border/30 hover:border-primary/30 transition-all duration-300 group">
                <CardContent className="p-6 text-center space-y-4">
                  {exchange.hasLogo ? (
                    <div className="w-full h-16 mx-auto flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                      <img 
                        src={exchange.logo} 
                        alt={exchange.name} 
                        className="h-10 w-auto object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 mx-auto bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground">{exchange.name}</h3>
                    <p className="text-sm text-muted-foreground">{exchange.type}</p>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full group-hover:bg-primary/10 transition-colors duration-300"
                    onClick={() => window.open(exchange.url, '_blank', 'noopener,noreferrer')}
                  >
                    Trade WCO <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Market Data & Information */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground text-center">Market Data & Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {marketData.map((platform) => {
            const IconComponent = platform.icon;
            return (
              <Card key={platform.name} className="glass-ocean rounded-xl border-border/30 hover:border-primary/30 transition-all duration-300 group">
                <CardContent className="p-6 text-center space-y-4">
                  {platform.hasBanner ? (
                    <div className="w-full h-16 mx-auto flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                      <img 
                        src={platform.name === "CoinMarketCap" ? coinmarketBanner : coingeckoBanner} 
                        alt={platform.name} 
                        className="h-12 w-auto object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 mx-auto bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground">{platform.name}</h3>
                    <p className="text-sm text-muted-foreground">{platform.description}</p>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full group-hover:bg-primary/10 transition-colors duration-300"
                    onClick={() => window.open(platform.url, '_blank', 'noopener,noreferrer')}
                  >
                    View Data <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Additional Information */}
        <div className="grid grid-cols-1 max-w-md mx-auto">
          {additionalInfo.map((info) => {
            const IconComponent = info.icon;
            return (
              <Card key={info.name} className="glass-ocean rounded-xl border-border/30 hover:border-primary/30 transition-all duration-300 group">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="w-12 h-12 mx-auto bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground">{info.name}</h3>
                    <p className="text-sm text-muted-foreground">{info.description}</p>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full group-hover:bg-primary/10 transition-colors duration-300"
                    onClick={() => window.open(info.url, '_blank', 'noopener,noreferrer')}
                  >
                    View Details <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <DailyReportGenerator 
        isOpen={showReportGenerator}
        onOpenChange={setShowReportGenerator}
        reportData={getReportData()}
      />
    </div>
  );
}