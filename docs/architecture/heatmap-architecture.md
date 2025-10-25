# 热力图系统架构

## 系统架构图

```mermaid
graph TB
    subgraph "客户端 (Browser)"
        A[UserHeatmap Component]
        B[EventSource - SSE Client]
        C[ECharts Treemap]
    end

    subgraph "Next.js App Router"
        D[/heatmap - Page]
        E[/api/heatmap/user-data - REST API]
        F[/api/heatmap/stream - SSE API]
    end

    subgraph "Server Actions"
        G[heatmap.actions.ts]
        H[watchlist.actions.ts]
        I[finnhub.actions.ts]
    end

    subgraph "SSE 管理层"
        J[SSE Manager Singleton]
    end

    subgraph "TradingView 集成"
        K[TradingView Ticker]
        L[wss://data.tradingview.com]
    end

    subgraph "数据存储"
        M[(MongoDB)]
        N[WatchlistGroup Collection]
        O[Watchlist Collection]
    end

    subgraph "外部 API"
        P[Finnhub API]
    end

    %% 客户端连接
    A --> B
    A --> C
    A -.初始数据.-> E
    B -.实时更新.-> F

    %% 页面路由
    D --> A

    %% API 路由
    E --> G
    F --> J

    %% Server Actions
    G --> N
    G --> O
    G --> I
    H --> N
    H --> O
    I --> P

    %% SSE 管理
    J --> K

    %% TradingView 连接
    K -.WebSocket.-> L

    %% 数据库连接
    N --> M
    O --> M

    %% 样式
    classDef client fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef server fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef external fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px

    class A,B,C client
    class D,E,F,G,H,I,J,K server
    class M,N,O data
    class L,P external
```

## 数据流程图

```mermaid
sequenceDiagram
    actor User
    participant Page as /heatmap Page
    participant Component as UserHeatmap
    participant DataAPI as /api/heatmap/user-data
    participant StreamAPI as /api/heatmap/stream
    participant Actions as Server Actions
    participant SSE as SSE Manager
    participant Ticker as TradingView Ticker
    participant TV as TradingView WS
    participant DB as MongoDB
    participant Finnhub as Finnhub API

    %% 初始加载流程
    User->>Page: 访问 /heatmap
    Page->>Page: 验证登录 (middleware)
    Page->>Component: 渲染 UserHeatmap
    
    %% 获取初始数据
    Component->>DataAPI: GET /api/heatmap/user-data
    DataAPI->>Actions: getUserHeatmapData(userId)
    Actions->>DB: 查询 WatchlistGroup
    DB-->>Actions: 返回分组数据
    Actions->>DB: 查询 Watchlist
    DB-->>Actions: 返回股票列表
    Actions->>Actions: 按 category/name 分组
    Actions->>Finnhub: getBatchStockQuotes(symbols)
    Finnhub-->>Actions: 返回市值和报价
    Actions-->>DataAPI: 返回初始数据
    DataAPI-->>Component: { pools, allCells }
    
    %% 渲染图表
    Component->>Component: 存储基准数据
    Component->>Component: 初始化 ECharts
    
    %% 建立 SSE 连接
    Component->>StreamAPI: EventSource /api/heatmap/stream
    StreamAPI->>StreamAPI: 验证登录
    StreamAPI->>Actions: getWatchlistWithDetails(userId)
    Actions->>DB: 查询用户观察列表
    DB-->>Actions: 返回股票代码列表
    Actions-->>StreamAPI: symbols[]
    
    %% SSE Manager 管理
    StreamAPI->>SSE: subscribeClient(clientId, symbols)
    
    alt Ticker 未运行
        SSE->>Ticker: 启动 TradingView Ticker
        Ticker->>TV: WebSocket 连接
        TV-->>Ticker: 连接成功
        Ticker->>TV: 认证和订阅
        TV-->>Ticker: 订阅确认
    else Ticker 已运行
        SSE->>Ticker: addSymbols(newSymbols)
        Ticker->>TV: 订阅新股票
    end
    
    %% 返回 SSE 流
    StreamAPI-->>Component: SSE Stream (connected)
    
    %% 实时更新循环
    loop 实时报价更新
        TV->>Ticker: 报价更新 (qsd 消息)
        Ticker->>Ticker: 解析并更新状态
        Ticker->>SSE: onUpdate(symbol, state)
        SSE->>SSE: 广播到所有订阅客户端
        SSE->>StreamAPI: 推送更新
        StreamAPI-->>Component: data: {symbol, price, change...}
        Component->>Component: 计算实时市值
        Component->>Component: 更新池子统计
        Component->>Component: 更新 ECharts 数据
    end
    
    %% 用户断开
    User->>Component: 离开页面
    Component->>StreamAPI: 关闭 EventSource
    StreamAPI->>SSE: unsubscribeClient(clientId)
    
    alt 无其他客户端
        SSE->>Ticker: 停止 Ticker
        Ticker->>TV: 关闭 WebSocket
    end
```

