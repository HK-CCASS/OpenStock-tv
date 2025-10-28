'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Activity, BarChart3 } from 'lucide-react';

/**
 * Performance Analytics Tab - Cache Performance Statistics
 *
 * Provides detailed analytics on cache performance including hit rates,
 * data distribution, response times, and top lists.
 */

export default function PerformanceTab() {
  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Redis L1 命中率
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">98.5%</div>
            <p className="text-xs text-green-400 mt-2">
              ↑ 比昨日 +0.3%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              MongoDB L2 命中率
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">92.3%</div>
            <p className="text-xs text-green-400 mt-2">
              ↑ 比昨日 +1.2%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              平均响应时间
            </CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">245ms</div>
            <p className="text-xs text-green-400 mt-2">
              ↓ 比昨日 -15ms
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">7天命中率趋势</CardTitle>
            <CardDescription className="text-gray-400">
              Redis L1 和 MongoDB L2 命中率对比
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
            <CardTitle className="text-white">市值分布</CardTitle>
            <CardDescription className="text-gray-400">
              按市值区间统计缓存记录分布
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">&lt; $1B</span>
                  <span className="text-white">125 条 (12.5%)</span>
                </div>
                <div className="w-full bg-[#262626] rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '12.5%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">$1B - $10B</span>
                  <span className="text-white">456 条 (45.6%)</span>
                </div>
                <div className="w-full bg-[#262626] rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '45.6%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">$10B - $100B</span>
                  <span className="text-white">312 条 (31.2%)</span>
                </div>
                <div className="w-full bg-[#262626] rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '31.2%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">&gt; $100B</span>
                  <span className="text-white">107 条 (10.7%)</span>
                </div>
                <div className="w-full bg-[#262626] rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '10.7%' }}></div>
                </div>
              </div>
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

        <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">API调用统计</CardTitle>
            <CardDescription className="text-gray-400">
              各数据源调用次数趋势
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              图表即将显示
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">🔥 Top 10 访问股票</CardTitle>
            <CardDescription className="text-gray-400">
              访问最频繁的股票
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { rank: 1, symbol: 'AAPL', count: 1234 },
                { rank: 2, symbol: 'MSFT', count: 1102 },
                { rank: 3, symbol: 'GOOGL', count: 986 },
                { rank: 4, symbol: 'AMZN', count: 834 },
                { rank: 5, symbol: 'TSLA', count: 756 },
              ].map((item) => (
                <div key={item.symbol} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#2a2a2a] flex items-center justify-center text-xs text-white">
                      {item.rank}
                    </div>
                    <span className="text-white font-medium">{item.symbol}</span>
                  </div>
                  <span className="text-gray-400">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">💰 Top 10 市值股票</CardTitle>
            <CardDescription className="text-gray-400">
              市值最大的股票
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { rank: 1, symbol: 'AAPL', marketCap: '2.35T' },
                { rank: 2, symbol: 'MSFT', marketCap: '2.04T' },
                { rank: 3, symbol: 'GOOGL', marketCap: '1.52T' },
                { rank: 4, symbol: 'AMZN', marketCap: '1.45T' },
                { rank: 5, symbol: 'TSLA', marketCap: '0.82T' },
              ].map((item) => (
                <div key={item.symbol} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#2a2a2a] flex items-center justify-center text-xs text-white">
                      {item.rank}
                    </div>
                    <span className="text-white font-medium">{item.symbol}</span>
                  </div>
                  <span className="text-gray-400">${item.marketCap}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
