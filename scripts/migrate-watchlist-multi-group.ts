import 'dotenv/config';
import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { getOrCreateDefaultGroup } from '@/lib/actions/watchlist-group.actions';

/**
 * 迁移 Watchlist 数据以支持多分组功能
 * 
 * 主要变更：
 * 1. 确保所有记录都有 groupId
 * 2. 删除旧索引 { userId: 1, symbol: 1 }
 * 3. 创建新索引 { userId: 1, symbol: 1, groupId: 1 }
 */
async function migrateWatchlistMultiGroup() {
  console.log('🔄 开始迁移 Watchlist 以支持多分组...\n');
  console.log('⚠️  警告：此操作将修改数据库索引，请确保已备份数据！\n');

  try {
    // 连接数据库
    await connectToDatabase();
    console.log('✅ 数据库连接成功\n');

    // ========== 步骤 1: 统计现有数据 ==========
    console.log('📊 步骤 1: 统计现有数据');
    console.log('─'.repeat(60));

    const totalCount = await Watchlist.countDocuments();
    const withoutGroupCount = await Watchlist.countDocuments({
      $or: [
        { groupId: { $exists: false } },
        { groupId: null },
        { groupId: '' }
      ]
    });

    console.log(`总记录数: ${totalCount}`);
    console.log(`缺少 groupId 的记录: ${withoutGroupCount}`);

    if (totalCount === 0) {
      console.log('\n⚠️  数据库中没有 Watchlist 记录，无需迁移');
      process.exit(0);
    }

    // ========== 步骤 2: 分配默认分组 ==========
    if (withoutGroupCount > 0) {
      console.log(`\n📝 步骤 2: 为 ${withoutGroupCount} 条记录分配默认分组`);
      console.log('─'.repeat(60));

      const itemsWithoutGroup = await Watchlist.find({
        $or: [
          { groupId: { $exists: false } },
          { groupId: null },
          { groupId: '' }
        ]
      });

      // 按用户分组
      const userGroups = new Map<string, any[]>();
      for (const item of itemsWithoutGroup) {
        if (!userGroups.has(item.userId)) {
          userGroups.set(item.userId, []);
        }
        userGroups.get(item.userId)!.push(item);
      }

      console.log(`需要处理 ${userGroups.size} 个用户的数据`);

      let processedCount = 0;
      for (const [userId, items] of userGroups) {
        try {
          // 获取或创建用户的默认分组
          const defaultGroupId = await getOrCreateDefaultGroup(userId);

          if (!defaultGroupId) {
            console.warn(`⚠️  用户 ${userId} 无法获取默认分组，跳过`);
            continue;
          }

          // 批量更新该用户的所有记录
          const itemIds = items.map(item => item._id);
          await Watchlist.updateMany(
            { _id: { $in: itemIds } },
            { $set: { groupId: defaultGroupId } }
          );

          processedCount += items.length;
          console.log(`  ✅ 用户 ${userId}: 更新了 ${items.length} 条记录`);
        } catch (error) {
          console.error(`  ❌ 用户 ${userId} 处理失败:`, error);
        }
      }

      console.log(`\n✅ 已为 ${processedCount} 条记录分配默认分组`);
    } else {
      console.log('\n✅ 步骤 2: 所有记录都已有 groupId，跳过');
    }

    // ========== 步骤 3: 删除旧索引 ==========
    console.log('\n🔧 步骤 3: 更新数据库索引');
    console.log('─'.repeat(60));

    try {
      // 获取现有索引
      const existingIndexes = await Watchlist.collection.indexes();
      console.log('现有索引：');
      existingIndexes.forEach(index => {
        console.log(`  - ${index.name}`);
      });

      // 删除旧索引
      console.log('\n正在删除旧索引: userId_1_symbol_1...');
      try {
        await Watchlist.collection.dropIndex('userId_1_symbol_1');
        console.log('✅ 已删除旧索引');
      } catch (err: any) {
        if (err.code === 27) {
          console.log('ℹ️  旧索引不存在（可能已被删除）');
        } else {
          throw err;
        }
      }
    } catch (error: any) {
      console.error('❌ 删除索引失败:', error.message);
      console.log('⚠️  继续执行后续步骤...');
    }

    // ========== 步骤 4: 创建新索引 ==========
    console.log('\n正在创建新索引...');
    try {
      await Watchlist.createIndexes();
      console.log('✅ 已创建新索引:');
      console.log('  - { userId: 1, symbol: 1, groupId: 1 } (唯一)');
      console.log('  - { userId: 1, groupId: 1 }');
    } catch (error: any) {
      console.error('❌ 创建索引失败:', error.message);
      throw error;
    }

    // ========== 步骤 5: 验证迁移结果 ==========
    console.log('\n✅ 步骤 5: 验证迁移结果');
    console.log('─'.repeat(60));

    const finalWithoutGroup = await Watchlist.countDocuments({
      $or: [
        { groupId: { $exists: false } },
        { groupId: null },
        { groupId: '' }
      ]
    });

    if (finalWithoutGroup === 0) {
      console.log('✅ 所有记录都有 groupId');
    } else {
      console.warn(`⚠️  仍有 ${finalWithoutGroup} 条记录缺少 groupId`);
    }

    // 验证新索引
    const newIndexes = await Watchlist.collection.indexes();
    const hasNewIndex = newIndexes.some(
      index => index.key && index.key.userId && index.key.symbol && index.key.groupId
    );

    if (hasNewIndex) {
      console.log('✅ 新索引已创建成功');
    } else {
      console.warn('⚠️  新索引未找到，请手动检查');
    }

    // 显示最终统计
    console.log('\n📊 最终统计:');
    console.log(`  总记录数: ${await Watchlist.countDocuments()}`);
    console.log(`  有 groupId 的记录: ${await Watchlist.countDocuments({ groupId: { $exists: true } })}`);

    // ========== 完成 ==========
    console.log('\n' + '='.repeat(60));
    console.log('🎉 迁移完成！');
    console.log('='.repeat(60));
    console.log('\n📌 接下来的步骤：');
    console.log('  1. ✅ 部署更新后的代码');
    console.log('  2. ✅ 测试添加/删除股票功能');
    console.log('  3. ✅ 验证同一股票可以出现在多个分组');
    console.log('  4. ✅ 监控应用日志，确保无异常');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 迁移失败:', error);
    console.error('\n建议：');
    console.error('  1. 检查错误信息');
    console.error('  2. 从备份恢复数据库');
    console.error('  3. 修复问题后重新运行迁移');
    process.exit(1);
  }
}

// 运行迁移
migrateWatchlistMultiGroup();

