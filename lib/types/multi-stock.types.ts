/**
 * Multi-Stock模块类型定义
 */

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
    marketCap: number; // 市值（单位：美元）
    timestamp: number;
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
    | 'marketCap_desc'
    | 'marketCap_asc'
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

