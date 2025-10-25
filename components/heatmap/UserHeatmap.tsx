'use client';

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { AlertCircle, ArrowLeft, Wifi, WifiOff } from 'lucide-react';

// 数据结构
interface StockData {
  symbol: string;
  name?: string;
  last: number;
  change: number;
  changePercent: number;
  volume?: number;
  category?: string;
  marketCap?: number;
  marketCapBase?: number; // 市值基准（用于计算实时市值）
  priceBase?: number;     // 价格基准
}

interface PoolGroup {
  poolName: string;
  stockCount: number;
  avgChangePercent: number;
  totalMarketCap: number;
  stocks: StockData[];
}

interface HeatmapData {
  pools: PoolGroup[];
  timestamp: Date;
}

// 根据涨跌幅返回颜色（TradingView风格渐变）
const getColorByChange = (changePercent: number): string => {
  if (changePercent >= 5) return '#4CAF50';
  if (changePercent >= 4) return '#43A047';
  if (changePercent >= 3) return '#388E3C';
  if (changePercent >= 2) return '#2E7D32';
  if (changePercent >= 1) return '#1B5E20';
  if (changePercent > 0) return '#0D4D1C';
  if (changePercent === 0) return '#424242';
  if (changePercent > -1) return '#5D1715';
  if (changePercent > -2) return '#8B1A1A';
  if (changePercent > -3) return '#B71C1C';
  if (changePercent > -4) return '#C62828';
  if (changePercent > -5) return '#D32F2F';
  return '#E53935';
};

