import { getMarketCapCache } from '@/lib/actions/heatmap.actions';

async function testMarketCapCache() {
  console.log('🧪 Testing Market Cap Cache System...\n');

  // 测试 1：批量查询（首次，应该触发 Yahoo Finance API）
  console.log('============================================================');
  console.log('Test 1: First fetch (should call Yahoo Finance)');
  console.log('============================================================\n');
  
  const symbols1 = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN'];
  const start1 = Date.now();
  const result1 = await getMarketCapCache(symbols1);
  const time1 = Date.now() - start1;

  console.log(`✅ Fetched ${result1.size} symbols in ${time1}ms\n`);
  result1.forEach((data, symbol) => {
    console.log(
      `  ${symbol.padEnd(6)}: $${(data.marketCap / 1e9).toFixed(2).padStart(8)}B  (source: ${data.source})`
    );
  });

  // 等待 1 秒
  console.log('\n⏳ Waiting 1 second before next test...\n');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 测试 2：相同股票再次查询（应该命中缓存）
  console.log('============================================================');
  console.log('Test 2: Second fetch (should hit cache)');
  console.log('============================================================\n');
  
  const start2 = Date.now();
  const result2 = await getMarketCapCache(symbols1);
  const time2 = Date.now() - start2;

  console.log(`✅ Fetched ${result2.size} symbols in ${time2}ms`);
  console.log(`⚡ Performance: ${(time1 / time2).toFixed(1)}x faster!\n`);

  // 测试 3：混合缓存/新股票
  console.log('============================================================');
  console.log('Test 3: Mixed (cached + new)');
  console.log('============================================================\n');
  
  const symbols3 = ['AAPL', 'NVDA', 'META'];  // AAPL 已缓存，NVDA 和 META 新增
  const start3 = Date.now();
  const result3 = await getMarketCapCache(symbols3);
  const time3 = Date.now() - start3;

  console.log(`✅ Fetched ${result3.size} symbols in ${time3}ms\n`);
  result3.forEach((data, symbol) => {
    console.log(
      `  ${symbol.padEnd(6)}: $${(data.marketCap / 1e9).toFixed(2).padStart(8)}B  (source: ${data.source})`
    );
  });

  // 测试 4：大批量查询
  console.log('\n============================================================');
  console.log('Test 4: Large batch (10 symbols)');
  console.log('============================================================\n');
  
  const symbols4 = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'AMD', 'INTC'];
  const start4 = Date.now();
  const result4 = await getMarketCapCache(symbols4);
  const time4 = Date.now() - start4;

  console.log(`✅ Fetched ${result4.size} symbols in ${time4}ms\n`);

  // 统计数据源分布
  const sourceStats = { yahoo: 0, finnhub: 0, fallback: 0 };
  result4.forEach((data) => {
    if (sourceStats[data.source as keyof typeof sourceStats] !== undefined) {
      sourceStats[data.source as keyof typeof sourceStats]++;
    }
  });

  console.log('📊 Data source distribution:');
  console.log(`  Yahoo Finance: ${sourceStats.yahoo}`);
  console.log(`  Finnhub:       ${sourceStats.finnhub}`);
  console.log(`  Fallback:      ${sourceStats.fallback}`);

  console.log('\n============================================================');
  console.log('✅ All tests completed successfully!');
  console.log('============================================================');
}

// 运行测试
testMarketCapCache().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});

