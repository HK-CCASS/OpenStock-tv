# 市值数据管理界面设计方案

基于对 OpenStock 市值缓存系统的深度分析，本文档详细描述了市值数据管理界面的完整设计方案。

---

## 📊 **方案概览**

### **核心理念**
为复杂的双层缓存系统提供可视化运维界面，让开发者/运维人员能够：
- 一目了然掌握缓存系统整体健康状态
- 快速执行管理操作（清理/刷新/编辑）
- 监控数据源回退链路
- 分析性能指标和趋势

---

## 🏗️ **系统架构背景**

### **现有架构**
- **双层缓存：** Redis L1 (1小时TTL) + MongoDB L2 (24小时有效期)
- **5级回退链：** Yahoo Finance → Finnhub → 单个查询回退 → 单个Finnhub → 价格估算
- **统一批次：** 50支/批次（所有操作保持一致）
- **数据模型：** symbol, marketCap, price, source, lastUpdated, validUntil

### **技术栈**
- **前端：** Next.js 15 (App Router) + React 19 + shadcn/ui + Tailwind CSS
- **图表：** ECharts (与热力图保持一致)
- **API：** 现有Server Actions + 新增Admin Actions
- **权限：** Better Auth + 角色控制

---

## 📐 **界面架构设计**

### **整体布局**

```
┌─────────────────────────────────────────────────────────────┐
│  OpenStock - 市值缓存管理                                      │
├─────────────────────────────────────────────────────────────┤
│  [仪表板] [缓存管理] [数据源] [性能统计] [操作]                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  标签页内容区域                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**访问路径：** `/admin/cache`

---

## 📑 **功能模块详细设计**

### **模块一：缓存概览仪表板 (Dashboard)**

**目标：** 3秒内了解缓存系统整体健康状态

#### **核心卡片**

1. **Redis 状态卡片**
   - 连接状态：🟢/🟡/🔴
   - 命中率：98.5%
   - 键数量：1,234
   - 内存使用：245MB

2. **MongoDB 状态卡片**
   - 连接状态：🟢/🔴
   - 记录总数：15,678
   - 命中率：92.3%
   - 过期记录：126

3. **数据源健康卡片**
   - Yahoo Finance：🟢 98.5% 成功率
   - Finnhub API：🟡 85% 成功率
   - Fallback：⚪ 备用状态

4. **性能指标卡片**
   - 平均响应时间：245ms
   - 今日API调用：1,690次
   - 缓存命中率趋势图（7天）

#### **可视化组件**
- ECharts 折线图：7天命中率趋势
- ECharts 饼图：数据源分布
- ECharts 直方图：市值区间分布
- 实时状态指示器

---

### **模块二：缓存数据管理 (Data Management)**

**目标：** 查看、编辑、删除缓存条目

#### **核心功能**

1. **数据表格**
   ```typescript
   columns: [
     { header: 'Symbol', accessorKey: 'symbol' },
     { header: 'Price', accessorKey: 'price' },
     { header: 'Market Cap', accessorKey: 'marketCap' },
     { header: 'Source', accessorKey: 'source' },
     { header: 'Last Updated', accessorKey: 'lastUpdated' },
     { header: 'Valid Until', accessorKey: 'validUntil' },
     { header: 'Status', accessorKey: 'status' },
     { header: 'Actions', accessorKey: 'actions' },
   ]
   ```

2. **过滤与搜索**
   - 按Source过滤：Yahoo / Finnhub / Fallback
   - 按Status过滤：有效 / 过期 / 即将过期
   - 按Symbol搜索：支持模糊匹配
   - 按日期范围过滤

3. **批量操作**
   - ✅ 选择多条 → 批量删除
   - ✅ 选择多条 → 手动刷新
   - ✅ 按Source筛选 → 清理该源
   - ✅ 按过期时间 → 清理过期记录

4. **详情抽屉 (Drawer)**
   ```
   ┌─────────────────────────────┐
   │  AAPL 详情                   │
   ├─────────────────────────────┤
   │  Symbol: NASDAQ:AAPL        │
   │  Company: Apple Inc.        │
   │  Price: $150.25             │
   │  Market Cap: $2.35T         │
   │  Source: yahoo              │
   │  Last Updated: 2024-01-15   │
   │  Valid Until: 2024-01-16    │
   │  Status: ✅ 有效             │
   │                             │
   │  [编辑] [刷新] [删除]        │
   └─────────────────────────────┘
   ```

5. **实时更新**
   - SWR 每30秒自动刷新
   - 新数据高亮提示
   - 操作后自动更新

---

### **模块三：数据源监控 (Data Sources)**

**目标：** 监控5级回退链健康状态

#### **回退链路可视化**

```
┌─────────────────────────────────────────────────────────────┐
│  数据源回退链状态                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Level 1: Yahoo Finance        🟢 健康 (成功率: 98.5%)      │
│    ├─ 今日调用: 1,234 次                                  │
│    └─ 平均响应: 245ms                                      │
│                                                             │
│  Level 2: Finnhub API           🟡 部分失败 (成功率: 85%)   │
│    ├─ 今日调用: 456 次                                     │
│    ├─ 平均响应: 420ms                                      │
│    └─ ⚠️ API限制: 接近上限 (850/1000)                      │
│                                                             │
│  Level 3: 单个查询回退           🟢 健康 (调用: 23 次)      │
│                                                             │
│  Level 4: Finnhub单个查询        🟢 健康 (调用: 12 次)      │
│                                                             │
│  Level 5: 价格估算回退           ⚪ 备用 (调用: 5 次)       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### **每个数据源的详细信息**
- 成功率百分比 + 趋势图
- 今日调用次数
- 平均响应时间
- 最近错误日志（10条）
- 配置信息（API Key状态、速率限制）
- 速率限制使用情况

