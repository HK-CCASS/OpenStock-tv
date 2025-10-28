'use server';

import { getRedisClient, isRedisAvailable } from '@/lib/redis/client';
import { connectToDatabase } from '@/database/mongoose';
import { MarketCap } from '@/database/models/market-cap.model';

/**
 * Cache Overview Data Interface
 */
export interface CacheOverview {
  redis: {
    status: 'connected' | 'disconnected';
    hitRate: number;
    keyCount: number;
    memoryUsage: string;
  };
  mongodb: {
    status: 'connected' | 'error';
    recordCount: number;
    hitRate: number;
    expiredCount: number;
  };
  dataSources: {
    yahoo: { success: number; failed: number; };
    finnhub: { success: number; failed: number; };
    fallback: { count: number; };
  };
  performance: {
    avgResponseTime: number;
    cacheHitTrend: number[];
    topSymbols: string[];
  };
  updatedAt: string;
}

/**
 * Get cache overview statistics
 * Returns real-time status of Redis L1, MongoDB L2, and data sources
 */
export async function getCacheOverview(): Promise<CacheOverview> {
  try {
    // Get Redis stats
    const redisStats = await getRedisStats();

    // Get MongoDB stats
    const mongoStats = await getMongoDBStats();

    // Get data source stats
    const dataSourceStats = await getDataSourceStats();

    // Get performance metrics
    const performanceStats = await getPerformanceStats();

    const overview: CacheOverview = {
      redis: redisStats,
      mongodb: mongoStats,
      dataSources: dataSourceStats,
      performance: performanceStats,
      updatedAt: new Date().toISOString(),
    };

    return overview;
  } catch (error) {
    console.error('[Cache Admin] getCacheOverview error:', error);

    // Return fallback data on error
    return {
      redis: {
        status: 'disconnected',
        hitRate: 0,
        keyCount: 0,
        memoryUsage: '0MB',
      },
      mongodb: {
        status: 'error',
        recordCount: 0,
        hitRate: 0,
        expiredCount: 0,
      },
      dataSources: {
        yahoo: { success: 0, failed: 0 },
        finnhub: { success: 0, failed: 0 },
        fallback: { count: 0 },
      },
      performance: {
        avgResponseTime: 0,
        cacheHitTrend: [],
        topSymbols: [],
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Get Redis statistics
 */
async function getRedisStats() {
  const redisClient = getRedisClient();
  const isConnected = isRedisAvailable();

  if (!isConnected || !redisClient) {
    return {
      status: 'disconnected' as const,
      hitRate: 0,
      keyCount: 0,
      memoryUsage: '0MB',
    };
  }

  try {
    // Get Redis info
    const info = await redisClient.info('memory');
    const keyCount = await redisClient.dbSize();

    // Parse memory info
    const memoryMatch = info.match(/used_memory_human:(\S+)/);
    const memoryUsage = memoryMatch ? memoryMatch[1] : '0MB';

    // Get cache hit rate (approximate)
    // In real implementation, you'd track this via custom metrics
    const hitRate = 95.0; // Placeholder - should be calculated from logs

    return {
      status: 'connected' as const,
      hitRate,
      keyCount,
      memoryUsage,
    };
  } catch (error) {
    console.error('[Redis] Stats error:', error);
    return {
      status: 'disconnected' as const,
      hitRate: 0,
      keyCount: 0,
      memoryUsage: '0MB',
    };
  }
}

/**
 * Get MongoDB statistics
 */
async function getMongoDBStats() {
  try {
    await connectToDatabase();

    // Get total record count
    const totalCount = await MarketCap.countDocuments();

    // Get valid (non-expired) record count
    const validCount = await MarketCap.countDocuments({
      validUntil: { $gt: new Date() },
    });

    // Get expired record count
    const expiredCount = totalCount - validCount;

    // Calculate hit rate (approximate)
    // In real implementation, track cache misses
    const hitRate = totalCount > 0 ? (validCount / totalCount) * 100 : 0;

    return {
      status: 'connected' as const,
      recordCount: totalCount,
      hitRate: Math.round(hitRate * 10) / 10,
      expiredCount,
    };
  } catch (error) {
    console.error('[MongoDB] Stats error:', error);
    return {
      status: 'error' as const,
      recordCount: 0,
      hitRate: 0,
      expiredCount: 0,
    };
  }
}

/**
 * Get data source statistics
 */
async function getDataSourceStats() {
  try {
    await connectToDatabase();

    // Group by source and count
    const sourceStats = await MarketCap.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
        },
      },
    ]);

    const statsMap = new Map(sourceStats.map((stat) => [stat._id, stat.count]));

    return {
      yahoo: {
        success: statsMap.get('yahoo') || 0,
        failed: 0, // Failed attempts would be in a separate collection
      },
      finnhub: {
        success: statsMap.get('finnhub') || 0,
        failed: 0,
      },
      fallback: {
        count: statsMap.get('fallback') || 0,
      },
    };
  } catch (error) {
    console.error('[Data Sources] Stats error:', error);
    return {
      yahoo: { success: 0, failed: 0 },
      finnhub: { success: 0, failed: 0 },
      fallback: { count: 0 },
    };
  }
}

/**
 * Get performance statistics
 */
