# 股票市场热力图 - 设置指南

## 概述

这个应用展示了一个基于MongoDB数据库的股票市场热力图，显示14个不同板块的股票及其实时价格和涨跌幅。

## 当前状态

✅ 前端热力图组件已完成
✅ 设计规范已实现（颜色、字体、布局）
✅ 交互功能已就绪（工具提示、自动刷新）
⚠️ 后端API需要实现以连接MongoDB

## 前端功能

前端组件 (`/components/StockHeatmap.tsx`) 已经完全实现，包括：

- ✅ ECharts TreeMap 布局
- ✅ 14个板块的显示
- ✅ 根据涨跌幅的颜色编码
- ✅ 股票信息（代码、价格、涨跌幅）
- ✅ 悬停工具提示
- ✅ 自动刷新功能（可选30秒间隔）
- ✅ 加载和错误状态
- ✅ 响应式设计
- ✅ 模拟数据（用于演示）

## 需要实现的后端API

### API端点：`/api/heatmap/data`

**方法**: GET

**响应格式**:
```json
{
  "watchlists": [
    {
      "name": "AI医疗",
      "description": "AI医疗相关股票",
      "symbols": ["AAPL", "MSFT", "GOOGL"],
      "userId": "system",
      "isPublic": true,
      "category": "科技",
      "source": "csv",
      "stocks": [
        {
          "symbol": "AAPL",
          "name": "Apple Inc.",
          "last": 178.50,
          "change": 2.30,
          "changePercent": 1.31,
          "volume": 52341000
        }
      ]
    }
  ],
  "timestamp": "2025-10-19T12:00:00.000Z"
}
```

### 实现步骤

#### 选项1: 使用 Supabase (推荐)

1. **连接Supabase**
   - 使用Figma Make的Supabase集成
   - 创建Edge Functions来连接MongoDB
   - 实现股票数据获取逻辑

2. **优点**
   - 无需管理服务器
   - 自动处理CORS
   - 内置认证和安全

#### 选项2: 使用 Node.js 后端

1. **安装依赖**
```bash
npm install mongodb
npm install node-fetch  # 用于获取股票数据
```

2. **环境变量** (`.env.local`)
```env
MONGODB_URI=mongodb://localhost:27017/your_database
STOCK_API_KEY=your_stock_api_key
```

3. **实现API路由** (`/api/heatmap/data.ts`)

参考 `/api/heatmap/data.ts` 中的示例代码。

#### MongoDB查询示例

```javascript
import { MongoClient } from 'mongodb';

// 连接MongoDB
const client = await MongoClient.connect(process.env.MONGODB_URI);
const db = client.db('your_database');

// 查询所有公开的WatchlistGroups
const watchlists = await db.collection('watchlistgroups')
  .find({ 
    isPublic: true,
    userId: 'system'
  })
  .toArray();

// 返回14个watchlist板块
console.log(watchlists.length); // 应该是14
```

### 股票数据API选项

你需要选择一个股票数据提供商来获取实时价格和涨跌幅：

1. **Yahoo Finance API**
   - 免费
   - npm包: `yahoo-finance2`

2. **Alpha Vantage**
   - 免费层级可用
   - 需要API密钥

3. **Finnhub**
   - 实时数据
   - 免费层级：60次调用/分钟

4. **IEX Cloud**
   - 高质量数据
   - 付费服务

#### 示例：使用Yahoo Finance

```javascript
import yahooFinance from 'yahoo-finance2';

async function fetchStockData(symbols) {
  const quotes = await yahooFinance.quote(symbols);
  
  return quotes.map(quote => ({
    symbol: quote.symbol,
    name: quote.longName || quote.shortName,
    last: quote.regularMarketPrice,
    change: quote.regularMarketChange,
    changePercent: quote.regularMarketChangePercent,
    volume: quote.regularMarketVolume
  }));
}
```

## 当前运行模式

**目前应用使用模拟数据运行**，这意味着：
- ✅ 所有UI功能都正常工作
- ✅ 可以看到完整的热力图
- ✅ 数据会在每次刷新时随机生成
- ⚠️ 不是真实的股票数据
- ⚠️ 不连接真实的MongoDB数据库

## 下一步

1. **如果你已有MongoDB数据库**:
   - 实现 `/api/heatmap/data.ts` API端点
   - 连接到你的MongoDB实例
   - 集成股票数据API

2. **如果需要帮助设置后端**:
   - 可以使用Supabase Edge Functions
   - 或者设置传统的Node.js后端

3. **测试**:
   - 确保API返回正确格式的数据
   - 前端会自动检测并使用真实数据

## 数据流程

```
MongoDB (watchlistgroups)
    ↓
API Endpoint (/api/heatmap/data)
    ↓
Stock Data API (Yahoo/Alpha Vantage/etc.)
    ↓
合并数据 (watchlist + stock quotes)
    ↓
返回JSON
    ↓
前端热力图显示
```

## 性能考虑

- **缓存**: 考虑缓存股票数据（1-5分钟）
- **批量请求**: 一次请求多个股票而不是单独请求
- **限流**: 注意股票API的请求限制
- **分页**: 如果板块很多，考虑分页加载

## 故障排除

**问题**: API调用失败
- 检查 `/api/heatmap/data` 是否存在
- 查看浏览器控制台的网络请求
- 应用会自动回退到模拟数据

**问题**: MongoDB连接失败
- 验证 `MONGODB_URI` 环境变量
- 确保MongoDB服务正在运行
- 检查网络防火墙设置

**问题**: 股票数据不更新
- 检查股票API的请求配额
- 验证API密钥是否有效
- 查看服务器日志

## 联系支持

如需帮助设置后端或连接数据库，请提供：
- MongoDB连接字符串格式
- 选择的股票数据API
- 遇到的具体错误信息
