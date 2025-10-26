'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { AlertCircle, ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import { StockDetailCard } from './StockDetailCard';

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

// 根据涨跌幅返回颜色（TradingView风格渐变，增强对比度）
const getColorByChange = (changePercent: number): string => {
  // 极端上涨（新增）
  if (changePercent >= 10) return '#00E676';     // 超亮绿色（> 10%）
  if (changePercent >= 7) return '#00C853';      // 亮绿色（7-10%）
  
  // 强劲上涨
  if (changePercent >= 5) return '#4CAF50';      // 绿色（5-7%）
  if (changePercent >= 4) return '#43A047';      // 中绿（4-5%）
  if (changePercent >= 3) return '#388E3C';      // 深绿（3-4%）
  
  // 温和上涨
  if (changePercent >= 2) return '#2E7D32';      // 墨绿（2-3%）
  if (changePercent >= 1) return '#1B5E20';      // 深墨绿（1-2%）
  if (changePercent > 0) return '#0D4D1C';       // 极深绿（0-1%）
  
  // 平盘
  if (changePercent === 0) return '#424242';     // 深灰色
  
  // 温和下跌
  if (changePercent > -1) return '#5D1715';      // 极深红（-1-0%）
  if (changePercent > -2) return '#8B1A1A';      // 深红（-2--1%）
  if (changePercent > -3) return '#B71C1C';      // 暗红（-3--2%）
  
  // 强劲下跌
  if (changePercent > -4) return '#C62828';      // 红色（-4--3%）
  if (changePercent > -5) return '#D32F2F';      // 中红（-5--4%）
  if (changePercent > -7) return '#E53935';      // 亮红（-7--5%）
  
  // 极端下跌（新增）
  if (changePercent > -10) return '#FF1744';     // 超亮红色（-10--7%）
  return '#FF0000';                               // 纯红色（< -10%）
};