export default function UserHeatmap({ userId }: { userId: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // 获取初始数据
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/heatmap/user-data');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      if (result.data.pools.length === 0) {
        setError('您还没有添加任何观察列表。请先添加股票到观察列表。');
        setLoading(false);
        return;
      }

      // 转换 API 数据为内部格式
      const pools: PoolGroup[] = result.data.pools.map((apiPool: any) => {
        const stocks: StockData[] = apiPool.cells.map((cell: any) => ({
          symbol: cell.symbol,
          name: cell.name,
          last: cell.last,
          change: cell.change,
          changePercent: cell.changePercent,
          volume: cell.volume,
          category: cell.category,
          marketCap: cell.marketCap,
          marketCapBase: cell.marketCap, // 保存市值基准
          priceBase: cell.last,            // 保存价格基准
        }));

        return {
          poolName: apiPool.poolName,
          stockCount: apiPool.stockCount,
          avgChangePercent: apiPool.avgChangePercent,
          totalMarketCap: apiPool.totalMarketCap,
          stocks,
        };
      });

      console.log('[Heatmap Debug] 初始数据加载 - pools 数量:', pools.length);
      console.log('[Heatmap Debug] 初始数据详情:', pools);
      
      setData({
        pools,
        timestamp: new Date(),
      });

      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch initial data:', err);
      setError('数据加载失败');
      setLoading(false);
    }
  };

  // 连接 SSE 实时更新
  const connectSSE = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource('/api/heatmap/stream');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[SSE] Connected');
      setSseConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);

        // 连接确认消息
        if (update.type === 'connected') {
          console.log('[SSE] Connection confirmed:', update.clientId);
          return;
        }

        // 股票报价更新
        if (update.symbol) {
          updateStockQuote(update);
        }
      } catch (err) {
        console.error('[SSE] Failed to parse message:', err);
      }
    };

    eventSource.onerror = () => {
      console.error('[SSE] Connection error');
      setSseConnected(false);
      // EventSource 会自动重连
    };
  };

  // 更新股票报价
  const updateStockQuote = (update: {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  }) => {
    setData((prevData) => {
      if (!prevData) return prevData;

      const newPools = prevData.pools.map((pool) => {
        const newStocks = pool.stocks.map((stock) => {
          if (stock.symbol === update.symbol) {
            // 计算实时市值
            const realTimeMarketCap = stock.marketCapBase && stock.priceBase
              ? stock.marketCapBase * (update.price / stock.priceBase)
              : stock.marketCap || 0;

            return {
              ...stock,
              last: update.price,
              change: update.change,
              changePercent: update.changePercent,
              volume: update.volume,
              marketCap: realTimeMarketCap,
            };
          }
          return stock;
        });

        // 重新计算池子统计
        const totalMarketCap = newStocks.reduce((sum, s) => sum + (s.marketCap || 0), 0);
        const avgChangePercent = newStocks.length > 0
          ? newStocks.reduce((sum, s) => sum + s.changePercent, 0) / newStocks.length
          : 0;

        return {
          ...pool,
          stocks: newStocks,
          totalMarketCap,
          avgChangePercent,
        };
      });

      return {
        pools: newPools,
        timestamp: new Date(),
      };
    });
  };

  // 初始化数据和 SSE 连接
  useEffect(() => {
    fetchInitialData();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [userId]);

  // 当初始数据加载完成后，连接 SSE
  useEffect(() => {
    if (data && !loading) {
      connectSSE();
    }
  }, [data, loading]);

  // 初始化 ECharts（只在首次或 selectedPool 改变时重建）
  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
    }

    const chart = echarts.init(chartRef.current);
    chartInstanceRef.current = chart;

    // 添加点击事件处理（仅一级视图）
    if (!selectedPool) {
      chart.on('click', function (params: any) {
        if (params.data.children && params.data.poolName) {
          setSelectedPool(params.data.poolName);
        }
      });
    }

    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.off('click');
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, [selectedPool]);

  // 更新 ECharts 数据（当 data 变化时）
  useEffect(() => {
    if (!chartInstanceRef.current || !data) return;

    const chart = chartInstanceRef.current;

    // 转换数据为 ECharts 格式
    let treeData;

    if (selectedPool) {
      // 二级视图：只显示选中池子的股票
      const pool = data.pools.find((p) => p.poolName === selectedPool);
      if (!pool) {
        setSelectedPool(null);
        return;
      }

      treeData = pool.stocks.map((stock) => {
        const marketCap = stock.marketCap || 0;
        return {
          name: stock.symbol,
          value: marketCap,
          stockData: stock,
          itemStyle: {
            color: getColorByChange(stock.changePercent),
          },
        };
      });
    } else {
      // 一级视图：显示所有池子
      console.log('[Heatmap Debug] 一级视图 - pools 数量:', data.pools.length);
      console.log('[Heatmap Debug] pools 详情:', data.pools.map(p => ({ name: p.poolName, stocks: p.stocks.length })));
      
      treeData = data.pools.map((pool) => {
        return {
          name: pool.poolName,
          value: pool.totalMarketCap,
          poolName: pool.poolName,
          poolData: {
            stockCount: pool.stockCount,
            avgChangePercent: pool.avgChangePercent,
          },
          children: pool.stocks.map((stock) => {
            const marketCap = stock.marketCap || 0;
            return {
              name: stock.symbol,
              value: marketCap,
              stockData: stock,
              itemStyle: {
                color: getColorByChange(stock.changePercent),
              },
            };
          }),
        };
      });
      
      console.log('[Heatmap Debug] treeData 数量:', treeData.length);
    }

    const option = {
      backgroundColor: '#1a1a1a',
      grid: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        containLabel: false,
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderColor: '#333',
        borderWidth: 1,
        textStyle: {
          color: '#fff',
          fontSize: 12,
        },
        formatter: function (info: any) {
          // 股票信息
          const stock = info.data.stockData;
          if (stock) {
            const changeColor = stock.changePercent >= 0 ? '#66BB6A' : '#EF5350';
            const changeSign = stock.changePercent >= 0 ? '+' : '';
            const marketCap = stock.marketCap || 0;

            return `
              <div style="padding: 8px; min-width: 200px;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 6px;">${stock.symbol}</div>
                ${stock.name ? `<div style="color: #aaa; font-size: 11px; margin-bottom: 6px;">${stock.name}</div>` : ''}
                <div style="margin-top: 6px;">
                  <div style="margin-bottom: 4px;">价格: <span style="font-weight: bold;">$${stock.last.toFixed(2)}</span></div>
                  <div style="color: ${changeColor}; font-weight: bold;">
                    ${changeSign}${stock.changePercent.toFixed(2)}% (${changeSign}${Math.abs(stock.change).toFixed(2)})
                  </div>
                  ${stock.volume ? `<div style="color: #aaa; font-size: 11px; margin-top: 4px;">成交量: ${stock.volume.toLocaleString()}</div>` : ''}
                  <div style="color: #aaa; font-size: 11px; margin-top: 4px;">市值: $${(marketCap / 1000000000).toFixed(2)}B</div>
                </div>
              </div>
            `;
          }

          // 池子信息（一级视图）
          if (!selectedPool && info.data.children) {
            const poolData = info.data.poolData;
            const stockCount = poolData?.stockCount || info.data.children?.length || 0;
            const avgChange = poolData?.avgChangePercent || 0;
            const totalValue = info.value;
            const changeColor = avgChange >= 0 ? '#66BB6A' : '#EF5350';
            const changeSign = avgChange >= 0 ? '+' : '';

            return `
              <div style="padding: 8px;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 6px;">${info.name}</div>
                <div style="color: #aaa;">股票数量: ${stockCount}</div>
                <div style="color: ${changeColor}; margin-top: 4px;">
                  平均涨跌幅: ${changeSign}${avgChange.toFixed(2)}%
                </div>
                <div style="color: #aaa; margin-top: 4px;">总市值: $${(totalValue / 1000000000).toFixed(2)}B</div>
                <div style="color: #4CAF50; font-size: 11px; margin-top: 6px;">点击查看详情</div>
              </div>
            `;
          }

          return '';
        },
      },
      series: [
        {
          name: '热力图',
          type: 'treemap',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          roam: false,
          nodeClick: selectedPool ? false : 'link',
          breadcrumb: {
            show: false,
          },
          itemStyle: {
            borderColor: '#1f1f1f',
            borderWidth: 2,
            gapWidth: 2,
          },
          label: {
            show: true,
            formatter: function (params: any) {
              const stock = params.data.stockData;
              if (stock) {
                const changeSign = stock.changePercent >= 0 ? '+' : '';
                return [
                  `{symbol|${stock.symbol}}`,
                  `{price|$${stock.last.toFixed(2)}}`,
                  `{change|${changeSign}${stock.changePercent.toFixed(2)}%}`,
                ].join('\n');
              }
              return '';
            },
            rich: {
              symbol: {
                fontSize: 14,
                fontWeight: 'bold',
                color: '#fff',
                lineHeight: 20,
              },
              price: {
                fontSize: 12,
                color: '#fff',
                lineHeight: 18,
              },
              change: {
                fontSize: 11,
                color: '#fff',
                lineHeight: 16,
              },
            },
            overflow: 'truncate',
            ellipsis: '...',
          },
          upperLabel: {
            show: !selectedPool,
            height: 36,
            color: '#fff',
            fontSize: 18,
            fontWeight: 'bold',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            borderWidth: 1,
            borderRadius: 4,
            padding: [8, 12],
            formatter: '{b}',
          },
          levels: [
            {
              itemStyle: {
                borderWidth: 0,
                gapWidth: 4,
              },
            },
            {
              itemStyle: {
                borderWidth: 2,
                gapWidth: 2,
                borderColor: '#1f1f1f',
              },
              upperLabel: {
                show: true,
              },
            },
            {
              itemStyle: {
                borderWidth: 2,
                borderColor: '#1f1f1f',
              },
            },
          ],
          data: treeData,
        },
      ],
    };

    chart.setOption(option, {
      notMerge: false,
      lazyUpdate: false,
    });

    setTimeout(() => {
      chart.resize();
    }, 0);
  }, [data, selectedPool]);

  if (error && !data) {
    return (
      <div className="w-full h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-white mb-2 text-lg">数据加载失败</p>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={fetchInitialData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-[#1a1a1a] flex flex-col overflow-hidden">
      {/* 顶部工具栏 */}
      <div className="bg-[#1f1f1f] border-b border-[#2a2a2a] px-6 py-3 flex items-center gap-4 flex-shrink-0">
        {selectedPool && (
          <button
            onClick={() => setSelectedPool(null)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#2a2a2a] text-white rounded hover:bg-[#333] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
        )}
        <h1 className="text-white text-lg font-semibold">
          {selectedPool || '热力图'}
        </h1>
        
        {/* SSE 连接状态 */}
        <div className="ml-auto flex items-center gap-2">
          {sseConnected ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-green-500 text-sm">实时连接</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-gray-500" />
              <span className="text-gray-500 text-sm">离线</span>
            </>
          )}
        </div>
      </div>

      {/* 热力图 */}
      <div className="flex-1 relative min-h-0" style={{ minHeight: 0 }}>
        {loading && !data && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a] z-10">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white">加载数据中...</p>
            </div>
          </div>
        )}

        <div ref={chartRef} className="absolute inset-0" />
      </div>

      {/* 图例说明 - TradingView风格渐变条 */}
      <div className="bg-[#1f1f1f] border-t border-[#2a2a2a] px-6 py-4 flex-shrink-0">
        <div className="flex flex-col items-center gap-3">
          <span className="text-gray-400 text-sm">涨跌幅颜色</span>

          {/* 渐变色条 */}
          <div className="flex items-center gap-0 h-8 rounded overflow-hidden shadow-lg">
            <div className="w-16 h-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: '#E53935' }}>
              &lt;-5%
            </div>
            <div className="w-16 h-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: '#D32F2F' }}>
              -4%
            </div>
            <div className="w-16 h-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: '#C62828' }}>
              -3%
            </div>
            <div className="w-16 h-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: '#B71C1C' }}>
              -2%
            </div>
            <div className="w-16 h-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: '#8B1A1A' }}>
              -1%
            </div>
            <div className="w-16 h-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: '#5D1715' }}>
              -0%
            </div>
            <div className="w-16 h-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: '#424242' }}>
              0%
            </div>
            <div className="w-16 h-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: '#0D4D1C' }}>
              +0%
            </div>
            <div className="w-16 h-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: '#1B5E20' }}>
              +1%
            </div>
            <div className="w-16 h-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: '#2E7D32' }}>
              +2%
            </div>
            <div className="w-16 h-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: '#388E3C' }}>
              +3%
            </div>
            <div className="w-16 h-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: '#43A047' }}>
              +4%
            </div>
            <div className="w-16 h-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: '#4CAF50' }}>
              &gt;5%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

