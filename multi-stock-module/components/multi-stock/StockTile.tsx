'use client';

import { StockQuote } from '@/lib/actions/multi-stock.actions';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import TradingViewMiniChart, { ChartType, Interval, TimeRange } from './TradingViewMiniChart';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StockTileProps {
  quote: StockQuote;
  chartType: ChartType;
  timeframe: Interval;
  timeRange: TimeRange;
  onClick?: () => void;
}

export default function StockTile({ quote, chartType, timeframe, timeRange, onClick }: StockTileProps) {
  const router = useRouter();
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

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-lg',
        'border-gray-700 bg-gray-800/50 backdrop-blur-sm overflow-hidden',
        'flex flex-col'
      )}
      onClick={handleCardClick}
    >
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

        {/* TradingView Chart - Fully Stretched */}
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