async function getPerformanceStats() {
  // Placeholder for performance metrics
  // In real implementation, you would track:
  // - Average response time from logs
  // - Cache hit rate trends over time
  // - Most accessed symbols

  return {
    avgResponseTime: 245, // ms
    cacheHitTrend: [95, 96, 95, 97, 96, 98, 98], // Last 7 days
    topSymbols: [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
      'META', 'NVDA', 'BRK.A', 'JPM', 'V',
    ],
  };
}

/**
 * Cache Data Interface for pagination
 */
export interface CacheDataItem {
  symbol: string;
  marketCap: number;
  price: number;
  source: string;
  lastUpdated: string;
  validUntil: string;
  status: 'valid' | 'expired' | 'expiring_soon';
}

export interface CacheDataFilters {
  source?: string;
  status?: string;
  search?: string;
}

export interface PaginatedCacheData {
  items: CacheDataItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Get paginated cache data with filters
 */
export async function getCacheData(params: {
  page: number;
  pageSize: number;
  filters?: CacheDataFilters;
}): Promise<PaginatedCacheData> {
  try {
    await connectToDatabase();

    const { page, pageSize, filters = {} } = params;
    const skip = (page - 1) * pageSize;

    // Build query
    const query: any = {};

    if (filters.source) {
      query.source = filters.source;
    }

    if (filters.status) {
      const now = new Date();
      if (filters.status === 'expired') {
        query.validUntil = { $lte: now };
      } else if (filters.status === 'valid') {
        query.validUntil = { $gt: now };
      } else if (filters.status === 'expiring_soon') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        query.validUntil = {
          $gt: now,
          $lte: tomorrow,
        };
      }
    }

    if (filters.search) {
      query.symbol = { $regex: filters.search, $options: 'i' };
    }

    // Get total count
    const total = await MarketCap.countDocuments(query);

    // Get data
    const documents = await MarketCap.find(query)
      .sort({ symbol: 1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Transform data
    const items: CacheDataItem[] = documents.map((doc) => {
      const now = new Date();
      const validUntil = new Date(doc.validUntil);
      let status: 'valid' | 'expired' | 'expiring_soon' = 'valid';

      if (validUntil <= now) {
        status = 'expired';
      } else if (validUntil <= new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
        status = 'expiring_soon';
      }

      return {
        symbol: doc.symbol,
        marketCap: doc.marketCap,
        price: doc.price,
        source: doc.source,
        lastUpdated: doc.lastUpdated.toISOString(),
        validUntil: doc.validUntil.toISOString(),
        status,
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error('[Cache Admin] getCacheData error:', error);
    return {
      items: [],
      total: 0,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: 0,
    };
  }
}

/**
 * Update a single cache entry
 */
export async function updateCacheEntry(symbol: string, data: {
  marketCap?: number;
  price?: number;
  source?: string;
}) {
  try {
    await connectToDatabase();

    const updateData: any = {};
    if (data.marketCap !== undefined) updateData.marketCap = data.marketCap;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.source !== undefined) updateData.source = data.source;

    // Update validUntil to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    updateData.validUntil = tomorrow;

    const result = await MarketCap.findOneAndUpdate(
      { symbol: symbol.toUpperCase() },
      { $set: updateData },
      { new: true, upsert: false }
    );

    return {
      success: !!result,
      data: result,
    };
  } catch (error) {
    console.error('[Cache Admin] updateCacheEntry error:', error);
    return {
      success: false,
      error: 'Failed to update cache entry',
    };
  }
}

/**
 * Delete cache entries
 */
export async function deleteCacheEntries(symbols: string[]) {
  try {
    await connectToDatabase();

    const upperSymbols = symbols.map(s => s.toUpperCase());
    const result = await MarketCap.deleteMany({
      symbol: { $in: upperSymbols },
    });

    return {
      success: true,
      deletedCount: result.deletedCount,
    };
  } catch (error) {
    console.error('[Cache Admin] deleteCacheEntries error:', error);
    return {
      success: false,
      error: 'Failed to delete cache entries',
    };
  }
}

/**
 * Clear cache (dangerous operation)
 */
export async function clearCache(params: {
  redis?: boolean;
  mongodb?: boolean;
  expired?: boolean;
  bySource?: string;
  symbols?: string[];
}) {
  try {
    const results: any = {};

    // Clear Redis if requested
    if (params.redis) {
      const redisClient = getRedisClient();
      if (redisClient) {
        await redisClient.flushdb();
        results.redis = { success: true };
      } else {
        results.redis = { success: false, error: 'Redis not available' };
      }
    }

    // Clear MongoDB if requested
    if (params.mongodb) {
      await connectToDatabase();

      const query: any = {};
      if (params.expired) {
        query.validUntil = { $lte: new Date() };
      }
      if (params.bySource) {
        query.source = params.bySource;
      }
      if (params.symbols) {
        query.symbol = { $in: params.symbols.map(s => s.toUpperCase()) };
      }

      const result = await MarketCap.deleteMany(query);
      results.mongodb = {
        success: true,
        deletedCount: result.deletedCount,
      };
    }

    return {
      success: true,
      results,
    };
  } catch (error) {
    console.error('[Cache Admin] clearCache error:', error);
    return {
      success: false,
      error: 'Failed to clear cache',
    };
  }
}
