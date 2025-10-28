'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Activity, TrendingUp, Server, Loader2, Wifi, WifiOff } from 'lucide-react';
import { DataSourceFallbackVisualizer } from '@/components/admin/data-source-fallback-visualizer';
import { PerformanceCharts } from '@/components/admin/performance-charts';
import { useCacheStream } from '@/hooks/use-cache-stream';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [data, setData] = useState<CacheOverview | null>(null);

  // Use SSE for real-time updates
  const { data: streamData, connected, error: streamError } = useCacheStream(true);

  useEffect(() => {
    if (streamData?.overview) {
      setData(streamData.overview);
      setLastUpdate(new Date());
      if (loading) {
        setLoading(false);
      }
    }
  }, [streamData?.overview, loading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/cache/overview');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setLastUpdate(new Date());
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (streamError) {
      setError(streamError);
    }
  }, [streamError]);

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
      {/* Real-time Status Bar */}
      {(connected || lastUpdate) && (
        <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {connected ? (
                    <>
                      <Wifi className="h-4 w-4 text-green-500" />
                      <span className="text-green-400 text-sm">实时连接中</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-400 text-sm">连接已断开</span>
                    </>
                  )}
                </div>
                {lastUpdate && (
                  <span className="text-gray-400 text-sm">
                    最后更新: {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <button
                onClick={fetchData}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                disabled={loading}
              >
                {loading ? '刷新中...' : '手动刷新'}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Performance Charts */}
      <PerformanceCharts
        cacheHitTrend={data.performance.cacheHitTrend}
        dataSourceDistribution={{
          yahoo: data.dataSources.yahoo.success,
          finnhub: data.dataSources.finnhub.success,
          fallback: data.dataSources.fallback.count,
        }}
      />

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

      {/* Data Source Fallback Chain Visualizer */}
      <DataSourceFallbackVisualizer
        sources={[
          {
            name: 'yahoo',
            displayName: 'Yahoo Finance',
            status: data.dataSources.yahoo.success > data.dataSources.yahoo.failed * 0.8 ? 'healthy' : 'degraded',
            successRate: data.dataSources.yahoo.success + data.dataSources.yahoo.failed > 0
              ? (data.dataSources.yahoo.success / (data.dataSources.yahoo.success + data.dataSources.yahoo.failed)) * 100
              : 0,
            responseTime: 120,
            lastUsed: new Date().toISOString(),
            batchSize: 50,
            description: '主要数据源，免费访问股票价格和市值信息',
          },
          {
            name: 'finnhub',
            displayName: 'Finnhub API',
            status: data.dataSources.finnhub.success > data.dataSources.finnhub.failed * 0.7 ? 'healthy' : 'degraded',
            successRate: data.dataSources.finnhub.success + data.dataSources.finnhub.failed > 0
              ? (data.dataSources.finnhub.success / (data.dataSources.finnhub.success + data.dataSources.finnhub.failed)) * 100
              : 0,
            responseTime: 250,
            lastUsed: new Date().toISOString(),
            batchSize: 50,
            description: '备用数据源，提供实时市场数据和公司信息',
          },
          {
            name: 'fallback',
            displayName: '价格估算',
            status: 'healthy',
            successRate: 100,
            responseTime: 5,
            lastUsed: new Date().toISOString(),
            batchSize: 0,
            description: '最终回退机制，基于历史数据进行价格估算',
          },
        ]}
      />
    </div>
  );
}
