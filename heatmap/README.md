# TradingView风格股票热力图

这是一个使用ECharts实现的TradingView风格股票市场热力图应用。

## 功能特性

- **两级热力图系统**
  - 一级视图：显示所有股票池（池大小按总市值权重）
  - 二级视图：点击池名称查看该池内的股票（股票大小按个股市值权重）

- **TradingView风格设计**
  - 13级精细颜色渐变（上涨绿色系、下跌红色系、平盘深灰色）
  - 底部渐变条显示颜色对照
  - 暗色主题界面

- **实时数据更新**
  - 每2秒自动更新股票价格和涨跌幅
  - 平滑更新，无页面闪烁
  - 只更新数据，不重建整个图表

- **性能优化**
  - ECharts实例复用，避免不必要的重渲染
  - 增量数据更新
  - 智能loading状态管理

## 技术栈

- React + TypeScript
- ECharts (Treemap)
- Tailwind CSS
- Lucide React (图标)

## 文件结构

```
/components
  ├── StockHeatmap.tsx              # 主热力图组件（轮询更新）
  └── StockHeatmapWithWebSocket.tsx # WebSocket版本（可选）

/lib
  ├── heatmap-data-service.ts       # 数据服务（模拟数据生成）
  └── tradingview-websocket.ts      # WebSocket客户端（可选）

/App.tsx                            # 应用入口
```

## 当前状态

应用目前使用 **模拟数据** 运行，数据通过 `/lib/heatmap-data-service.ts` 生成。

每2秒会自动更新股票价格，模拟真实市场波动：
- 首次加载时获取完整数据集
- 后续更新仅模拟小幅价格波动（-1% 到 +1%）
- 自动重新计算市值和平均涨跌幅

## 连接真实数据库

要连接MongoDB数据库，请修改 `/lib/heatmap-data-service.ts`：

```typescript
// 取消注释并实现真实的API调用
export async function fetchHeatmapData(): Promise<ApiHeatmapResponse> {
  try {
    const response = await fetch('/api/heatmap/data');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    // 回退到模拟数据
    return generateMockHeatmapData();
  }
}
```

## 数据结构

### HeatmapSymbolPool (MongoDB模型)

```typescript
{
  poolName: string;           // 池名称，如 "Magnificent 7"
  symbols: string[];          // 股票代码数组
  stockCount: number;         // 股票数量
  avgChangePercent: number;   // 平均涨跌幅
  totalMarketCap: number;     // 总市值
  cells: [                    // 股票单元数组
    {
      symbol: string;         // 股票代码
      name: string;           // 股票名称
      last: number;           // 最新价格
      change: number;         // 价格变动
      changePercent: number;  // 涨跌幅百分比
      volume: number;         // 成交量
      marketCap: number;      // 市值
      category: string;       // 分类
      pools: string[];        // 所属池子
    }
  ]
}
```

## 使用说明

1. **查看一级视图**：启动应用即可看到所有股票池
2. **进入二级视图**：点击任意池子名称
3. **返回一级视图**：点击左上角"返回"按钮
4. **查看详情**：将鼠标悬停在任意方块上查看详细信息

## WebSocket实时更新（可选）

如需使用WebSocket实时推送，请在 `App.tsx` 中切换组件：

```typescript
import StockHeatmapWithWebSocket from "./components/StockHeatmapWithWebSocket";

export default function App() {
  return (
    <div className="min-h-screen bg-[#131722]">
      <StockHeatmapWithWebSocket />
    </div>
  );
}
```

确保WebSocket服务运行在 `ws://localhost:8001/ws`。

## 颜色方案

| 涨跌幅 | 颜色 | 说明 |
|--------|------|------|
| < -5% | #E53935 | 亮红色 |
| -4% ~ -5% | #D32F2F | 中红色 |
| -3% ~ -4% | #C62828 | 红色 |
| -2% ~ -3% | #B71C1C | 暗红色 |
| -1% ~ -2% | #8B1A1A | 深红色 |
| -0% ~ -1% | #5D1715 | 极深红 |
| 0% | #424242 | 深灰色 |
| 0% ~ +1% | #0D4D1C | 极深绿 |
| +1% ~ +2% | #1B5E20 | 深墨绿 |
| +2% ~ +3% | #2E7D32 | 深绿色 |
| +3% ~ +4% | #388E3C | 中绿色 |
| +4% ~ +5% | #43A047 | 绿色 |
| > +5% | #4CAF50 | 亮绿色 |

## 故障排查

**问题：页面不断刷新**
- 已修复：ECharts实例现在被复用，只更新数据不重建图表

**问题：API 404错误**
- 已修复：数据服务已迁移到客户端 `/lib/heatmap-data-service.ts`

**问题：数据不更新**
- 检查：确保轮询间隔设置正确（当前为2秒）
- 检查：浏览器控制台是否有错误信息

## 性能优化

- ✅ ECharts实例复用（只在视图切换时重建）
- ✅ 增量数据更新（使用setOption更新而非重建）
- ✅ 智能loading状态（只在初始加载时显示）
- ✅ 避免不必要的重渲染
- ✅ 优化的数据结构转换

## 后续改进建议

1. 连接真实MongoDB数据库
2. 实现WebSocket实时数据推送
3. 添加股票搜索和筛选功能
4. 支持自定义颜色方案
5. 添加历史数据回放功能
6. 导出热力图为图片功能
