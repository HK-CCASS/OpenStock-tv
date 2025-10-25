# 股票热力图 API 集成文档

## 概述

本文档说明如何将股票热力图组件与MongoDB数据库和实时数据源集成。

## 数据架构

### API端点

**主要端点**: `GET /api/heatmap/data`

**返回数据结构**:
```typescript
{
  success: boolean;
  data: {
    pools: [
      {
        poolName: string;          // 池子名称 (来自HeatmapSymbolPool)
        stockCount: number;        // 股票数量
        avgChangePercent: number;  // 平均涨跌幅
        totalMarketCap: number;    // 总市值
        cells: [                   // 池子中的股票
          {
            symbol: string;        // 股票代码
            name: string;          // 公司名称
            last: number;          // 当前价格
            change: number;        // 价格变动
            changePercent: number; // 涨跌幅百分比
            volume: number;        // 成交量
            category: string;      // 分类
            marketCap: number;     // 市值
            pools: string[];       // 所属池子列表
          }
        ]
      }
    ];
    allCells: [...];  // 所有股票的扁平列表
  };
  error?: string;
}
```

## 实现方式

### 方式1: 轮询更新 (默认实现)

**组件**: `/components/StockHeatmap.tsx`

**特点**:
- 每2秒自动刷新数据
- 简单可靠
- 适合大多数场景

**使用方法**:
```tsx
import StockHeatmap from './components/StockHeatmap';

function App() {
  return <StockHeatmap />;
}
```

### 方式2: WebSocket实时推送 (可选实现)

**组件**: `/components/StockHeatmapWithWebSocket.tsx`

**WebSocket客户端**: `/lib/tradingview-websocket.ts`

**特点**:
- 真正的实时数据推送
- 更高效的带宽使用
- 需要WebSocket服务器支持

**使用方法**:
```tsx
import StockHeatmapWithWebSocket from './components/StockHeatmapWithWebSocket';

function App() {
  return <StockHeatmapWithWebSocket />;
}
```

**WebSocket服务器要求**:
- 端点: `ws://localhost:8001/ws`
- 支持订阅消息:
  ```json
  {
    "type": "subscribe",
    "symbols": ["TSLA", "AAPL", "MSFT"]
  }
  ```
- 推送消息格式:
  ```json
  {
    "type": "quote_update",
    "symbol": "TSLA",
    "last": 245.32,
    "change": 5.67,
    "changePercent": 2.37,
    "volume": 124567890,
    "timestamp": 1234567890
  }
  ```

## MongoDB集成

### 数据模型

**HeatmapSymbolPool 集合**:
```typescript
{
  poolName: string;      // 例如: "ARK Innovation ETFs"
  symbols: string[];     // 股票代码列表
  description?: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### API实现示例

**文件**: `/api/heatmap/data.ts`

```typescript
import { MongoClient } from 'mongodb';

export default async function handler(req: any, res: any) {
  try {
    // 1. 连接MongoDB
    const client = await MongoClient.connect(process.env.MONGODB_URI!);
    const db = client.db('your_database');
    
    // 2. 获取所有池子
    const pools = await db.collection('heatmapsymbolpool')
      .find({})
      .toArray();
    
    // 3. 对于每个池子，获取股票实时数据
    const enrichedPools = await Promise.all(
      pools.map(async (pool) => {
        const cellsData = await fetchStockData(pool.symbols);
        
        // 计算统计数据
        const totalMarketCap = cellsData.reduce(
          (sum, cell) => sum + cell.marketCap, 0
        );
        const avgChangePercent = cellsData.reduce(
          (sum, cell) => sum + cell.changePercent, 0
        ) / cellsData.length;
        
        return {
          poolName: pool.poolName,
          stockCount: pool.symbols.length,
          avgChangePercent,
          totalMarketCap,
          cells: cellsData
        };
      })
    );
    
    // 4. 生成扁平化的所有股票列表
    const allCells = enrichedPools.flatMap(pool => pool.cells);
    
    // 5. 返回数据
    res.status(200).json({
      success: true,
      data: {
        pools: enrichedPools,
        allCells: allCells
      }
    });
    
    await client.close();
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      data: { pools: [], allCells: [] }
    });
  }
}

