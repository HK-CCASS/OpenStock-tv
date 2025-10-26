# OpenStock 系统架构总览

> **最后更新**: 2025-10-26  
> **版本**: v1.0 (含双层缓存系统 + Mock Ticker)

---

## 🏗️ 系统架构图

```mermaid
graph TB
    subgraph "前端层 Frontend"
        A[Next.js 15 App Router]
        B[React 19 Components]
        C[Tailwind CSS v4]
        D[shadcn/ui + ECharts]
    end

    subgraph "应用层 Application"
        E[Server Components]
        F[Client Components]
        G[Server Actions]
        H[API Routes + SSE]
    end

    subgraph "业务逻辑层 Business Logic"
        I[Better Auth]
        J[Watchlist Multi-Group]
        K[Heatmap Service]
        L[Market Cap Cache Manager]
        M[Inngest Workflows]
    end

    subgraph "数据访问层 Data Access"
        N[Mongoose ODM]
        O[Redis Client懒加载]
        P[Yahoo Finance SDK]
        Q[Finnhub SDK]
        R[TradingView Ticker]
        S[Mock Ticker 85+ stocks]
        T[SSE Manager]
    end

    subgraph "基础设施层 Infrastructure"
        U[(MongoDB 持久化+L2缓存)]
        V[(Redis L1缓存 1h TTL)]
        W[Yahoo Finance API主源]
        X[Finnhub API备用源]
        Y[TradingView WebSocket]
        Z[Gemini AI]
        AA[Nodemailer SMTP]
    end

    %% 前端连接
    A --> B
    A --> C
    B --> D
    
    %% 应用层连接
    E --> G
    F --> H
    
    %% 业务逻辑连接
    G --> I
    G --> J
    H --> K
    K --> L
    M --> Z
    M --> AA
    
    %% 数据访问连接
    I --> N
    J --> N
    L --> O
    L --> P
    L --> Q
    K --> T
    T --> R
    T --> S
    R --> Y
    
    %% 基础设施连接
    N --> U
    O --> V
    P --> W
    Q --> X
    
    %% 样式
    style K fill:#4caf50,stroke:#388e3c,color:#fff
    style L fill:#66bb6a,stroke:#4caf50,color:#fff
    style V fill:#ff6b6b,stroke:#f44336,color:#fff
    style U fill:#00ed64,stroke:#00c853,color:#000
    style S fill:#ffd54f,stroke:#fbc02d,color:#000
```

---

## 📊 核心数据流

### 1. 实时热力图数据流

```mermaid
sequenceDiagram
    autonumber
    participant U as 用户
    participant HP as Heatmap Page
    participant API as /api/user-data
    participant Cache as Cache Manager
    participant Redis as Redis L1
    participant Mongo as MongoDB L2
    participant Yahoo as Yahoo Finance
    participant Finn as Finnhub
    participant SSE as /api/stream SSE
    participant Mgr as SSE Manager
    participant Ticker as TradingView Ticker
    participant WS as TradingView WS

    %% 初始数据加载
    U->>HP: 访问热力图
    HP->>API: GET /api/heatmap/user-data
    API->>Cache: getMarketCapBatch(symbols)
    
    alt Redis L1 命中 (~90%)
        Cache->>Redis: mget(symbols)
        Redis-->>Cache: 市值数据 (~1-2ms)
    else MongoDB L2 命中 (~8%)
        Cache->>Mongo: find({validUntil > now})
        Mongo-->>Cache: 市值数据 (~10-20ms)
        Cache->>Redis: setex (回写L1)
    else 缓存未命中 (~2%)
        Cache->>Yahoo: batch 100 stocks
        alt Yahoo 成功
            Yahoo-->>Cache: 市值数据 (~300ms)
        else Yahoo 失败
            Cache->>Finn: batch 50 stocks (回退)
            Finn-->>Cache: 市值数据 (~500ms)
        end
        Cache->>Redis: setex (写L1, 1h TTL)
        Cache->>Mongo: bulkWrite (写L2, 24h expiry)
    end
    
    Cache-->>API: 市值数据 + 源标记
    API-->>HP: {pools, cells, marketCap}
    HP->>HP: 渲染 ECharts 树图
    
    %% 实时更新流
    HP->>SSE: EventSource('/api/heatmap/stream')
    SSE->>Mgr: subscribeClient(symbols)
    
    alt Mock Ticker 模式
        Mgr->>Ticker: new MockTicker(symbols)
        Note over Ticker: 85+预设股票<br/>每1-3秒随机更新
    else 真实 Ticker 模式
        Mgr->>Ticker: new TradingViewTicker(symbols)
        Ticker->>WS: WebSocket 连接
        WS-->>Ticker: 实时报价推送
    end
    
    loop 持续更新
        Ticker->>Mgr: onUpdate(symbol, state)
        Mgr->>SSE: broadcastUpdate(symbol, quote)
        SSE-->>HP: data: {"symbol", "price", "change"}
        HP->>HP: 实时计算市值
        HP->>HP: 更新 ECharts (requestAnimationFrame)
    end
```

