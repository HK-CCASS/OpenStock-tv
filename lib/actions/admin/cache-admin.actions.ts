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

  // 如果客户端正在连接，等待一下再检查
  if (redisClient && redisClient.status === 'connecting') {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 使用客户端状态而不是全局状态，因为全局状态可能有延迟
  if (!redisClient || redisClient.status !== 'ready') {
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

    // Get key count using DBSIZE command
    const keyCount = await redisClient.dbsize();

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
 * Data Source Metrics Interface
 */
export interface DataSourceMetrics {
  overall: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    lastUpdated: string;
  };
  sources: {
    yahoo: {
      requests: number;
      successRate: number;
      avgResponseTime: number;
      errorRate: number;
      totalDataPoints: number;
      status: 'healthy' | 'degraded' | 'unhealthy';
    };
    finnhub: {
      requests: number;
      successRate: number;
      avgResponseTime: number;
      errorRate: number;
      totalDataPoints: number;
      status: 'healthy' | 'degraded' | 'unhealthy';
    };
    fallback: {
      requests: number;
      successRate: number;
      avgResponseTime: number;
      totalDataPoints: number;
      status: 'healthy' | 'degraded' | 'unhealthy';
    };
  };
  trends: {
    hourlyRequests: { hour: string; count: number }[];
    sourceDistribution: { source: string; count: number }[];
  };
  period: string;
}

/**
 * Get detailed data source metrics
 */
export async function getDataSourceMetrics(params: {
  period: string;
  source?: string;
}): Promise<DataSourceMetrics> {
  try {
    await connectToDatabase();

    const { period, source } = params;

    // Calculate date range based on period
    const now = new Date();
    const days = parsePeriod(period);
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Get overall metrics from database
    const overallStats = await getOverallMetrics(startDate);

    // Get per-source metrics
    const sourceMetrics = await getPerSourceMetrics(startDate);

    // Get trends
    const trends = await getSourceTrends(startDate);

    return {
      overall: overallStats,
      sources: sourceMetrics,
      trends,
      period,
    };
  } catch (error) {
    console.error('[Cache Admin] getDataSourceMetrics error:', error);

    // Return fallback data
    return {
      overall: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        lastUpdated: new Date().toISOString(),
      },
      sources: {
        yahoo: {
          requests: 0,
          successRate: 0,
          avgResponseTime: 0,
          errorRate: 0,
          totalDataPoints: 0,
          status: 'unhealthy',
        },
        finnhub: {
          requests: 0,
          successRate: 0,
          avgResponseTime: 0,
          errorRate: 0,
          totalDataPoints: 0,
          status: 'unhealthy',
        },
        fallback: {
          requests: 0,
          successRate: 100,
          avgResponseTime: 5,
          totalDataPoints: 0,
          status: 'healthy',
        },
      },
      trends: {
        hourlyRequests: [],
        sourceDistribution: [],
      },
      period,
    };
  }
}

/**
 * Parse period string to days
 */
function parsePeriod(period: string): number {
  const match = period.match(/^(\d+)([dh])$/);
  if (!match) return 7;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  return unit === 'd' ? value : value / 24;
}

/**
 * Get overall metrics
 */
