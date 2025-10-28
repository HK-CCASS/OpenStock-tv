'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Filter, Download, Loader2, ChevronLeft, ChevronRight, User, Clock } from 'lucide-react';

interface AuditLog {
  _id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  target?: string;
  ip: string;
  userAgent: string;
  status: 'success' | 'failure' | 'error';
  errorMessage?: string;
  duration?: number;
  createdAt: string;
}

interface PaginatedAuditLogs {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Audit Logs Tab - Security & Compliance
 *
 * Provides tools for viewing and analyzing audit logs
 * to track all admin operations for security and compliance.
 */

export default function AuditLogsTab() {
  const [data, setData] = useState<PaginatedAuditLogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('all');
  const [resource, setResource] = useState('all');
  const [status, setStatus] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    fetchData();
  }, [currentPage, userId, action, resource, status]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
      });

      if (userId) params.append('userId', userId);
      if (action && action !== 'all') params.append('action', action);
      if (resource && resource !== 'all') params.append('resource', resource);
      if (status && status !== 'all') params.append('status', status);

      const response = await fetch(`/api/admin/cache/audit-logs?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch audit logs');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/20 text-green-400">成功</Badge>;
      case 'failure':
        return <Badge className="bg-yellow-500/20 text-yellow-400">失败</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-400">错误</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400">未知</Badge>;
    }
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ');
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
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="h-5 w-5" />
            审计日志
          </CardTitle>
          <CardDescription className="text-gray-400">
            查看和筛选所有管理员操作记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* User ID Filter */}
            <Input
              placeholder="用户 ID..."
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="bg-[#262626] border-[#2a2a2a] text-white"
            />

            {/* Action Filter */}
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-[200px] bg-[#262626] border-[#2a2a2a] text-white">
                <SelectValue placeholder="操作类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部操作</SelectItem>
                <SelectItem value="CACHE_OVERVIEW_VIEW">查看概览</SelectItem>
                <SelectItem value="CACHE_DATA_VIEW">查看数据</SelectItem>
                <SelectItem value="CACHE_ENTRY_EDIT">编辑条目</SelectItem>
                <SelectItem value="CACHE_BATCH_DELETE">批量删除</SelectItem>
                <SelectItem value="CACHE_CLEAR">清理缓存</SelectItem>
                <SelectItem value="CACHE_EXPORT">导出数据</SelectItem>
              </SelectContent>
            </Select>

            {/* Resource Filter */}
            <Select value={resource} onValueChange={setResource}>
              <SelectTrigger className="w-[200px] bg-[#262626] border-[#2a2a2a] text-white">
                <SelectValue placeholder="资源类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部资源</SelectItem>
                <SelectItem value="cache">缓存</SelectItem>
                <SelectItem value="redis">Redis</SelectItem>
                <SelectItem value="mongodb">MongoDB</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[200px] bg-[#262626] border-[#2a2a2a] text-white">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="success">成功</SelectItem>
                <SelectItem value="failure">失败</SelectItem>
                <SelectItem value="error">错误</SelectItem>
              </SelectContent>
            </Select>
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

      {/* Audit Logs Table */}
      <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white">审计日志记录</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">加载失败: {error}</p>
              <Button onClick={fetchData}>重试</Button>
            </div>
          ) : !data || data.logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {loading ? '加载中...' : '暂无审计日志'}
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2a2a2a]">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">时间</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">用户</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">操作</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">资源</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">目标</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">状态</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">耗时</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logs.map((log) => (
                      <tr key={log._id} className="border-b border-[#2a2a2a] hover:bg-[#262626]">
                        <td className="py-3 px-4 text-gray-300 text-sm">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-white text-sm">{log.userEmail}</p>
                              <p className="text-gray-500 text-xs">{log.userId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-300 text-sm">
                          {formatAction(log.action)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-[#2a2a2a] text-gray-300 text-xs rounded">
                            {log.resource}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-sm">
                          {log.target || '-'}
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(log.status)}</td>
                        <td className="py-3 px-4 text-gray-400 text-sm">
                          {log.duration ? `${log.duration}ms` : '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-sm font-mono">
                          {log.ip}
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
    </div>
  );
}
