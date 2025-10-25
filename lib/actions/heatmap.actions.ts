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
 * 获取市值缓存数据（每日更新）
 * TODO: 实现 Redis 或数据库缓存，当前直接调用 Finnhub API
 */
export async function getMarketCapCache(symbols: string[]): Promise<Map<string, number>> {
  if (symbols.length === 0) {
    return new Map();
  }

  try {
    // 批量获取股票报价（包含市值）
    const quotesMap = await getBatchStockQuotes(symbols);
    
    // 提取市值数据
    const marketCapMap = new Map<string, number>();
    quotesMap.forEach((data, symbol) => {
      marketCapMap.set(symbol, data.marketCap || 0);
    });

    return marketCapMap;
  } catch (error) {
    console.error('getMarketCapCache error:', error);
    return new Map();
  }
}

/**
 * 获取初始报价快照（用于基准价格）
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
    const quotesMap = await getBatchStockQuotes(symbols);
    
    const initialQuotes = new Map();
    quotesMap.forEach((data, symbol) => {
      initialQuotes.set(symbol, {
        price: data.price || 0,
        change: data.change || 0,
        changePercent: data.changePercent || 0,
        volume: data.previousClose || 0, // 使用前收盘价作为基准
        marketCap: data.marketCap || 0,
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