---

### **模块四：性能统计 (Performance Analytics)**

**目标：** 深度分析缓存性能

#### **统计维度**

1. **命中率分析**
   - Redis L1 命中率趋势（实时 + 7天历史）
   - MongoDB L2 命中率趋势
   - 总体命中率（两级合并）
   - 按时间段分析（开盘/收盘/盘后）

2. **数据分布统计**
   ```
   市值区间分布：
   ┌────────────────────────────────┐
   │ < $1B:      125 条 (12.5%)     │
   │ $1B-$10B:   456 条 (45.6%)     │
   │ $10B-$100B: 312 条 (31.2%)     │
   │ > $100B:    107 条 (10.7%)     │
   └────────────────────────────────┘
   ```

3. **数据源分布**
   - Yahoo Finance: 65%
   - Finnhub: 28%
   - Fallback: 7%

4. **Top 列表**
   - 🔥 访问最频繁的50个股票
   - 💰 市值最大的50个股票
   - ⚠️ 缓存失败最多的10个股票
   - 🐌 响应最慢的10个股票

---

### **模块五：缓存操作 (Cache Operations)**

**目标：** 快速执行管理操作

#### **操作面板**

```typescript
interface CacheOperations {
  refresh: {
    single: string[];      // 刷新单个股票
    batch: string[];       // 批量刷新
    bySource: 'yahoo' | 'finnhub' | 'fallback';  // 按源刷新
    expired: boolean;      // 刷新过期记录
    all: boolean;          // 刷新所有
  };
  clear: {
    redis: boolean;        // 清空Redis缓存
    mongodb: boolean;      // 清空MongoDB缓存
    expired: boolean;      // 清空过期记录
    bySource: string;      // 清空特定源
    symbols: string[];     // 清空特定股票
  };
  export: {
    format: 'csv' | 'json' | 'xlsx';
    scope: 'all' | 'expired' | 'bySource' | 'custom';
  };
}
```

#### **操作确认机制**
- 危险操作需要二次确认
- 显示影响范围说明
- 批量操作显示进度条

---

## 🛠️ **技术实现方案**

### **1. 前端文件结构**

```
app/(admin)/
└── cache/
    ├── page.tsx                          # 主页面（标签页容器）
    ├── dashboard/                        # 仪表板
    │   ├── RedisStatus.tsx
    │   ├── MongoDBStatus.tsx
    │   ├── DataSourcesHealth.tsx
    │   └── PerformanceCharts.tsx
    ├── data/                             # 数据管理
    │   ├── CacheTable.tsx                # 数据表格
    │   ├── BatchActions.tsx              # 批量操作
    │   └── SymbolDetail.tsx              # 详情抽屉
    ├── sources/                          # 数据源监控
    │   ├── FallbackChain.tsx             # 回退链路
    │   └── SourceMetrics.tsx             # 源指标
    ├── performance/                      # 性能统计
    │   ├── HitRateAnalytics.tsx
    │   └── DistributionCharts.tsx
    └── operations/                       # 缓存操作
        ├── RefreshPanel.tsx
        ├── ClearPanel.tsx
        └── ExportPanel.tsx
```

### **2. 后端 API 设计**

#### **新增 Server Actions (`lib/actions/admin/cache-admin.actions.ts`)**

