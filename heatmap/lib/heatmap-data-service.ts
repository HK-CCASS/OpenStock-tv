// 热力图数据服务 - 模拟API响应
// 在连接真实MongoDB之前使用模拟数据

export interface ApiStockCell {
  symbol: string;
  name?: string;
  last: number;
  change: number;
  changePercent: number;
  volume?: number;
  category?: string;
  pools?: string[];
  marketCap?: number;
}

export interface ApiPool {
  poolName: string;
  stockCount: number;
  avgChangePercent: number;
  totalMarketCap?: number;
  cells: ApiStockCell[];
}

export interface ApiHeatmapResponse {
  success: boolean;
  data: {
    pools: ApiPool[];
    allCells: ApiStockCell[];
  };
  error?: string;
}

// 生成模拟API响应（用于开发测试）
export function generateMockHeatmapData(): ApiHeatmapResponse {
  const poolDefinitions = [
    { name: 'ARK Innovation ETFs', count: 8 },
    { name: 'Magnificent 7', count: 7 },
    { name: 'S&P 500 Top 50', count: 50 },
    { name: 'Technology Leaders', count: 30 },
    { name: 'Energy Sector', count: 25 },
    { name: 'Financial Services', count: 35 },
    { name: 'Healthcare', count: 40 },
    { name: 'Consumer Goods', count: 28 },
    { name: 'Industrial', count: 22 },
    { name: 'Utilities', count: 15 },
    { name: 'Real Estate', count: 18 },
    { name: 'Materials', count: 20 },
    { name: 'Telecommunications', count: 12 },
    { name: 'Blockchain & Crypto', count: 16 }
  ];
  
  const allCells: ApiStockCell[] = [];
  const pools: ApiPool[] = [];
  
  poolDefinitions.forEach(poolDef => {
    const cells: ApiStockCell[] = [];
    
    for (let i = 0; i < poolDef.count; i++) {
      const changePercent = (Math.random() - 0.5) * 20; // -10% to +10%
      const last = Math.random() * 500 + 10;
      const change = (last * changePercent) / 100;
      const volume = Math.floor(Math.random() * 10000000) + 100000;
      const marketCap = last * volume;
      
      const cell: ApiStockCell = {
        symbol: `${poolDef.name.substring(0, 3).toUpperCase()}${i + 1}`,
        name: `${poolDef.name} Company ${i + 1}`,
        last: parseFloat(last.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        volume: volume,
        category: poolDef.name,
        marketCap: marketCap,
        pools: [poolDef.name]
      };
      
      cells.push(cell);
      allCells.push(cell);
    }
    
    // 计算池子统计数据
    const totalMarketCap = cells.reduce((sum, cell) => sum + cell.marketCap!, 0);
    const avgChangePercent = cells.reduce((sum, cell) => sum + cell.changePercent, 0) / cells.length;
    
    pools.push({
      poolName: poolDef.name,
      stockCount: poolDef.count,
      avgChangePercent: parseFloat(avgChangePercent.toFixed(2)),
      totalMarketCap: totalMarketCap,
      cells: cells
    });
  });
  
  return {
    success: true,
    data: {
      pools: pools,
      allCells: allCells
    }
  };
}

// 模拟从API获取数据（带延迟）
export async function fetchHeatmapData(): Promise<ApiHeatmapResponse> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // TODO: 在实际部署时，替换为真实的API调用
  // try {
  //   const response = await fetch('/api/heatmap/data');
  //   if (!response.ok) {
  //     throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  //   }
  //   return await response.json();
  // } catch (error) {
  //   console.error('API Error:', error);
  //   // 回退到模拟数据
  //   return generateMockHeatmapData();
  // }
  
  return generateMockHeatmapData();
}

// 更新单个股票数据（模拟实时更新）
export function updateStockPrices(data: ApiHeatmapResponse): ApiHeatmapResponse {
  const newData = JSON.parse(JSON.stringify(data)); // 深拷贝
  
  newData.data.pools.forEach((pool: ApiPool) => {
    pool.cells.forEach((cell: ApiStockCell) => {
      // 随机小幅波动（-1% 到 +1%）
      const priceChange = (Math.random() - 0.5) * 0.02;
      const newLast = cell.last * (1 + priceChange);
      const newChange = newLast - (cell.last - cell.change);
      const newChangePercent = (newChange / (newLast - newChange)) * 100;
      
      cell.last = parseFloat(newLast.toFixed(2));
      cell.change = parseFloat(newChange.toFixed(2));
      cell.changePercent = parseFloat(newChangePercent.toFixed(2));
      
      if (cell.volume) {
        cell.marketCap = cell.last * cell.volume;
      }
    });
    
    // 重新计算池子统计
    pool.totalMarketCap = pool.cells.reduce((sum, cell) => sum + (cell.marketCap || 0), 0);
    pool.avgChangePercent = pool.cells.reduce((sum, cell) => sum + cell.changePercent, 0) / pool.cells.length;
    pool.avgChangePercent = parseFloat(pool.avgChangePercent.toFixed(2));
  });
  
  // 更新 allCells
  newData.data.allCells = newData.data.pools.flatMap((pool: ApiPool) => pool.cells);
  
  return newData;
}
