'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CacheDetailsDrawer } from '@/components/admin/cache-details-drawer';
import { useCacheStream } from '@/hooks/use-cache-stream';
import { Search, Filter, Download, Loader2, ChevronLeft, ChevronRight, Edit, Trash2, Wifi, WifiOff } from 'lucide-react';

interface CacheDataItem {
  symbol: string;
  marketCap: number;
  price: number;
  source: string;
  lastUpdated: string;
  validUntil: string;
  status: 'valid' | 'expired' | 'expiring_soon';
}

interface PaginatedCacheData {
  items: CacheDataItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Data Management Tab - Cache Data CRUD
 *
 * Provides tools for viewing, editing, and managing cache entries
 * including search, filtering, batch operations, and export.
 */

export default function DataTab() {
  const [data, setData] = useState<PaginatedCacheData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Drawer state
  const [selectedItem, setSelectedItem] = useState<CacheDataItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Batch operations state
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);

  // Use SSE for real-time updates
  const { connected } = useCacheStream(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
      });

      if (search) params.append('search', search);
      if (sourceFilter && sourceFilter !== 'all') params.append('source', sourceFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/admin/cache/data?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh data when connected or filters change
  useEffect(() => {
    fetchData();
  }, [currentPage, search, sourceFilter, statusFilter, connected]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-green-500/20 text-green-400">有效</Badge>;
      case 'expired':
        return <Badge className="bg-red-500/20 text-red-400">过期</Badge>;
      case 'expiring_soon':
        return <Badge className="bg-yellow-500/20 text-yellow-400">即将过期</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400">未知</Badge>;
    }
  };

  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleEdit = (item: CacheDataItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const handleSave = async (symbol: string, data: Partial<CacheDataItem>) => {
    try {
      const response = await fetch('/api/admin/cache/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol, data }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update cache entry');
      }

      // Refresh data after successful update
      await fetchData();
    } catch (error) {
      console.error('Failed to save cache entry:', error);
      throw error;
    }
  };

  // Batch operations handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked && data) {
      setSelectedSymbols(data.items.map((item) => item.symbol));
    } else {
      setSelectedSymbols([]);
    }
  };

  const handleSelectItem = (symbol: string, checked: boolean) => {
    if (checked) {
      setSelectedSymbols([...selectedSymbols, symbol]);
    } else {
      setSelectedSymbols(selectedSymbols.filter((s) => s !== symbol));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedSymbols.length === 0) {
      alert('请先选择要删除的项目');
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedSymbols.length} 个项目吗？`)) {
      return;
    }

    try {
      // Log audit event before operation
      const { extractClientInfo, logAuditEntry, AUDIT_ACTIONS } = await import('@/lib/utils/audit-logger');
      const clientInfo = extractClientInfo(window);

      await logAuditEntry({
        userId: 'current-user', // In real app, get from auth
        userEmail: 'current@example.com',
        action: AUDIT_ACTIONS.CACHE_BATCH_DELETE,
        resource: 'cache',
        target: selectedSymbols.join(','),
        details: { symbolCount: selectedSymbols.length },
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        status: 'success',
      });

      const response = await fetch('/api/admin/cache/operations/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          symbols: selectedSymbols,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete cache entries');
      }

      setSelectedSymbols([]);
      await fetchData();
      alert('批量删除成功');
    } catch (error) {
      console.error('Failed to batch delete:', error);
      alert('批量删除失败，请重试');
    }
  };

  const handleBatchRefresh = async () => {
    if (selectedSymbols.length === 0) {
      alert('请先选择要刷新的项目');
      return;
    }

    try {
      const response = await fetch('/api/admin/cache/operations/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'refresh',
          symbols: selectedSymbols,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to refresh cache entries');
      }

      alert('批量刷新任务已启动，请稍后查看结果');
    } catch (error) {
      console.error('Failed to batch refresh:', error);
      alert('批量刷新失败，请重试');
    }
  };

  const handleClearBySource = async () => {
    if (!sourceFilter || sourceFilter === 'all') {
      alert('请先选择具体的数据源（不能选择"全部源"）');
      return;
    }

    if (
      !confirm(
        `确定要清理所有来自 "${sourceFilter}" 的缓存数据吗？此操作不可撤销！`
      )
    ) {
      return;
    }

    try {
      const response = await fetch('/api/admin/cache/operations/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mongodb: true,
          redis: true,
          bySource: sourceFilter,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to clear cache');
      }

      await fetchData();
      alert(`已清理 ${result.data.totalCleared} 条 ${sourceFilter} 缓存记录`);
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('清理缓存失败，请重试');
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-400">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real-time Status Bar */}
      <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
        <CardContent className="py-2">
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-2">
              {connected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-green-400 text-xs">实时</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-400 text-xs">离线</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls Bar */}
      <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white">缓存数据管理</CardTitle>
          <CardDescription className="text-gray-400">
            查看、编辑和管理市值缓存数据
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="搜索股票代码..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-[#262626] border-[#2a2a2a] text-white"
              />
            </div>

            {/* Source Filter */}
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[180px] bg-[#262626] border-[#2a2a2a] text-white">
                <SelectValue placeholder="数据源" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部源</SelectItem>
                <SelectItem value="yahoo">Yahoo Finance</SelectItem>
                <SelectItem value="finnhub">Finnhub</SelectItem>
                <SelectItem value="fallback">Fallback</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-[#262626] border-[#2a2a2a] text-white">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="valid">有效</SelectItem>
                <SelectItem value="expiring_soon">即将过期</SelectItem>
                <SelectItem value="expired">过期</SelectItem>
              </SelectContent>
            </Select>

            {/* Export */}
            <Button variant="outline" className="border-[#2a2a2a] text-gray-400">
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
          </div>

          {/* Summary */}
          {data && (
            <div className="text-sm text-gray-400">
              共 {data.total.toLocaleString()} 条记录，
              显示第 {data.page} 页，共 {data.totalPages} 页
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white">缓存数据</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">加载失败: {error}</p>
              <Button onClick={fetchData}>重试</Button>
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {loading ? '加载中...' : '暂无数据'}
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2a2a2a]">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium w-12">
                        <input
                          type="checkbox"
                          checked={
                            data &&
                            data.items.length > 0 &&
                            selectedSymbols.length === data.items.length
                          }
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-[#2a2a2a] bg-[#262626] text-blue-600 focus:ring-blue-600"
                        />
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">股票代码</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">价格</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">市值</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">数据源</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">状态</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">更新时间</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">有效期至</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.symbol} className="border-b border-[#2a2a2a] hover:bg-[#262626]">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedSymbols.includes(item.symbol)}
                            onChange={(e) =>
                              handleSelectItem(item.symbol, e.target.checked)
                            }
                            className="rounded border-[#2a2a2a] bg-[#262626] text-blue-600 focus:ring-blue-600"
                          />
                        </td>
                        <td className="py-3 px-4 text-white font-medium">{item.symbol}</td>
                        <td className="py-3 px-4 text-gray-300">${item.price.toFixed(2)}</td>
                        <td className="py-3 px-4 text-gray-300">{formatMarketCap(item.marketCap)}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-[#2a2a2a] text-gray-300 text-xs rounded">
                            {item.source}
                          </span>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                        <td className="py-3 px-4 text-gray-400 text-sm">
                          {formatDate(item.lastUpdated)}
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-sm">
                          {formatDate(item.validUntil)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 border-[#2a2a2a]"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-[#2a2a2a] text-red-400">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-400">
                    第 {data.page} 页，共 {data.totalPages} 页
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1 || loading}
                      className="border-[#2a2a2a] text-gray-400"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(data.totalPages, currentPage + 1))}
                      disabled={currentPage === data.totalPages || loading}
                      className="border-[#2a2a2a] text-gray-400"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Batch Actions */}
      <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white">批量操作</CardTitle>
          <CardDescription className="text-gray-400">
            选择多条记录执行批量操作
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedSymbols.length > 0 && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-blue-400 text-sm">
                已选择 {selectedSymbols.length} 个项目
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-4">
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              onClick={handleBatchDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              批量删除
            </Button>
            <Button
              variant="outline"
              className="border-[#2a2a2a] text-gray-400"
              onClick={handleBatchRefresh}
            >
              批量刷新
            </Button>
            <Button
              variant="outline"
              className="border-[#2a2a2a] text-gray-400"
              onClick={handleClearBySource}
            >
              按源清理
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cache Details Drawer */}
      <CacheDetailsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        item={selectedItem}
        onSave={handleSave}
      />
    </div>
  );
}
