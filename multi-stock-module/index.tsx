import React from 'react';
import StockGridController from './components/multi-stock/StockGridController';
import type { WatchlistInfo, StockQuote } from './lib/types';

/**
 * 多股同列组件入口
 *
 * @example 基本用法
 * ```tsx
 * import MultiStockModule from 'multi-stock-module';
 *
 * const symbols = [
 *   { symbol: 'AAPL', company: 'Apple Inc.' },
 *   { symbol: 'GOOGL', company: 'Alphabet Inc.' },
 *   { symbol: 'MSFT', company: 'Microsoft Corporation' }
 * ];
 *
 * const watchlists = [
 *   { id: 1, name: '科技股', symbolCount: 3, category: '科技', is_system: true, is_active: true, created_at: '', updated_at: '', symbols: ['AAPL', 'GOOGL', 'MSFT'] }
 * ];
 *
 * <MultiStockModule
 *   symbols={symbols}
 *   watchlists={watchlists}
 *   currentWatchlistId="1"
 * />
 * ```
 */

export interface MultiStockModuleProps {
  /** 股票数据数组 */
  symbols: Array<{ symbol: string; company: string }>;
  /** 可用的watchlist列表 */
  watchlists: WatchlistInfo[];
  /** 当前watchlist ID */
  currentWatchlistId: string;
}

/**
 * 多股同列组件
 * 支持实时监控多支股票，灵活布局和智能排序
 */
export default function MultiStockModule({
  symbols,
  watchlists,
  currentWatchlistId,
}: MultiStockModuleProps) {
  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">多股同列</h1>
        <p className="text-muted-foreground">
          实时监控多支股票，支持灵活布局和智能排序
        </p>
      </div>

      <StockGridController
        symbols={symbols}
        watchlists={watchlists}
        currentWatchlistId={currentWatchlistId}
      />
    </div>
  );
}

// 导出所有子组件，方便高级用户自定义
export { default as StockGridController } from './components/multi-stock/StockGridController';
export { default as StockTile } from './components/multi-stock/StockTile';
export { default as LayoutControls } from './components/multi-stock/LayoutControls';
export { default as TradingViewMiniChart } from './components/multi-stock/TradingViewMiniChart';
export { default as TradingViewQuote } from './components/multi-stock/TradingViewQuote';

// 导出类型定义
export type {
  StockQuote,
  WatchlistInfo,
  WatchlistDetail,
  ApiResponse,
  SortOption,
  ColumnCount,
  ChartType,
  Interval,
  TimeRange,
  StockDataFormat,
  HeatmapData,
} from './lib/types';

// 导出工具函数
export { cn } from './lib/utils';