```typescript
// 获取缓存概览数据
export async function getCacheOverview(): Promise<CacheOverview>

// 分页获取缓存数据
export async function getCacheData(params: {
  page: number;
  pageSize: number;
  filters?: CacheDataFilters;
}): Promise<PaginatedCacheData>

// 更新单个缓存条目
export async function updateCacheEntry(symbol: string, data: MarketCapData)

// 批量删除缓存条目
export async function deleteCacheEntries(symbols: string[])

// 手动刷新缓存
export async function refreshCacheData(params: RefreshParams)

// 清空缓存
export async function clearCache(params: ClearParams)

// 获取数据源指标
export async function getDataSourceMetrics(): Promise<DataSourceMetrics>

// 导出缓存数据
export async function exportCacheData(format: 'csv' | 'json', scope: string)
```

#### **API 路由 (`app/api/admin/cache/`)**

```
overview/route.ts      # GET: 缓存概览
data/route.ts          # GET: 缓存数据 (分页/过滤)
operations/refresh     # POST: 刷新缓存
operations/clear       # POST: 清空缓存
export/route.ts        # GET: 导出数据
sources/route.ts       # GET: 数据源状态
stream/route.ts        # GET: SSE 实时更新
```

### **3. 权限控制**

#### **基于 Better Auth 的角色系统**

```typescript
// lib/auth/roles.ts
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

// middleware.ts - 保护管理员路由
export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    const role = session.user.role || 'user';
    if (!['admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }
}
```

### **4. 实时数据更新**

#### **使用 Server-Sent Events**

```typescript
// app/api/admin/cache/stream/route.ts
export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const interval = setInterval(async () => {
        const data = await getCacheOverview();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }, 5000); // 每5秒更新一次

      controller.enqueue(encoder.encode('event: ping\ndata: connected\n\n'));

      return () => clearInterval(interval);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

## 🔐 **安全性考虑**

### **1. 操作审计**

```typescript
// 记录所有管理操作
interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: 'refresh' | 'clear' | 'update' | 'delete' | 'export';
  scope: {
    type: 'all' | 'symbols' | 'source' | 'expired';
    count: number;
    symbols?: string[];
  };
  timestamp: Date;
  ip: string;
  userAgent: string;
}

// 存储到 MongoDB 集合：cache_admin_logs
```

### **2. 速率限制**

```typescript
// lib/rate-limit.ts
const limiter = {
  refresh: '10/min',    // 每分钟最多10次刷新
  clear: '1/min',       // 每分钟最多1次清空
  export: '5/min',      // 每分钟最多5次导出
  dataQuery: '60/min',  // 每分钟最多60次查询
};
```

### **3. 数据验证**

```typescript
// 使用 zod 验证输入
import { z } from 'zod';

const RefreshSchema = z.object({
  symbols: z.array(z.string()).max(500),
  bySource: z.enum(['yahoo', 'finnhub']).optional(),
  expiredOnly: z.boolean().optional(),
});
```

---

## 📱 **UI/UX 设计细节**

### **1. 响应式断点**

```typescript
const breakpoints = {
  mobile: '320px',    // 单列布局，隐藏非关键列
  tablet: '768px',    // 双列布局，使用抽屉代替侧边栏
  desktop: '1024px',  // 三列布局
  wide: '1440px'      // 全宽布局
};
```

### **2. 深色主题配色**

```css
:root {
  --bg-primary: #1a1a1a;      /* 主背景 */
  --bg-secondary: #1f1f1f;    /* 卡片背景 */
  --bg-tertiary: #262626;     /* 表格行背景 */
  --border: #2a2a2a;          /* 边框 */
  --text-primary: #ffffff;    /* 主文本 */
  --text-secondary: #aaaaaa;  /* 次要文本 */
  --text-muted: #666666;      /* 禁用文本 */
  --success: #00e676;         /* 成功绿 */
  --warning: #ff9800;         /* 警告橙 */
  --error: #ff1744;           /* 错误红 */
  --info: #2196f3;            /* 信息蓝 */
}
```

### **3. 交互反馈**

```typescript
// 操作反馈模式
const feedback = {
  loading: 'spinner',           // 加载指示器
  success: 'toast',             // 成功提示 (3秒自动消失)
  error: 'modal',               // 错误弹窗
  confirmation: 'dialog',       // 确认对话框
  progress: 'progress-bar',     // 进度条 (批量操作)
  skeleton: 'shimmer',          // 骨架屏 (数据加载)
};

// 示例：批量刷新进度条
const [progress, setProgress] = useState(0);
const [isRefreshing, setIsRefreshing] = useState(false);

