import { connectToDatabase } from '@/database/mongoose';
import { getRedisClient, isRedisAvailable } from '@/lib/redis/client';

interface MarketCapData {
  marketCap: number;
  price: number;
  source: string;
  lastUpdated: string;
}

const CACHE_TTL = 24 * 60 * 60; // 24 小时（秒）
const REDIS_KEY_PREFIX = 'marketcap:';

/**
 * 双层缓存管理器：Redis (L1) + MongoDB (L2)
 */
export class MarketCapCacheManager {
  /**
   * 批量获取缓存数据
   */
  static async getMultiple(symbols: string[]): Promise<Map<string, MarketCapData>> {
    const normalizedSymbols = symbols.map(s => s.toUpperCase());
    const resultMap = new Map<string, MarketCapData>();
    const missingFromRedis: string[] = [];

    // 1️⃣ 批量从 Redis 读取
    if (isRedisAvailable()) {
      const redisResults = await this.getMultipleFromRedis(normalizedSymbols);
      redisResults.forEach((data, symbol) => {
        resultMap.set(symbol, data);
      });
      
      normalizedSymbols.forEach(s => {
        if (!resultMap.has(s)) {
          missingFromRedis.push(s);
        }
      });

      if (redisResults.size > 0) {
        console.log(
          `[Cache L1] Hit rate: ${((redisResults.size / normalizedSymbols.length) * 100).toFixed(1)}% (${redisResults.size}/${normalizedSymbols.length})`
        );
      }
    } else {
      missingFromRedis.push(...normalizedSymbols);
    }

    // 2️⃣ 从 MongoDB 读取 Redis 未命中的数据
    if (missingFromRedis.length > 0) {
      const mongoResults = await this.getMultipleFromMongo(missingFromRedis);
      
      // 回写到 Redis
      if (isRedisAvailable() && mongoResults.size > 0) {
        await this.setMultipleToRedis(mongoResults);
      }

      mongoResults.forEach((data, symbol) => {
        resultMap.set(symbol, data);
      });

      if (mongoResults.size > 0) {
        console.log(
          `[Cache L2] Hit rate: ${((mongoResults.size / missingFromRedis.length) * 100).toFixed(1)}% (${mongoResults.size}/${missingFromRedis.length})`
        );
      }
    }

    return resultMap;
  }

  /**
   * 批量写入缓存（同时写入 Redis 和 MongoDB）
   */
  static async setMultiple(dataMap: Map<string, MarketCapData>): Promise<void> {
    const promises: Promise<void>[] = [
      this.setMultipleToMongo(dataMap),
    ];

    if (isRedisAvailable()) {
      promises.push(this.setMultipleToRedis(dataMap));
    }

    await Promise.all(promises);
  }

  // ========== Redis 操作 ==========

  private static async getMultipleFromRedis(symbols: string[]): Promise<Map<string, MarketCapData>> {
    const resultMap = new Map<string, MarketCapData>();

    try {
      const redis = getRedisClient();
      if (!redis) return resultMap;

      const keys = symbols.map(s => REDIS_KEY_PREFIX + s);
      const values = await redis.mget(...keys);

      values.forEach((value, index) => {
        if (value) {
          try {
            const data = JSON.parse(value);
            resultMap.set(symbols[index], data);
          } catch (err) {
            console.warn(`[Redis] Failed to parse data for ${symbols[index]}`);
          }
        }
      });
    } catch (error) {
      console.warn('[Redis] Batch get failed:', error);
    }

    return resultMap;
  }

  private static async setMultipleToRedis(dataMap: Map<string, MarketCapData>): Promise<void> {
    try {
      const redis = getRedisClient();
      if (!redis) return;

      const pipeline = redis.pipeline();
      
      dataMap.forEach((data, symbol) => {
        const key = REDIS_KEY_PREFIX + symbol;
        pipeline.setex(key, CACHE_TTL, JSON.stringify(data));
      });

      await pipeline.exec();
      console.log(`[Redis] ✅ Cached ${dataMap.size} symbols`);
    } catch (error) {
      console.warn('[Redis] Batch set failed:', error);
    }
  }

  // ========== MongoDB 操作 ==========

  private static async getMultipleFromMongo(symbols: string[]): Promise<Map<string, MarketCapData>> {
    const resultMap = new Map<string, MarketCapData>();

    try {
      await connectToDatabase();
      const { MarketCap } = await import('@/database/models/market-cap.model');

      const now = new Date();
      const cached = await MarketCap.find({
        symbol: { $in: symbols },
        validUntil: { $gt: now },
      }).lean();

      cached.forEach((item: any) => {
        resultMap.set(item.symbol, {
          marketCap: item.marketCap,
          price: item.price,
          source: item.source,
          lastUpdated: item.lastUpdated.toISOString(),
        });
      });
    } catch (error) {
      console.warn('[MongoDB] Batch get failed:', error);
    }

    return resultMap;
  }

  private static async setMultipleToMongo(dataMap: Map<string, MarketCapData>): Promise<void> {
    try {
      await connectToDatabase();
      const { MarketCap } = await import('@/database/models/market-cap.model');

      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const bulkOps = Array.from(dataMap.entries()).map(([symbol, data]) => ({
        updateOne: {
          filter: { symbol },
          update: {
            $set: {
              marketCap: data.marketCap,
              price: data.price,
              source: data.source,
              lastUpdated: now,
              validUntil: tomorrow,
            },
          },
          upsert: true,
        },
      }));

      await MarketCap.bulkWrite(bulkOps);
      console.log(`[MongoDB] ✅ Cached ${bulkOps.length} symbols`);
    } catch (error) {
      console.warn('[MongoDB] Batch set failed:', error);
    }
  }
}

