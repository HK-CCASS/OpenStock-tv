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

    console.log(`[TradingViewQuote] 初始化隐藏 Widget 提取数据: ${symbol}`);
    console.log('[TradingViewQuote] 注意: TradingView contentWindow 错误是正常的，可以忽略');

    // 创建 portal 容器
    const portalContainer = document.createElement('div');
    portalContainer.style.width = '300px';
    portalContainer.style.height = '200px';
    portalContainer.style.overflow = 'hidden';
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
        // 排除 style 和 script 标签，只获取实际数据
        const clone = portalContainerRef.current.cloneNode(true) as HTMLElement;
        
        // 移除所有 style 和 script 标签
        clone.querySelectorAll('style, script').forEach(el => el.remove());
        
        const fullText = clone.textContent || '';
        
        // 如果内容主要是 CSS 或为空，说明 Widget 还未加载完成
        if (fullText.length < 20 || fullText.includes('tradingview-widget')) {
          console.log(`[TradingViewQuote] ${symbol} Widget 还在加载中...`);
          return false;
        }
        
        // 调试：显示前200个字符
        console.log(`[TradingViewQuote] ${symbol} Widget 数据内容:`, fullText.substring(0, 200));

        // 提取价格 - 改进的正则表达式
        const pricePatterns = [
          /(\d{1,4}(?:,\d{3})*\.?\d{2,4})\s*[-+]/,  // 价格在涨跌符号前: "182.45 +"
          /\$(\d{1,4}(?:,\d{3})*\.?\d{2,4})/,      // 带$符号: "$182.45"
          /(?:^|\s)(\d{1,4}(?:,\d{3})*\.\d{2})(?:\s|$)/,  // 标准格式: "182.45"
        ];

        let price = 0;
        for (const pattern of pricePatterns) {
          const match = fullText.match(pattern);
          if (match) {
            const priceStr = match[1].replace(/,/g, '');
            const parsedPrice = parseFloat(priceStr);
            if (parsedPrice > 0.01 && parsedPrice < 10000) {
              price = parsedPrice;
              console.log(`[TradingViewQuote] ${symbol} 提取价格: ${price} (使用模式: ${pattern})`);
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
        const volumePatterns = [
          /(?:Vol|Volume|V)[\s:]*(\d+\.?\d*)([KMB])/i,  // 标准格式: "Vol 38.25M"
          /(\d+\.?\d*)([KMB])\s*(?:Vol|Volume)/i,       // 反向格式: "38.25M Vol"
        ];
        
        let volume = 0;
        for (const pattern of volumePatterns) {
          const volumeMatch = fullText.match(pattern);
          if (volumeMatch) {
            const num = parseFloat(volumeMatch[1]);
            const suffix = volumeMatch[2]?.toUpperCase();
            volume = suffix === 'K' ? num * 1000 :
                     suffix === 'M' ? num * 1000000 :
                     suffix === 'B' ? num * 1000000000 : num;
            console.log(`[TradingViewQuote] ${symbol} 提取成交量: ${volumeMatch[0]} → ${volume}`);
            break;
          }
        }

        if (price > 0) {
          console.log(`[TradingViewQuote] ✅ ${symbol} 数据提取成功:`, {
            price: `$${price}`,
            change,
            changePercent: `${changePercent}%`,
            volume: volume > 0 ? `${(volume / 1000000).toFixed(2)}M` : '0',
          });
          onPriceUpdate(symbol, price, change, changePercent, volume);
          return true;
        } else {
          // 只在多次尝试后仍失败时显示警告
          if (extractAttempts > 5) {
            console.warn(`[TradingViewQuote] ⚠️ ${symbol} 未提取到有效价格数据 (尝试 ${extractAttempts} 次)`);
            console.warn(`[TradingViewQuote] ${symbol} Widget 数据长度: ${fullText.length}`);
            if (fullText.length > 0 && fullText.length < 500) {
              console.warn(`[TradingViewQuote] ${symbol} 完整内容:`, fullText);
            } else if (fullText.length > 0) {
              console.warn(`[TradingViewQuote] ${symbol} 前300个字符:`, fullText.substring(0, 300));
            }
          }
        }
        return false;
      } catch (error) {
        console.error(`[TradingViewQuote] ${symbol} Error:`, error);
        return false;
      }
    };

    // 使用MutationObserver监听DOM变化
    let extractAttempts = 0;
    const maxAttempts = 30; // 增加最大尝试次数
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

    // 多次尝试提取 - 增加重试次数和延迟
    const timers: NodeJS.Timeout[] = [];
    [1000, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000].forEach((delay) => {
      const timer = setTimeout(() => {
        if (!successfulExtraction) {
          extractAttempts++;
          const success = extractQuoteData();
          if (success) {
            successfulExtraction = true;
            console.log(`[TradingViewQuote] ✅ ${symbol} 在 ${delay}ms 后成功提取数据`);
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
          // 忽略清理错误
        }
      }

      portalContainerRef.current = null;
      console.log(`[TradingViewQuote] 清理 Widget: ${symbol}`);
    };
  }, [symbol, onPriceUpdate]);

  return (
    <div
      ref={containerRef}
      className="tradingview-quote-widget"
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 0,
        width: '300px',
        height: '200px',
        opacity: 0,
        pointerEvents: 'none',
        zIndex: -9999,
        visibility: 'hidden',
      }}
      aria-hidden="true"
      role="presentation"
    />
  );
}

