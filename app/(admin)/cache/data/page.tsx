'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Download, Loader2, ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react';

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
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    fetchData();
  }, [currentPage, search, sourceFilter, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
      });

      if (search) params.append('search', search);
      if (sourceFilter) params.append('source', sourceFilter);
      if (statusFilter) params.append('status', statusFilter);

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
                <SelectItem value="">全部源</SelectItem>
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
                <SelectItem value="">全部状态</SelectItem>
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
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-[#2a2a2a]">
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
          <div className="flex flex-wrap gap-4">
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
              <Trash2 className="h-4 w-4 mr-2" />
              批量删除
            </Button>
            <Button variant="outline" className="border-[#2a2a2a] text-gray-400">
              批量刷新
            </Button>
            <Button variant="outline" className="border-[#2a2a2a] text-gray-400">
              按源清理
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
