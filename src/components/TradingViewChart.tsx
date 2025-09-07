import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";

declare global {
  interface Window {
    TradingView: any;
  }
}

export function TradingViewChart() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load TradingView script if not already loaded
    if (!window.TradingView) {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = () => {
        initializeWidget();
      };
      document.head.appendChild(script);
    } else {
      initializeWidget();
    }

    function initializeWidget() {
      if (containerRef.current && window.TradingView) {
        new window.TradingView.widget({
          autosize: true,
          symbol: "CRYPTO:WCOUSD",
          interval: "1H",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "rgba(7, 26, 44, 0.9)",
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: "tradingview-widget",
          backgroundColor: "rgba(7, 26, 44, 0.9)",
          gridColor: "rgba(56, 189, 248, 0.1)",
          overrides: {
            "paneProperties.background": "rgba(7, 26, 44, 0.9)",
            "paneProperties.backgroundType": "solid",
            "mainSeriesProperties.candleStyle.upColor": "rgb(34, 197, 94)",
            "mainSeriesProperties.candleStyle.downColor": "rgb(239, 68, 68)",
            "mainSeriesProperties.candleStyle.borderUpColor": "rgb(34, 197, 94)",
            "mainSeriesProperties.candleStyle.borderDownColor": "rgb(239, 68, 68)",
            "mainSeriesProperties.candleStyle.wickUpColor": "rgb(34, 197, 94)",
            "mainSeriesProperties.candleStyle.wickDownColor": "rgb(239, 68, 68)",
          },
          studies: [
            "MASimple@tv-basicstudies",
            "RSI@tv-basicstudies"
          ],
          disabled_features: [
            "use_localization",
            "header_symbol_search",
            "header_resolutions"
          ],
          enabled_features: [
            "study_templates"
          ]
        });
      }
    }

    return () => {
      // Cleanup if needed
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-ocean-gradient p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            WCO/USD Trading Chart
          </h1>
          <p className="text-muted-foreground">
            Professional trading analysis powered by TradingView
          </p>
        </div>

        {/* TradingView Widget Container */}
        <Card className="glass-ocean border border-border/30 p-0 overflow-hidden">
          <div 
            ref={containerRef}
            id="tradingview-widget"
            style={{ height: "80vh", minHeight: "600px" }}
            className="w-full"
          />
        </Card>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-ocean p-4 border border-border/30">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Current Price</p>
              <p className="text-xl font-bold text-foreground">$0.0847</p>
              <p className="text-xs text-success">+12.5%</p>
            </div>
          </Card>
          
          <Card className="glass-ocean p-4 border border-border/30">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">24h Volume</p>
              <p className="text-xl font-bold text-foreground">$156K</p>
              <p className="text-xs text-accent">+45.2%</p>
            </div>
          </Card>
          
          <Card className="glass-ocean p-4 border border-border/30">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Market Cap</p>
              <p className="text-xl font-bold text-foreground">$2.1M</p>
              <p className="text-xs text-success">+8.3%</p>
            </div>
          </Card>
          
          <Card className="glass-ocean p-4 border border-border/30">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">All-Time High</p>
              <p className="text-xl font-bold text-foreground">$0.2134</p>
              <p className="text-xs text-destructive">-60.3%</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}