// 获取股票实时数据
async function fetchStockData(symbols: string[]) {
  // TODO: 从数据源获取实时报价
  // 可以使用:
  // - TradingView API
  // - Yahoo Finance API
  // - Alpha Vantage API
  // - 自建WebSocket服务
  
  return symbols.map(symbol => ({
    symbol: symbol,
    name: 'Company Name',  // 从API获取
    last: 100.00,
    change: 2.50,
    changePercent: 2.56,
    volume: 1000000,
    category: 'Technology',
    marketCap: 100000000,
    pools: [pool.poolName]
  }));
}
```

## 查询参数支持

### 特定池子数据
```
GET /api/heatmap/data?pool=ARK%20Innovation%20ETFs
```

### 过滤模式
```
GET /api/heatmap/data?mode=gainers&limit=10    // 涨幅最大
GET /api/heatmap/data?mode=losers&limit=10     // 跌幅最大
GET /api/heatmap/data?mode=active&limit=10     // 交易量最大
```

### 排序和过滤
```
GET /api/heatmap/data?sortBy=changePercent&sortOrder=desc
GET /api/heatmap/data?minChange=2&categories=Technology
```

## 环境变量配置

创建 `.env.local` 文件:

```env
# MongoDB连接
MONGODB_URI=mongodb://localhost:27017/your_database

# TradingView WebSocket (可选)
TRADINGVIEW_WS_URL=ws://localhost:8001/ws

# 其他数据源API密钥 (按需配置)
ALPHA_VANTAGE_API_KEY=your_api_key
YAHOO_FINANCE_API_KEY=your_api_key
```

## 关键概念说明

### poolName vs Watchlist Name

**重要区别**:
- `poolName`: 来自 `HeatmapSymbolPool` 模型，是系统预定义的股票组合
- `Watchlist name`: 来自 `WatchlistGroup` 模型，是用户个人的监听列表

**本热力图使用**: `poolName` (系统预定义的股票池)

## 测试

### 测试API端点
```bash
curl http://localhost:3000/api/heatmap/data
```

### 测试WebSocket连接
```javascript
const ws = new WebSocket('ws://localhost:8001/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    symbols: ['TSLA', 'AAPL']
  }));
};

ws.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};
```

## 故障排除

### API返回空数据
1. 检查MongoDB连接
2. 确认 `HeatmapSymbolPool` 集合有数据
3. 检查股票数据源API配置

### WebSocket连接失败
1. 确认WebSocket服务器运行在正确端口
2. 检查防火墙设置
3. 验证WebSocket URL配置

### 数据不实时更新
1. 轮询模式: 检查网络请求频率（默认2秒）
2. WebSocket模式: 检查连接状态指示器
3. 查看浏览器控制台日志

## 性能优化建议

1. **缓存机制**: 在服务器端缓存股票数据5-10秒
2. **批量请求**: 一次请求获取所有股票数据，而不是逐个请求
3. **增量更新**: WebSocket只推送变化的数据
4. **数据压缩**: 启用gzip压缩减少传输大小
5. **连接池**: 使用MongoDB连接池提高数据库性能

## 安全注意事项

⚠️ **重要**: Figma Make 不适合收集PII（个人身份信息）或保护敏感数据

1. 不要在前端暴露API密钥
2. 使用环境变量存储敏感配置
3. 实现请求速率限制防止滥用
4. 验证所有输入参数
5. 使用HTTPS保护数据传输

## 下一步

1. 配置MongoDB连接
2. 实现股票数据获取逻辑
3. （可选）设置WebSocket服务器
4. 测试和优化性能
5. 部署到生产环境

## 支持

如有问题，请参考:
- MongoDB文档: https://docs.mongodb.com/
- ECharts文档: https://echarts.apache.org/
- WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
