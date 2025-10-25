'use client';

import { useEffect, useRef, useId } from 'react';

export type ChartType = 'area' | 'line' | 'candles' | 'bars';
export type Interval = '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M';
export type TimeRange = '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y';

interface TradingViewMiniChartProps {
  symbol: string;
  chartType?: ChartType;
  interval?: Interval;
  timeRange?: TimeRange;
  height?: number;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

// Convert TimeRange to TradingView's "range" parameter
function convertTimeRangeToTVRange(timeRange: TimeRange): string {
  const rangeMap: Record<TimeRange, string> = {
    '1M': '1M',
    '3M': '3M',
    '6M': '6M',
    '1Y': '12M',
    '3Y': '36M',
    '5Y': '60M',
  };
  return rangeMap[timeRange];
}

export default function TradingViewMiniChart({
  symbol,
  chartType = 'area',
  interval = '5',
  timeRange = '3M',
  height = 200,
}: TradingViewMiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const portalContainerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<any>(null);
  const uniqueId = useId();

  useEffect(() => {
    // Clean up previous widget
    if (widgetRef.current) {
      try {
        if (widgetRef.current.remove) {
          widgetRef.current.remove();
        }
      } catch (e) {
        console.warn('Widget cleanup warning:', e);
      }
      widgetRef.current = null;
    }

    if (!containerRef.current) return;

    // Create portal container for TradingView (isolate from React DOM management)
    const portalContainer = document.createElement('div');
    portalContainer.style.width = '100%';
    portalContainer.style.height = `${height}px`;
    portalContainer.id = `tradingview_${symbol.replace(/[^a-zA-Z0-9]/g, '_')}_${uniqueId.replace(/:/g, '_')}`;
    portalContainerRef.current = portalContainer;

    // Add portal to React container
    containerRef.current.appendChild(portalContainer);

    // Add a small delay to ensure DOM is ready
    const initTimer = setTimeout(() => {
      // Load TradingView script if not already loaded
      const scriptId = 'tradingview-widget-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement;

      const initWidget = () => {
        if (typeof window.TradingView !== 'undefined' && portalContainerRef.current) {
          try {
            // ✅ TradingView 会自动识别股票代码的交易所，无需添加前缀
            // 直接使用原始股票代码即可 (如 "AAPL", "TSLA", "SPOT")
            console.log(`Initializing TradingView widget for ${symbol} with interval=${interval}, range=${timeRange}`);

            widgetRef.current = new window.TradingView.widget({
              autosize: false,
              width: '100%',
              height: height,
              symbol: symbol,
              interval: interval,
              range: convertTimeRangeToTVRange(timeRange),
              timezone: 'Etc/UTC',
              theme: 'dark',
              style: chartType === 'candles' ? '1' : chartType === 'bars' ? '8' : chartType === 'line' ? '2' : '3',
              locale: 'en',
              toolbar_bg: '#1a1a1a',
              enable_publishing: false,
              hide_top_toolbar: false,
              hide_legend: true,
              save_image: false,
              container_id: portalContainerRef.current.id,
              backgroundColor: '#141414',
              gridColor: '#1a1a1a',
              hide_side_toolbar: true,
              allow_symbol_change: false,
              show_popup_button: false,
              popup_width: '1000',
              popup_height: '650',
              studies: [],
              disabled_features: [
                'header_symbol_search',
                'header_compare',
                'header_undo_redo',
                'header_screenshot',
                'header_saveload',
              ],
              enabled_features: ['hide_left_toolbar_by_default'],
              // Force interval to not auto-adjust based on range
              overrides: {
                'mainSeriesProperties.minTick': 'default',
              },
              // Note: TradingView widget handles price display internally
              // Price data extraction from widget is complex and not reliably supported
              // For sorting, we rely on the placeholder data or external API calls
            });
          } catch (error) {
            console.error(`Error initializing TradingView widget for ${symbol}:`, error);
          }
        }
      };

      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = initWidget;
        document.head.appendChild(script);
      } else if (script.getAttribute('data-loaded') === 'true') {
        initWidget();
      } else {
        script.addEventListener('load', initWidget);
      }

      // Mark script as loaded
      script.setAttribute('data-loaded', 'true');
    }, 100); // Small delay to prevent race conditions

    return () => {
      clearTimeout(initTimer);

      // Clean up widget
      if (widgetRef.current && widgetRef.current.remove) {
        try {
          widgetRef.current.remove();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      widgetRef.current = null;

      // Safe portal cleanup (React doesn't manage this container)
      // Check if portal still exists and is connected to DOM
      if (portalContainerRef.current && portalContainerRef.current.parentNode) {
        try {
          // Remove portal from DOM WITHOUT clearing innerHTML first
          // This prevents TradingView from accessing deleted nodes
          const parent = portalContainerRef.current.parentNode;
          parent.removeChild(portalContainerRef.current);
        } catch (e) {
          // Silently handle if node was already removed
          console.debug('Portal cleanup warning:', e);
        }
      }

      // Always clear ref
      portalContainerRef.current = null;
    };
  }, [symbol, chartType, interval, timeRange, height]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ width: '100%', height: `${height}px` }}
    />
  );
}
