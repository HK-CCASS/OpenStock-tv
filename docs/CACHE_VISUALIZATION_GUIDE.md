# 缓存数据可视化指南

## 📊 概览

OpenStock 提供了两种方式查看市值缓存数据：

1. **终端查看** (`cache:check`) - 快速查看缓存状态
2. **可视化报告** (`cache:visualize`) - 生成美观的 HTML 报告

---

## 🚀 快速开始

### 前置要求

1. **启动 Docker 服务**
```bash
docker compose up -d mongodb redis
```

2. **配置环境变量**

确保 `.env` 文件包含以下配置：

```env
# MongoDB
MONGODB_URI=mongodb://root:example@localhost:27017/openstock?authSource=admin

# Redis (可选，如果不配置会自动降级)
REDIS_URL=redis://localhost:6379

# 其他必需配置
FINNHUB_API_KEY=your_key_here
BETTER_AUTH_SECRET=your_secret_here
BETTER_AUTH_URL=http://localhost:3000
```

---

## 📋 使用方法

### 方法 1: 终端查看（快速）

```bash
npm run cache:check
```

**输出示例:**
```
📊 Checking Market Cap Cache Status...

--- MongoDB Cache (L2) ---
Total documents: 150
Expired documents: 12
Latest 5 entries:
  - AAPL: $3.45T (Source: yahoo, Valid Until: 10/27/2025, 9:30:00 AM)
  - MSFT: $2.98T (Source: yahoo, Valid Until: 10/27/2025, 9:30:00 AM)
  - GOOGL: $2.15T (Source: yahoo, Valid Until: 10/27/2025, 9:30:00 AM)
  ...

--- Redis Cache (L1) ---
Total keys: 138
Sample 5 entries:
  - AAPL: $3.45T (Source: yahoo)
  - MSFT: $2.98T (Source: yahoo)
  ...

✅ Cache status check completed.
```

---

### 方法 2: 可视化报告（详细）

```bash
npm run cache:visualize
```

这将生成一个 **`cache-report.html`** 文件在项目根目录。

**打开报告:**
```bash
open cache-report.html
```

---

## 📈 可视化报告内容

生成的 HTML 报告包含以下内容：

### 1️⃣ 统计卡片
- **MongoDB (L2 缓存)**
  - 总缓存数量
  - 有效缓存数
  - 过期缓存数

- **Redis (L1 缓存)**
  - 缓存数量
  - 缓存命中率
  - 预估内存使用

- **性能指标**
  - L1 命中率 (Redis)
  - L2 命中率 (MongoDB)
  - 总命中率

### 2️⃣ 数据源分布图
柱状图显示各数据源的占比：
- Yahoo Finance (主要)
- Finnhub (备用)
- Fallback (估算)

### 3️⃣ MongoDB 缓存记录表
显示最近 100 条缓存记录，包含：
- 状态 (✅ 有效 / ❌ 过期)
- 股票代码
- 市值
- 价格
- 数据源
- 最后更新时间
- 有效期

### 4️⃣ Redis 缓存记录表
显示前 50 条 Redis 缓存，包含：
- 股票代码
- 市值
- 价格
- 数据源
- TTL (剩余时间)

---

## 🎨 报告特性

- **响应式设计** - 支持移动端和桌面端
- **动态动画** - 柱状图有平滑的加载动画
- **颜色编码** - 不同数据源用不同颜色标识
- **状态标签** - 清晰显示缓存是否有效
- **渐变主题** - 美观的紫色渐变背景

---

## 🔧 故障排除

### 问题 1: MongoDB URI is missing

**解决方案:**
```bash
# 确保 .env 文件存在并包含 MONGODB_URI
echo "MONGODB_URI=mongodb://root:example@localhost:27017/openstock?authSource=admin" >> .env
```

### 问题 2: Redis 显示不可用

**解决方案:**
```bash
# 检查 Redis 是否运行
docker ps | grep redis

# 如果没有运行，启动它
docker compose up -d redis

# 等待 5 秒后重试
sleep 5 && npm run cache:visualize
```

### 问题 3: 没有缓存数据

**解决方案:**
```bash
# 运行开发服务器并访问热力图页面
npm run dev

# 或者手动触发缓存更新 (需要配置 Inngest)
# Inngest 会在每天 UTC 21:30 自动更新
```

---

## 📊 数据解读

### 缓存命中率
- **90%+** - 优秀 ✅
- **70-90%** - 良好 👍
- **50-70%** - 需优化 ⚠️
- **<50%** - 需检查 ❌

### 数据源分布
- **Yahoo Finance** - 主要数据源，最可靠
- **Finnhub** - Yahoo 失败时的备用源
- **Fallback** - 基于价格的估算，精度较低

### TTL (Time To Live)
- Redis 缓存默认 TTL: **1 小时**
- MongoDB 缓存默认有效期: **24 小时**

---

## 🔄 定时更新

系统会自动在以下时间更新缓存：

1. **每日定时更新**
   - 时间: UTC 21:30 (美股收盘后)
   - 频率: 周一至周五
   - 范围: 所有 Watchlist 股票

2. **即时更新**
   - 触发: 用户添加新股票到 Watchlist
   - 方式: 异步预缓存
   - 不阻塞用户操作

---

## 📚 相关文档

- [架构文档](./ARCHITECTURE.md)
- [市值缓存文档](./MARKET_CAP_CACHE.md)
- [热力图优化](./HEATMAP_OPTIMIZATION.md)

---

## 🆘 需要帮助？

如有问题，请查看:
1. [ARCHITECTURE.md](./ARCHITECTURE.md) - 系统架构说明
2. [Docker 日志](#docker-logs) - 查看服务状态
3. [Issue Tracker](https://github.com/your-repo/issues) - 提交问题

### Docker 日志
```bash
# 查看 MongoDB 日志
docker compose logs mongodb

# 查看 Redis 日志
docker compose logs redis

# 实时监控日志
docker compose logs -f mongodb redis
```

---

**最后更新:** 2025-10-26  
**版本:** 1.0.0

