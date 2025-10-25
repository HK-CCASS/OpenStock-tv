'use client';

import { useState, useEffect, useMemo } from 'react';
import { StockQuote } from '@/lib/actions/multi-stock.actions';
import { WatchlistInfo } from '@/lib/actions/watchlist-sqlite.actions';
import StockTile from './StockTile';
import LayoutControls, { SortOption, ColumnCount } from './LayoutControls';
import { ChartType, Interval, TimeRange } from './TradingViewMiniChart';
// 使用SQLite数据，不再调用外部API
// import { getQuotesForSymbols } from '@/lib/actions/stock-quotes.actions'; // 已弃用，使用TradingView widgets
import { cn } from '@/lib/utils';

interface StockGridControllerProps {
  symbols: Array<{ symbol: string; company: string }>;
  watchlists: WatchlistInfo[];
  currentWatchlistId: string;
}

// Grid column classes mapping - Optimized for wide screens
const gridColsMap: Record<ColumnCount, string> = {
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4',
  5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5',
  6: 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6',
  7: 'grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-7',
  8: 'grid-cols-3 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-8',
};

// Initial placeholder data for display (TradingView widgets will show actual real-time/last close data)
// This is only used for the header display and sorting - actual prices shown in charts are from TradingView
function generateInitialQuotes(symbols: Array<{ symbol: string; company: string }>): StockQuote[] {
  return symbols.map(({ symbol, company }) => {
    // Use placeholder values - TradingView will display actual market data
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
}: StockGridControllerProps) {
  const [quotes, setQuotes] = useState<StockQuote[]>(generateInitialQuotes(symbols));
  const [columns, setColumns] = useState<ColumnCount>(5);
  const [sortBy, setSortBy] = useState<SortOption>('changePercent_desc');
  const [isConnected, setIsConnected] = useState(false);
  const [globalChartType, setGlobalChartType] = useState<ChartType>('line'); // ✅ 默认折线图
  const [globalTimeframe, setGlobalTimeframe] = useState<Interval>('5');
  const [globalTimeRange, setGlobalTimeRange] = useState<TimeRange>('1Y'); // ✅ 默认1年

  // 使用TradingView widgets显示实时数据，无需手动获取报价
  useEffect(() => {
    // TradingView widgets会自动处理实时数据更新
    console.log('[StockGridController] 使用TradingView widgets显示实时数据');
    setIsConnected(true);

    return () => {
      setIsConnected(false);
    };
  }, [symbols]);

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
            />
          ))}
        </div>
      )}
    </div>
  );
}
