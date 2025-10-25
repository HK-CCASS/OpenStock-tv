/**
 * 股票报价数据接口
 */
export interface StockQuote {
  symbol: string;
  company: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
}

/**
 * Watchlist信息接口
 */
export interface WatchlistInfo {
  id: number;
  name: string;
  symbolCount: number;
  category?: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  symbols: string[];
}

/**
 * Watchlist详情接口
 */
export interface WatchlistDetail {
  id: number;
  name: string;
  description?: string;
  symbols: Array<{ symbol: string; company: string }>;
  category?: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * API响应通用接口
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 排序选项
 */
export type SortOption =
  | 'changePercent_desc'
  | 'changePercent_asc'
  | 'price_desc'
  | 'price_asc'
  | 'volume_desc'
  | 'symbol_asc';

/**
 * 列数选项
 */
export type ColumnCount = 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * 图表类型
 */
export type ChartType = 'line' | 'area' | 'candlestick';

/**
 * 时间间隔
 */
export type Interval = '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M';

/**
 * 时间范围
 */
export type TimeRange = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '5Y';

/**
 * 股票数据格式（用于TradingView）
 */
export interface StockDataFormat {
  symbol: string;
  company?: string;
  last: number;
  change: number;
  changePercent: number;
  volume?: number;
  category?: string;
  marketCap?: number;
}

/**
 * 热力图数据接口
 */
export interface HeatmapData {
  pools: Array<{
    watchlist: {
      id: number;
      name: string;
      description?: string;
    };
    stocks: StockDataFormat[];
    summary: {
      totalStocks: number;
      avgChangePercent: number;
      totalMarketCap: number;
    };
  }>;
  summary: {
    totalWatchlists: number;
    totalStocks: number;
    totalMarketCap: number;
  };
  dataFreshness: {
    lastUpdated: string;
    totalStocksInDB: number;
  };
}