'use server';

import { connectToDatabase } from '@/database/mongoose';
import { WatchlistGroup } from '@/database/models/watchlist-group.model';
import { Watchlist } from '@/database/models/watchlist.model';
import { getBatchStockQuotes } from './finnhub.actions';

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
 * 获取市值缓存数据（MongoDB + API 回退）
 * 优先从数据库读取，如果缺失或过期则调用 API 并更新缓存
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
    await connectToDatabase();
    const { MarketCap } = await import('@/database/models/market-cap.model');

    const now = new Date();
    const normalizedSymbols = symbols.map(s => s.toUpperCase());

    // 1. 从数据库查询有效缓存
    const cachedData = await MarketCap.find({
      symbol: { $in: normalizedSymbols },
      validUntil: { $gt: now },
    }).lean();

    const resultMap = new Map<string, { marketCap: number; price: number; source: string }>();
    const cachedSymbols = new Set<string>();

    // 2. 填充已缓存的数据
    cachedData.forEach((item: any) => {
      resultMap.set(item.symbol, {
        marketCap: item.marketCap,
        price: item.price,
        source: item.source,
      });
      cachedSymbols.add(item.symbol);
    });

    // 3. 查找缺失或过期的股票代码
    const missingSymbols = normalizedSymbols.filter(s => !cachedSymbols.has(s));

    // 4. 如果有缺失的，从 API 获取并缓存
    if (missingSymbols.length > 0) {
      console.log(`[MarketCap Cache] Fetching ${missingSymbols.length} missing symbols from API`);
      
      const quotesMap = await getBatchStockQuotes(missingSymbols);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      // 批量更新数据库
      const bulkOps = Array.from(quotesMap.entries()).map(([symbol, data]) => {
        let marketCap = data.marketCap || 0;
        let source = 'finnhub';

        // 如果市值无效，使用价格估算
        if (marketCap <= 0) {
          marketCap = (data.price || 1) * 1000000000;
          source = 'fallback';
          console.warn(
            `[MarketCap Cache] ${symbol} 市值无效，使用回退值: ${(marketCap / 1000000000).toFixed(2)}B`
          );
        }

        // 添加到结果
        resultMap.set(symbol, {
          marketCap,
          price: data.price || 0,
          source,
        });

        // 准备数据库更新操作
        return {
          updateOne: {
            filter: { symbol },
            update: {
              $set: {
                marketCap,
                price: data.price || 0,
                source,
                lastUpdated: now,
                validUntil: tomorrow,
              },
            },
            upsert: true,
          },
        };
      });

      if (bulkOps.length > 0) {
        await MarketCap.bulkWrite(bulkOps);
        console.log(`[MarketCap Cache] Updated ${bulkOps.length} symbols in database`);
      }
    }

    return resultMap;
  } catch (error) {
    console.error('getMarketCapCache error:', error);
    // 回退到直接 API 调用
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

