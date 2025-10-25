# 多股同列模块集成指南

本指南详细说明如何在您的项目中集成多股同列功能模块。

## 📋 前置条件

### 环境要求
- Node.js 18.0+
- React 18.0+
- Next.js 14.0+ (推荐)
- Tailwind CSS 3.4+

### 依赖安装
```bash
# 核心依赖
npm install react react-dom next

# UI组件依赖
npm install @radix-ui/react-slot
npm install @radix-ui/react-select
npm install @radix-ui/react-dropdown-menu
npm install @radix-ui/react-tabs
npm install @radix-ui/react-label

# 工具库依赖
npm install class-variance-authority
npm install clsx
npm install tailwind-merge
npm install lucide-react

# 样式依赖
npm install tailwindcss-animate
```

## 🔧 配置步骤

### 1. Tailwind CSS 配置

将 `multi-stock-module/tailwind.config.js` 复制到您的项目根目录，或集成到现有配置中：

```javascript
// tailwind.config.js
module.exports = {
  darkMode: ["class"],
  content: [
    // 现有内容路径
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',

    // 添加模块路径
    './multi-stock-module/**/*.{ts,tsx}',
    './node_modules/multi-stock-module/**/*.{ts,tsx}'
  ],
  // ... 其他配置
}
```

### 2. 全局样式集成

在您的全局CSS文件中添加模块样式：

```css
/* globals.css */
@import './multi-stock-module/globals.css';

/* 现有样式 */
```

### 3. TypeScript 配置

确保您的 `tsconfig.json` 包含模块路径：

```json
{
  "compilerOptions": {
    "paths": {
      "multi-stock-module": ["./multi-stock-module"]
    }
  }
}
```

## 🚀 快速集成

### 基本集成

```tsx
// app/multi-stock/page.tsx
import MultiStockModule from 'multi-stock-module';

// 模拟数据 - 实际项目中应从API获取
const symbols = [
  { symbol: 'AAPL', company: 'Apple Inc.' },
  { symbol: 'GOOGL', company: 'Alphabet Inc.' },
  { symbol: 'MSFT', company: 'Microsoft Corporation' },
  { symbol: 'TSLA', company: 'Tesla Inc.' },
  { symbol: 'NVDA', company: 'NVIDIA Corporation' }
];

const watchlists = [
  {
    id: 1,
    name: '科技股',
    symbolCount: 5,
    category: '科技',
    is_system: true,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    symbols: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA']
  }
];

export default function MultiStockPage() {
  return (
    <MultiStockModule
      symbols={symbols}
      watchlists={watchlists}
      currentWatchlistId="1"
    />
  );
}
```

### 动态数据集成

```tsx
// app/multi-stock/[id]/page.tsx
import MultiStockModule from 'multi-stock-module';

async function getWatchlistData(id: string) {
  // 调用您的API获取watchlist数据
  const watchlistResponse = await fetch(`${process.env.API_URL}/watchlists/${id}`);
  const watchlist = await watchlistResponse.json();

  return watchlist;
}

async function getAllWatchlists() {
  // 调用您的API获取所有watchlist
  const response = await fetch(`${process.env.API_URL}/watchlists`);
  const data = await response.json();
  return data.watchlists || [];
}

export default async function DynamicMultiStockPage({ params }) {
  const { id } = await params;

  const watchlists = await getAllWatchlists();
  const currentWatchlist = await getWatchlistData(id);

  return (
    <MultiStockModule
      symbols={currentWatchlist.symbols}
      watchlists={watchlists}
      currentWatchlistId={id}
    />
  );
}
```

## 🔄 数据接口适配

### API 适配器

如果您的现有API格式与模块期望的格式不同，创建适配器：

```typescript
// lib/adapters/stock-adapter.ts
import type { WatchlistInfo, StockQuote } from 'multi-stock-module';

// 适配您的API响应到模块格式
export function adaptWatchlistData(apiResponse: any): WatchlistInfo[] {
  return apiResponse.watchlists.map((watchlist: any) => ({
    id: watchlist.id,
    name: watchlist.name,
    symbolCount: watchlist.stocks?.length || 0,
    category: watchlist.category,
    is_system: watchlist.isSystem || false,
    is_active: watchlist.isActive,
    created_at: watchlist.createdAt,
    updated_at: watchlist.updatedAt,
    symbols: watchlist.stocks?.map((s: any) => s.symbol) || []
  }));
}

export function adaptStockData(apiResponse: any): StockQuote[] {
  return apiResponse.stocks.map((stock: any) => ({
    symbol: stock.symbol,
    company: stock.companyName,
    price: stock.currentPrice,
    change: stock.priceChange,
    changePercent: stock.percentChange,
    volume: stock.volume,
    high: stock.dayHigh,
    low: stock.dayLow,
    open: stock.dayOpen,
    previousClose: stock.previousClose,
    timestamp: stock.lastUpdated
  }));
}
```

