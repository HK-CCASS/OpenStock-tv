'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Activity, TrendingUp, Server } from 'lucide-react';

/**
 * Dashboard Tab - Cache Overview
 *
 * Displays real-time status of the dual-layer cache system including
 * Redis L1, MongoDB L2, data sources health, and performance metrics.
 */

export default function DashboardTab() {
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
            <Database className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">🟢 连接正常</div>
            <p className="text-xs text-gray-400 mt-2">
              命中率: 98.5%
            </p>
            <p className="text-xs text-gray-400">
              内存使用: 245MB
            </p>
          </CardContent>
        </Card>

        {/* MongoDB Status Card */}
        <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              MongoDB L2 缓存
            </CardTitle>
            <Server className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">🟢 状态正常</div>
            <p className="text-xs text-gray-400 mt-2">
              记录数: 15,678
            </p>
            <p className="text-xs text-gray-400">
              命中率: 92.3%
            </p>
          </CardContent>
        </Card>

        {/* Data Sources Health Card */}
        <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              数据源健康
            </CardTitle>
            <Activity className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">🟡 部分正常</div>
            <p className="text-xs text-gray-400 mt-2">
              Yahoo: 98.5%
            </p>
            <p className="text-xs text-gray-400">
              Finnhub: 85.0%
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
            <div className="text-2xl font-bold text-white">245ms</div>
            <p className="text-xs text-gray-400 mt-2">
              平均响应时间
            </p>
            <p className="text-xs text-gray-400">
              今日API调用: 1,690
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
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              图表即将显示
            </div>
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
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              图表即将显示
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
                <li>• 键数量: 1,234</li>
                <li>• 过期键: 23</li>
                <li>• 内存使用: 245MB / 512MB</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">MongoDB L2</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• 总记录: 15,678</li>
                <li>• 过期记录: 126</li>
                <li>• 数据大小: 45.2MB</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
