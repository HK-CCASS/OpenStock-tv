/**
 * 测试 TradingView Ticker 连接
 * 运行命令: npx tsx scripts/test-tradingview-ticker.ts
 */

import { TradingViewTicker } from '../lib/tradingview/ticker';

async function testTicker() {
  console.log('Testing TradingView Ticker...\n');

  // 测试几个流行股票
  const symbols = ['NASDAQ:AAPL', 'NASDAQ:MSFT', 'NASDAQ:GOOGL', 'NASDAQ:TSLA'];
  
  const ticker = new TradingViewTicker(symbols, true);

  // 设置更新回调
  ticker.onUpdate((symbol, state) => {
    console.log(`\n[UPDATE] ${symbol}:`);
    console.log(`  Price: $${state.price.toFixed(2)}`);
    console.log(`  Change: ${state.change >= 0 ? '+' : ''}${state.change.toFixed(2)}`);
    console.log(`  Change%: ${state.changePercent >= 0 ? '+' : ''}${state.changePercent.toFixed(2)}%`);
    console.log(`  Volume: ${state.volume.toLocaleString()}`);
  });

  try {
    console.log('Connecting to TradingView WebSocket...');
    await ticker.start();
    console.log('✓ Connected successfully!\n');
    console.log('Listening for updates... (Press Ctrl+C to stop)\n');

    // 保持运行
    await new Promise(() => {});
  } catch (error) {
    console.error('✗ Connection failed:', error);
    process.exit(1);
  }
}

testTicker().catch(console.error);

