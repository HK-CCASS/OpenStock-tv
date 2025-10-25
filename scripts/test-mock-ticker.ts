/**
 * 测试 Mock Ticker（模拟实时更新）
 * 运行命令: npx tsx scripts/test-mock-ticker.ts
 */

import { MockTradingViewTicker } from '../lib/tradingview/mock-ticker';

async function testMockTicker() {
  console.log('Testing Mock TradingView Ticker...\n');

  // 测试几个股票
  const symbols = ['NASDAQ:AAPL', 'NASDAQ:MSFT', 'NASDAQ:GOOGL', 'NASDAQ:TSLA'];
  
  const ticker = new MockTradingViewTicker(symbols, true);

  let updateCount = 0;

  // 设置更新回调
  ticker.onUpdate((symbol, state) => {
    updateCount++;
    const sign = state.changePercent >= 0 ? '+' : '';
    console.log(`\n[Update #${updateCount}] ${symbol}:`);
    console.log(`  Price: $${state.price.toFixed(2)}`);
    console.log(`  Change: ${sign}${state.change.toFixed(2)}`);
    console.log(`  Change%: ${sign}${state.changePercent.toFixed(2)}%`);
    console.log(`  Volume: ${state.volume.toLocaleString()}`);
  });

  try {
    console.log('Starting Mock Ticker...');
    await ticker.start();
    console.log('✓ Mock Ticker started successfully!\n');
    console.log('Listening for updates... (will stop after 30 seconds)\n');
    console.log('=' .repeat(60));

    // 立即生成初始更新
    ticker.generateInitialUpdates();

    // 运行 30 秒后停止
    setTimeout(() => {
      console.log('\n' + '='.repeat(60));
      console.log(`\nStopping after receiving ${updateCount} updates...`);
      ticker.stop();
      console.log('✓ Mock Ticker stopped\n');
      process.exit(0);
    }, 30000);
  } catch (error) {
    console.error('✗ Mock Ticker failed:', error);
    process.exit(1);
  }
}

testMockTicker().catch(console.error);