## 组件关系图

```mermaid
graph LR
    subgraph "前端组件"
        A[UserHeatmap.tsx]
        B[ECharts Instance]
        C[SSE Connection]
    end

    subgraph "API 层"
        D[user-data API]
        E[stream API]
    end

    subgraph "业务逻辑层"
        F[heatmap.actions]
        G[watchlist.actions]
        H[finnhub.actions]
    end

    subgraph "SSE 管理层"
        I[SSE Manager]
        J[TradingView Ticker]
    end

    subgraph "数据模型"
        K[WatchlistGroup]
        L[Watchlist]
    end

    A --> B
    A --> C
    A --> D
    C --> E
    D --> F
    E --> I
    F --> G
    F --> H
    G --> K
    G --> L
    I --> J

    style A fill:#42a5f5
    style I fill:#66bb6a
    style J fill:#ffa726
```

## 技术栈层次图

```mermaid
graph TB
    subgraph "展示层"
        A[React Components]
        B[ECharts]
        C[Tailwind CSS]
    end

    subgraph "应用层"
        D[Next.js 15]
        E[App Router]
        F[Server Components]
        G[Client Components]
    end

    subgraph "业务逻辑层"
        H[Server Actions]
        I[API Routes]
        J[SSE Manager]
        K[TradingView Ticker]
    end

    subgraph "数据访问层"
        L[Mongoose]
        M[Finnhub SDK]
        N[WebSocket Client]
    end

    subgraph "基础设施层"
        O[MongoDB]
        P[TradingView WS]
        Q[Finnhub API]
    end

    A --> D
    B --> D
    C --> D
    D --> E
    E --> F
    E --> G
    F --> H
    G --> I
    H --> L
    I --> J
    J --> K
    K --> N
    L --> O
    M --> Q
    N --> P

    style D fill:#000000,color:#fff
    style J fill:#66bb6a
    style K fill:#ffa726
```

## 数据模型 ER 图

```mermaid
erDiagram
    USER ||--o{ WATCHLIST_GROUP : creates
    USER ||--o{ WATCHLIST : has
    WATCHLIST_GROUP ||--o{ WATCHLIST : contains
    WATCHLIST }o--|| STOCK_DATA : references
    
    USER {
        string id PK
        string email
        string name
    }
    
    WATCHLIST_GROUP {
        string _id PK
        string userId FK
        string name
        string category
        boolean isSystem
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }
    
    WATCHLIST {
        string _id PK
        string userId FK
        string symbol
        string company
        string groupId FK
        datetime addedAt
    }
    
    STOCK_DATA {
        string symbol PK
        number price
        number change
        number changePercent
        number volume
        number marketCap
    }
```

## 热力图分组逻辑

```mermaid
flowchart TD
    A[获取用户的 WatchlistGroups] --> B{有 category?}
    B -->|是| C[按 category 分组]
    B -->|否| D[使用 name 作为独立 Pool]
    
    C --> E[合并相同 category 的 Groups]
    D --> F[创建独立 Pool]
    
    E --> G[查询每个 Pool 的 Watchlist]
    F --> G
    
    G --> H[聚合股票列表]
    H --> I[调用 Finnhub 获取市值]
    I --> J[返回 Pools 数据]
    
    style B fill:#ffe082
    style C fill:#81c784
    style D fill:#64b5f6
```

## 市值计算流程

```mermaid
flowchart LR
    A[初始加载] --> B[Finnhub API]
    B --> C[获取市值基准]
    B --> D[获取价格基准]
    
    C --> E[存储 marketCapBase]
    D --> F[存储 priceBase]
    
    G[SSE 实时更新] --> H[接收当前价格]
    
    E --> I[实时市值计算]
    F --> I
    H --> I
    
    I --> J[realTimeMarketCap = marketCapBase × currentPrice / priceBase]
    
    J --> K[更新 ECharts]
    
    style I fill:#ffa726
    style J fill:#66bb6a
```

## SSE 连接管理