---

### 2. 市值缓存架构

```mermaid
flowchart TB
    Start([触发点]) --> Trigger{触发源}
    
    %% 三种触发方式
    Trigger -->|添加到观察列表| T1[异步预缓存]
    Trigger -->|每日UTC 21:30<br/>周一至周五| T2[Inngest Cron Job]
    Trigger -->|热力图请求| T3[即时查询]
    
    %% 缓存查询流程
    T1 --> CacheMgr[Market Cap<br/>Cache Manager]
    T2 --> CacheMgr
    T3 --> CacheMgr
    
    CacheMgr --> L1Check{Redis L1<br/>查询}
    
    L1Check -->|命中 ~90%| L1Hit[返回缓存<br/>~1-2ms]
    L1Check -->|未命中 ~10%| L2Check{MongoDB L2<br/>查询<br/>validUntil > now}
    
    L2Check -->|命中 ~8%| L2Hit[返回缓存<br/>~10-20ms]
    L2Check -->|未命中 ~2%| APICall[API 调用]
    
    %% API 调用流程
    APICall --> Yahoo[Yahoo Finance<br/>batch 100 stocks]
    Yahoo -->|成功| YahooSuccess[获取市值<br/>~300ms]
    Yahoo -->|失败/限流| Finnhub[Finnhub API<br/>batch 50 stocks<br/>回退源]
    
    Finnhub -->|成功| FinnSuccess[获取市值<br/>~500ms]
    Finnhub -->|失败| Fallback[价格估算<br/>marketCap = price × shares]
    
    %% 写入缓存
    YahooSuccess --> WriteCache[写入缓存]
    FinnSuccess --> WriteCache
    Fallback --> WriteCache
    L2Hit --> BackfillL1[回写 L1]
    
    WriteCache --> Redis[(Redis L1<br/>TTL: 1 hour)]
    WriteCache --> MongoDB[(MongoDB L2<br/>Expiry: 24 hours<br/>+ source tracking)]
    BackfillL1 --> Redis
    
    %% 返回结果
    L1Hit --> Return([返回前端])
    L2Hit --> Return
    Redis --> Return
    MongoDB --> Return
    
    %% 样式
    style L1Hit fill:#66bb6a,stroke:#4caf50,color:#fff
    style L2Hit fill:#81c784,stroke:#66bb6a,color:#fff
    style Redis fill:#ff6b6b,stroke:#f44336,color:#fff
    style MongoDB fill:#00ed64,stroke:#00c853,color:#000
    style Yahoo fill:#5c6bc0,stroke:#3949ab,color:#fff
    style Finnhub fill:#7e57c2,stroke:#5e35b1,color:#fff
    style Fallback fill:#ffa726,stroke:#fb8c00,color:#fff
```

---

### 3. 观察列表多分组架构

```mermaid
graph TB
    User[用户] --> WLMgr[Watchlist Manager]
    
    WLMgr --> Groups[WatchlistGroup 分组管理]
    WLMgr --> Items[Watchlist 股票管理]
    
    Groups --> G1[创建分组]
    Groups --> G2[更新分组]
    Groups --> G3[删除分组]
    Groups --> G4[激活/停用分组]
    
    Items --> I1[添加股票]
    Items --> I2[移除股票]
    Items --> I3[移动股票到其他分组]
    
    G1 --> Category{设置 Category}
    Category -->|是| HeatmapPool[热力图 Pool]
    Category -->|否| DefaultPool[默认 Pool]
    
    I1 --> PreCache[触发预缓存]
    PreCache --> CacheMgr[Market Cap Cache Manager]
    
    Items --> DB[(MongoDB)]
    Groups --> DB
    
    DB --> Heatmap[实时热力图]
    DB --> MultiStock[多股票视图]
    DB --> StockDetail[个股详情]
    
    style PreCache fill:#66bb6a,stroke:#4caf50,color:#fff
    style HeatmapPool fill:#4caf50,stroke:#388e3c,color:#fff
    style CacheMgr fill:#ff6b6b,stroke:#f44336,color:#fff
```

---

## 🔑 核心模块详解

### 1. 双层缓存系统

#### Redis L1 缓存
- **TTL**: 1 小时
- **响应时间**: ~1-2ms
- **命中率**: ~90%
- **特性**: 懒加载、自动降级、Pipeline 批量操作
- **键格式**: `marketcap:NASDAQ:AAPL`

