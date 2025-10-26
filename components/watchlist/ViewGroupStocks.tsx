'use client';

import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, X, TrendingUp, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { removeFromWatchlist } from '@/lib/actions/watchlist.actions';
import { cn } from '@/lib/utils';

interface ViewGroupStocksProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  stocks: Array<{ symbol: string; company: string }>;
  userId: string;
  onStockRemoved?: () => void;
}

export default function ViewGroupStocks({
  open,
  onOpenChange,
  groupId,
  groupName,
  stocks,
  userId,
  onStockRemoved,
}: ViewGroupStocksProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set());

  // 切换选择
  const toggleStockSelection = (symbol: string) => {
    const newSelected = new Set(selectedStocks);
    if (newSelected.has(symbol)) {
      newSelected.delete(symbol);
    } else {
      newSelected.add(symbol);
    }
    setSelectedStocks(newSelected);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedStocks.size === stocks.length) {
      setSelectedStocks(new Set());
    } else {
      setSelectedStocks(new Set(stocks.map(s => s.symbol)));
    }
  };

  // 删除单个股票（只从当前分组删除）
  const handleRemoveStock = (symbol: string, company: string) => {
    if (!confirm(`确定要将 ${symbol} (${company}) 从 ${groupName} 中移除吗？`)) {
      return;
    }

    startTransition(async () => {
      const result = await removeFromWatchlist(userId, symbol, groupId);
      
      if (result.success) {
        toast.success(`已从 ${groupName} 移除 ${symbol}`);
        onStockRemoved?.();
      } else {
        toast.error(result.error || '删除失败');
      }
    });
  };

  // 批量删除选中的股票（只从当前分组删除）
  const handleBatchRemove = () => {
    if (selectedStocks.size === 0) {
      toast.error('请先选择要删除的股票');
      return;
    }

    const selectedCount = selectedStocks.size;
    if (!confirm(`确定要将选中的 ${selectedCount} 支股票从 ${groupName} 中移除吗？`)) {
      return;
    }

    startTransition(async () => {
      let successCount = 0;
      let failCount = 0;

      for (const symbol of selectedStocks) {
        const result = await removeFromWatchlist(userId, symbol, groupId);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`已从 ${groupName} 移除 ${successCount} 支股票`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} 支股票移除失败`);
      }

      setSelectedStocks(new Set());
      onStockRemoved?.();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>管理 {groupName} 中的股票</DialogTitle>
          <DialogDescription>
            查看和删除分组中的股票
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 工具栏 */}
          {stocks.length > 0 && (
            <div className="flex items-center justify-between border-b border-gray-700 pb-2">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <TrendingUp className="h-4 w-4" />
                <span>共 {stocks.length} 支股票</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                  disabled={isPending}
                >
                  {selectedStocks.size === stocks.length ? '取消全选' : '全选'}
                </Button>
                {selectedStocks.size > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleBatchRemove}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    删除选中 ({selectedStocks.size})
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* 股票列表 */}
          {stocks.length > 0 ? (
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {stocks.map((stock) => {
                const isSelected = selectedStocks.has(stock.symbol);
                return (
                  <div
                    key={stock.symbol}
                    className={cn(
                      'flex items-center gap-3 p-3 border rounded-lg transition-colors',
                      isSelected
                        ? 'bg-teal-600/20 border-teal-600'
                        : 'bg-gray-800/50 border-gray-700'
                    )}
                  >
                    {/* 多选框 */}
                    <button
                      onClick={() => toggleStockSelection(stock.symbol)}
                      disabled={isPending}
                      className="flex-shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-5 w-5 text-teal-400" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                      )}
                    </button>

                    {/* 股票信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-100">
                        {stock.symbol}
                      </div>
                      <div className="text-sm text-gray-400 truncate">
                        {stock.company}
                      </div>
                    </div>

                    {/* 删除按钮 */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveStock(stock.symbol, stock.company)}
                      disabled={isPending}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10 flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-lg mb-1">此分组中还没有股票</p>
              <p className="text-sm">点击"添加股票"按钮开始添加</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

