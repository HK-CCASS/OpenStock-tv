'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Activity, TrendingUp, Server, Loader2 } from 'lucide-react';

interface CacheOverview {
  redis: {
    status: 'connected' | 'disconnected';
    hitRate: number;
    keyCount: number;
    memoryUsage: string;
  };
  mongodb: {
    status: 'connected' | 'error';
    recordCount: number;
    hitRate: number;
    expiredCount: number;
  };
  dataSources: {
    yahoo: { success: number; failed: number; };
    finnhub: { success: number; failed: number; };
    fallback: { count: number; };
  };
  performance: {
    avgResponseTime: number;
    cacheHitTrend: number[];
    topSymbols: string[];
  };
  updatedAt: string;
}

/**
 * Dashboard Tab - Cache Overview
 *
 * Displays real-time status of the dual-layer cache system including
 * Redis L1, MongoDB L2, data sources health, and performance metrics.
 */

export default function DashboardTab() {
  const [data, setData] = useState<CacheOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/cache/overview');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-400">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">加载失败: {error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          重试
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Redis Status Card */}
        <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Redis L1 缓存
            </CardTitle>
            <Database className={`h-4 w-4 ${data.redis.status === 'connected' ? 'text-green-500' : 'text-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {data.redis.status === 'connected' ? '🟢 连接正常' : '🔴 连接断开'}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              命中率: {data.redis.hitRate.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-400">
              内存使用: {data.redis.memoryUsage}
            </p>
            <p className="text-xs text-gray-400">
              键数量: {data.redis.keyCount.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* MongoDB Status Card */}
        <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              MongoDB L2 缓存
            </CardTitle>
            <Server className={`h-4 w-4 ${data.mongodb.status === 'connected' ? 'text-green-500' : 'text-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {data.mongodb.status === 'connected' ? '🟢 状态正常' : '🔴 状态异常'}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              记录数: {data.mongodb.recordCount.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">
              命中率: {data.mongodb.hitRate.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-400">
              过期记录: {data.mongodb.expiredCount.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* Data Sources Health Card */}
        <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              数据源健康
            </CardTitle>
            <Activity className={`h-4 w-4 ${data.dataSources.finnhub.success > data.dataSources.yahoo.success * 0.8 ? 'text-green-500' : 'text-yellow-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {data.dataSources.finnhub.success > data.dataSources.yahoo.success * 0.8 ? '🟢 健康' : '🟡 警告'}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Yahoo: {data.dataSources.yahoo.success}
            </p>
            <p className="text-xs text-gray-400">
              Finnhub: {data.dataSources.finnhub.success}
            </p>
            <p className="text-xs text-gray-400">
              Fallback: {data.dataSources.fallback.count}
            </p>
          </CardContent>
        </Card>

        {/* Performance Card */}
        <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              性能指标
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.performance.avgResponseTime}ms</div>
            <p className="text-xs text-gray-400 mt-2">
              平均响应时间
            </p>
            <p className="text-xs text-gray-400">
              最后更新: {new Date(data.updatedAt).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">7天命中率趋势</CardTitle>
            <CardDescription className="text-gray-400">
              Redis L1 和 MongoDB L2 命中率趋势
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.performance.cacheHitTrend.length > 0 ? (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                图表即将显示 (数据: {data.performance.cacheHitTrend.join(', ')})
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">数据源分布</CardTitle>
            <CardDescription className="text-gray-400">
              Yahoo Finance vs Finnhub vs Fallback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Yahoo Finance</span>
                <span className="text-white font-medium">{data.dataSources.yahoo.success}</span>
              </div>
              <div className="w-full bg-[#262626] rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: `${Math.min(
                      (data.dataSources.yahoo.success /
                        (data.dataSources.yahoo.success +
                          data.dataSources.finnhub.success +
                          data.dataSources.fallback.count)) * 100,
                      100
                    )}%`
                  }}
                ></div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Finnhub</span>
                <span className="text-white font-medium">{data.dataSources.finnhub.success}</span>
              </div>
              <div className="w-full bg-[#262626] rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${Math.min(
                      (data.dataSources.finnhub.success /
                        (data.dataSources.yahoo.success +
                          data.dataSources.finnhub.success +
                          data.dataSources.fallback.count)) * 100,
                      100
                    )}%`
                  }}
                ></div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Fallback</span>
                <span className="text-white font-medium">{data.dataSources.fallback.count}</span>
              </div>
              <div className="w-full bg-[#262626] rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{
                    width: `${Math.min(
                      (data.dataSources.fallback.count /
                        (data.dataSources.yahoo.success +
                          data.dataSources.finnhub.success +
                          data.dataSources.fallback.count)) * 100,
                      100
                    )}%`
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white">系统信息</CardTitle>
          <CardDescription className="text-gray-400">
            双层缓存系统详细信息
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Redis L1</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• 状态: {data.redis.status === 'connected' ? '已连接' : '未连接'}</li>
                <li>• 命中率: {data.redis.hitRate.toFixed(1)}%</li>
                <li>• 键数量: {data.redis.keyCount.toLocaleString()}</li>
                <li>• 内存使用: {data.redis.memoryUsage}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">MongoDB L2</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• 状态: {data.mongodb.status === 'connected' ? '正常' : '错误'}</li>
                <li>• 总记录: {data.mongodb.recordCount.toLocaleString()}</li>
                <li>• 过期记录: {data.mongodb.expiredCount.toLocaleString()}</li>
                <li>• 命中率: {data.mongodb.hitRate.toFixed(1)}%</li>
              </ul>
            </div>
          </div>

          {/* Top Symbols */}
          {data.performance.topSymbols.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Top 访问股票</h4>
              <div className="flex flex-wrap gap-2">
                {data.performance.topSymbols.slice(0, 10).map((symbol) => (
                  <span
                    key={symbol}
                    className="px-2 py-1 bg-[#2a2a2a] text-gray-300 text-xs rounded"
                  >
                    {symbol}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
