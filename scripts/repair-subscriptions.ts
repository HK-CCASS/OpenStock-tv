/**
 * 手动修复订阅脚本
 * 强制重新订阅未接收更新的股票
 * 
 * 使用方法:
 * npx tsx scripts/repair-subscriptions.ts
 */

import fetch from 'cross-fetch';

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function repairSubscriptions() {
  try {
    console.log('\n🔧 正在修复订阅...');
    console.log('='.repeat(60));

    const response = await fetch(`${API_URL}/api/heatmap/repair-subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('❌ API 请求失败:', response.status, response.statusText);
      return;
    }

    const result = await response.json();

    if (!result.success) {
      console.error('❌ 修复失败:', result.error);
      return;
    }

    const data = result.data;

    console.log('\n📊 修复结果:');
    console.log(`  重新订阅股票数: ${data.repairedCount}`);

    console.log('\n修复前:');
    console.log(`  订阅总数: ${data.before.totalSymbols}`);
    console.log(`  活跃股票: ${data.before.activeSymbols}`);
    console.log(`  从未更新: ${data.before.neverUpdatedCount}`);
    console.log(`  超时未更新: ${data.before.staleCount}`);

    console.log('\n修复后:');
    console.log(`  订阅总数: ${data.after.totalSymbols}`);
    console.log(`  活跃股票: ${data.after.activeSymbols}`);
    console.log(`  从未更新: ${data.after.neverUpdatedCount}`);
    console.log(`  超时未更新: ${data.after.staleCount}`);

    if (data.repairedCount > 0) {
      console.log('\n✅ 修复完成！');
      console.log('💡 建议：等待 10-30 秒后再次运行 npm run subscription:health 检查效果');
    } else {
      console.log('\n✅ 所有订阅正常，无需修复');
    }

    console.log('\n修复时间:', data.timestamp);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ 修复失败:', error);
  }
}

// 运行修复
repairSubscriptions();

