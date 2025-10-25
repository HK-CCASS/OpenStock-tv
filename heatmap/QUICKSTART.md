# 股票热力图 - 快速开始指南

## 🚀 当前状态

✅ **已完成**:
- TradingView风格的颜色渐变方案（13级）
- 两级热力图系统（池子 → 股票）
- 市值权重计算
- 实时数据更新支持（轮询模式，每2秒）
- API接口对接框架
- WebSocket实时推送框架（可选）

🔄 **待完成**:
- MongoDB数据库连接
- 真实股票数据源集成

## 📦 当前实现

### 默认组件（轮询模式）

**文件**: `/components/StockHeatmap.tsx`

**特性**:
- ✅ 每2秒自动刷新数据
- ✅ 从 `/api/heatmap/data` 获取数据
- ✅ API失败时自动回退到模拟数据
- ✅ TradingView风格配色
- ✅ 市值加权显示

**当前行为**:
```
1. 尝试调用 GET /api/heatmap/data
2. 如果成功 → 使用真实数据
3. 如果失败 → 静默回退到模拟数据
4. 每2秒重复上述过程
```

### API端点

**文件**: `/api/heatmap/data.ts`

**当前状态**: 返回模拟数据用于开发测试

**数据格式**:
```json
{
  "success": true,
  "data": {
    "pools": [
      {
        "poolName": "ARK Innovation ETFs",
        "stockCount": 8,
        "avgChangePercent": 1.85,
        "totalMarketCap": 500000000000,
        "cells": [...]
      }
    ],
    "allCells": [...]
  }
}
```

## 🔌 集成真实数据

### 步骤1: 配置MongoDB

编辑 `/api/heatmap/data.ts`:

```typescript
import { MongoClient } from 'mongodb';

export default async function handler(req: any, res: any) {
  try {
    // 连接MongoDB
    const client = await MongoClient.connect(process.env.MONGODB_URI!);
    const db = client.db('your_database');
    
    // 获取HeatmapSymbolPool数据
    const pools = await db.collection('heatmapsymbolpool')
      .find({})
      .toArray();
    
    // 获取每个池子的股票数据
    const enrichedPools = await Promise.all(
      pools.map(async (pool) => {
        const cellsData = await fetchStockData(pool.symbols);
        // ... 处理数据
        return { poolName: pool.poolName, cells: cellsData, ... };
      })
    );
    
    res.status(200).json({
      success: true,
      data: {
        pools: enrichedPools,
        allCells: enrichedPools.flatMap(p => p.cells)
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

### 步骤2: 实现股票数据获取

在 `/api/heatmap/data.ts` 中添加:

```typescript
async function fetchStockData(symbols: string[]) {
  // 选项A: 从TradingView WebSocket获取
  // 选项B: 从Yahoo Finance API获取
  // 选项C: 从Alpha Vantage获取
  // 选项D: 从其他数据源获取
  
  return symbols.map(symbol => ({
    symbol: symbol,
    name: 'Company Name',
    last: 100.00,
    change: 2.50,
    changePercent: 2.56,
    volume: 1000000,
    marketCap: 100000000,
    pools: []
  }));
}
```

### 步骤3: 配置环境变量

创建 `.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017/your_database
```

## 🌐 切换到WebSocket实时推送（可选）

### 1. 更新 App.tsx

```tsx
// 替换
import StockHeatmap from "./components/StockHeatmap";

// 为
import StockHeatmap from "./components/StockHeatmapWithWebSocket";
```

### 2. 启动WebSocket服务器

确保TradingView WebSocket服务运行在 `ws://localhost:8001/ws`

### 3. 验证连接

组件会在右上角显示连接状态:
- 🟢 **实时连接** - WebSocket正常工作
- 🟡 **离线模式** - 回退到初始数据

## 📊 数据结构说明

### poolName (使用中)

来源: `HeatmapSymbolPool` 集合

示例:
```javascript
const poolNames = [
  "ARK Innovation ETFs",
  "Magnificent 7",
  "S&P 500 Top 50",
  "Technology Leaders",
  ...
];
```