#### MongoDB L2 缓存
- **有效期**: 24 小时
- **响应时间**: ~10-20ms
- **命中率**: ~8%
- **特性**: 持久化、自动过期、数据源追踪
- **文档结构**:
  ```javascript
  {
    symbol: "NASDAQ:AAPL",
    marketCap: 2800000000000,
    price: 180.25,
    source: "yahoo", // or "finnhub" or "fallback"
    lastUpdated: ISODate("2025-10-26T21:30:00Z"),
    validUntil: ISODate("2025-10-27T21:30:00Z")
  }
  ```

---

### 2. 多数据源容错

#### 数据源优先级
1. **Yahoo Finance** (主源)
   - 批量: 100 stocks
   - 响应: ~300ms
   - 免费、无需 API Key
   
2. **Finnhub** (备用源)
   - 批量: 50 stocks
   - 响应: ~500ms
   - 需要 API Key
   
3. **Price Estimation** (回退)
   - 基于实时价格和流通股数
   - 立即计算
   - 准确度: ~80-90%

---

### 3. Mock Ticker 测试模式

#### 特性
- **85+ 预设股票**，覆盖所有主要行业
- **每 1-3 秒**随机更新一个股票
- **价格变化范围**: -2% ~ +2%
- **无网络依赖**，完全本地运行

#### 支持的行业
- 科技股 (30 支): AAPL, MSFT, GOOGL, AMZN, META, NVDA, TSLA...
- 金融股 (11 支): JPM, BAC, GS, V, MA, BLK...
- 消费股 (10 支): WMT, HD, KO, MCD, COST...
- 医疗股 (10 支): JNJ, UNH, LLY, TMO, ABBV...
- 能源股 (5 支): XOM, CVX, COP, SLB...
- 工业股 (7 支): BA, CAT, GE, HON, LMT...
- 通信股 (4 支): T, VZ, CMCSA, TMUS...
- 房地产 (3 支): AMT, PLD, SPG...
- 其他 (5 支): BRK.B, TSM...

#### 启用方式
```bash
# 方法 1: 使用专用命令
npm run dev:mock

# 方法 2: 设置环境变量
export USE_MOCK_TICKER=true
npm run dev

# 方法 3: .env 文件
USE_MOCK_TICKER=true
```

---

### 4. Inngest 自动化工作流

#### 工作流列表

1. **用户注册欢迎邮件**
   - 触发: `app/user.created`
   - AI 生成: Gemini 2.5 Flash Lite
   - 内容: 个性化欢迎内容

2. **每日新闻摘要**
   - Cron: `0 12 * * *` (每日 12:00 UTC)
   - 内容: 基于用户观察列表的新闻摘要
   - AI 生成: Gemini

3. **每日市值缓存更新** 🆕
   - Cron: `30 21 * * 1-5` (周一至周五 21:30 UTC)
   - 时机: 美股收盘后 (16:30 ET = 21:30 UTC)
   - 操作: 更新所有观察列表股票的市值缓存
   - 数据源: Yahoo Finance → Finnhub → Fallback

---

## 📈 性能指标

### 缓存性能

| 层级 | 响应时间 | 命中率 | 数据源 |
|------|---------|--------|--------|
| **Redis L1** | ~1-2ms | ~90% | 内存缓存 |
| **MongoDB L2** | ~10-20ms | ~8% | 持久化缓存 |
| **Yahoo Finance** | ~300ms | ~1.5% | API 调用 |
| **Finnhub** | ~500ms | ~0.3% | API 调用 (回退) |
| **Price Estimation** | ~1ms | ~0.2% | 本地计算 |

### 批量处理能力

| API | 批量大小 | 响应时间 | 并发限制 |
|-----|---------|---------|---------|
| Yahoo Finance | 100 stocks | ~300ms | 无官方限制 |
| Finnhub | 50 stocks | ~500ms | Free: 60 calls/min |

### 前端性能

| 优化项 | 方法 | 效果 |
|--------|------|------|
| ChartOption 构建 | `useMemo` | +70% 效率 |
| 状态更新 | `useCallback` | 减少重渲染 |
| ECharts 更新 | `requestAnimationFrame` | 流畅度 +100% |
| 动画禁用 | `animation: false` | GPU 使用 -75% |
| Label 简化 | 动态字体 + 溢出截断 | CPU 使用 -60% |

---

## 🔄 数据同步策略

### 1. 实时同步
- **TradingView WebSocket** → 价格实时推送 (交易时间)
- **Mock Ticker** → 模拟实时推送 (非交易时间)
- **SSE Stream** → 前端实时更新

### 2. 批量同步
- **每日定时**: UTC 21:30 (周一至周五)
- **触发更新**: 添加到观察列表时

### 3. 按需同步
- **缓存未命中**: 立即从 API 获取
- **缓存过期**: 重新验证并刷新

---

## 🛡️ 容错与降级

