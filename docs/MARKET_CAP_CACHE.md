# 📊 市值缓存系统文档

**实现日期**：2025-10-25  
**目的**：减少 API 调用、提升性能、确保市值数据稳定性

---

## 🎯 系统概述

市值缓存系统使用 MongoDB 存储股票市值数据，每天自动更新一次，减少对 Finnhub API 的依赖。

### 架构图
```
用户请求热力图
      ↓
API: /api/heatmap/user-data
      ↓
getInitialQuotes()
      ├─ getBatchStockQuotes() → 实时报价（价格、涨跌幅）
      └─ getMarketCapCache() → 市值数据（优先缓存）
            ├─ 查询 MongoDB → 命中 → 返回缓存
            └─ 未命中 → Finnhub API → 更新缓存 → 返回数据

定时任务（每天 UTC 2:00）
      ↓
updateMarketCapCache()
      ↓
批量更新所有观察列表股票的市值
```

---

## 🗂️ 数据模型

### MarketCap Schema

```typescript
{
  symbol: string;           // 股票代码（大写，唯一）
  marketCap: number;       // 市值（美元）
  price: number;           // 价格（用于回退计算）
  source: string;          // 数据来源: finnhub | iex | fallback
  lastUpdated: Date;       // 最后更新时间
  validUntil: Date;        // 有效期（次日 00:00）
  createdAt: Date;
  updatedAt: Date;
}
```

### 索引
- `{ symbol: 1 }` - 唯一索引
- `{ symbol: 1, validUntil: 1 }` - 查询有效缓存
- `{ validUntil: 1 }` - 清理过期数据

---

## 🔄 缓存策略

### 1. 读取流程
```typescript
getMarketCapCache(symbols: string[])
├─ 步骤 1：查询 MongoDB 有效缓存（validUntil > now）
├─ 步骤 2：填充已缓存的数据
├─ 步骤 3：查找缺失的股票代码
├─ 步骤 4：调用 Finnhub API 获取缺失数据
│         ├─ 如果 marketCap 有效 → source: 'finnhub'
│         └─ 如果 marketCap 无效 → 使用价格估算 → source: 'fallback'
└─ 步骤 5：批量更新 MongoDB（upsert）
```

### 2. 缓存有效期
- **时长**：从当前时间到次日 00:00（UTC）
- **原因**：市值数据变化缓慢，日内波动通过价格估算
- **例外**：第二天凌晨 2 点定时任务会强制更新所有数据

### 3. 回退策略
```
Finnhub API 返回市值
      ↓
市值 > 0？
  ├─ 是 → 缓存有效市值 → source: 'finnhub'
  └─ 否 → 价格 × 10亿 → source: 'fallback'
            ↓
      警告日志：市值无效，使用回退值
```

---

## ⏰ 定时任务

### updateMarketCapCache

**运行时间**：每天 UTC 02:00（北京时间 10:00）

**执行逻辑**：
```typescript
1. 获取所有观察列表的唯一股票代码
2. 分批处理（每批 50 个）
3. 调用 getMarketCapCache() 更新缓存
4. 记录成功/失败数量
```

**手动触发**（可选）：
```typescript
// 在 Inngest Dashboard 或通过 API
await inngest.send({ name: 'app/update.market.cap' });
```

---

## 📊 性能优化

### 缓存命中率
- **首次访问**：0%（需要调用 API）
- **后续访问（当天）**：~100%（直接从 MongoDB 读取）
- **次日首次访问**：0%（缓存过期，定时任务更新）

### API 调用量对比

**优化前**：
- 用户每次访问热力图 → 调用 Finnhub API（所有股票）
- 100 用户/天 × 20 股票 = **2000 次 API 调用**

**优化后**：
- 首次访问 → 调用 API（缓存未命中）
- 后续访问 → MongoDB 查询
- 定时任务 → 批量更新
- **预估：200 次 API 调用/天**（降低 90%）

---

## 🔍 监控和调试

### 查看缓存状态

**方法 1：MongoDB Shell**
```javascript
// 连接到数据库
mongosh mongodb://localhost:27017/openstock

// 查看所有缓存
db.marketcaps.find().pretty()

// 查看特定股票
db.marketcaps.find({ symbol: "AAPL" })

// 统计缓存数量
db.marketcaps.countDocuments()

// 查看过期缓存
db.marketcaps.find({ validUntil: { $lt: new Date() } })
```

