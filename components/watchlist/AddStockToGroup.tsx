'use client';

import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Plus, CheckSquare, Square, List } from 'lucide-react';
import { toast } from 'sonner';
import { addToWatchlist } from '@/lib/actions/watchlist.actions';
import { searchStocks } from '@/lib/actions/finnhub.actions';
import { cn } from '@/lib/utils';

interface AddStockToGroupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  userId: string;
  onStockAdded?: () => void;
}

export default function AddStockToGroup({
  open,
  onOpenChange,
  groupId,
  groupName,
  userId,
  onStockAdded,
}: AddStockToGroupProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [batchInput, setBatchInput] = useState('');

  // 搜索股票
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('请输入股票代码或名称');
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchStocks(searchQuery.trim());
      
      if (results && results.length > 0) {
        // 转换为我们需要的格式
        const formattedResults = results
          .filter((r: any) => r.type === 'Common Stock' || r.type === 'ETP')
          .slice(0, 10)
          .map((r: any) => ({
            symbol: r.symbol || r.displaySymbol,
            name: r.description || r.symbol,
          }));
        
        setSearchResults(formattedResults);
        
        if (formattedResults.length === 0) {
          toast.info('未找到匹配的股票');
        }
      } else {
        setSearchResults([]);
        toast.info('未找到匹配的股票');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('搜索失败，请重试');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 切换股票选择
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
    if (selectedStocks.size === searchResults.length) {
      setSelectedStocks(new Set());
    } else {
      setSelectedStocks(new Set(searchResults.map(s => s.symbol)));
    }
  };

  // 添加单个股票
  const handleAddStock = (symbol: string, name: string) => {
    startTransition(async () => {
      const result = await addToWatchlist(userId, symbol, name, groupId);
      
      if (result.success) {
        toast.success(`已添加 ${symbol} 到 ${groupName}`);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedStocks(new Set());
        onStockAdded?.();
      } else {
        toast.error(result.error || '添加失败');
      }
    });
  };

  // 批量添加选中的股票
  const handleAddSelectedStocks = () => {
    if (selectedStocks.size === 0) {
      toast.error('请先选择要添加的股票');
      return;
    }

    startTransition(async () => {
      const selectedResults = searchResults.filter(s => selectedStocks.has(s.symbol));
      let successCount = 0;
      let failCount = 0;

      for (const stock of selectedResults) {
        const result = await addToWatchlist(userId, stock.symbol, stock.name, groupId);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`成功添加 ${successCount} 支股票到 ${groupName}`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} 支股票添加失败`);
      }

      setSearchQuery('');
      setSearchResults([]);
      setSelectedStocks(new Set());
      onStockAdded?.();
    });
  };

  // 批量输入处理
  const handleBatchAdd = () => {
    if (!batchInput.trim()) {
      toast.error('请输入股票代码');
      return;
    }

    startTransition(async () => {
      // 解析输入（支持逗号、空格、换行分隔）
      const symbols = batchInput
        .split(/[\s,\n]+/)
        .map(s => s.trim().toUpperCase())
        .filter(s => s.length > 0);

      if (symbols.length === 0) {
        toast.error('未找到有效的股票代码');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const symbol of symbols) {
        // 使用symbol作为company name（后续可以优化为查询真实名称）
        const result = await addToWatchlist(userId, symbol, symbol, groupId);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`成功添加 ${successCount} 支股票到 ${groupName}`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} 支股票添加失败（可能重复或不存在）`);
      }

      setBatchInput('');
      setBatchMode(false);
      onStockAdded?.();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>添加股票到 {groupName}</DialogTitle>
          <DialogDescription>
            搜索并选择要添加到此分组的股票
          </DialogDescription>
        </DialogHeader>

        {/* 模式切换 */}
        <div className="flex gap-2 border-b border-gray-700 pb-2">
          <Button
            variant={!batchMode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setBatchMode(false);
              setBatchInput('');
            }}
            className={cn(
              !batchMode && 'bg-teal-600 hover:bg-teal-700'
            )}
          >
            <Search className="h-4 w-4 mr-2" />
            搜索添加
          </Button>
          <Button
            variant={batchMode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setBatchMode(true);
              setSearchResults([]);
              setSelectedStocks(new Set());
            }}
            className={cn(
              batchMode && 'bg-teal-600 hover:bg-teal-700'
            )}
          >
            <List className="h-4 w-4 mr-2" />
            批量输入
          </Button>
        </div>

        <div className="space-y-4">
          {/* 搜索模式 */}
          {!batchMode && (
            <>
              {/* 搜索框 */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="stock-search" className="sr-only">
                    搜索股票
                  </Label>
                  <Input
                    id="stock-search"
                    placeholder="输入股票代码或名称（如 AAPL, Tesla）"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                    disabled={isSearching || isPending}
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={isSearching || isPending}
                >
                  <Search className="h-4 w-4 mr-2" />
                  搜索
                </Button>
              </div>

              {/* 搜索结果 - 多选模式 */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-gray-400">
                      搜索结果（可多选）
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleSelectAll}
                        disabled={isPending}
                      >
                        {selectedStocks.size === searchResults.length ? '取消全选' : '全选'}
                      </Button>
                      {selectedStocks.size > 0 && (
                        <Button
                          size="sm"
                          onClick={handleAddSelectedStocks}
                          disabled={isPending}
                          className="bg-teal-600 hover:bg-teal-700"
                        >
                          添加选中 ({selectedStocks.size})
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {searchResults.map((stock) => {
                      const isSelected = selectedStocks.has(stock.symbol);
                      return (
                        <button
                          key={stock.symbol}
                          onClick={() => toggleStockSelection(stock.symbol)}
                          disabled={isPending}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 border rounded-lg transition-colors text-left disabled:opacity-50',
                            isSelected
                              ? 'bg-teal-600/20 border-teal-600 hover:bg-teal-600/30'
                              : 'bg-gray-800/50 border-gray-700 hover:bg-gray-700/50'
                          )}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-teal-400 flex-shrink-0" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-100">
                              {stock.symbol}
                            </div>
                            <div className="text-sm text-gray-400 truncate">
                              {stock.name}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 批量输入模式 */}
          {batchMode && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="batch-input">
                  批量输入股票代码
                </Label>
                <textarea
                  id="batch-input"
                  className="w-full min-h-[200px] p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="输入股票代码，支持多种分隔符：&#10;&#10;逗号分隔：AAPL, GOOGL, MSFT, TSLA&#10;空格分隔：AAPL GOOGL MSFT TSLA&#10;换行分隔：&#10;AAPL&#10;GOOGL&#10;MSFT&#10;TSLA"
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  disabled={isPending}
                />
                <p className="text-xs text-gray-400">
                  💡 提示：可以使用逗号、空格或换行符分隔多个股票代码
                </p>
              </div>
              <Button
                onClick={handleBatchAdd}
                disabled={isPending || !batchInput.trim()}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                批量添加
              </Button>
            </div>
          )}

          {/* 加载状态 */}
          {!batchMode && isSearching && (
            <div className="text-center py-8 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto mb-2"></div>
              <p className="text-sm">搜索中...</p>
            </div>
          )}

          {/* 空状态 */}
          {!batchMode && !isSearching && searchResults.length === 0 && !searchQuery && (
            <div className="text-center py-8 text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">输入股票代码或名称开始搜索</p>
              <p className="text-xs mt-2">或切换到批量输入模式</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