### 数据获取服务

```typescript
// lib/services/stock-service.ts
import { adaptWatchlistData } from './adapters/stock-adapter';

export class StockService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getWatchlists(): Promise<WatchlistInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/watchlists`);
      const data = await response.json();
      return adaptWatchlistData(data);
    } catch (error) {
      console.error('Failed to fetch watchlists:', error);
      return [];
    }
  }

  async getWatchlistSymbols(watchlistId: string): Promise<Array<{ symbol: string; company: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/watchlists/${watchlistId}/symbols`);
      const data = await response.json();
      return data.symbols || [];
    } catch (error) {
      console.error(`Failed to fetch watchlist ${watchlistId}:`, error);
      return [];
    }
  }
}
```

## 🎨 样式自定义

### 主题定制

```css
/* 自定义主题变量 */
:root {
  --primary: 59 130% 246%;  /* 自定义主色 */
  --secondary: 220 14% 96%; /* 自定义次色 */
  --radius: 0.75rem;        /* 自定义圆角 */
}

/* 自定义组件样式 */
.multi-stock-module {
  /* 组件容器样式 */
}

.stock-tile {
  /* 股票卡片样式 */
  border-radius: var(--radius);
}
```

### 响应式断点自定义

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      screens: {
        'xs': '475px',    // 自定义断点
        '3xl': '1600px',  // 超大屏幕
      }
    }
  }
}
```

## 🔌 高级集成

### 自定义组件

```tsx
// components/CustomMultiStock.tsx
import { StockGridController } from 'multi-stock-module';

export default function CustomMultiStock({ symbols, watchlists }) {
  // 自定义布局
  return (
    <div className="custom-multi-stock-container">
      <h1>我的股票监控面板</h1>
      <StockGridController
        symbols={symbols}
        watchlists={watchlists}
        currentWatchlistId="custom"
      />
    </div>
  );
}
```

### 事件处理

```tsx
import { StockGridController } from 'multi-stock-module';

export default function EventHandlingExample() {
  const handleStockSelect = (symbol: string) => {
    console.log('选中股票:', symbol);
    // 自定义处理逻辑
  };

  const handleLayoutChange = (columns: number) => {
    console.log('布局列数:', columns);
    // 保存用户偏好
  };

  return (
    <StockGridController
      symbols={symbols}
      watchlists={watchlists}
      currentWatchlistId="1"
      onStockSelect={handleStockSelect}
      onLayoutChange={handleLayoutChange}
    />
  );
}
```

## 🚨 常见问题

### Q: TradingView图表不显示？
A: 确保网络连接正常，TradingView服务可用。检查股票代码格式是否正确。

### Q: 样式不生效？
A: 确保Tailwind CSS配置正确，全局样式已导入，检查CSS构建路径。

### Q: 数据格式错误？
A: 使用适配器模式转换您的API响应格式到模块期望的格式。

### Q: 性能问题？
A: 考虑使用React.memo优化组件，限制同时显示的股票数量。

## 📚 扩展功能

### 添加新的排序选项

```tsx
// lib/types/sort-options.ts
export type ExtendedSortOption =
  | 'marketCap_desc'    // 新增市值排序
  | 'pe_ratio_asc'      // 新增PE排序
  | 'dividend_yield_desc' // 新增股息排序
  | SortOption;         // 原有选项
```

### 集成新的数据源

```typescript
// lib/services/yahoo-finance.ts
export class YahooFinanceService {
  async getRealTimeData(symbol: string) {
    // Yahoo Finance API集成
  }
}
```

## 📞 技术支持

如果遇到集成问题：
1. 检查本文档的常见问题部分
2. 查看GitHub Issues
3. 联系开发团队

---

**更新日期**: 2025-10-24
**版本**: 1.0.0