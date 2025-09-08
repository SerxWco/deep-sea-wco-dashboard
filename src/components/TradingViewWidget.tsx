import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";

declare global {
  interface Window {
    TradingView: any;
  }
}

interface TradingViewWidgetProps {
  height?: string;
  className?: string;
}

export function TradingViewWidget({ height = "400px", className = "" }: TradingViewWidgetProps) {
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
    <Card className={`glass-ocean border border-border/30 p-0 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-border/30">
        <h2 className="text-xl font-bold text-foreground mb-1">
          WCO/USD Trading Chart
        </h2>
        <p className="text-muted-foreground text-sm">
          Professional trading analysis powered by TradingView
        </p>
      </div>
      <div 
        ref={containerRef}
        id="tradingview-widget"
        style={{ height, minHeight: "400px" }}
        className="w-full"
      />
    </Card>
  );
}