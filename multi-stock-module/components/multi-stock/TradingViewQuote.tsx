'use client';

import { useEffect, useRef } from 'react';

interface TradingViewQuoteProps {
  symbol: string;
  onPriceUpdate: (symbol: string, price: number, change: number, changePercent: number, volume: number) => void;
}

/**
 * TradingView Symbol Overview Widget
 * 用于提取实时/收盘价格数据进行排序
 *
 * 功能:
 * - 开市时提供实时数据(自动更新)
 * - 闭市时提供最后收盘价数据
 * - 自动提取: 价格、涨跌额、涨跌幅、成交量
 */
export default function TradingViewQuote({ symbol, onPriceUpdate }: TradingViewQuoteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const portalContainerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string>(`tradingview_quote_${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!containerRef.current) return;

    // 创建 portal 容器(React 不管理)
    const portalContainer = document.createElement('div');
    portalContainer.style.width = '300px';
    portalContainer.style.height = '200px';
    portalContainerRef.current = portalContainer;

    // 添加 portal 到 React 容器
    containerRef.current.appendChild(portalContainer);

    // ✅ TradingView 会自动识别股票代码的交易所，直接使用原始代码
    const formattedSymbol = symbol;

    // 在 portal 内创建 widget 容器
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.id = widgetIdRef.current;
    portalContainer.appendChild(widgetDiv);  // 添加到 portal,不是 React 容器

    // 创建配置脚本 - 使用Symbol Overview Widget
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

    portalContainer.appendChild(script);  // 添加到 portal,不是 React 容器

    // 数据提取函数 - 使用多种策略
    const extractQuoteData = () => {
      if (!portalContainerRef.current) return;

      try {
        // 策略1: 从Widget的iframe中查找数据
        const iframe = portalContainerRef.current.querySelector('iframe');
        if (iframe) {
          try {
            // 尝试从iframe的title或其他属性中提取
            const titleData = iframe.getAttribute('title');
            if (titleData) {
              console.log(`[TradingViewQuote] ${symbol} iframe title:`, titleData);
            }
          } catch (e) {
            // 跨域限制,无法访问iframe内容
          }
        }

        // 策略2: 查找Widget容器外的数据显示元素
        const allElements = portalContainerRef.current.querySelectorAll('*');
        let foundData = false;

        allElements.forEach((el) => {
          const text = el.textContent || '';
          const className = el.className || '';

          // 查找包含价格模式的元素
          if (text && /\$?\d+\.?\d*/.test(text)) {
            console.log(`[TradingViewQuote] ${symbol} found element:`, {
              tag: el.tagName,
              class: className,
              text: text.substring(0, 100),
            });
          }
        });

        // 策略3: 直接从容器文本中提取完整数据
        const fullText = portalContainerRef.current.textContent || '';

        // 匹配多种价格格式
        // 格式1: $182.45 +2.34 +1.30%
        // 格式2: 182.45 +2.34 (+1.30%)
        // 格式3: AAPL 182.45 +1.30%

        // 提取价格(支持逗号分隔符)
        const pricePatterns = [
          /(?:^|\s)(\d{1,4}(?:,\d{3})*\.?\d{0,2})(?:\s|$)/,  // 标准格式
          /\$(\d{1,4}(?:,\d{3})*\.?\d{0,2})/,                // 带$符号
        ];

        let price = 0;
        for (const pattern of pricePatterns) {
          const match = fullText.match(pattern);
          if (match) {
            const priceStr = match[1].replace(/,/g, '');
            price = parseFloat(priceStr);
            if (price > 0.01 && price < 1000000) { // 合理价格范围
              console.log(`[TradingViewQuote] ${symbol} extracted price: ${price} from "${match[0].trim()}"`);
              break;
            }
          }
        }

        // 提取涨跌幅
        const percentPattern = /([-+]?\d+\.?\d{0,2})%/;
        const percentMatch = fullText.match(percentPattern);
        const changePercent = percentMatch ? parseFloat(percentMatch[1]) : 0;

        // 提取涨跌额(查找%之前的数字)
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

        // 只有在获取到有效数据时才回调
        if (price > 0) {
          console.log(`[TradingViewQuote] ✅ ${symbol}: price=$${price}, change=${change}, changePercent=${changePercent}%, volume=${volume}`);
          onPriceUpdate(symbol, price, change, changePercent, volume);
          foundData = true;
        } else {
          console.warn(`[TradingViewQuote] ⚠️ ${symbol}: No valid price found in text: "${fullText.substring(0, 200)}..."`);
        }

        return foundData;
      } catch (error) {
        console.error(`[TradingViewQuote] ❌ ${symbol} Error:`, error);
        return false;
      }
    };

    // 使用MutationObserver监听DOM变化
    let extractAttempts = 0;
    const maxAttempts = 20; // 最多尝试20次
    let successfulExtraction = false;

    const observer = new MutationObserver((mutations) => {
      if (successfulExtraction || extractAttempts >= maxAttempts) {
        return; // 已成功或超过最大尝试次数
      }

      // 检查是否有实质性的DOM变化
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
          console.log(`[TradingViewQuote] ✅ ${symbol} successfully extracted after ${extractAttempts} attempts`);
        }
      }
    });

    // 开始监听 portal 容器
    observer.observe(portalContainerRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
      characterDataOldValue: false,
    });

    // 延迟首次提取,等待Widget加载
    const timers: NodeJS.Timeout[] = [];

    // 多次尝试提取,逐渐增加间隔
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