export default function UserHeatmap({ userId }: { userId: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null); // 用于详情卡片
  const [displayMode, setDisplayMode] = useState<'marketCap' | 'monosize'>('marketCap'); // 显示模式
  const [sseConnected, setSseConnected] = useState(false);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // SSE 更新节流：使用 RAF 批量处理
  const updateQueueRef = useRef<Map<string, any>>(new Map());
  const rafIdRef = useRef<number | null>(null);

  // 批量更新调度（使用 requestAnimationFrame）
  const scheduleUpdate = useCallback((update: {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  }) => {
    // 将更新加入队列（相同 symbol 会覆盖旧值）
    updateQueueRef.current.set(update.symbol, update);

    // 如果已有待处理的 RAF，不重复调度
    if (rafIdRef.current !== null) return;

    // 调度批量更新（在下一帧执行）
    rafIdRef.current = requestAnimationFrame(() => {
      const updates = Array.from(updateQueueRef.current.values());
      updateQueueRef.current.clear();
      rafIdRef.current = null;

      // 批量应用所有更新
      if (updates.length > 0) {
        console.log(`[Update] Processing ${updates.length} stock updates`);
        batchUpdateStockQuotes(updates);
      }
    });
  }, []);

  // 批量更新股票报价（优化版：一次性更新多个股票）
  const batchUpdateStockQuotes = (updates: Array<{
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  }>) => {
    setData((prevData) => {
      if (!prevData) return prevData;

      // 构建 symbol -> update 映射，快速查找
      const updateMap = new Map(updates.map(u => [u.symbol, u]));
      let hasChanges = false;

      const updatedPools = prevData.pools.map((pool) => {
        let poolChanged = false;
        const updatedStocks = pool.stocks.map((stock) => {
          const update = updateMap.get(stock.symbol);
          if (update) {
            poolChanged = true;
            hasChanges = true;

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

        // 如果该 pool 有变化，重新计算统计
        if (poolChanged) {
          const totalMarketCap = updatedStocks.reduce((sum, s) => sum + (s.marketCap || 0), 0);
          const avgChangePercent = updatedStocks.length > 0
            ? updatedStocks.reduce((sum, s) => sum + s.changePercent, 0) / updatedStocks.length
            : 0;

          return {
            ...pool,
            stocks: updatedStocks,
            totalMarketCap,
            avgChangePercent,
          };
        }

        return pool; // 无变化，保持引用
      });

      // 如果有任何变化，返回新状态
      return hasChanges ? {
        pools: updatedPools,
        timestamp: new Date(),
      } : prevData;
    });
  };

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
        const stocks: StockData[] = apiPool.cells.map((cell: any) => {
          // 验证和修正市值数据
          let marketCap = cell.marketCap;
          let usedFallback = false;
          
          // 如果市值缺失、为 0 或异常，使用价格作为权重（相对大小）
          if (!marketCap || marketCap <= 0 || !isFinite(marketCap)) {
            // 使用价格 × 流通股数假设值（10亿）作为默认市值
            // 这样可以保持不同价格股票的相对大小合理
            marketCap = (cell.last || 1) * 1000000000;
            usedFallback = true;
            console.warn(
              `[Heatmap] ${cell.symbol} 市值数据异常 (原值: ${cell.marketCap})，` +
              `使用回退值: ${(marketCap / 1000000000).toFixed(2)}B (价格 × 1B)`
            );
          }

          return {
            symbol: cell.symbol,
            name: cell.name,
            last: cell.last,
            change: cell.change,
            changePercent: cell.changePercent,
            volume: cell.volume,
            category: cell.category,
            marketCap,
            marketCapBase: marketCap, // 保存市值基准
            priceBase: cell.last,      // 保存价格基准
            __fallback: usedFallback,  // 标记是否使用了回退值
          };
        });

        // 重新计算 pool 的总市值
        const totalMarketCap = stocks.reduce((sum, s) => sum + (s.marketCap || 0), 0);

        return {
          poolName: apiPool.poolName,
          stockCount: apiPool.stockCount,
          avgChangePercent: apiPool.avgChangePercent,
          totalMarketCap,
          stocks,
        };
      });

      // 调试日志：输出每个 Pool 的详细信息
      const poolsInfo = pools.map(p => ({ 
        name: p.poolName, 
        stockCount: p.stockCount,
        totalMarketCap: (p.totalMarketCap / 1000000000).toFixed(2) + 'B',
        stocks: p.stocks.map(s => ({
          symbol: s.symbol,
          marketCap: ((s.marketCap || 0) / 1000000000).toFixed(2) + 'B',
          price: s.last.toFixed(2),
        }))
      }));
      
      console.log('[Heatmap Debug] 获取到的 pools 数量:', pools.length);
      console.log('[Heatmap Debug] Pools 详情:', JSON.stringify(poolsInfo, null, 2));

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

  // 连接 SSE 实时更新（健壮版：支持重连、心跳、超时）
  const connectSSE = () => {
    let retryCount = 0;
    const maxRetries = 5;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let heartbeatTimer: NodeJS.Timeout | null = null;
    let lastMessageTime = Date.now();

    const clearTimers = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    };

    const connect = () => {
      // 清理旧连接
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      console.log(`[SSE] Connecting... (attempt ${retryCount + 1}/${maxRetries + 1})`);

      const eventSource = new EventSource('/api/heatmap/stream');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('[SSE] Connected successfully');
        setSseConnected(true);
        retryCount = 0; // 重置重试计数
        lastMessageTime = Date.now();

        // 启动心跳检测（每 10 秒检查一次）
        heartbeatTimer = setInterval(() => {
          const timeSinceLastMessage = Date.now() - lastMessageTime;
          const timeout = 30000; // 30 秒超时

          if (timeSinceLastMessage > timeout) {
            console.warn('[SSE] Connection timeout (no message for 30s), reconnecting...');
            eventSource.close();
            setSseConnected(false);
            attemptReconnect();
          }
        }, 10000);
      };

      eventSource.onmessage = (event) => {
        lastMessageTime = Date.now(); // 更新最后消息时间

        try {
          const update = JSON.parse(event.data);

          // 连接确认消息
          if (update.type === 'connected') {
            console.log('[SSE] Connection confirmed:', update.clientId);
            return;
          }

          // 心跳消息
          if (update.type === 'heartbeat') {
            console.log('[SSE] Heartbeat received');
            return;
          }

          // 股票报价更新（使用节流调度）
          if (update.symbol) {
            scheduleUpdate(update);
          }
        } catch (err) {
          console.error('[SSE] Failed to parse message:', err);
        }
      };

      eventSource.onerror = () => {
        console.error('[SSE] Connection error');
        setSseConnected(false);
        clearTimers();
        eventSource.close();
        attemptReconnect();
      };
    };

    const attemptReconnect = () => {
      if (retryCount >= maxRetries) {
        console.error('[SSE] Max retries reached, giving up');
        setError('实时连接失败，请刷新页面重试');
        return;
      }

      // 指数退避：1s, 2s, 4s, 8s, 16s（最大 30s）
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

      reconnectTimer = setTimeout(() => {
        retryCount++;
        connect();
      }, delay);
    };

    // 开始连接
    connect();

    // 返回清理函数
    return () => {
      clearTimers();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  };

  // 组件卸载时清理 RAF
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      updateQueueRef.current.clear();
    };
  }, []);

  // 初始化数据和 SSE 连接
  useEffect(() => {
    fetchInitialData();
    // 不在这里清理 SSE，由下面的 useEffect 管理
  }, [userId]);

  // 当初始数据加载完成后，连接 SSE（只连接一次）
  useEffect(() => {
    if (!data || loading) return;

    let cleanup: (() => void) | undefined;

    // 延迟连接，确保组件完全初始化
    const timer = setTimeout(() => {
      cleanup = connectSSE();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (cleanup) cleanup();
    };
  }, [data, loading]); // data 变化时重新连接（例如用户切换账号）

  // 分段平滑算法（智能处理不同规模的市值）
  const smoothValue = (marketCap: number): number => {
    if (marketCap <= 0) return 1;
    
    // 市值阈值定义
    const MEGA_CAP_THRESHOLD = 1000000000000;  // 1T（超大市值）
    const LARGE_CAP_THRESHOLD = 500000000000;  // 500B（大市值）
    const MID_CAP_THRESHOLD = 50000000000;     // 50B（中市值）
    const SMALL_CAP_THRESHOLD = 10000000000;   // 10B（小市值）
    
    // 分段平滑策略
    if (marketCap > MEGA_CAP_THRESHOLD) {
      // 超大市值（> 1T）：激进压缩（立方根）
      // 例如：3T → 1442, 1T → 1000
      return Math.cbrt(marketCap) * 0.7;
    } else if (marketCap > LARGE_CAP_THRESHOLD) {
      // 大市值（500B-1T）：平方根压缩
      // 例如：800B → 632, 500B → 500
      return Math.sqrt(marketCap) * 0.9;
    } else if (marketCap > MID_CAP_THRESHOLD) {
      // 中市值（50B-500B）：平方根压缩（标准）
      // 例如：100B → 316, 50B → 224
      return Math.sqrt(marketCap);
    } else if (marketCap > SMALL_CAP_THRESHOLD) {
      // 小市值（10B-50B）：温和压缩
      // 例如：30B → 240, 10B → 150
      return Math.sqrt(marketCap) * 1.5;
    } else {
      // 微市值（< 10B）：线性放大
      // 例如：5B → 100, 1B → 50
      // 确保小股票也能看见
      return (marketCap / 1000000000) * 50;  // 1B → 50px²
    }
  };

  // 构建 ECharts 配置（提取为独立函数，便于维护）
  const buildChartOption = (data: HeatmapData, selectedPool: string | null, displayMode: 'marketCap' | 'monosize') => {
    // 转换数据为 ECharts 格式
    let treeData;

    if (selectedPool) {
      // 二级视图：只显示选中 pool 的股票
      const pool = data.pools.find((p) => p.poolName === selectedPool);
      if (!pool) return null;

      treeData = pool.stocks.map((stock) => ({
        name: stock.symbol,
        // 等大小模式 vs 市值比例模式
        value: displayMode === 'monosize' 
          ? 1  // 所有股票大小相同
          : smoothValue(stock.marketCap || 0), // 使用平滑值
        realMarketCap: stock.marketCap || 0,       // 保存真实市值（tooltip 显示）
        stockData: stock,
        itemStyle: {
          color: getColorByChange(stock.changePercent),
        },
      }));
    } else {
      // 一级视图：Finviz 风格，显示所有 pool + stocks
      treeData = data.pools.map((pool) => {
        const children = pool.stocks.map((stock) => ({
          name: stock.symbol,
          // 等大小模式 vs 市值比例模式
          value: displayMode === 'monosize' 
            ? 1  // 所有股票大小相同
            : smoothValue(stock.marketCap || 0), // 使用平滑值
          realMarketCap: stock.marketCap || 0,       // 保存真实市值
          stockData: stock,
          itemStyle: {
            color: getColorByChange(stock.changePercent),
          },
        }));

        // Pool 的 value
        const poolValue = displayMode === 'monosize'
          ? children.length  // 等大小模式：按股票数量
          : children.reduce((sum, child) => sum + child.value, 0);  // 市值模式：平滑值总和

        return {
          name: pool.poolName,
          value: poolValue,
          realMarketCap: pool.totalMarketCap,  // 保存真实市值
          poolName: pool.poolName,
          poolData: {
            stockCount: pool.stockCount,
            avgChangePercent: pool.avgChangePercent,
          },
          children,
        };
      });
    }

    return {
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

          // Pool 信息（一级视图）
          if (!selectedPool && info.data.children) {
            const poolData = info.data.poolData;
            const stockCount = poolData?.stockCount || info.data.children?.length || 0;
            const avgChange = poolData?.avgChangePercent || 0;
            const realMarketCap = info.data.realMarketCap || 0; // 使用真实市值
            const changeColor = avgChange >= 0 ? '#66BB6A' : '#EF5350';
            const changeSign = avgChange >= 0 ? '+' : '';

            return `
              <div style="padding: 8px;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 6px;">${info.name}</div>
                <div style="color: #aaa;">股票数量: ${stockCount}</div>
                <div style="color: ${changeColor}; margin-top: 4px;">
                  平均涨跌幅: ${changeSign}${avgChange.toFixed(2)}%
                </div>
                <div style="color: #aaa; margin-top: 4px;">总市值: $${(realMarketCap / 1000000000).toFixed(2)}B</div>
                <div style="color: #4CAF50; font-size: 11px; margin-top: 6px;">点击查看该板块详情</div>
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
          roam: 'scale',                  // 启用缩放功能（'scale' 或 true）
          scaleLimit: {
            min: 1,                       // 最小缩放比例
            max: 5,                       // 最大缩放比例（放大 5 倍查看小股票）
          },
          nodeClick: selectedPool ? false : 'link',
          leafDepth: selectedPool ? 0 : 2, // 一级视图显示 2 层，二级视图显示 1 层
          squareRatio: 0.5,  // 降低比例，更接近正方形
          visibleMin: 10,    // 最小可见面积（像素²），确保小股票也能显示
          childrenVisibleMin: 10,  // 子节点最小可见面积
          breadcrumb: {
            show: false,
          },
          itemStyle: {
            borderColor: '#0a0a0a',     // 更深的黑色，增强对比
            borderWidth: 3,              // 加粗边框（2 → 3）
            gapWidth: 4,                 // 增大间隙（2 → 4）
            shadowBlur: 8,               // 添加阴影
            shadowColor: 'rgba(0, 0, 0, 0.5)',
            shadowOffsetX: 2,
            shadowOffsetY: 2,
          },
          label: {
            show: true,
            formatter: function (params: any) {
              const stock = params.data.stockData;
              
              if (stock) {
                // 根据方块大小决定显示内容和字体大小
                const area = params.rect?.width * params.rect?.height || 0;
                const width = params.rect?.width || 0;
                const height = params.rect?.height || 0;
                const changeSign = stock.changePercent >= 0 ? '+' : '';
                
                // 动态计算字体大小（根据方块面积）
                const baseFontSize = Math.max(10, Math.min(18, Math.sqrt(area) / 4));
                
                // 计算宽高比，避免细长方块显示过多文字
                const aspectRatio = Math.max(width, height) / Math.min(width, height);
                const isTooNarrow = aspectRatio > 3;
                
                // 调试：输出方块大小（开发时使用）
                if (Math.random() < 0.01) { // 随机采样 1%
                  console.log(`[Label] ${stock.symbol} 方块大小: ${area.toFixed(0)}px² (${width.toFixed(0)}x${height.toFixed(0)}), 字体: ${baseFontSize.toFixed(1)}px`);
                }
                
                // 大方块（> 1500px² 且不太窄）：显示完整信息
                if (area > 1500 && !isTooNarrow) {
                  return [
                    `{symbolLarge|${stock.symbol}}`,
                    `{price|$${stock.last.toFixed(2)}}`,
                    `{change|${changeSign}${stock.changePercent.toFixed(2)}%}`,
                  ].join('\n');
                }
                // 中等方块（800-1500px²）：只显示股票名和涨跌幅
                else if (area > 800 && width > 50 && height > 30) {
                  return [
                    `{symbolMedium|${stock.symbol}}`,
                    `{changeSmall|${changeSign}${stock.changePercent.toFixed(1)}%}`,
                  ].join('\n');
                }
                // 小方块（300-800px²）：只显示股票名
                else if (area > 300 && width > 35) {
                  return `{symbolSmall|${stock.symbol}}`;
                }
                // 极小方块（< 300px²）：不显示文字
                else {
                  return '';
                }
              }
              
              return '';
            },
            rich: {
              symbolLarge: {
                fontSize: 16,                 // 加大字体
                fontWeight: 'bold',
                color: '#fff',
                lineHeight: 22,
                shadowBlur: 2,                 // 添加文字阴影
                shadowColor: 'rgba(0, 0, 0, 0.8)',
              },
              symbolMedium: {
                fontSize: 14,
                fontWeight: 'bold',
                color: '#fff',
                lineHeight: 20,
                shadowBlur: 2,
                shadowColor: 'rgba(0, 0, 0, 0.8)',
              },
              symbolSmall: {
                fontSize: 11,
                fontWeight: 'bold',
                color: '#fff',
                lineHeight: 14,
                shadowBlur: 1,
                shadowColor: 'rgba(0, 0, 0, 0.8)',
              },
              price: {
                fontSize: 13,                 // 加大字体
                color: '#fff',
                lineHeight: 19,
                shadowBlur: 1,
                shadowColor: 'rgba(0, 0, 0, 0.8)',
              },
              change: {
                fontSize: 12,                 // 加大字体
                fontWeight: 'bold',            // 加粗涨跌幅
                color: '#fff',
                lineHeight: 17,
                shadowBlur: 1,
                shadowColor: 'rgba(0, 0, 0, 0.8)',
              },
              changeSmall: {
                fontSize: 10,
                fontWeight: 'bold',
                color: '#fff',
                lineHeight: 14,
                shadowBlur: 1,
                shadowColor: 'rgba(0, 0, 0, 0.8)',
              },
              poolName: {
                fontSize: 18,
                fontWeight: 'bold',
                color: '#fff',
                lineHeight: 24,
              },
              poolStats: {
                fontSize: 13,
                color: '#ddd',
                lineHeight: 20,
              },
              poolChange: {
                fontSize: 14,
                fontWeight: 'bold',
                color: '#fff',
                lineHeight: 20,
              },
            },
            overflow: 'truncate',
            ellipsis: '...',
          },
          upperLabel: {
            show: true,
            height: 40,                            // 加高（30 → 40）
            color: '#ffffff',
            fontSize: 18,                          // 加大字体（16 → 18）
            fontWeight: 'bold',
            backgroundColor: 'rgba(0, 0, 0, 0.85)', // 提高不透明度（0.5 → 0.85）
            borderColor: 'rgba(255, 255, 255, 0.3)', // 提高边框对比度（0.2 → 0.3）
            borderWidth: 2,                         // 加粗边框（1 → 2）
            borderRadius: 6,                        // 更圆滑（4 → 6）
            padding: [10, 16],                      // 加大内边距（[6, 10] → [10, 16]）
            shadowBlur: 12,                         // 添加阴影
            shadowColor: 'rgba(0, 0, 0, 0.6)',
            shadowOffsetY: 2,
            formatter: function (params: any) {
              const poolData = params.data.poolData;
              if (poolData) {
                const changeSign = poolData.avgChangePercent >= 0 ? '+' : '';
                return `${params.name} (${poolData.stockCount}只 ${changeSign}${poolData.avgChangePercent.toFixed(2)}%)`;
              }
              return params.name;
            },
          },
          levels: [
            {
              // 一级视图：Pool 容器
              itemStyle: {
                borderWidth: 0,
                gapWidth: 6,              // 增大池子间隙（4 → 6）
              },
            },
            {
              // 二级视图：Pool 标签层
              itemStyle: {
                borderWidth: 3,           // 加粗边框（2 → 3）
                gapWidth: 4,              // 增大间隙（2 → 4）
                borderColor: '#0a0a0a',   // 更深的黑色
                shadowBlur: 6,            // 添加阴影
                shadowColor: 'rgba(0, 0, 0, 0.4)',
              },
              upperLabel: {
                show: true,
              },
            },
            {
              // 三级视图：Stock 方块层
              itemStyle: {
                borderWidth: 3,           // 加粗边框（2 → 3）
                borderColor: '#0a0a0a',   // 更深的黑色
                shadowBlur: 4,            // 添加阴影
                shadowColor: 'rgba(0, 0, 0, 0.3)',
              },
            },
          ],
          data: treeData,
        },
      ],
    };
  };

  // 初始化 ECharts（只在挂载时初始化一次，避免内存泄漏）
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);
    chartInstanceRef.current = chart;

    // 添加点击事件处理
    const handleClick = (params: any) => {
      const stock = params.data.stockData;
      
      // 如果点击的是股票方块
      if (stock) {
        // Shift+Click 或 Ctrl+Click 打开详情卡片
        if (params.event?.event?.shiftKey || params.event?.event?.ctrlKey || params.event?.event?.metaKey) {
          setSelectedStock(stock);
        }
        // 普通点击：如果在二级视图，也打开详情卡片
        else if (selectedPool) {
          setSelectedStock(stock);
        }
        // 如果在一级视图，不做任何操作（保持 Finviz 风格）
      }
      // 如果点击的是 Pool（只在一级视图）
      else if (!selectedPool && params.data.children && params.data.poolName) {
        setSelectedPool(params.data.poolName);
      }
    };

    chart.on('click', handleClick);

    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.off('click', handleClick);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []); // 只在挂载时执行一次

  // 更新 ECharts 数据（当 data、selectedPool 或 displayMode 变化时）
  useEffect(() => {
    if (!chartInstanceRef.current || !data) return;

    const chart = chartInstanceRef.current;
    const option = buildChartOption(data, selectedPool, displayMode);

    if (!option) {
      // 如果选中的 pool 不存在，返回一级视图
      setSelectedPool(null);
      return;
    }

    // 使用优化的配置参数
    chart.setOption(option, {
      notMerge: true,   // 完全替换配置，避免旧数据污染
      lazyUpdate: true, // 启用批量更新，提升性能
      silent: false,    // 允许触发事件（用户交互）
    });

    // 异步 resize 确保尺寸正确
    setTimeout(() => {
      chart.resize();
    }, 0);
  }, [data, selectedPool, displayMode]);

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
          {selectedPool || '股票市场热力图'}
        </h1>
        
        {/* 显示模式切换 */}
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => setDisplayMode('marketCap')}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              displayMode === 'marketCap'
                ? 'bg-blue-600 text-white'
                : 'bg-[#2a2a2a] text-gray-400 hover:text-white hover:bg-[#333]'
            }`}
          >
            市值比例
          </button>
          <button
            onClick={() => setDisplayMode('monosize')}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              displayMode === 'monosize'
                ? 'bg-blue-600 text-white'
                : 'bg-[#2a2a2a] text-gray-400 hover:text-white hover:bg-[#333]'
            }`}
          >
            等大小
          </button>
        </div>
        
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
      
      {/* 详情卡片弹窗 */}
      {selectedStock && (
        <StockDetailCard
          stock={selectedStock}
          userId={userId}
          onClose={() => setSelectedStock(null)}
        />
      )}
    </div>
  );
}

