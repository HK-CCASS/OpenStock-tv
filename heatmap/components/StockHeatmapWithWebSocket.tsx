// 可选实现：使用WebSocket实时更新的热力图组件
// 这个版本展示了如何集成TradingView WebSocket进行实时数据推送
// 默认使用轮询版本(StockHeatmap.tsx)，如需实时推送可切换到此版本

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { AlertCircle, ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import { TradingViewWebSocket } from '../lib/tradingview-websocket';

// ... 复制 StockHeatmap.tsx 中的所有接口定义 ...
interface ApiStockCell {
  symbol: string;
  name?: string;
  last: number;
  change: number;
  changePercent: number;
  volume?: number;
  category?: string;
  pools?: string[];
  marketCap?: number;
}

interface ApiPool {
  poolName: string;
  stockCount: number;
  avgChangePercent: number;
  totalMarketCap?: number;
  cells: ApiStockCell[];
}

interface ApiHeatmapResponse {
  success: boolean;
  data: {
    pools: ApiPool[];
    allCells: ApiStockCell[];
  };
  error?: string;
}

interface StockData {
  symbol: string;
  name?: string;
  last: number;
  change: number;
  changePercent: number;
  volume?: number;
  category?: string;
  marketCap?: number;
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

export default function StockHeatmapWithWebSocket() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const wsClientRef = useRef<TradingViewWebSocket | null>(null);

  // 初始化数据加载
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/heatmap/data');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const apiResponse: ApiHeatmapResponse = await response.json();
      
      if (!apiResponse.success) {
        throw new Error(apiResponse.error || 'API返回错误');
      }
      
      const transformedData = transformApiData(apiResponse);
      setData(transformedData);
      
      // 提取所有股票代码用于WebSocket订阅
      const allSymbols = apiResponse.data.allCells.map(cell => cell.symbol);
      initializeWebSocket(allSymbols);
      
    } catch (err) {
      console.error('数据加载失败:', err);
      setError('数据加载失败，请检查API连接');
    } finally {
      setLoading(false);
    }
  };

  // 初始化WebSocket连接
  const initializeWebSocket = (symbols: string[]) => {
    try {
      const wsClient = new TradingViewWebSocket('ws://localhost:8001/ws');
      wsClientRef.current = wsClient;
      
      // 设置更新回调
      wsClient.onUpdate((update) => {
        updateStockData(update.symbol, {
          last: update.last,
          change: update.change,
          changePercent: update.changePercent,
          volume: update.volume
        });
      });
      
      // 连接并订阅
      wsClient.connect();
      wsClient.subscribe(symbols);
      setWsConnected(true);
      
      console.log(`WebSocket已连接，订阅了 ${symbols.length} 个股票代码`);
      
    } catch (err) {
      console.error('WebSocket连接失败:', err);
      setWsConnected(false);
    }
  };

  // 更新单个股票数据
  const updateStockData = (symbol: string, updates: Partial<StockData>) => {
    setData(prevData => {
      if (!prevData) return prevData;
      
      const newPools = prevData.pools.map(pool => {
        const newStocks = pool.stocks.map(stock => {
          if (stock.symbol === symbol) {
            const updatedStock = { ...stock, ...updates };
            // 重新计算市值
            if (updates.volume !== undefined || updates.last !== undefined) {
              updatedStock.marketCap = updatedStock.last * (updatedStock.volume || 1000000);
            }
            return updatedStock;
          }
          return stock;
        });
        
        // 重新计算池子统计
        const totalMarketCap = newStocks.reduce((sum, s) => sum + (s.marketCap || 0), 0);
        const avgChangePercent = newStocks.reduce((sum, s) => sum + s.changePercent, 0) / newStocks.length;
        
        return {
          ...pool,
          stocks: newStocks,
          totalMarketCap,
          avgChangePercent
        };
      });
      
      return {
        ...prevData,
        pools: newPools,
        timestamp: new Date()
      };
    });
  };

  // 数据转换函数
  const transformApiData = (apiResponse: ApiHeatmapResponse): HeatmapData => {
    const pools = apiResponse.data.pools.map(apiPool => {
      const stocks: StockData[] = apiPool.cells.map(cell => ({
        symbol: cell.symbol,
        name: cell.name,
        last: cell.last,
        change: cell.change,
        changePercent: cell.changePercent,
        volume: cell.volume,
        category: cell.category,
        marketCap: cell.marketCap || (cell.last * (cell.volume || 1000000))
      }));

      const totalMarketCap = apiPool.totalMarketCap || stocks.reduce((sum, stock) => 
        sum + (stock.marketCap || 0), 0
      );

      return {
        poolName: apiPool.poolName,
        stockCount: apiPool.stockCount,
        avgChangePercent: apiPool.avgChangePercent,
        totalMarketCap,
        stocks
      };
    });

    return {
      pools,
      timestamp: new Date()
    };
  };

  // 组件挂载时初始化
  useEffect(() => {
    fetchInitialData();
    
    return () => {
      // 清理WebSocket连接
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
        wsClientRef.current = null;
      }
    };
  }, []);

  // ECharts渲染逻辑（与StockHeatmap.tsx相同）
  useEffect(() => {
    if (!chartRef.current || !data) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
    }

    const chart = echarts.init(chartRef.current);
    chartInstanceRef.current = chart;

    // ... ECharts配置代码（与StockHeatmap.tsx相同）...

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, [data, selectedPool]);

  if (loading && !data) {
    return (
      <div className="w-full h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">加载数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-[#1a1a1a] flex flex-col overflow-hidden">
      {/* 顶部工具栏 */}
      <div className="bg-[#1f1f1f] border-b border-[#2a2a2a] px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          {selectedPool && (
            <button
              onClick={() => setSelectedPool(null)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#2a2a2a] text-white rounded hover:bg-[#333] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </button>
          )}
          <h1 className="text-white">
            {selectedPool ? selectedPool : '股票市场热力图'}
          </h1>
        </div>
        
        {/* WebSocket连接状态 */}
        <div className="flex items-center gap-2">
          {wsConnected ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-green-500 text-sm">实时连接</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-yellow-500" />
              <span className="text-yellow-500 text-sm">离线模式</span>
            </>
          )}
        </div>
      </div>

      {/* 热力图 */}
      <div className="flex-1 relative min-h-0" style={{ minHeight: 0 }}>
        <div ref={chartRef} className="absolute inset-0" />
      </div>

      {/* 图例 */}
      <div className="bg-[#1f1f1f] border-t border-[#2a2a2a] px-6 py-4 flex-shrink-0">
        <div className="flex flex-col items-center gap-3">
          <span className="text-gray-400 text-sm">涨跌幅颜色</span>
          <div className="flex items-center gap-0 h-8 rounded overflow-hidden shadow-lg">
            {/* 渐变色条 */}
          </div>
        </div>
      </div>
    </div>
  );
}

// 使用说明：
// 1. 在 App.tsx 中导入此组件替代默认的 StockHeatmap
// 2. 确保 TradingView WebSocket 服务运行在 ws://localhost:8001/ws
// 3. WebSocket会自动订阅所有股票代码并实时更新数据
// 4. 如果WebSocket连接失败，组件会显示离线模式状态
