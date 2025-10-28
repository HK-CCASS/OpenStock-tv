'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDown, CheckCircle, AlertCircle, XCircle, Clock, TrendingUp } from 'lucide-react';

interface DataSource {
  name: string;
  displayName: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  successRate: number;
  responseTime: number;
  lastUsed: string;
  batchSize: number;
  description: string;
}

interface DataSourceFallbackVisualizerProps {
  sources: DataSource[];
}

export function DataSourceFallbackVisualizer({
  sources,
}: DataSourceFallbackVisualizerProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-400" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500/20 text-green-400">健康</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500/20 text-yellow-400">降级</Badge>;
      case 'unhealthy':
        return <Badge className="bg-red-500/20 text-red-400">不健康</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400">未知</Badge>;
    }
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          数据源回退链
        </CardTitle>
        <CardDescription className="text-gray-400">
          自动回退策略：从 Yahoo Finance → Finnhub → 价格估算
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sources.map((source, index) => (
            <div key={source.name} className="relative">
              {/* Connection Line */}
              {index > 0 && (
                <div className="absolute left-6 -top-6 h-6 w-0.5 bg-[#2a2a2a]" />
              )}

              {/* Source Card */}
              <div className="bg-[#262626] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#3a3a3a] transition-colors">
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(source.status)}
                  </div>

                  {/* Source Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-medium">{source.displayName}</h3>
                      {getStatusBadge(source.status)}
                    </div>

                    <p className="text-gray-400 text-sm">{source.description}</p>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-400">成功率</p>
                        <p className="text-white font-medium">
                          {source.successRate.toFixed(1)}%
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-400">响应时间</p>
                        <p className="text-white font-medium">
                          {formatResponseTime(source.responseTime)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-400">批次大小</p>
                        <p className="text-white font-medium">{source.batchSize} 支</p>
                      </div>
                    </div>

                    {/* Health Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">健康度</span>
                        <span className="text-xs text-gray-400">
                          {source.successRate.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 bg-[#1f1f1f] rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            source.successRate >= 90
                              ? 'bg-green-500'
                              : source.successRate >= 70
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${source.successRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrow to Next */}
              {index < sources.length - 1 && (
                <div className="flex justify-center my-2">
                  <div className="bg-[#2a2a2a] rounded-full p-1">
                    <ArrowDown className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Fallback Strategy Summary */}
          <div className="mt-6 p-4 bg-[#262626] border border-[#2a2a2a] rounded-lg">
            <h4 className="text-white font-medium mb-2">回退策略说明</h4>
            <ul className="space-y-1 text-sm text-gray-400">
              <li>• 主数据源：Yahoo Finance (快速、免费)</li>
              <li>• 备用数据源：Finnhub (需要 API Key)</li>
              <li>• 最终回退：价格估算 (基于历史数据)</li>
              <li>• 批次处理：每批 50 支股票，避免 API 限制</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
