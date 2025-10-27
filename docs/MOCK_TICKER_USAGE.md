# Mock Ticker 使用指南

## 什么是 Mock Ticker？

Mock Ticker 是一个模拟 TradingView WebSocket 的工具，用于：
- ✅ 非交易时间测试热力图实时更新
- ✅ 开发环境快速验证功能
- ✅ 演示和截图（可控的数据变化）
- ✅ 不依赖外部 API 的集成测试

## 特性

- 🎲 **随机价格变化**: 每1-3秒随机更新一个股票
- 📊 **真实价格范围**: 基于实际股票价格范围
- 🔄 **持续更新**: 模拟实时市场行为
- 🎨 **完整数据**: 包含 price, change, changePercent, volume
- 🚀 **即时响应**: 无需等待 TradingView 连接

## 快速开始

### 方法 1: 开发环境自动启用（推荐）

Mock Ticker 在开发环境（NODE_ENV=development）下**默认启用**。

```bash
# 直接启动开发服务器
npm run dev

# 访问热力图页面
# 本地开发: http://localhost:3000/heatmap
# Docker: http://localhost:3100/heatmap

# ✅ 会看到控制台输出：
# [SSE] Starting Mock Ticker with X symbols
# [Mock Ticker] Starting with X symbols
# [Mock Ticker] Started successfully
# [Mock Ticker] NASDAQ:AAPL: $180.25 (+0.45%)
```

### 方法 2: 显式启用（生产环境）

```bash
# 设置环境变量
export USE_MOCK_TICKER=true

# 或在 .env 文件添加
USE_MOCK_TICKER=true

# 启动服务器
npm run dev
```

### 方法 3: 独立测试 Mock Ticker

```bash
# 运行测试脚本（30秒自动停止）
npx tsx scripts/test-mock-ticker.ts
```

## 测试流程

### 完整测试步骤（5分钟）

```bash
# 1. 确保 Mock Ticker 已启用（开发环境默认）
npm run dev

# 2. 登录并创建观察列表
# 本地: http://localhost:3000/sign-in
# Docker: http://localhost:3100/sign-in
# 创建分组并添加股票（任意股票代码）

# 3. 访问热力图
# 本地: http://localhost:3000/heatmap
# Docker: http://localhost:3100/heatmap

# 4. 观察实时更新（1-3秒一次）
# ✅ 股票价格会变化
# ✅ 涨跌幅会变化
# ✅ 颜色会实时切换
# ✅ 池子大小会调整
```

### 验证更新效果

打开浏览器控制台（F12 → Console）：

```javascript
// 监听 SSE 消息
const es = new EventSource('/api/heatmap/stream');
es.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`${data.symbol}: $${data.price} (${data.changePercent}%)`);
};

// ✅ 每1-3秒会看到新的更新：
// NASDAQ:AAPL: $180.45 (0.25%)
// NASDAQ:MSFT: $379.82 (-0.18%)
// ...
```

## Mock Ticker vs Real Ticker

| 特性 | Mock Ticker | Real TradingView Ticker |
|------|-------------|------------------------|
| 数据源 | 随机生成 | TradingView WebSocket |
| 更新频率 | 1-3秒/股票 | 实时（市场数据） |
| 交易时间限制 | ❌ 无限制 | ✅ 仅交易时间 |
| 网络依赖 | ❌ 无 | ✅ 需要连接 TradingView |
| 价格真实性 | ⚠️ 模拟数据 | ✅ 真实市场报价 |
| 开发调试 | ✅ 完美 | ⚠️ 受市场时间限制 |
| 生产使用 | ❌ 不推荐 | ✅ 推荐 |

## 支持的股票代码

Mock Ticker 支持任意股票代码，并为常见股票设置了合理的基准价格：

| 股票代码 | 基准价格 | 交易所 |
|---------|---------|--------|
| NASDAQ:AAPL | $180 | Nasdaq |
| NASDAQ:MSFT | $380 | Nasdaq |
| NASDAQ:GOOGL | $140 | Nasdaq |
| NASDAQ:TSLA | $250 | Nasdaq |
| NASDAQ:META | $470 | Nasdaq |
| NASDAQ:NVDA | $500 | Nasdaq |
| NYSE:JPM | $150 | NYSE |
| NYSE:BAC | $35 | NYSE |
| NYSE:WFC | $45 | NYSE |
| NYSE:GS | $400 | NYSE |
| 其他股票 | $100-500 | 随机 |

## 实现原理

### Mock Ticker 架构

