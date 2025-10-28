'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Trash2, Download, AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';

/**
 * Cache Operations Tab - Manual Cache Management
 *
 * Provides tools for manual cache operations including refresh,
 * clear, and export functions.
 */

export default function OperationsTab() {
  const [refreshSymbols, setRefreshSymbols] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleRefresh = async () => {
    if (!refreshSymbols) {
      alert('请输入股票代码');
      return;
    }

    setIsRefreshing(true);
    try {
      const symbols = refreshSymbols.split(',').map(s => s.trim()).filter(Boolean);

      const response = await fetch('/api/admin/cache/operations/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'refresh',
          symbols,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to refresh cache');
      }

      alert('缓存刷新任务已启动，请稍后查看结果');
      setRefreshSymbols('');
    } catch (error) {
      console.error('Refresh error:', error);
      alert('刷新失败: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearCache = async (type: string, params?: any) => {
    if (!confirm(`确定要执行"${type}"操作吗？此操作不可撤销！`)) {
      return;
    }

    setIsClearing(true);
    try {
      const response = await fetch('/api/admin/cache/operations/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params || {}),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to clear cache');
      }

      alert(`缓存清理成功！已清理 ${result.data?.totalCleared || 0} 条记录`);
    } catch (error) {
      console.error('Clear cache error:', error);
      alert('清理失败: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsClearing(false);
    }
  };

  const handleExport = async (type: string) => {
    setIsExporting(true);
    try {
      let format = 'csv';
      let url = `/api/admin/cache/export?type=${type}&format=${format}`;

      if (type === 'expired') {
        format = 'json';
        url = `/api/admin/cache/export?type=${type}&format=${format}`;
      } else if (type === 'bySource') {
        format = 'excel';
        const source = prompt('请输入数据源 (yahoo/finnhub/fallback):');
        if (!source) {
          setIsExporting(false);
          return;
        }
        url = `/api/admin/cache/export?type=${type}&format=${format}&source=${source}`;
      }

      // Create download link
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${type}_cache_data.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      alert('导出成功！');
    } catch (error) {
      console.error('Export error:', error);
      alert('导出失败: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Refresh Operations */}
      <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            缓存刷新
          </CardTitle>
          <CardDescription className="text-gray-400">
            手动刷新缓存数据，触发数据源回退链
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {/* Single Symbol Refresh */}
            <div className="space-y-2">
              <Label htmlFor="symbols" className="text-gray-300">
                股票代码 (逗号分隔)
              </Label>
              <Input
                id="symbols"
                placeholder="AAPL,MSFT,GOOGL"
                value={refreshSymbols}
                onChange={(e) => setRefreshSymbols(e.target.value)}
                className="bg-[#262626] border-[#2a2a2a] text-white"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4 pt-4">
              <Button
                onClick={handleRefresh}
                disabled={!refreshSymbols || isRefreshing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {isRefreshing ? '刷新中...' : '刷新指定股票'}
              </Button>

              <Button
                variant="outline"
                className="border-[#2a2a2a] text-gray-400"
                disabled={isRefreshing}
                onClick={() => handleClearCache('清理过期记录', { mongodb: true, expired: true })}
              >
                刷新过期记录
              </Button>

              <Button
                variant="outline"
                className="border-[#2a2a2a] text-gray-400"
                disabled={isRefreshing}
                onClick={() => handleClearCache('按源清理 (Yahoo)', { mongodb: true, bySource: 'yahoo' })}
              >
                按源刷新 (Yahoo)
              </Button>

              <Button
                variant="outline"
                className="border-[#2a2a2a] text-gray-400"
                disabled={isRefreshing}
                onClick={() => handleClearCache('按源清理 (Finnhub)', { mongodb: true, bySource: 'finnhub' })}
              >
                按源刷新 (Finnhub)
              </Button>

              <Button
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
                disabled={isRefreshing || isClearing}
                onClick={() => handleClearCache('清理所有缓存', { mongodb: true, redis: true })}
              >
                刷新所有缓存
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clear Operations */}
      <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            缓存清理
          </CardTitle>
          <CardDescription className="text-gray-400">
            清空缓存数据 - 此操作不可逆转！
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-yellow-400 font-medium mb-1">警告：危险操作</p>
              <p className="text-gray-400">
                清空操作将永久删除缓存数据，请谨慎操作。建议先导出数据备份。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-4">
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              disabled={isClearing}
              onClick={() => handleClearCache('清空 Redis 缓存', { redis: true })}
            >
              {isClearing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              清空 Redis 缓存
            </Button>

            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              disabled={isClearing}
              onClick={() => handleClearCache('清空 MongoDB 缓存', { mongodb: true })}
            >
              {isClearing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              清空 MongoDB 缓存
            </Button>

            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              disabled={isClearing}
              onClick={() => handleClearCache('清空过期记录', { mongodb: true, expired: true })}
            >
              {isClearing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              清空过期记录
            </Button>

            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              disabled={isClearing}
              onClick={() => {
                const symbols = prompt('请输入要清空的股票代码（逗号分隔）');
                if (symbols) {
                  const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean);
                  handleClearCache('清空指定股票', { mongodb: true, symbols: symbolList });
                }
              }}
            >
              {isClearing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              清空指定股票
            </Button>

            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              disabled={isClearing}
              onClick={() => handleClearCache('清空所有缓存', { mongodb: true, redis: true })}
            >
              {isClearing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              清空所有缓存
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Operations */}
      <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Download className="h-5 w-5" />
            数据导出
          </CardTitle>
          <CardDescription className="text-gray-400">
            导出缓存数据用于备份或分析
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="border-[#2a2a2a] text-gray-400 h-20"
              disabled={isExporting}
              onClick={() => handleExport('all')}
            >
              {isExporting ? (
                <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
              ) : (
                <Download className="h-6 w-6 mx-auto mb-2" />
              )}
              <div>导出全部</div>
              <div className="text-xs text-gray-500">CSV 格式</div>
            </Button>

            <Button
              variant="outline"
              className="border-[#2a2a2a] text-gray-400 h-20"
              disabled={isExporting}
              onClick={() => handleExport('expired')}
            >
              {isExporting ? (
                <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
              ) : (
                <Download className="h-6 w-6 mx-auto mb-2" />
              )}
              <div>导出过期</div>
              <div className="text-xs text-gray-500">JSON 格式</div>
            </Button>

            <Button
              variant="outline"
              className="border-[#2a2a2a] text-gray-400 h-20"
              disabled={isExporting}
              onClick={() => handleExport('bySource')}
            >
              {isExporting ? (
                <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
              ) : (
                <Download className="h-6 w-6 mx-auto mb-2" />
              )}
              <div>导出指定源</div>
              <div className="text-xs text-gray-500">Excel 格式</div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Operation History */}
      <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white">操作历史</CardTitle>
          <CardDescription className="text-gray-400">
            最近10次缓存操作记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm text-gray-500">暂无操作记录</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
