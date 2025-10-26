import 'dotenv/config';  // 显式加载 .env 文件
import { connectToDatabase } from '@/database/mongoose';
import { getRedisClient, isRedisAvailable } from '@/lib/redis/client';

/**
 * 查看市值缓存状态
 */
async function checkCacheStatus() {
  console.log('🔍 检查市值缓存状态...\n');

  try {
    // 1️⃣ 检查 MongoDB 缓存
    console.log('============================================================');
    console.log('📊 MongoDB (L2 缓存) 状态');
    console.log('============================================================\n');

    await connectToDatabase();
    const { MarketCap } = await import('@/database/models/market-cap.model');

    const now = new Date();

    // 统计总数
    const totalCount = await MarketCap.countDocuments();
    console.log(`✅ 总缓存数量: ${totalCount} 条`);

    // 统计有效缓存
    const validCount = await MarketCap.countDocuments({
      validUntil: { $gt: now },
    });
    console.log(`✅ 有效缓存数量: ${validCount} 条`);
    console.log(`⏰ 过期缓存数量: ${totalCount - validCount} 条`);

    // 统计数据源分布
    const sourceStats = await MarketCap.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]);

    console.log('\n📈 数据源分布:');
    sourceStats.forEach((stat: any) => {
      console.log(`  ${stat._id.padEnd(10)}: ${stat.count} 条`);
    });

    // 显示最近更新的 10 条记录
    console.log('\n📝 最近更新的 10 条记录:');
    const recentRecords = await MarketCap.find()
      .sort({ lastUpdated: -1 })
      .limit(10)
      .lean();

    recentRecords.forEach((record: any) => {
      const isValid = new Date(record.validUntil) > now;
      const status = isValid ? '✅' : '❌';
      console.log(
        `  ${status} ${record.symbol.padEnd(8)} | ` +
          `市值: $${(record.marketCap / 1e9).toFixed(2).padStart(8)}B | ` +
          `来源: ${record.source.padEnd(8)} | ` +
          `更新: ${new Date(record.lastUpdated).toLocaleString()}`
      );
    });

    // 2️⃣ 检查 Redis 缓存
    console.log('\n============================================================');
    console.log('⚡ Redis (L1 缓存) 状态');
    console.log('============================================================\n');

    let keys: string[] = []; // 定义在外部作用域

    if (isRedisAvailable()) {
      const redis = getRedisClient();
      if (redis) {
        // 获取所有市值缓存 key
        keys = await redis.keys('marketcap:*');
        console.log(`✅ Redis 缓存数量: ${keys.length} 条`);

        if (keys.length > 0) {
          console.log('\n📝 Redis 缓存示例（前 10 条）:');
          const sampleKeys = keys.slice(0, 10);

          for (const key of sampleKeys) {
            const data = await redis.get(key);
            const ttl = await redis.ttl(key);

            if (data) {
              try {
                const parsed = JSON.parse(data);
                const symbol = key.replace('marketcap:', '');
                console.log(
                  `  ✅ ${symbol.padEnd(8)} | ` +
                    `市值: $${(parsed.marketCap / 1e9).toFixed(2).padStart(8)}B | ` +
                    `来源: ${parsed.source.padEnd(8)} | ` +
                    `TTL: ${ttl}s`
                );
              } catch (err) {
                console.warn(`  ⚠️ 无法解析: ${key}`);
              }
            }
          }
        }

        // 显示 Redis 内存使用
        const info = await redis.info('memory');
        const usedMemory = info.match(/used_memory_human:(.*)/)?.[1]?.trim();
        if (usedMemory) {
          console.log(`\n💾 Redis 内存使用: ${usedMemory}`);
        }
      }
    } else {
      console.log('⚠️ Redis 不可用（系统已降级到纯 MongoDB 模式）');
      console.log('提示: 运行 `docker compose up -d redis` 启动 Redis');
    }

    // 3️⃣ 性能统计
    console.log('\n============================================================');
    console.log('📊 性能统计');
    console.log('============================================================\n');

    const cacheHitRate = keys.length > 0 ? (keys.length / totalCount) * 100 : 0;
    console.log(`📈 预估缓存命中率:`);
    console.log(`  L1 (Redis):   ${cacheHitRate.toFixed(1)}%`);
    console.log(`  L2 (MongoDB): ${((validCount / totalCount) * 100).toFixed(1)}%`);
    console.log(`  总命中率:     ${(((keys.length + validCount) / (totalCount * 2)) * 100).toFixed(1)}%`);

    console.log('\n✅ 检查完成！');
  } catch (error) {
    console.error('\n❌ 检查失败:', error);
    process.exit(1);
  }
}

// 运行检查
checkCacheStatus().then(() => process.exit(0));

