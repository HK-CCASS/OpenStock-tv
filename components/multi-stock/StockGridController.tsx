'use client';

import { useState, useEffect, useMemo } from 'react';
import StockTile from './StockTile';
import LayoutControls from './LayoutControls';
import TradingViewQuote from './TradingViewQuote';
import { ChartType, Interval, TimeRange } from './TradingViewMiniChart';
import type { StockQuote, SortOption, ColumnCount } from '@/lib/types/multi-stock.types';
import type { WatchlistInfo } from '@/lib/adapters/multi-stock-adapter';
import { cn } from '@/lib/utils';
import { getBatchStockQuotes } from '@/lib/actions/finnhub.actions';

interface StockGridControllerProps {
  symbols: Array<{ symbol: string; company: string }>;
  watchlists: WatchlistInfo[];
  currentWatchlistId: string;
  userId?: string;
  onStockRemoved?: () => void;
}

// Grid column classes mapping
const gridColsMap: Record<ColumnCount, string> = {
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4',
  5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5',
  6: 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6',
  7: 'grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-7',
  8: 'grid-cols-3 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-8',
};

// Generate initial placeholder quotes
function generateInitialQuotes(symbols: Array<{ symbol: string; company: string }>): StockQuote[] {
  return symbols.map(({ symbol, company }) => {
    const placeholderPrice = 0;

    return {
      symbol,
      company,
      price: placeholderPrice,
      change: 0,
      changePercent: 0,
      volume: 0,
      high: placeholderPrice,
      low: placeholderPrice,
      open: placeholderPrice,
      previousClose: placeholderPrice,
      timestamp: Date.now(),
    };
  });
}

export default function StockGridController({
  symbols,
  watchlists,
  currentWatchlistId,
  userId,
  onStockRemoved,
}: StockGridControllerProps) {
  const [quotes, setQuotes] = useState<StockQuote[]>(generateInitialQuotes(symbols));
  const [columns, setColumns] = useState<ColumnCount>(5);
  const [sortBy, setSortBy] = useState<SortOption>('changePercent_desc');
  const [isConnected, setIsConnected] = useState(false);
  const [globalChartType, setGlobalChartType] = useState<ChartType>('line');
  const [globalTimeframe, setGlobalTimeframe] = useState<Interval>('5');
  const [globalTimeRange, setGlobalTimeRange] = useState<TimeRange>('1Y');

  // Fetch real-time quotes from Finnhub (price + market cap)
  useEffect(() => {
    const fetchQuotes = async () => {
      console.log('[StockGridController] Fetching quotes from Finnhub...');
      
      const symbolList = symbols.map(s => s.symbol);
      const quotesMap = await getBatchStockQuotes(symbolList);
      
      // 更新quotes状态（volume 将通过 TradingViewQuote 组件更新）
      const updatedQuotes = symbols.map(({ symbol, company }) => {
        const quoteData = quotesMap.get(symbol.toUpperCase());
        
        if (quoteData) {
          return {
            symbol,
            company,
            price: quoteData.price,
            change: quoteData.change,
            changePercent: quoteData.changePercent,
            volume: 0, // 将通过 TradingViewQuote 更新
            high: quoteData.high,
            low: quoteData.low,
            open: quoteData.open,
            previousClose: quoteData.previousClose,
            marketCap: quoteData.marketCap,
            timestamp: Date.now(),
          };
        }
        
        // 如果获取失败，使用占位符
        return {
          symbol,
          company,
          price: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
          high: 0,
          low: 0,
          open: 0,
          previousClose: 0,
          marketCap: 0,
          timestamp: Date.now(),
        };
      });
      
      setQuotes(updatedQuotes);
      setIsConnected(true);
      console.log('[StockGridController] Quotes updated:', updatedQuotes.length);
    };

    fetchQuotes();

    // 每60秒刷新一次数据
    const interval = setInterval(fetchQuotes, 60000);

    return () => {
      clearInterval(interval);
      setIsConnected(false);
    };
  }, [symbols]);

  // 处理从 TradingView Widget 提取的数据更新
  const handleQuoteUpdate = (symbol: string, price: number, change: number, changePercent: number, volume: number) => {
    console.log(`[StockGridController] TradingView data for ${symbol}:`, { price, change, changePercent, volume });
    
    setQuotes(prevQuotes => 
      prevQuotes.map(quote => {
        if (quote.symbol.toUpperCase() === symbol.toUpperCase()) {
          return {
            ...quote,
            // 更新成交量数据（从 TradingView 提取）
            volume: volume,
            // 可选：如果 Finnhub 数据还未加载，也更新价格数据
            price: quote.price === 0 ? price : quote.price,
            change: quote.change === 0 ? change : quote.change,
            changePercent: quote.changePercent === 0 ? changePercent : quote.changePercent,
          };
        }
        return quote;
      })
    );
  };

  // Sort stocks based on selected option
  const sortedQuotes = useMemo(() => {
    const sorted = [...quotes];

    switch (sortBy) {
      case 'changePercent_desc':
        return sorted.sort((a, b) => b.changePercent - a.changePercent);
      case 'changePercent_asc':
        return sorted.sort((a, b) => a.changePercent - b.changePercent);
      case 'price_desc':
        return sorted.sort((a, b) => b.price - a.price);
      case 'price_asc':
        return sorted.sort((a, b) => a.price - b.price);
      case 'volume_desc':
        return sorted.sort((a, b) => b.volume - a.volume);
      case 'marketCap_desc':
        return sorted.sort((a, b) => b.marketCap - a.marketCap);
      case 'marketCap_asc':
        return sorted.sort((a, b) => a.marketCap - b.marketCap);
      case 'symbol_asc':
        return sorted.sort((a, b) => a.symbol.localeCompare(b.symbol));
      default:
        return sorted;
    }
  }, [quotes, sortBy]);

  return (
    <div className="space-y-6">
      {/* Layout Controls */}
      <LayoutControls
        columns={columns}
        sortBy={sortBy}
        chartType={globalChartType}
        timeframe={globalTimeframe}
        timeRange={globalTimeRange}
        watchlists={watchlists}
        currentWatchlistId={currentWatchlistId}
        onColumnsChange={setColumns}
        onSortChange={setSortBy}
        onChartTypeChange={setGlobalChartType}
        onTimeframeChange={setGlobalTimeframe}
        onTimeRangeChange={setGlobalTimeRange}
      />

      {/* Stock Count */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>{quotes.length} 支股票</span>
        {isConnected && (
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            实时数据已连接
          </span>
        )}
      </div>

      {/* Stock Grid */}
      {sortedQuotes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-2">自选列表为空</p>
          <p className="text-sm">请先添加股票到自选列表</p>
        </div>
      ) : (
        <div className={cn('grid gap-2', gridColsMap[columns])}>
          {sortedQuotes.map((quote) => (
            <StockTile
              key={quote.symbol}
              quote={quote}
              chartType={globalChartType}
              timeframe={globalTimeframe}
              timeRange={globalTimeRange}
              userId={userId}
              onRemove={(symbol) => {
                // 从本地状态移除
                setQuotes(quotes.filter(q => q.symbol !== symbol));
                // 通知父组件刷新数据
                onStockRemoved?.();
              }}
            />
          ))}
        </div>
      )}

      {/* 隐藏的 TradingView Quote Widgets 用于提取成交量数据 */}
      {symbols.map(({ symbol }) => (
        <TradingViewQuote
          key={`quote-${symbol}`}
          symbol={symbol}
          onPriceUpdate={handleQuoteUpdate}
        />
      ))}
    </div>
  );
}