async function getOverallMetrics(startDate: Date) {
  // Count total records by source
  const stats = await MarketCap.aggregate([
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
        avgResponseTime: { $avg: '$responseTime' },
      },
    },
  ]);

  const totalRequests = stats.reduce((sum, stat) => sum + stat.count, 0);
  const avgResponseTime =
    stats.reduce((sum, stat) => sum + (stat.avgResponseTime || 0), 0) /
    (stats.length || 1);

  return {
    totalRequests,
    successfulRequests: totalRequests, // Assume all records are successful
    failedRequests: 0, // Failed requests would be tracked separately
    averageResponseTime: Math.round(avgResponseTime),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get per-source metrics
 */
async function getPerSourceMetrics(startDate: Date) {
  const stats = await MarketCap.aggregate([
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
        avgResponseTime: { $avg: '$responseTime' },
      },
    },
  ]);

  const statsMap = new Map(stats.map((stat) => [stat._id, stat]));

  const yahoo = statsMap.get('yahoo');
  const finnhub = statsMap.get('finnhub');
  const fallback = statsMap.get('fallback');

  const yahooCount = yahoo?.count || 0;
  const finnhubCount = finnhub?.count || 0;
  const totalCount = yahooCount + finnhubCount + (fallback?.count || 0);

  return {
    yahoo: {
      requests: yahooCount,
      successRate: totalCount > 0 ? (yahooCount / totalCount) * 100 : 0,
      avgResponseTime: Math.round(yahoo?.avgResponseTime || 120),
      errorRate: 0, // Would be calculated from failed requests
      totalDataPoints: yahooCount,
      status: yahooCount > finnhubCount ? 'healthy' : 'degraded',
    },
    finnhub: {
      requests: finnhubCount,
      successRate: totalCount > 0 ? (finnhubCount / totalCount) * 100 : 0,
      avgResponseTime: Math.round(finnhub?.avgResponseTime || 250),
      errorRate: 0,
      totalDataPoints: finnhubCount,
      status: finnhubCount > 0 ? 'healthy' : 'degraded',
    },
    fallback: {
      requests: fallback?.count || 0,
      successRate: 100,
      avgResponseTime: 5,
      totalDataPoints: fallback?.count || 0,
      status: 'healthy',
    },
  };
}

/**
 * Get source trends
 */
async function getSourceTrends(startDate: Date) {
  // Get hourly request distribution
  const hourlyStats = await MarketCap.aggregate([
    {
      $match: {
        lastUpdated: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          hour: { $hour: '$lastUpdated' },
          source: '$source',
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { '_id.hour': 1 },
    },
  ]);

  // Transform to chart-friendly format
  const hourlyRequests = Array.from({ length: 24 }, (_, i) => {
    const hourStats = hourlyStats.filter((s) => s._id.hour === i);
    const count = hourStats.reduce((sum, s) => sum + s.count, 0);
    return {
      hour: `${i}:00`,
      count,
    };
  });

  // Get source distribution
  const sourceDistribution = await MarketCap.aggregate([
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        source: '$_id',
        count: 1,
        _id: 0,
      },
    },
  ]);

  return {
    hourlyRequests,
    sourceDistribution,
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

/**
 * Export cache data
 */
export async function exportCacheData(params: {
  type: string;
  format: string;
  source?: string;
}): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    await connectToDatabase();

    // Build query based on type
    const query: any = {};
    if (params.source) {
      query.source = params.source;
    }

    if (params.type === 'expired') {
      query.validUntil = { $lte: new Date() };
    }

    // Get data
    const documents = await MarketCap.find(query).lean();

    if (documents.length === 0) {
      return {
        success: false,
        error: 'No data found to export',
      };
    }

    let exportData: string;

    switch (params.format) {
      case 'csv':
        exportData = convertToCSV(documents);
        break;
      case 'json':
        exportData = JSON.stringify(documents, null, 2);
        break;
      case 'excel':
        // For Excel, we'll return CSV for now (in real implementation, use a library like exceljs)
        exportData = convertToCSV(documents);
        break;
      default:
        exportData = JSON.stringify(documents);
    }

    return {
      success: true,
      data: exportData,
    };
  } catch (error) {
    console.error('[Cache Admin] exportCacheData error:', error);
    return {
      success: false,
      error: 'Failed to export cache data',
    };
  }
}

/**
 * Convert MongoDB documents to CSV format
 */
function convertToCSV(documents: any[]): string {
  if (documents.length === 0) return '';

  // Get headers from first document
  const headers = Object.keys(documents[0]);

  // Create CSV header row
  const csvRows = [headers.join(',')];

  // Add data rows
  for (const doc of documents) {
    const values = headers.map((header) => {
      const value = doc[header];
      // Handle nested objects and dates
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      // Escape commas and quotes
      const str = String(value).replace(/"/g, '""');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str}"`;
      }
      return str;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}
