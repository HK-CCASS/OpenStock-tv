'use client';

import { useEffect, useRef } from 'react';

interface TradingViewQuoteProps {
  symbol: string;
  onPriceUpdate: (symbol: string, price: number, change: number, changePercent: number, volume: number) => void;
}

/**
 * TradingView Symbol Overview Widget
 * 用于提取实时/收盘价格数据进行排序
 */
export default function TradingViewQuote({ symbol, onPriceUpdate }: TradingViewQuoteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const portalContainerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string>(`tradingview_quote_${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!containerRef.current) return;

    // 创建 portal 容器
    const portalContainer = document.createElement('div');
    portalContainer.style.width = '300px';
    portalContainer.style.height = '200px';
    portalContainerRef.current = portalContainer;

    containerRef.current.appendChild(portalContainer);

    const formattedSymbol = symbol;

    // 创建 widget 容器
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.id = widgetIdRef.current;
    portalContainer.appendChild(widgetDiv);

    // 创建配置脚本
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [[formattedSymbol]],
      chartOnly: false,
      width: '100%',
      height: '100%',
      locale: 'en',
      colorTheme: 'dark',
      autosize: false,
      showVolume: false,
      showMA: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
      scalePosition: 'right',
      scaleMode: 'Normal',
      fontFamily: '-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif',
      fontSize: '10',
      noTimeScale: false,
      valuesTracking: '1',
      changeMode: 'price-and-percent',
      chartType: 'area',
      maLineColor: '#2962FF',
      maLineWidth: 1,
      maLength: 9,
      lineWidth: 2,
      lineType: 0,
      dateRanges: ['1d|1', '1m|30', '3m|60', '12m|1D', '60m|1W', 'all|1M'],
    });

    portalContainer.appendChild(script);

    // 数据提取函数
    const extractQuoteData = () => {
      if (!portalContainerRef.current) return;

      try {
        const fullText = portalContainerRef.current.textContent || '';

        // 提取价格
        const pricePatterns = [
          /(?:^|\s)(\d{1,4}(?:,\d{3})*\.?\d{0,2})(?:\s|$)/,
          /\$(\d{1,4}(?:,\d{3})*\.?\d{0,2})/,
        ];

        let price = 0;
        for (const pattern of pricePatterns) {
          const match = fullText.match(pattern);
          if (match) {
            const priceStr = match[1].replace(/,/g, '');
            price = parseFloat(priceStr);
            if (price > 0.01 && price < 1000000) {
              break;
            }
          }
        }

        // 提取涨跌幅
        const percentPattern = /([-+]?\d+\.?\d{0,2})%/;
        const percentMatch = fullText.match(percentPattern);
        const changePercent = percentMatch ? parseFloat(percentMatch[1]) : 0;

        // 提取涨跌额
        const changePattern = /([-+]\d+\.?\d{0,2})(?=\s*[-+]?\d+\.?\d{0,2}%)/;
        const changeMatch = fullText.match(changePattern);
        const change = changeMatch ? parseFloat(changeMatch[1]) : 0;

        // 提取成交量
        const volumePattern = /(?:Vol|Volume|V)[\s:]*(\d+\.?\d*)([KMB])?/i;
        const volumeMatch = fullText.match(volumePattern);
        let volume = 0;
        if (volumeMatch) {
          const num = parseFloat(volumeMatch[1]);
          const suffix = volumeMatch[2]?.toUpperCase();
          volume = suffix === 'K' ? num * 1000 :
                   suffix === 'M' ? num * 1000000 :
                   suffix === 'B' ? num * 1000000000 : num;
        }

        if (price > 0) {
          onPriceUpdate(symbol, price, change, changePercent, volume);
          return true;
        }
        return false;
      } catch (error) {
        console.error(`[TradingViewQuote] ${symbol} Error:`, error);
        return false;
      }
    };

    // 使用MutationObserver监听DOM变化
    let extractAttempts = 0;
    const maxAttempts = 20;
    let successfulExtraction = false;

    const observer = new MutationObserver((mutations) => {
      if (successfulExtraction || extractAttempts >= maxAttempts) {
        return;
      }

      const hasContentChange = mutations.some(
        (mutation) =>
          mutation.type === 'childList' ||
          mutation.type === 'characterData'
      );

      if (hasContentChange) {
        extractAttempts++;
        const success = extractQuoteData();
        if (success) {
          successfulExtraction = true;
        }
      }
    });

    observer.observe(portalContainerRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
      characterDataOldValue: false,
    });

    // 多次尝试提取
    const timers: NodeJS.Timeout[] = [];
    [1000, 2000, 3000, 5000, 8000, 10000].forEach((delay) => {
      const timer = setTimeout(() => {
        if (!successfulExtraction) {
          extractAttempts++;
          const success = extractQuoteData();
          if (success) {
            successfulExtraction = true;
          }
        }
      }, delay);
      timers.push(timer);
    });

    return () => {
      timers.forEach(clearTimeout);
      observer.disconnect();

      if (portalContainerRef.current && portalContainerRef.current.parentNode) {
        try {
          const parent = portalContainerRef.current.parentNode;
          parent.removeChild(portalContainerRef.current);
        } catch (e) {
          console.debug('Portal cleanup warning:', e);
        }
      }

      portalContainerRef.current = null;
    };
  }, [symbol, onPriceUpdate]);

  return (
    <div
      ref={containerRef}
      className="tradingview-quote-widget"
      style={{
        position: 'fixed',
        left: '-9999px',
        top: 0,
        width: '300px',
        height: '200px',
        opacity: 0,
        pointerEvents: 'none',
        zIndex: -1,
      }}
      aria-hidden="true"
    />
  );
}

