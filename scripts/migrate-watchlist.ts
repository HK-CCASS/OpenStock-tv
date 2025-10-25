/**
 * Watchlist数据迁移脚本
 * 为现有的watchlist数据创建默认分组
 * 
 * 使用方法:
 * npx tsx scripts/migrate-watchlist.ts
 */

import { connectToDatabase } from '../database/mongoose';
import { Watchlist } from '../database/models/watchlist.model';
import { WatchlistGroup } from '../database/models/watchlist-group.model';

async function migrateWatchlistData() {
  console.log('🚀 Starting watchlist data migration...\n');

  try {
    // 连接数据库
    await connectToDatabase();
    console.log('✅ Connected to MongoDB\n');

    // 获取所有唯一的userId
    const uniqueUserIds = await Watchlist.distinct('userId');
    console.log(`📊 Found ${uniqueUserIds.length} unique users with watchlist data\n`);

    let migratedUsers = 0;
    let createdGroups = 0;
    let updatedItems = 0;

    for (const userId of uniqueUserIds) {
      console.log(`\n👤 Processing user: ${userId}`);

      // 检查用户是否已有默认分组
      let defaultGroup = await WatchlistGroup.findOne({
        userId,
        name: '我的自选',
      });

      if (!defaultGroup) {
        // 创建默认分组
        defaultGroup = await WatchlistGroup.create({
          userId,
          name: '我的自选',
          category: '默认',
          isSystem: true,
          isActive: true,
        });
        createdGroups++;
        console.log(`  ✅ Created default group for user`);
      } else {
        console.log(`  ℹ️  Default group already exists`);
      }

      // 获取该用户所有没有groupId的watchlist items
      const itemsWithoutGroup = await Watchlist.find({
        userId,
        $or: [
          { groupId: { $exists: false } },
          { groupId: null },
          { groupId: '' },
        ],
      });

      if (itemsWithoutGroup.length > 0) {
        // 更新这些items，设置groupId为默认分组
        const result = await Watchlist.updateMany(
          {
            userId,
            $or: [
              { groupId: { $exists: false } },
              { groupId: null },
              { groupId: '' },
            ],
          },
          {
            $set: { groupId: defaultGroup._id.toString() },
          }
        );

        updatedItems += result.modifiedCount;
        console.log(`  ✅ Updated ${result.modifiedCount} watchlist items`);
      } else {
        console.log(`  ℹ️  All items already have groupId`);
      }

      migratedUsers++;
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Migration completed successfully!');
    console.log('='.repeat(50));
    console.log(`\n📊 Summary:`);
    console.log(`  - Total users processed: ${migratedUsers}`);
    console.log(`  - Default groups created: ${createdGroups}`);
    console.log(`  - Watchlist items updated: ${updatedItems}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// 执行迁移
migrateWatchlistData()
  .then(() => {
    console.log('✅ Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script error:', error);
    process.exit(1);
  });

