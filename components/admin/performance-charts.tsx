'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface LineChartProps {
  data: number[];
  labels?: string[];
  color?: string;
  height?: number;
}

function LineChart({ data, labels, color = '#3b82f6', height = 300 }: LineChartProps) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = ((max - value) / (max - min)) * 80 + 10; // 10% top/bottom padding
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="h-[300px] relative">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        <g className="opacity-20">
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="#374151"
              strokeWidth="0.5"
            />
          ))}
          {[0, 20, 40, 60, 80, 100].map((x) => (
            <line
              key={x}
              x1={x}
              y1="0"
              x2={x}
              y2="100"
              stroke="#374151"
              strokeWidth="0.5"
            />
          ))}
        </g>
        {/* Area fill */}
        <polygon
          points={`0,100 ${points} 100,100`}
          fill="url(#lineGradient)"
        />
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Data points */}
        {data.map((value, index) => {
          const x = (index / (data.length - 1)) * 100;
          const y = ((max - value) / (max - min)) * 80 + 10;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="1.5"
              fill={color}
              className="opacity-80 hover:opacity-100 transition-opacity"
            />
          );
        })}
      </svg>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
        <span>{max.toFixed(1)}</span>
        <span>{((max + min) / 2).toFixed(1)}</span>
        <span>{min.toFixed(1)}</span>
      </div>
      {/* X-axis labels */}
      {labels && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500">
          {labels.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
}

function BarChart({ data, height = 300 }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="h-[300px] flex items-end justify-around gap-4 p-4">
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full flex flex-col items-center gap-1">
            <span className="text-xs text-gray-400">{item.value.toFixed(1)}%</span>
            <div className="w-full max-w-[60px] bg-[#262626] rounded-t-lg overflow-hidden">
              <div
                className="transition-all duration-500 ease-out"
                style={{
                  height: `${(item.value / max) * 200}px`,
                  backgroundColor: item.color || '#3b82f6',
                }}
              />
            </div>
          </div>
          <span className="text-xs text-gray-400 text-center">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

interface DoughnutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
}

function DoughnutChart({ data, size = 200 }: DoughnutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercentage = 0;

  const circles = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const strokeDasharray = `${percentage} ${100 - percentage}`;
    const strokeDashoffset = -cumulativePercentage;
    cumulativePercentage += percentage;

    return (
      <circle
        key={index}
        cx="50%"
        cy="50%"
        r="40"
        fill="none"
        stroke={item.color}
        strokeWidth="8"
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
        transform="rotate(-90 50 50)"
        className="transition-all duration-300"
      />
    );
  });

  return (
    <div className="flex items-center justify-center gap-8">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100">
          {circles}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{total}</div>
            <div className="text-xs text-gray-400">总计</div>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-gray-400">{item.label}</span>
            <span className="text-sm text-white font-medium ml-2">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PerformanceChartsProps {
  cacheHitTrend: number[];
  dataSourceDistribution: {
    yahoo: number;
    finnhub: number;
    fallback: number;
  };
}

export function PerformanceCharts({
  cacheHitTrend,
  dataSourceDistribution,
}: PerformanceChartsProps) {
  // Generate labels for the trend chart (last 7 days)
  const trendLabels = Array.from({ length: cacheHitTrend.length }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (cacheHitTrend.length - 1 - i));
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  });

  const sourceData = [
    { label: 'Yahoo', value: dataSourceDistribution.yahoo, color: '#3b82f6' },
    { label: 'Finnhub', value: dataSourceDistribution.finnhub, color: '#10b981' },
    { label: 'Fallback', value: dataSourceDistribution.fallback, color: '#f59e0b' },
  ].filter((item) => item.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Cache Hit Trend Chart */}
      <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white">7天命中率趋势</CardTitle>
          <CardDescription className="text-gray-400">
            Redis L1 和 MongoDB L2 命中率趋势
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cacheHitTrend.length > 0 ? (
            <LineChart
              data={cacheHitTrend}
              labels={trendLabels}
              color="#3b82f6"
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              暂无数据
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Source Distribution Chart */}
      <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white">数据源分布</CardTitle>
          <CardDescription className="text-gray-400">
            Yahoo Finance vs Finnhub vs Fallback 使用情况
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sourceData.length > 0 ? (
            <DoughnutChart data={sourceData} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              暂无数据
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
