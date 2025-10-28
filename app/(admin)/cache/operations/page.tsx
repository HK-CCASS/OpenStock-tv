'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, Trash2, Download, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

/**
 * Cache Operations Tab - Manual Cache Management
 *
 * Provides tools for manual cache operations including refresh,
 * clear, and export functions.
 */

export default function OperationsTab() {
  const [refreshSymbols, setRefreshSymbols] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // TODO: Implement refresh logic
    setTimeout(() => {
      setIsRefreshing(false);
    }, 2000);
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
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? '刷新中...' : '刷新指定股票'}
              </Button>

              <Button
                variant="outline"
                className="border-[#2a2a2a] text-gray-400"
                disabled={isRefreshing}
              >
                刷新过期记录
              </Button>

              <Button
                variant="outline"
                className="border-[#2a2a2a] text-gray-400"
                disabled={isRefreshing}
              >
                按源刷新 (Yahoo)
              </Button>

              <Button
                variant="outline"
                className="border-[#2a2a2a] text-gray-400"
                disabled={isRefreshing}
              >
                按源刷新 (Finnhub)
              </Button>

              <Button
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
                disabled={isRefreshing}
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
            >
              <Trash2 className="h-4 w-4 mr-2" />
              清空 Redis 缓存
            </Button>

            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              清空 MongoDB 缓存
            </Button>

            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              清空过期记录
            </Button>

            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              清空指定股票
            </Button>

            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
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
            >
              <div className="text-center">
                <Download className="h-6 w-6 mx-auto mb-2" />
                <div>导出全部</div>
                <div className="text-xs text-gray-500">CSV 格式</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="border-[#2a2a2a] text-gray-400 h-20"
            >
              <div className="text-center">
                <Download className="h-6 w-6 mx-auto mb-2" />
                <div>导出过期</div>
                <div className="text-xs text-gray-500">JSON 格式</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="border-[#2a2a2a] text-gray-400 h-20"
            >
              <div className="text-center">
                <Download className="h-6 w-6 mx-auto mb-2" />
                <div>导出指定源</div>
                <div className="text-xs text-gray-500">Excel 格式</div>
              </div>
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
