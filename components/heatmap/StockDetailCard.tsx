'use client';

import { X, TrendingUp, TrendingDown, DollarSign, BarChart3, Plus, ExternalLink } from 'lucide-react';
import { useState, useTransition } from 'react';
import { addToWatchlist } from '@/lib/actions/watchlist.actions';
import { toast } from 'sonner';

interface StockData {
  symbol: string;
  name?: string;
  last: number;
  change: number;
  changePercent: number;
  volume?: number;
  category?: string;
  marketCap?: number;
}

interface StockDetailCardProps {
  stock: StockData;
  userId: string;
  onClose: () => void;
}

export function StockDetailCard({ stock, userId, onClose }: StockDetailCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isAdding, setIsAdding] = useState(false);
  
  const isPositive = stock.changePercent >= 0;
  const changeColor = isPositive ? 'text-green-500' : 'text-red-500';
  const changeBgColor = isPositive ? 'bg-green-500/10' : 'bg-red-500/10';
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  
  const handleAddToWatchlist = () => {
    if (isAdding) return;
    
    setIsAdding(true);
    startTransition(async () => {
      try {
        const result = await addToWatchlist(
          userId,
          stock.symbol,
          stock.name || stock.symbol
        );
        
        if (result.success) {
          toast.success(`已添加 ${stock.symbol} 到观察列表`);
        } else {
          toast.error(result.error || '添加失败');
        }
      } catch (error) {
        console.error('Add to watchlist error:', error);
        toast.error('添加失败');
      } finally {
        setIsAdding(false);
      }
    });
  };
  
  const handleViewDetails = () => {
    // 跳转到个股详情页
    window.location.href = `/stocks/${stock.symbol}`;
  };
  
  const handleClickOutside = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleClickOutside}
    >
      <div className="bg-[#1f1f1f] rounded-xl w-full max-w-md shadow-2xl border border-[#2a2a2a] overflow-hidden">
        {/* Header */}
        <div className="bg-[#252525] px-6 py-4 flex justify-between items-start border-b border-[#2a2a2a]">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-1">{stock.symbol}</h2>
            {stock.name && (
              <p className="text-gray-400 text-sm">{stock.name}</p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/5 rounded"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Price Section */}
        <div className="px-6 py-5 bg-[#1a1a1a] border-b border-[#2a2a2a]">
          <div className="flex items-baseline gap-3">
            <div className="text-4xl font-bold text-white">
              ${stock.last.toFixed(2)}
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${changeBgColor}`}>
              <TrendIcon className={`w-4 h-4 ${changeColor}`} />
              <span className={`font-bold ${changeColor}`}>
                {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
              </span>
              <span className={`text-sm ${changeColor}`}>
                ({isPositive ? '+' : ''}{stock.change.toFixed(2)})
              </span>
            </div>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          {/* 市值 */}
          {stock.marketCap && (
            <div className="bg-[#252525] rounded-lg p-4 border border-[#2a2a2a]">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400 text-sm">市值</span>
              </div>
              <div className="text-white font-semibold text-lg">
                ${(stock.marketCap / 1e9).toFixed(2)}B
              </div>
            </div>
          )}
          
          {/* 成交量 */}
          {stock.volume && (
            <div className="bg-[#252525] rounded-lg p-4 border border-[#2a2a2a]">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400 text-sm">成交量</span>
              </div>
              <div className="text-white font-semibold text-lg">
                {(stock.volume / 1000000).toFixed(2)}M
              </div>
            </div>
          )}
          
          {/* 分类 */}
          {stock.category && (
            <div className="bg-[#252525] rounded-lg p-4 border border-[#2a2a2a] col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-gray-400 text-sm">行业分类</span>
              </div>
              <div className="text-white font-semibold">
                {stock.category}
              </div>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="px-6 py-4 flex gap-3 border-t border-[#2a2a2a]">
          <button
            onClick={handleViewDetails}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            查看详情
          </button>
          <button
            onClick={handleAddToWatchlist}
            disabled={isAdding || isPending}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {isAdding ? '添加中...' : '添加到观察列表'}
          </button>
        </div>
      </div>
    </div>
  );
}

