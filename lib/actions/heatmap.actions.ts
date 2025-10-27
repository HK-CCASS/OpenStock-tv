'use server';

import { connectToDatabase } from '@/database/mongoose';
import { WatchlistGroup } from '@/database/models/watchlist-group.model';
import { Watchlist } from '@/database/models/watchlist.model';
import { getBatchStockQuotes } from './finnhub.actions';
import { MarketCapCacheManager } from '@/lib/cache/market-cap-cache-manager';
import { getBatchQuotesFromYahoo, isValidMarketCap } from './yahoo-finance.actions';

interface PoolData {
  poolName: string;
  symbols: Array<{
    symbol: string;
    company: string;
  }>;
}

/**
 * 获取用户的热力图数据（按 category 或 name 分组）
 */
export async function getUserHeatmapData(userId: string): Promise<{
  pools: PoolData[];
}> {
  if (!userId) {
    return { pools: [] };
  }

  try {
    await connectToDatabase();

    // 1. 获取用户所有活跃的分组
    const groups = await WatchlistGroup.find({
      userId,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (groups.length === 0) {
      return { pools: [] };
    }

    // 2. 按 category 或 name 分组
    const poolMap = new Map<string, {
      poolName: string;
      groupIds: string[];
    }>();

    groups.forEach((group) => {
      // 如果有 category，使用 category 作为 pool 名称
      // 否则使用 name 作为独立 pool
      const poolName = group.category || group.name;
      
      if (!poolMap.has(poolName)) {
        poolMap.set(poolName, {
          poolName,
          groupIds: [],
        });
      }
      
      poolMap.get(poolName)!.groupIds.push(String(group._id));
    });

    // 3. 获取每个 pool 的股票
    const pools = await Promise.all(
      Array.from(poolMap.values()).map(async (pool) => {
        const stocks = await Watchlist.find({
          userId,
          groupId: { $in: pool.groupIds },
        })
          .lean();

        return {
          poolName: pool.poolName,
          symbols: stocks.map((s) => ({
            symbol: s.symbol,
            company: s.company,
          })),
        };
      })
    );

    // 过滤掉没有股票的 pool
    const filteredPools = pools.filter(p => p.symbols.length > 0);

    return { pools: filteredPools };
  } catch (error) {
    console.error('getUserHeatmapData error:', error);
    return { pools: [] };
  }
}

/**
 * 获取市值缓存数据（双层缓存 + 多数据源容错）
 * 缓存层次：Redis (L1) → MongoDB (L2) → Yahoo Finance API → Finnhub API → 价格估算
 */
export async function getMarketCapCache(symbols: string[]): Promise<Map<string, {
  marketCap: number;
  price: number;
  source: string;
}>> {
  if (symbols.length === 0) {
    return new Map();
  }

  try {
    const normalizedSymbols = symbols.map(s => s.toUpperCase());

    // 1️⃣ 从双层缓存读取（Redis + MongoDB）
    const cachedData = await MarketCapCacheManager.getMultiple(normalizedSymbols);
    
    const resultMap = new Map<string, { marketCap: number; price: number; source: string }>();
    cachedData.forEach((data, symbol) => {
      resultMap.set(symbol, {
        marketCap: data.marketCap,
        price: data.price,
        source: data.source,
      });
    });

    // 2️⃣ 查找缓存未命中的股票
    const missingSymbols = normalizedSymbols.filter(s => !resultMap.has(s));

    if (missingSymbols.length === 0) {
      console.log(`[MarketCap Cache] ✅ All symbols cached (hit rate: 100%)`);
      return resultMap;
    }

    console.log(
      `[MarketCap Cache] Cache miss: ${missingSymbols.length} symbols | ` +
      `Hit rate: ${((resultMap.size / normalizedSymbols.length) * 100).toFixed(1)}%`
    );

    // 3️⃣ 从 Yahoo Finance 获取缺失数据（批量每批 50 个，与订阅机制保持一致）
    const yahooQuotes = await fetchInBatches(missingSymbols, 50, getBatchQuotesFromYahoo);
    const yahooSymbols = new Set(yahooQuotes.keys());
    const remainingSymbols = missingSymbols.filter(s => !yahooSymbols.has(s));

    // 4️⃣ Yahoo Finance 失败的股票，回退到 Finnhub
    let finnhubQuotes = new Map();
    if (remainingSymbols.length > 0) {
      console.warn(
        `[MarketCap Cache] Yahoo failed for ${remainingSymbols.length} symbols, falling back to Finnhub`
      );
      
      finnhubQuotes = await fetchInBatches(remainingSymbols, 50, getBatchStockQuotes);
    }

    // 5️⃣ 合并数据并写入缓存
    const newCacheData = new Map();

    yahooQuotes.forEach((data, symbol) => {
      let marketCap = data.marketCap || 0;
      let source = 'yahoo';

      // 验证市值有效性（100万 ~ 10万亿美元）
      const isValid = marketCap > 1000000 && marketCap < 10000000000000;
      if (!isValid) {
        marketCap = (data.price || 1) * 1000000000;
        source = 'fallback';
        console.warn(
          `[MarketCap] ${symbol} 市值无效 (Yahoo: ${data.marketCap})，使用估算: ${(marketCap / 1e9).toFixed(2)}B`
        );
      }

      const cacheEntry = {
        marketCap,
        price: data.price || 0,
        source,
        lastUpdated: new Date().toISOString(),
      };

      resultMap.set(symbol, cacheEntry);
      newCacheData.set(symbol, cacheEntry);
    });

    finnhubQuotes.forEach((data: any, symbol) => {
      let marketCap = data.marketCap || 0;
      let source = 'finnhub';

      // 验证市值有效性（100万 ~ 10万亿美元）
      const isValid = marketCap > 1000000 && marketCap < 10000000000000;
      if (!isValid) {
        marketCap = (data.price || 1) * 1000000000;
        source = 'fallback';
      }

      const cacheEntry = {
        marketCap,
        price: data.price || 0,
        source,
        lastUpdated: new Date().toISOString(),
      };

      resultMap.set(symbol, cacheEntry);
      newCacheData.set(symbol, cacheEntry);
    });

    // 6️⃣ 写入双层缓存
    if (newCacheData.size > 0) {
      await MarketCapCacheManager.setMultiple(newCacheData);
      
      const sourceStats = { yahoo: 0, finnhub: 0, fallback: 0 };
      newCacheData.forEach((data: any) => {
        sourceStats[data.source as keyof typeof sourceStats]++;
      });

      console.log(
        `[MarketCap Cache] ✅ Cached ${newCacheData.size} new symbols | ` +
        `Yahoo: ${sourceStats.yahoo} | Finnhub: ${sourceStats.finnhub} | Fallback: ${sourceStats.fallback}`
      );
    }

    return resultMap;
  } catch (error) {
    console.error('[MarketCap Cache] ❌ Critical error:', error);
    
    // 最终回退：直接调用 Finnhub
    const quotesMap = await getBatchStockQuotes(symbols);
    const fallbackMap = new Map();
    quotesMap.forEach((data, symbol) => {
      const marketCap = data.marketCap || (data.price || 1) * 1000000000;
      fallbackMap.set(symbol, {
        marketCap,
        price: data.price || 0,
        source: 'fallback',
      });
    });
    return fallbackMap;
  }
}

/**
 * 分批处理辅助函数
 */
async function fetchInBatches<T>(
  symbols: string[],
  batchSize: number,
  fetchFn: (symbols: string[]) => Promise<Map<string, T>>
): Promise<Map<string, T>> {
  const resultMap = new Map<string, T>();

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    try {
      const batchResults = await fetchFn(batch);
      batchResults.forEach((data, symbol) => {
        resultMap.set(symbol, data);
      });
    } catch (error) {
      console.error(`[Batch ${Math.floor(i / batchSize) + 1}] Failed:`, error);
    }
  }

  return resultMap;
}

/**
 * 获取初始报价快照（用于基准价格）
 * 优先使用缓存的市值数据，报价数据实时获取
 */
export async function getInitialQuotes(symbols: string[]): Promise<Map<string, {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
}>> {
  if (symbols.length === 0) {
    return new Map();
  }

  try {
    // 并行获取报价和市值缓存
    const [quotesMap, marketCapMap] = await Promise.all([
      getBatchStockQuotes(symbols),
      getMarketCapCache(symbols),
    ]);
    
    const initialQuotes = new Map();
    quotesMap.forEach((data, symbol) => {
      const cachedMarketCap = marketCapMap.get(symbol);
      
      initialQuotes.set(symbol, {
        price: data.price || 0,
        change: data.change || 0,
        changePercent: data.changePercent || 0,
        volume: data.previousClose || 0, // 使用前收盘价作为基准
        marketCap: cachedMarketCap?.marketCap || data.marketCap || 0,
      });
    });

    return initialQuotes;
  } catch (error) {
    console.error('getInitialQuotes error:', error);
    return new Map();
  }
}

/**
 * 获取所有用户观察列表的唯一股票代码（用于定时任务）
 */
export async function getAllWatchlistSymbols(): Promise<string[]> {
  try {
    await connectToDatabase();

    const watchlists = await Watchlist.find({})
      .distinct('symbol')
      .lean();

    return watchlists.map(s => String(s));
  } catch (error) {
    console.error('getAllWatchlistSymbols error:', error);
    return [];
  }
}