### ❌ 不使用 Watchlist Name

`WatchlistGroup` 是用户个人监听列表，本热力图使用系统预定义的池子

## 🎨 颜色方案

TradingView风格13级渐变:

```
涨幅:
+5%以上  → #4CAF50 (亮绿)
+4-5%    → #43A047
+3-4%    → #388E3C
+2-3%    → #2E7D32
+1-2%    → #1B5E20
+0-1%    → #0D4D1C (极深绿)

平盘:
0%       → #424242 (深灰)

跌幅:
-0-1%    → #5D1715 (极深红)
-1-2%    → #8B1A1A
-2-3%    → #B71C1C
-3-4%    → #C62828
-4-5%    → #D32F2F
-5%以下  → #E53935 (亮红)
```

## 🧪 测试

### 测试当前实现

1. 启动应用: `npm run dev`
2. 打开浏览器: `http://localhost:3000`
3. 查看模拟数据热力图
4. 点击池子进入详情
5. 点击"返回"回到总览

### 测试API端点

```bash
curl http://localhost:3000/api/heatmap/data | jq
```

### 验证数据更新

打开浏览器控制台，应该看到:
```
热力图数据加载成功: { poolCount: 14, totalStocks: 376 }
```

每2秒会重新获取数据

## 📁 文件结构

```
/
├── App.tsx                              # 主应用
├── components/
│   ├── StockHeatmap.tsx                 # 默认组件（轮询）✅
│   └── StockHeatmapWithWebSocket.tsx    # WebSocket版本（可选）
├── api/
│   └── heatmap/
│       └── data.ts                      # API端点 ✅
├── lib/
│   └── tradingview-websocket.ts         # WebSocket客户端
├── HEATMAP_API_INTEGRATION.md           # 完整集成文档
└── QUICKSTART.md                        # 本文件
```

## 🔍 调试技巧

### 查看API请求

浏览器控制台 → Network标签 → 筛选 "data"

### 查看数据结构

```javascript
// 在浏览器控制台执行
fetch('/api/heatmap/data')
  .then(r => r.json())
  .then(data => console.log(data));
```

### 查看ECharts配置

```javascript
// 在StockHeatmap.tsx中添加
console.log('ECharts option:', option);
```

## 🚦 状态指示

### 加载状态

显示旋转加载动画

### 错误状态

如果API完全失败且无模拟数据:
- 显示错误图标
- 显示错误信息
- 提供重试按钮

### 正常状态

- 顶部标题栏
- 热力图显示区域
- 底部颜色图例

## ⚡ 性能提示

1. **数据缓存**: 考虑在服务器端缓存5-10秒
2. **批量请求**: 一次获取所有数据
3. **增量更新**: WebSocket只推送变化的数据
4. **虚拟化**: 如果股票数量超过1000，考虑虚拟化渲染

## 📚 延伸阅读

- [完整集成文档](./HEATMAP_API_INTEGRATION.md)
- [ECharts Treemap文档](https://echarts.apache.org/en/option.html#series-treemap)
- [MongoDB Node.js驱动](https://docs.mongodb.com/drivers/node/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## ❓ 常见问题

**Q: 数据不更新怎么办?**

A: 检查浏览器控制台是否有网络错误，确认 `/api/heatmap/data` 返回正确数据

**Q: 如何改变刷新频率?**

A: 在 `StockHeatmap.tsx` 中修改:
```typescript
const interval = setInterval(() => {
  fetchData();
}, 2000); // 改为你需要的毫秒数
```

**Q: 如何添加新的池子?**

A: 在MongoDB的 `HeatmapSymbolPool` 集合中添加新文档

**Q: 可以显示更多信息吗?**

A: 可以，修改tooltip formatter部分添加更多字段

## 🎯 下一步

1. ✅ **已完成**: UI和数据结构
2. 🔧 **进行中**: 集成真实数据源
3. 📈 **计划中**: 添加更多分析功能
4. 🚀 **部署**: 生产环境配置

---

**准备好了吗?** 开始集成你的数据源吧！ 🚀
