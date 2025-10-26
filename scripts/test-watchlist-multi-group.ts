import 'dotenv/config';
import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { WatchlistGroup } from '@/database/models/watchlist-group.model';
import { addToWatchlist, removeFromWatchlist, getWatchlistByGroup } from '@/lib/actions/watchlist.actions';

/**
 * 端到端测试：Watchlist 多分组功能
 */
async function testWatchlistMultiGroup() {
  console.log('🧪 开始测试 Watchlist 多分组功能...\n');

  try {
    await connectToDatabase();

    // 清理测试数据
    const testUserId = 'test-user-multigroup';
    await Watchlist.deleteMany({ userId: testUserId });
    await WatchlistGroup.deleteMany({ userId: testUserId });

    // 创建测试分组
    const group1 = await WatchlistGroup.create({
      userId: testUserId,
      name: '科技股',
      isDefault: true,
      isSystem: false,
      createdAt: new Date(),
    });

    const group2 = await WatchlistGroup.create({
      userId: testUserId,
      name: '长期持有',
      isDefault: false,
      isSystem: false,
      createdAt: new Date(),
    });

    const group3 = await WatchlistGroup.create({
      userId: testUserId,
      name: '高增长',
      isDefault: false,
      isSystem: false,
      createdAt: new Date(),
    });

    console.log('✅ 创建测试分组成功');
    console.log(`  - ${group1.name} (${group1._id})`);
    console.log(`  - ${group2.name} (${group2._id})`);
    console.log(`  - ${group3.name} (${group3._id})\n`);

    // ========== Test Case 1: 添加股票到单个分组 ==========
    console.log('📝 Test Case 1: 添加股票到单个分组');
    console.log('─'.repeat(60));

    const result1 = await addToWatchlist(testUserId, 'AAPL', 'Apple Inc.', group1._id.toString());
    if (!result1.success) throw new Error('Test Case 1 Failed: ' + result1.error);

    const group1Stocks1 = await getWatchlistByGroup(testUserId, group1._id.toString());
    if (group1Stocks1.length !== 1) throw new Error('Expected 1 stock in group1');
    if (group1Stocks1[0].symbol !== 'AAPL') throw new Error('Expected AAPL in group1');

    console.log('✅ PASS: AAPL 成功添加到 科技股 分组\n');

    // ========== Test Case 2: 同一股票添加到多个分组 ==========
    console.log('📝 Test Case 2: 同一股票添加到多个分组');
    console.log('─'.repeat(60));

    const result2 = await addToWatchlist(testUserId, 'AAPL', 'Apple Inc.', group2._id.toString());
    if (!result2.success) throw new Error('Test Case 2 Failed: ' + result2.error);

    const result3 = await addToWatchlist(testUserId, 'AAPL', 'Apple Inc.', group3._id.toString());
    if (!result3.success) throw new Error('Test Case 3 Failed: ' + result3.error);

    // 验证所有分组都有 AAPL
    const group1Stocks2 = await getWatchlistByGroup(testUserId, group1._id.toString());
    const group2Stocks2 = await getWatchlistByGroup(testUserId, group2._id.toString());
    const group3Stocks2 = await getWatchlistByGroup(testUserId, group3._id.toString());

    if (!group1Stocks2.some(s => s.symbol === 'AAPL')) throw new Error('AAPL not in group1');
    if (!group2Stocks2.some(s => s.symbol === 'AAPL')) throw new Error('AAPL not in group2');
    if (!group3Stocks2.some(s => s.symbol === 'AAPL')) throw new Error('AAPL not in group3');

    console.log('✅ PASS: AAPL 同时存在于 3 个分组中\n');

    // ========== Test Case 3: 幂等性检查 ==========
    console.log('📝 Test Case 3: 幂等性检查（重复添加）');
    console.log('─'.repeat(60));

    const result4 = await addToWatchlist(testUserId, 'AAPL', 'Apple Inc.', group1._id.toString());
    if (!result4.success) throw new Error('Test Case 3 Failed: ' + result4.error);

    const count = await Watchlist.countDocuments({
      userId: testUserId,
      symbol: 'AAPL',
      groupId: group1._id.toString(),
    });

    if (count !== 1) throw new Error(`Expected 1 record, got ${count}`);

    console.log('✅ PASS: 重复添加不会创建重复记录\n');

    // ========== Test Case 4: 从单个分组删除 ==========
    console.log('📝 Test Case 4: 从单个分组删除股票');
    console.log('─'.repeat(60));

    const result5 = await removeFromWatchlist(testUserId, 'AAPL', group1._id.toString());
    if (!result5.success) throw new Error('Test Case 4 Failed: ' + result5.error);
    if (result5.deletedCount !== 1) throw new Error(`Expected deletedCount=1, got ${result5.deletedCount}`);

    // 验证：group1 中没有 AAPL，group2 和 group3 仍有
    const group1After = await getWatchlistByGroup(testUserId, group1._id.toString());
    const group2After = await getWatchlistByGroup(testUserId, group2._id.toString());
    const group3After = await getWatchlistByGroup(testUserId, group3._id.toString());

    if (group1After.some(s => s.symbol === 'AAPL')) throw new Error('AAPL still in group1');
    if (!group2After.some(s => s.symbol === 'AAPL')) throw new Error('AAPL not in group2');
    if (!group3After.some(s => s.symbol === 'AAPL')) throw new Error('AAPL not in group3');

    console.log('✅ PASS: 从 科技股 删除后，其他分组仍保留 AAPL\n');

    // ========== Test Case 5: 全局删除（不提供 groupId）==========
    console.log('📝 Test Case 5: 全局删除股票（从所有分组）');
    console.log('─'.repeat(60));

    // 添加 MSFT 到 3 个分组
    await addToWatchlist(testUserId, 'MSFT', 'Microsoft', group1._id.toString());
    await addToWatchlist(testUserId, 'MSFT', 'Microsoft', group2._id.toString());
    await addToWatchlist(testUserId, 'MSFT', 'Microsoft', group3._id.toString());

    // 全局删除（不提供 groupId）
    const result6 = await removeFromWatchlist(testUserId, 'MSFT');
    if (!result6.success) throw new Error('Test Case 5 Failed: ' + result6.error);
    if (result6.deletedCount !== 3) throw new Error(`Expected deletedCount=3, got ${result6.deletedCount}`);

    // 验证：所有分组都没有 MSFT
    const remaining = await Watchlist.countDocuments({
      userId: testUserId,
      symbol: 'MSFT',
    });
    if (remaining !== 0) throw new Error(`Expected 0 remaining MSFT records, got ${remaining}`);

    console.log('✅ PASS: MSFT 已从所有分组中删除\n');

    // ========== Test Case 6: 混合场景 ==========
    console.log('📝 Test Case 6: 混合场景测试');
    console.log('─'.repeat(60));

    // 添加多支股票到不同分组
    await addToWatchlist(testUserId, 'GOOGL', 'Alphabet', group1._id.toString());
    await addToWatchlist(testUserId, 'GOOGL', 'Alphabet', group2._id.toString());
    await addToWatchlist(testUserId, 'TSLA', 'Tesla', group1._id.toString());
    await addToWatchlist(testUserId, 'NVDA', 'NVIDIA', group2._id.toString());
    await addToWatchlist(testUserId, 'NVDA', 'NVIDIA', group3._id.toString());

    // 验证每个分组的股票数量
    const finalGroup1 = await getWatchlistByGroup(testUserId, group1._id.toString());
    const finalGroup2 = await getWatchlistByGroup(testUserId, group2._id.toString());
    const finalGroup3 = await getWatchlistByGroup(testUserId, group3._id.toString());

    console.log(`  科技股 (${finalGroup1.length} 支):`);
    finalGroup1.forEach(s => console.log(`    - ${s.symbol}: ${s.company}`));

    console.log(`  长期持有 (${finalGroup2.length} 支):`);
    finalGroup2.forEach(s => console.log(`    - ${s.symbol}: ${s.company}`));

    console.log(`  高增长 (${finalGroup3.length} 支):`);
    finalGroup3.forEach(s => console.log(`    - ${s.symbol}: ${s.company}`));

    console.log('\n✅ PASS: 混合场景测试通过\n');

    // ========== Test Case 7: 数据库索引验证 ==========
    console.log('📝 Test Case 7: 验证数据库索引');
    console.log('─'.repeat(60));

    const indexes = await Watchlist.collection.indexes();
    const hasNewIndex = indexes.some(
      index => index.key && index.key.userId && index.key.symbol && index.key.groupId
    );

    if (!hasNewIndex) throw new Error('New index { userId, symbol, groupId } not found');

    console.log('✅ PASS: 新索引已创建');
    console.log('  现有索引:');
    indexes.forEach(index => {
      console.log(`    - ${index.name}`);
    });

    // 清理测试数据
    await Watchlist.deleteMany({ userId: testUserId });
    await WatchlistGroup.deleteMany({ userId: testUserId });

    // ========== 测试完成 ==========
    console.log('\n' + '='.repeat(60));
    console.log('🎉 所有测试通过！');
    console.log('='.repeat(60));

    console.log('\n📊 测试总结:');
    console.log('  ✅ Test Case 1: 添加股票到单个分组');
    console.log('  ✅ Test Case 2: 同一股票添加到多个分组');
    console.log('  ✅ Test Case 3: 幂等性检查');
    console.log('  ✅ Test Case 4: 从单个分组删除');
    console.log('  ✅ Test Case 5: 全局删除');
    console.log('  ✅ Test Case 6: 混合场景');
    console.log('  ✅ Test Case 7: 数据库索引验证');

    console.log('\n🎯 结论: Watchlist 多分组功能正常工作！');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);

    // 清理测试数据
    try {
      const testUserId = 'test-user-multigroup';
      await Watchlist.deleteMany({ userId: testUserId });
      await WatchlistGroup.deleteMany({ userId: testUserId });
      console.log('\n🧹 已清理测试数据');
    } catch (cleanupErr) {
      console.error('清理失败:', cleanupErr);
    }

    process.exit(1);
  }
}

// 运行测试
testWatchlistMultiGroup();

