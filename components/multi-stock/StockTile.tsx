'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import TradingViewMiniChart, { ChartType, Interval, TimeRange } from './TradingViewMiniChart';
import { TrendingUp, TrendingDown, X } from 'lucide-react';
import type { StockQuote } from '@/lib/types/multi-stock.types';
import { useState, useTransition } from 'react';
import { removeFromWatchlist } from '@/lib/actions/watchlist.actions';
import { toast } from 'sonner';

interface StockTileProps {
  quote: StockQuote;
  chartType: ChartType;
  timeframe: Interval;
  timeRange: TimeRange;
  userId?: string;
  onRemove?: (symbol: string) => void;
  onClick?: () => void;
}

export default function StockTile({ 
  quote, 
  chartType, 
  timeframe, 
  timeRange, 
  userId,
  onRemove,
  onClick 
}: StockTileProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showRemoveButton, setShowRemoveButton] = useState(false);
  const isPositive = quote.changePercent >= 0;
  const isFlat = quote.changePercent === 0;

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default: Navigate to stock detail page
      router.push(`/stocks/${quote.symbol}`);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发卡片点击
    
    if (!userId) {
      toast.error('请先登录');
      return;
    }

    if (!confirm(`确定要从自选列表移除 ${quote.symbol} 吗？`)) {
      return;
    }

    startTransition(async () => {
      const result = await removeFromWatchlist(userId, quote.symbol);
      
      if (result.success) {
        toast.success(`已移除 ${quote.symbol}`);
        onRemove?.(quote.symbol);
      } else {
        toast.error(result.error || '移除失败');
      }
    });
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-lg',
        'border-gray-700 bg-gray-800/50 backdrop-blur-sm overflow-hidden',
        'flex flex-col relative group'
      )}
      onClick={handleCardClick}
      onMouseEnter={() => setShowRemoveButton(true)}
      onMouseLeave={() => setShowRemoveButton(false)}
    >
      {/* 删除按钮 - 悬停显示 */}
      {userId && (showRemoveButton || isPending) && (
        <button
          onClick={handleRemove}
          disabled={isPending}
          className={cn(
            'absolute top-2 right-2 z-10',
            'bg-red-500/90 hover:bg-red-600 text-white',
            'rounded-full p-1.5 shadow-lg',
            'transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title={`移除 ${quote.symbol}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}

      <CardContent className="p-0 flex flex-col flex-1">
        {/* Header: Symbol, Price & Change */}
        <div className="flex justify-between items-center py-1 px-2 border-b border-gray-700/50">
          <h3 className="text-xs font-bold text-gray-100">{quote.symbol}</h3>
          <div className="flex items-center gap-2">
            <div className="text-xs font-bold text-gray-100">
              ${quote.price.toFixed(2)}
            </div>
            <div
              className={cn(
                'flex items-center gap-0.5 text-[10px] font-medium',
                isPositive && !isFlat && 'text-green-400',
                !isPositive && !isFlat && 'text-red-400',
                isFlat && 'text-gray-400'
              )}
            >
              {isPositive && !isFlat && <TrendingUp className="h-3 w-3" />}
              {!isPositive && !isFlat && <TrendingDown className="h-3 w-3" />}
              <span>{isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* TradingView Chart */}
        <div className="flex-1 overflow-hidden bg-gray-900/50">
          <TradingViewMiniChart
            symbol={quote.symbol}
            chartType={chartType}
            interval={timeframe}
            timeRange={timeRange}
            height={450}
          />
        </div>
      </CardContent>
    </Card>
  );
}