### Redis 不可用
1. 跳过 L1 缓存
2. 直接查询 MongoDB L2
3. 正常运行，性能略降

### MongoDB 不可用
1. 应用启动失败
2. 显示错误页面
3. 需要运维介入

### Yahoo Finance 不可用
1. 自动切换到 Finnhub
2. 记录数据源为 `finnhub`
3. 用户无感知

### Finnhub 不可用
1. 使用价格估算
2. 记录数据源为 `fallback`
3. 准确度略降

### TradingView WebSocket 断开
1. 自动重连机制
2. 重新订阅股票
3. 恢复实时推送

---

## 📁 关键文件路径

### 缓存系统
```
lib/cache/market-cap-cache-manager.ts  # 双层缓存管理器
lib/redis/client.ts                     # Redis 客户端 (懒加载)
lib/actions/yahoo-finance.actions.ts    # Yahoo Finance 适配器
lib/actions/heatmap.actions.ts          # 市值缓存逻辑
database/models/market-cap.model.ts     # MongoDB L2 模型
```

### 实时系统
```
lib/tradingview/ticker.ts               # TradingView WebSocket 客户端
lib/tradingview/mock-ticker.ts          # Mock Ticker (85+ stocks)
lib/tradingview/sse-manager.ts          # SSE 连接管理器
app/api/heatmap/stream/route.ts         # SSE API 路由
```

### 热力图
```
components/heatmap/UserHeatmap.tsx      # 热力图组件 (ECharts)
app/(root)/heatmap/page.tsx             # 热力图页面
app/api/heatmap/user-data/route.ts      # 初始数据 API
```

### 观察列表
```
lib/actions/watchlist.actions.ts        # 观察列表 Actions
lib/actions/watchlist-group.actions.ts  # 分组管理 Actions
database/models/watchlist.model.ts      # Watchlist 模型
database/models/watchlist-group.model.ts # WatchlistGroup 模型
```

### 自动化
```
lib/inngest/functions/update-market-cap-cache.ts  # 市值更新工作流
lib/inngest/functions/welcome-email.ts            # 欢迎邮件工作流
lib/inngest/functions/daily-news.ts               # 新闻摘要工作流
```

---

## 🚀 快速开始

### 最小配置 (无 Redis)
```bash
# 环境变量
MONGODB_URI=your_mongodb_uri
FINNHUB_API_KEY=your_finnhub_key

# 启动
npm run dev
```

### 推荐配置 (含 Redis)
```bash
# 启动 Docker 服务
docker compose up -d mongodb
docker compose up -d openstock-redis

# 环境变量
MONGODB_URI=mongodb://root:example@mongodb:27017/openstock?authSource=admin
REDIS_URL=redis://openstock-redis:6379
FINNHUB_API_KEY=your_finnhub_key

# 启动应用
npm run dev
```

### 测试配置 (Mock Ticker)
```bash
# 环境变量
USE_MOCK_TICKER=true

# 或使用专用命令
npm run dev:mock
```

---

## 📚 相关文档

- **完整架构**: [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- **热力图架构**: [docs/architecture/heatmap-architecture.md](./architecture/heatmap-architecture.md)
- **市值缓存系统**: [docs/MARKET_CAP_CACHE.md](./MARKET_CAP_CACHE.md)
- **缓存可视化**: [docs/CACHE_VISUALIZATION_GUIDE.md](./CACHE_VISUALIZATION_GUIDE.md)
- **热力图测试**: [docs/HEATMAP_TESTING_GUIDE.md](./HEATMAP_TESTING_GUIDE.md)
- **Mock Ticker**: [docs/MOCK_TICKER_USAGE.md](./MOCK_TICKER_USAGE.md)
- **观察列表**: [docs/WATCHLIST_USAGE.md](./WATCHLIST_USAGE.md)
- **开发指南**: [../CLAUDE.md](../CLAUDE.md)

---

## 🎯 未来规划

### Phase 1 (当前) ✅
- ✅ 双层缓存系统
- ✅ Yahoo Finance 集成
- ✅ Mock Ticker
- ✅ 全屏热力图
- ✅ 性能优化

### Phase 2 (计划中)
- [ ] WebSocket 直连 (替代 SSE)
- [ ] 自定义热力图配色
- [ ] 更多技术指标
- [ ] 移动端优化
- [ ] PWA 支持

### Phase 3 (未来)
- [ ] 机器学习价格预测
- [ ] 社区分享功能
- [ ] 实时聊天室
- [ ] 高级图表分析
- [ ] API 开放平台

---

**文档维护**: 本文档随着系统更新而持续维护。最后更新于 2025-10-26。

**贡献者**: Open Dev Society Team & Community Contributors

**许可证**: AGPL-3.0 - Open Source, Forever Free

