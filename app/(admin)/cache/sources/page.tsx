'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

/**
 * Data Sources Tab - Fallback Chain Monitoring
 *
 * Monitors the 5-level data source fallback chain including
 * Yahoo Finance, Finnhub API, and fallback mechanisms.
 */

export default function SourcesTab() {
  const fallbackChain = [
    {
      level: 1,
      name: 'Yahoo Finance',
      description: '主数据源，免费API',
      status: 'healthy',
      successRate: 98.5,
      callsToday: 1234,
      avgResponse: 245,
    },
    {
      level: 2,
      name: 'Finnhub API',
      description: '备用数据源，需要API Key',
      status: 'warning',
      successRate: 85.0,
      callsToday: 456,
      avgResponse: 420,
    },
    {
      level: 3,
      name: '单个查询回退',
      description: 'Yahoo Finance 单个查询',
      status: 'healthy',
      successRate: 99.2,
      callsToday: 23,
      avgResponse: 380,
    },
    {
      level: 4,
      name: 'Finnhub单个查询',
      description: 'Finnhub 单个查询',
      status: 'healthy',
      successRate: 97.8,
      callsToday: 12,
      avgResponse: 450,
    },
    {
      level: 5,
      name: '价格估算回退',
      description: '基于价格的市值估算',
      status: 'standby',
      successRate: 100.0,
      callsToday: 5,
      avgResponse: 10,
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full bg-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500/20 text-green-400">健康</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500/20 text-yellow-400">警告</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-400">错误</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400">备用</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Fallback Chain Visualization */}
      <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white">数据源回退链</CardTitle>
          <CardDescription className="text-gray-400">
            监控5级数据源健康状态和回退机制
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fallbackChain.map((source, index) => (
              <div
                key={source.level}
                className="flex items-center justify-between p-4 rounded-lg bg-[#262626] border border-[#2a2a2a]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border-2 border-[#2a2a2a] flex items-center justify-center text-white text-sm font-bold">
                      {source.level}
                    </div>
                    {index < fallbackChain.length - 1 && (
                      <div className="w-0.5 h-8 bg-[#2a2a2a] ml-[-4px] mt-2" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(source.status)}
                      <h3 className="text-white font-medium">{source.name}</h3>
                      {getStatusBadge(source.status)}
                    </div>
                    <p className="text-gray-400 text-sm">{source.description}</p>
                  </div>
                </div>
                <div className="flex gap-8 text-sm">
                  <div className="text-center">
                    <div className="text-gray-400">成功率</div>
                    <div className="text-white font-medium">{source.successRate}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-400">今日调用</div>
                    <div className="text-white font-medium">{source.callsToday}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-400">平均响应</div>
                    <div className="text-white font-medium">{source.avgResponse}ms</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Source Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Yahoo Finance Details */}
        <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Yahoo Finance
            </CardTitle>
            <CardDescription className="text-gray-400">
              主数据源信息
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-400">状态</div>
                <div className="text-green-400 font-medium">🟢 正常</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">成功率</div>
                <div className="text-white">98.5%</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">今日调用</div>
                <div className="text-white">1,234</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">平均响应</div>
                <div className="text-white">245ms</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Finnhub Details */}
        <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Finnhub API
            </CardTitle>
            <CardDescription className="text-gray-400">
              备用数据源信息
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-400">状态</div>
                <div className="text-yellow-400 font-medium">🟡 部分失败</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">成功率</div>
                <div className="text-white">85.0%</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">今日调用</div>
                <div className="text-white">456</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">API限制</div>
                <div className="text-red-400">接近上限</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Errors */}
      <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white">最近错误日志</CardTitle>
          <CardDescription className="text-gray-400">
            最近10条数据源错误记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm text-gray-500">暂无错误记录</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
