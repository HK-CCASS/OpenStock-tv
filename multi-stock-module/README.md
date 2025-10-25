# 多股同列功能模块

一个功能强大的多股同列React组件，支持实时监控多支股票，提供灵活的布局和智能排序功能。

## ✨ 特性

- 🔄 **实时数据**: 集成TradingView图表，显示实时股价数据
- 📊 **多种图表**: 支持折线图、面积图、K线图
- 🎛️ **灵活布局**: 2-8列自适应布局，支持响应式设计
- 🔄 **智能排序**: 按涨跌幅、价格、成交量、代码排序
- ⏰ **时间范围**: 多种时间间隔和时间范围选择
- 🎨 **现代UI**: 基于Tailwind CSS的美观界面
- 📱 **响应式**: 完美适配桌面和移动设备
- 🔧 **高度可定制**: 支持自定义样式和行为

## 🚀 快速开始

### 安装依赖

```bash
npm install react react-dom next tailwindcss
npm install @radix-ui/react-slot @radix-ui/react-select class-variance-authority lucide-react
```

### 基本用法

```tsx
import React from 'react';
import MultiStockModule from 'multi-stock-module';

const App = () => {
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

  return (
    <MultiStockModule
      symbols={symbols}
      watchlists={watchlists}
      currentWatchlistId="1"
    />
  );
};

export default App;
```

## 📁 项目结构

```
multi-stock-module/
├── components/              # React组件
│   ├── multi-stock/        # 核心组件
│   │   ├── StockGridController.tsx    # 主控制器
│   │   ├── StockTile.tsx            # 股票卡片
│   │   ├── LayoutControls.tsx        # 布局控制
│   │   ├── TradingViewMiniChart.tsx  # 迷你图表
│   │   ├── TradingViewQuote.tsx      # 实时报价
│   │   └── ChartTypeSelector.tsx     # 图表类型选择
│   └── ui/               # UI基础组件
│       └── badge.tsx     # 徽章组件
├── lib/                   # 核心逻辑
│   ├── actions/          # 数据操作
│   │   ├── multi-stock.actions.ts     # 多股操作
│   │   └── watchlist-sqlite.actions.ts # Watchlist操作
│   ├── services/         # 服务层
│   │   └── watchlist-bff.service.ts # BFF API服务
│   ├── types/           # 类型定义
│   │   └── index.ts    # 完整类型导出
│   └── utils.ts        # 工具函数
├── docs/               # 文档
├── index.tsx           # 主入口文件
├── package.json        # 依赖配置
└── README.md          # 使用说明
```

## 🔧 组件API

### MultiStockModule

主组件，包含所有多股同列功能。

#### Props

| 属性名 | 类型 | 必需 | 说明 |
|---------|------|------|------|
| `symbols` | `Array<{ symbol: string; company: string }>` | ✅ | 股票数据数组 |
| `watchlists` | `WatchlistInfo[]` | ✅ | 可用的watchlist列表 |
| `currentWatchlistId` | `string` | ✅ | 当前watchlist ID |

### 高级用法

#### 自定义布局控制

```tsx
import { StockGridController, StockTile } from 'multi-stock-module';

const CustomDashboard = () => {
  return (
    <StockGridController
      symbols={symbols}
      watchlists={watchlists}
      currentWatchlistId="1"
    />
  );
};
```

#### 使用单个组件

```tsx
import { StockTile } from 'multi-stock-module';

const StockCard = ({ symbol }) => {
  const quote = getStockQuote(symbol); // 获取股票数据

  return (
    <StockTile
      quote={quote}
      chartType="line"
      timeframe="5"
      timeRange="1Y"
    />
  );
};
```

## 🎨 自定义样式

模块使用Tailwind CSS，支持完整的主题定制：

```css
/* globals.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --secondary: 210 40% 96%;
    --destructive: 0 84.2% 60.2%;
    --border: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --secondary: 217.2 32.6% 17.5%;
    --destructive: 0 62.8% 30.6%;
    --border: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}
```

## 🔄 数据集成

### API数据格式

组件期望的数据格式：

```typescript
// Watchlist信息
interface WatchlistInfo {
  id: number;
  name: string;
  symbolCount: number;
  category?: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  symbols: string[];
}

// 股票数据
interface StockData {
  symbol: string;
  company: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}
```

### 数据获取示例

```typescript
// 获取watchlist数据
async function getWatchlists(): Promise<WatchlistInfo[]> {
  const response = await fetch('/api/watchlists');
  const data = await response.json();
  return data.watchlists || [];
}

// 获取股票数据
async function getStockData(symbol: string): Promise<StockData> {
  const response = await fetch(`/api/stocks/${symbol}`);
  return response.json();
}
```

## 🌟 功能特性详解

### 1. 实时数据集成
- 集成TradingView Widget
- 支持实时价格更新
- 自动处理交易所时间

### 2. 布局控制
- 2-8列自适应布局
- 响应式设计
- 移动端优化

### 3. 排序功能
- 按涨跌幅升序/降序
- 按价格升序/降序
- 按成交量排序
- 按股票代码排序

### 4. 图表选项
- 折线图、面积图、K线图
- 多种时间间隔（1分钟到1月）
- 多种时间范围（1天到5年）

## 📱 浏览器兼容性

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🆘 技术支持

如需技术支持，请：
1. 查看本文档
2. 检查示例代码
3. 提交Issue

---

**开发团队**: OpenStock Team
**最后更新**: 2025-10-24