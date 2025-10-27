/**
 * 订阅健康检查脚本
 * 用于开发和调试：快速查看订阅状态
 * 
 * 使用方法:
 * npx tsx scripts/check-subscription-health.ts
 */

import fetch from 'cross-fetch';

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function checkSubscriptionHealth() {
  try {
    console.log('\n🔍 订阅健康检查');
    console.log('='.repeat(60));

    const response = await fetch(`${API_URL}/api/heatmap/subscription-health`, {
      method: 'GET',
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
      console.error('❌ Ticker 未运行:', result.error);
      console.log('\n统计信息:');
      console.log(`  连接客户端: ${result.stats?.clientCount || 0}`);
      console.log(`  Ticker 状态: ${result.stats?.isTickerRunning ? '运行中' : '已停止'}`);
      return;
    }

    const data = result.data;

    console.log('\n📊 订阅统计:');
    console.log(`  健康分数: ${data.healthScore}% ${getHealthEmoji(data.healthScore)}`);
    console.log(`  订阅总数: ${data.totalSymbols}`);
    console.log(`  活跃股票: ${data.activeSymbols} (${((data.activeSymbols / data.totalSymbols) * 100).toFixed(1)}%)`);
    console.log(`  连接客户端: ${data.connectedClients}`);
    console.log(`  Ticker 状态: ${data.isTickerRunning ? '✅ 运行中' : '❌ 已停止'}`);

    if (data.neverUpdatedSymbolsCount > 0) {
      console.log('\n⚠️  从未接收更新的股票:');
      console.log(`  总数: ${data.neverUpdatedSymbolsCount}`);
      console.log(`  示例: ${data.neverUpdatedSymbols.slice(0, 10).join(', ')}`);
      if (data.neverUpdatedSymbolsCount > 10) {
        console.log(`  ... 还有 ${data.neverUpdatedSymbolsCount - 10} 个`);
      }
    }

    if (data.staleSymbolsCount > 0) {
      console.log('\n⏰ 超过5分钟未更新的股票:');
      console.log(`  总数: ${data.staleSymbolsCount}`);
      console.log(`  示例: ${data.staleSymbols.slice(0, 10).join(', ')}`);
      if (data.staleSymbolsCount > 10) {
        console.log(`  ... 还有 ${data.staleSymbolsCount - 10} 个`);
      }
    }

    if (data.healthScore === 100) {
      console.log('\n✅ 所有股票订阅正常！');
    } else if (data.healthScore >= 80) {
      console.log('\n⚠️  大部分股票订阅正常，但有少数异常');
    } else if (data.healthScore >= 50) {
      console.log('\n⚠️  订阅健康状况一般，建议检查');
    } else {
      console.log('\n❌ 订阅健康状况较差，需要立即检查');
    }

    console.log('\n检查时间:', data.timestamp);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ 检查失败:', error);
  }
}

function getHealthEmoji(score: number): string {
  if (score >= 95) return '🟢';
  if (score >= 80) return '🟡';
  if (score >= 50) return '🟠';
  return '🔴';
}

// 运行检查
checkSubscriptionHealth();