const refreshBatch = async (symbols: string[]) => {
  setIsRefreshing(true);
  for (let i = 0; i < symbols.length; i++) {
    await refreshSymbol(symbols[i]);
    setProgress(((i + 1) / symbols.length) * 100);
  }
  setIsRefreshing(false);
  setProgress(0);
};
```

---

## 🎨 **视觉设计稿**

### **仪表板布局草图**

```
┌─────────────────────────────────────────────────────────────┐
│  OpenStock - 市值缓存管理                    [管理员: Alice]  │
├─────────┬─────────┬─────────┬───────────────────────────────┤
│ Redis   │MongoDB  │数据源   │                               │
│ 🟢 连接 │ 🟢 正常 │ Yahoo 🟢│     7天命中率趋势             │
│ 命中率  │ 记录数  │Finnhub 🟡│   ┌─────────────────────┐    │
│  98.5%  │  1,234  │ 成功率  │   │ 100%                │    │
│         │  命中率 │  85%    │   │  98%  ▄▄▄▄▄▄▄▄▄▄▄   │    │
│内存使用 │  92.3%  │Fallback │   │  96%                │    │
│  245MB  │过期126  │ 备用    │   │                     │    │
└─────────┴─────────┴─────────┴   └─────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  Top 10 访问股票                      市值分布              │
│  ┌─────────────────────────┐         ┌────────────────┐    │
│  │ 1. AAPL   访问 1,234   │         │ <$1B   12.5%  │    │
│  │ 2. MSFT   访问 1,102   │         │ $1-10B 45.6%  │    │
│  │ 3. GOOGL  访问  986    │         │ $10-100B 31.2%│    │
│  │ 4. AMZN   访问  834    │         │ >$100B 10.7%  │    │
│  │ 5. TSLA   访问  756    │         └────────────────┘    │
│  │ ...                   │                               │
│  └─────────────────────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 **实施计划**

### **Phase 1: 核心基础 (2天)**
- [ ] 创建管理员页面路由结构 (`app/(admin)/cache/`)
- [ ] 实现主页面标签页容器
- [ ] 实现缓存概览仪表板组件
- [ ] 基础数据表格展示
- [ ] 集成 Redis/MongoDB 状态查询

### **Phase 2: 数据管理功能 (2天)**
- [ ] 实现高级过滤与搜索功能
- [ ] 实现批量操作（删除/刷新）
- [ ] 实现详情抽屉组件
- [ ] 实现编辑缓存条目功能
- [ ] 添加实时数据更新 (SWR)

### **Phase 3: 监控与可视化 (2天)**
- [ ] 实现数据源回退链可视化
- [ ] 实现性能统计图表 (ECharts)
- [ ] 实现7天趋势分析
- [ ] 实现 Top 列表组件
- [ ] 添加实时状态更新 (SSE)

### **Phase 4: 缓存操作 (1天)**
- [ ] 实现缓存刷新面板
- [ ] 实现缓存清理面板
- [ ] 实现数据导出功能
- [ ] 添加操作确认对话框
- [ ] 添加批量操作进度条

### **Phase 5: 安全与权限 (1天)**
- [ ] 实现角色权限控制中间件
- [ ] 添加操作审计日志
- [ ] 实现速率限制
- [ ] 添加输入数据验证
- [ ] 安全测试与优化

---

## 💡 **创新亮点**

1. **实时回退链路可视化** - 业界首创的5级回退链监控界面
2. **统一批次大小展示** - 50支/批次的可视化统计
3. **智能数据验证** - 自动标记和筛选无效市值数据
4. **批量操作进度条** - 提升大操作的用户体验
5. **性能趋势预测** - 基于历史数据预测缓存需求
6. **静默生产模式** - 延续现有的高性能策略

---

## 📊 **预期效果**

### **对开发者的价值**
- ✅ 3秒内了解缓存健康状态
- ✅ 快速定位和解决缓存问题
- ✅ 可视化数据源回退链路
- ✅ 分析缓存性能瓶颈

### **对运维人员的价值**
- ✅ 一键清理过期缓存
- ✅ 手动刷新特定数据
- ✅ 监控API调用健康度
- ✅ 导出数据进行离线分析

### **对系统的价值**
- ✅ 提升可观测性
- ✅ 降低故障排查时间
- ✅ 提高系统稳定性
- ✅ 优化缓存策略

---

## 🔗 **相关文档**

- [市值缓存系统文档](./MARKET_CAP_CACHE.md)
- [缓存数据可视化指南](./CACHE_VISUALIZATION_GUIDE.md)
- [热力图架构文档](./architecture/heatmap-architecture.md)
- [API 文档](../app/api-docs/)

---

**方案版本：** v1.0
**创建日期：** 2024-10-28
**负责人：** 系统架构师
**审核状态：** 待审核
