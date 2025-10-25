'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LayoutGrid, BarChart3, LineChart, AreaChart, CandlestickChart, Calendar, ArrowUpDown, List } from 'lucide-react';
import { ChartType, Interval, TimeRange } from './TradingViewMiniChart';
import { useRouter } from 'next/navigation';

export type ColumnCount = 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type SortOption =
  | 'changePercent_desc'
  | 'changePercent_asc'
  | 'price_desc'
  | 'price_asc'
  | 'volume_desc'
  | 'symbol_asc';

export interface WatchlistInfo {
  id: string;
  name: string;
  symbolCount: number;
}

interface LayoutControlsProps {
  columns: ColumnCount;
  sortBy: SortOption;
  chartType: ChartType;
  timeframe: Interval;
  timeRange: TimeRange;
  watchlists: WatchlistInfo[];
  currentWatchlistId: string;
  onColumnsChange: (columns: ColumnCount) => void;
  onSortChange: (sort: SortOption) => void;
  onChartTypeChange: (type: ChartType) => void;
  onTimeframeChange: (interval: Interval) => void;
  onTimeRangeChange: (range: TimeRange) => void;
}

const columnOptions: { value: ColumnCount; label: string }[] = [
  { value: 2, label: '2 列' },
  { value: 3, label: '3 列' },
  { value: 4, label: '4 列' },
  { value: 5, label: '5 列' },
  { value: 6, label: '6 列' },
  { value: 7, label: '7 列' },
  { value: 8, label: '8 列' },
];

const chartTypeOptions: Array<{ value: ChartType; label: string; icon: React.ReactNode }> = [
  { value: 'area', label: '面积图', icon: <AreaChart className="h-4 w-4" /> },
  { value: 'line', label: '折线图', icon: <LineChart className="h-4 w-4" /> },
  { value: 'candles', label: 'K线图', icon: <CandlestickChart className="h-4 w-4" /> },
  { value: 'bars', label: '柱状图', icon: <BarChart3 className="h-4 w-4" /> },
];

const timeRangeOptions: Array<{ value: TimeRange; label: string }> = [
  { value: '1M', label: '1个月' },
  { value: '3M', label: '3个月' },
  { value: '6M', label: '6个月' },
  { value: '1Y', label: '1年' },
  { value: '3Y', label: '3年' },
  { value: '5Y', label: '5年' },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'changePercent_desc', label: '涨幅 ↓' },
  { value: 'changePercent_asc', label: '涨幅 ↑' },
  { value: 'price_desc', label: '价格 ↓' },
  { value: 'price_asc', label: '价格 ↑' },
  { value: 'volume_desc', label: '成交量 ↓' },
  { value: 'symbol_asc', label: '代码 A-Z' },
];

export default function LayoutControls({
  columns,
  sortBy,
  chartType,
  timeframe,
  timeRange,
  watchlists,
  currentWatchlistId,
  onColumnsChange,
  onSortChange,
  onChartTypeChange,
  onTimeframeChange,
  onTimeRangeChange,
}: LayoutControlsProps) {
  const router = useRouter();

  const handleWatchlistChange = (watchlistId: string) => {
    console.log('📋 LayoutControls: 切换到 watchlist:', watchlistId);
    // URL encode the watchlist ID to handle Chinese characters
    router.push(`/multi-stock/${encodeURIComponent(watchlistId)}`);
  };

  // Get the current watchlist name for display
  const currentWatchlist = watchlists.find(w => w.id === currentWatchlistId);
  const displayName = currentWatchlist?.name || '选择股票池';

  // 添加调试日志
  console.log('🔍 LayoutControls render:', {
    currentWatchlistId,
    displayName,
    watchlistsCount: watchlists.length,
    allWatchlistIds: watchlists.map(w => w.id),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
        {/* Watchlist Selector */}
        {watchlists && watchlists.length > 0 && (
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-gray-400" />
            <Select
              value={currentWatchlistId}
              onValueChange={handleWatchlistChange}
            >
              <SelectTrigger className="w-[200px] bg-gray-700 border-gray-600 text-gray-100">
                <span className="flex-1 truncate text-left">{displayName}</span>
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 max-h-[400px]">
                {watchlists.map((watchlist) => (
                  <SelectItem
                    key={watchlist.id}
                    value={watchlist.id}
                    className="text-gray-100 hover:bg-gray-700 focus:bg-gray-700"
                  >
                    {watchlist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Column Count Selector */}
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-gray-400" />
          <Select value={columns.toString()} onValueChange={(value) => onColumnsChange(Number(value) as ColumnCount)}>
            <SelectTrigger className="w-[120px] bg-gray-700 border-gray-600 text-gray-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {columnOptions.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-gray-400" />
          <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
            <SelectTrigger className="w-[110px] bg-gray-700 border-gray-600 text-gray-100 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {sortOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-gray-100 hover:bg-gray-700 focus:bg-gray-700"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <Select value={timeRange} onValueChange={(value) => onTimeRangeChange(value as TimeRange)}>
            <SelectTrigger className="w-[110px] bg-gray-700 border-gray-600 text-gray-100 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {timeRangeOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-gray-100 hover:bg-gray-700 focus:bg-gray-700"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Global Chart Type Selector */}
        <div className="flex items-center gap-2">
          <Select value={chartType} onValueChange={onChartTypeChange}>
            <SelectTrigger className="w-[120px] bg-gray-700 border-gray-600 text-gray-100 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {chartTypeOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-gray-100 hover:bg-gray-700 focus:bg-gray-700"
                >
                  <div className="flex items-center gap-2">
                    {option.icon}
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quick Column Buttons (Desktop Only) */}
        <div className="hidden md:flex items-center gap-1 ml-auto">
          {[2, 3, 4, 5, 6, 7, 8].map((col) => (
            <Button
              key={col}
              variant={columns === col ? 'default' : 'outline'}
              size="sm"
              onClick={() => onColumnsChange(col as ColumnCount)}
              className={
                columns === col
                  ? 'bg-teal-600 hover:bg-teal-700'
                  : 'bg-gray-700 hover:bg-gray-600 border-gray-600'
              }
            >
              {col}
            </Button>
          ))}
        </div>
      </div>

    </div>
  );
}