**方法 2：控制台日志**
```
[MarketCap Cache] Fetching 15 missing symbols from API
[MarketCap Cache] SONY 市值无效，使用回退值: 28.65B
[MarketCap Cache] Updated 15 symbols in database
```

### 清理过期缓存

**手动清理**（可选）：
```javascript
// 删除过期数据
db.marketcaps.deleteMany({ validUntil: { $lt: new Date() } })
```

**自动清理**（建议）：
```typescript
// 在 MongoDB 设置 TTL 索引（未来实现）
db.marketcaps.createIndex(
  { "validUntil": 1 },
  { expireAfterSeconds: 86400 }  // 24 小时后自动删除
)
```

---

## 🐛 故障排查

### 问题 1：缓存未生效
**症状**：控制台日志显示 "Fetching X missing symbols from API"

**排查步骤**：
1. 检查 MongoDB 连接：
   ```bash
   npm run test:db
   ```
2. 查看数据库中是否有数据：
   ```javascript
   db.marketcaps.countDocuments()
   ```
3. 检查 `validUntil` 是否过期：
   ```javascript
   db.marketcaps.find().sort({ validUntil: -1 }).limit(5)
   ```

---

### 问题 2：市值数据为 0
**症状**：热力图显示异常，某些股票占据巨大空间

**原因**：Finnhub API 返回的 `marketCapitalization` 为 null/0

**解决方案**：
- ✅ 已实现回退机制（使用价格估算）
- ✅ 前端也有回退逻辑（双重保险）

**验证**：查看 source 字段
```javascript
db.marketcaps.find({ source: "fallback" })
```

---

### 问题 3：定时任务未运行
**症状**：数据超过 24 小时未更新

**排查步骤**：
1. 检查 Inngest 服务是否运行：
   ```bash
   npx inngest-cli@latest dev
   ```
2. 查看 Inngest Dashboard：http://localhost:8288
3. 手动触发任务测试：
   ```typescript
   await inngest.send({ name: 'app/update.market.cap' });
   ```

---

## 📈 使用统计（预期）

### 数据量
- **平均观察列表股票数**：10-20 只/用户
- **100 用户**：~500 条缓存记录
- **每条记录大小**：~200 bytes
- **总存储**：~100 KB（几乎可忽略）

### 性能提升
- **API 调用减少**：90%
- **响应时间**：从 ~2s → ~200ms（首屏加载）
- **缓存命中后**：< 50ms（MongoDB 查询）

---

## 🚀 部署检查清单

### 开发环境
- [x] 创建 MarketCap 数据模型
- [x] 实现 getMarketCapCache 缓存逻辑
- [x] 更新 getInitialQuotes 使用缓存
- [x] 创建 Inngest 定时任务
- [ ] 测试缓存功能
- [ ] 测试定时任务

### 生产环境
- [ ] 确保 MongoDB 连接稳定
- [ ] 配置 Inngest 生产环境
- [ ] 设置 MongoDB TTL 索引（自动清理过期数据）
- [ ] 监控缓存命中率
- [ ] 设置告警（缓存失效率 > 20%）

---

## 🔧 配置选项

### 调整缓存有效期

**当前**：次日 00:00（UTC）

**修改方法**：
```typescript
// lib/actions/heatmap.actions.ts 第 138-140 行
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);  // 改为 +2 可延长到 2 天
tomorrow.setHours(0, 0, 0, 0);
```

### 调整定时任务时间

**当前**：每天 UTC 02:00

**修改方法**：
```typescript
// lib/inngest/functions.ts 第 129 行
{ cron: '0 2 * * *' }  // 改为 '0 10 * * *' 为 UTC 10:00（北京 18:00）
```

### 调整批处理大小

**当前**：50 个股票/批

**修改方法**：
```typescript
// lib/inngest/functions.ts 第 141 行
const batchSize = 50;  // 改为 100 可加快更新，但可能触发 API 限速
```

---

## 🎓 最佳实践

1. **首次部署**：手动触发一次 `updateMarketCapCache` 预热缓存
2. **监控日志**：关注 "fallback" 比例，过高说明 Finnhub 数据质量差
3. **定期检查**：每周查看一次缓存数据完整性
4. **性能优化**：如果用户量大，考虑添加 Redis 二级缓存
5. **数据质量**：如果 fallback 比例 > 30%，考虑切换 API 提供商

---

**文档版本**：v1.0  
**最后更新**：2025-10-25