```typescript
// lib/tradingview/mock-ticker.ts

class MockTradingViewTicker {
  // 1. 初始化模拟价格
  constructor(symbols) {
    symbols.forEach(symbol => {
      this.states.set(symbol, {
        price: getBasePrice(symbol),
        volume: randomVolume(),
        change: 0,
        changePercent: 0,
      });
    });
  }

  // 2. 启动定时更新
  start() {
    setInterval(() => {
      const symbol = randomSymbol();
      const priceChange = random(-2%, +2%);
      updateState(symbol, priceChange);
      callback(symbol, newState);
    }, 1000-3000ms);
  }
}
```

### SSE Manager 集成

```typescript
// lib/tradingview/sse-manager.ts

// 根据环境自动选择
const USE_MOCK_TICKER = 
  process.env.USE_MOCK_TICKER === 'true' || 
  process.env.NODE_ENV === 'development';

if (USE_MOCK_TICKER) {
  ticker = new MockTradingViewTicker(symbols);
} else {
  ticker = new TradingViewTicker(symbols);
}
```

## 切换回真实 Ticker

### 方法 1: 修改环境变量

```bash
# 在 .env 文件中
USE_MOCK_TICKER=false

# 或命令行
export USE_MOCK_TICKER=false
npm run dev
```

### 方法 2: 生产环境构建

```bash
# 生产构建默认使用真实 Ticker
NODE_ENV=production npm run build
npm start
```

### 验证使用的 Ticker 类型

查看服务器控制台日志：

```bash
# Mock Ticker
[SSE] Starting Mock Ticker with 10 symbols
[Mock Ticker] Starting with 10 symbols

# Real Ticker
[SSE] Starting TradingView Ticker with 10 symbols
[TradingView] WebSocket connected
```

## 常见问题

### Q1: Mock Ticker 数据准确吗？

**A**: 不准确。Mock Ticker 生成的是**模拟数据**，仅用于：
- 功能测试
- UI 验证
- 演示展示

**不应该用于**:
- 投资决策
- 生产环境
- 真实交易

### Q2: 如何确认使用的是哪个 Ticker？

**A**: 查看服务器控制台或浏览器控制台：
```bash
# Mock Ticker
[Mock Ticker] Starting with X symbols

# Real Ticker
[TradingView] WebSocket connected
```

### Q3: Mock Ticker 会连接 TradingView 吗？

**A**: 不会。Mock Ticker 完全独立运行，不会：
- 连接 TradingView WebSocket
- 消耗网络带宽
- 受交易时间限制

### Q4: 生产环境能用 Mock Ticker 吗？

**A**: 强烈不推荐！原因：
- ❌ 数据不真实
- ❌ 可能误导用户
- ❌ 违反数据准确性原则

仅在以下情况使用：
- ✅ 内部测试环境
- ✅ 开发调试
- ✅ 功能演示（需明确标注）

### Q5: Mock Ticker 更新频率能调整吗？

**A**: 可以。修改 `lib/tradingview/mock-ticker.ts`:

```typescript
// 当前：每1-3秒随机更新
this.updateInterval = setInterval(() => {
  this.generateRandomUpdate();
}, 1000 + Math.random() * 2000);

// 改为：每500ms固定更新（更频繁）
this.updateInterval = setInterval(() => {
  this.generateRandomUpdate();
}, 500);
```

## 最佳实践

### 开发环境

```bash
# ✅ 使用 Mock Ticker 快速开发
NODE_ENV=development npm run dev
```

### 集成测试

```bash
# ✅ 使用 Mock Ticker 稳定测试
USE_MOCK_TICKER=true npm run test
```

### 生产环境

```bash
# ✅ 使用 Real Ticker 真实数据
USE_MOCK_TICKER=false npm run build
npm start
```

### 演示展示

```bash
# ⚠️ Mock Ticker + 明确标注
USE_MOCK_TICKER=true npm run dev
# 在 UI 上显示 "演示模式 - 模拟数据"
```

## 总结

Mock Ticker 是一个强大的开发和测试工具：
- ✅ 解决了非交易时间无法测试的问题
- ✅ 提供可控的模拟数据
- ✅ 加速开发调试流程
- ✅ 开发环境默认启用

但请记住：
- ⚠️ Mock 数据不是真实市场数据
- ⚠️ 仅用于开发、测试和演示
- ⚠️ 生产环境必须使用 Real Ticker

---

**下一步**: 
- 本地开发: 运行 `npm run dev` 并访问 http://localhost:3000/heatmap
- Docker: 运行 `docker compose up -d` 并访问 http://localhost:3100/heatmap

查看实时更新效果！