```mermaid
stateDiagram-v2
    [*] --> Idle: 系统启动
    
    Idle --> Starting: 第一个客户端连接
    Starting --> Running: Ticker 启动成功
    Running --> Running: 新客户端加入
    
    Running --> Stopping: 最后一个客户端断开
    Stopping --> Idle: Ticker 停止
    
    Running --> Running: 接收报价更新
    Running --> Running: 广播到客户端
    
    note right of Running
        - 管理多个 SSE 连接
        - 共享一个 Ticker 实例
        - 广播报价更新
    end note
    
    note right of Stopping
        - 清理所有连接
        - 关闭 WebSocket
        - 释放资源
    end note
```

## 部署架构

```mermaid
graph TB
    subgraph "Vercel / Netlify"
        A[Next.js App]
        B[SSE Endpoints]
        C[Static Assets]
    end
    
    subgraph "Serverless Functions"
        D[API Routes]
        E[Server Actions]
    end
    
    subgraph "External Services"
        F[MongoDB Atlas]
        G[TradingView WebSocket]
        H[Finnhub API]
    end
    
    A --> B
    A --> C
    A --> D
    D --> E
    
    E --> F
    B --> G
    E --> H
    
    style A fill:#000000,color:#fff
    style B fill:#66bb6a
    style F fill:#00ed64
    style G fill:#2962ff
    style H fill:#30b27a
```

## 性能优化架构

```mermaid
graph LR
    subgraph "客户端优化"
        A[ECharts 实例复用]
        B[增量数据更新]
        C[SSE 自动重连]
    end
    
    subgraph "服务端优化"
        D[SSE Manager 单例]
        E[Ticker 共享实例]
        F[批量 API 调用]
    end
    
    subgraph "数据优化"
        G[市值缓存]
        H[MongoDB 索引]
        I[Finnhub 速率限制]
    end
    
    A --> Performance[高性能热力图]
    B --> Performance
    C --> Performance
    D --> Performance
    E --> Performance
    F --> Performance
    G --> Performance
    H --> Performance
    I --> Performance
    
    style Performance fill:#4caf50,color:#fff
```

## 关键设计决策

### 1. 为什么选择 SSE 而不是 WebSocket?

| 特性 | SSE | WebSocket |
|------|-----|-----------|
| 浏览器支持 | 原生支持，自动重连 | 需要手动实现 |
| Serverless 支持 | ✅ 完全支持 | ⚠️ 需要自定义服务器 |
| 实现复杂度 | 简单（单向推送） | 复杂（双向通信） |
| 带宽效率 | 高（HTTP/2） | 高（二进制协议） |
| 适用场景 | 单向数据流 | 双向交互 |

**结论**: 热力图只需要服务器到客户端的单向数据流，SSE 是最佳选择。

### 2. 单例模式的 SSE Manager

**优势**:
- 全局共享一个 TradingView WebSocket 连接
- 降低外部 API 调用频率
- 减少资源占用
- 简化连接管理

**实现**:
```typescript
class SSEManager {
  private static instance: SSEManager | null = null;
  
  public static getInstance(): SSEManager {
    if (!SSEManager.instance) {
      SSEManager.instance = new SSEManager();
    }
    return SSEManager.instance;
  }
}
```

### 3. 实时市值计算

**为什么不每次都调用 Finnhub?**
- Finnhub API 有速率限制
- 市值变化相对缓慢
- 可以通过价格变化推算

**计算公式**:
```
实时市值 = 市值基准 × (当前价格 / 基准价格)
```

**示例**:
- 基准时刻: 市值 $2.5B, 价格 $150
- 当前时刻: 价格 $152.30
- 实时市值: $2.5B × (152.30 / 150) = $2.538B

### 4. Pool 分组策略

**设计原则**:
- 优先使用 `category` 字段聚合
- 无 `category` 时使用 `name` 作为独立显示
- 支持灵活的用户自定义分组

**示例**:
```typescript
// 用户的观察列表分组
WatchlistGroups = [
  { name: "我的科技股A", category: "Technology" },
  { name: "我的科技股B", category: "Technology" },
  { name: "个人投资", category: null },
]

// 生成的热力图 Pools
Pools = [
  { poolName: "Technology", stocks: [股票A, 股票B] },
  { poolName: "个人投资", stocks: [...] },
]
```

## 总结

本架构实现了一个高性能、可扩展、Serverless 友好的实时股票热力图系统，核心特点：

1. **纯 JavaScript 实现**: 无需 Python 服务器
2. **SSE 流式推送**: 浏览器原生支持，自动重连
3. **单例模式优化**: 全局共享 TradingView 连接
4. **实时市值计算**: 基于价格变化的高效算法
5. **灵活的分组策略**: 支持 category 聚合和自定义命名
6. **Serverless 部署**: 可直接部署到 Vercel/Netlify

