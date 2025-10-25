# 热力图测试指南

## 测试前准备

### 1. 确保环境正常

```bash
# 检查 MongoDB 连接
npm run test:db

# 检查 TradingView Ticker（独立测试）
npx tsx scripts/test-tradingview-ticker.ts
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问: http://localhost:3000

## 测试步骤

### 步骤 1: 准备测试数据（创建观察列表）

#### 1.1 登录或注册账户
- 访问 http://localhost:3000/sign-in
- 使用已有账户登录或创建新账户

#### 1.2 创建观察列表分组
- 访问 http://localhost:3000/watchlists
- 点击 "Create New Group" 或类似按钮
- 创建至少 2 个分组并设置 `category` 字段：

**示例分组 1**:
- Name: "我的科技股"
- Category: "Technology"

**示例分组 2**:
- Name: "金融股票"
- Category: "Finance"

**示例分组 3**（测试无 category）:
- Name: "个人投资"
- Category: (留空)

#### 1.3 添加股票到分组

**科技股（Technology）**:
- NASDAQ:AAPL (Apple)
- NASDAQ:MSFT (Microsoft)
- NASDAQ:GOOGL (Alphabet)
- NASDAQ:TSLA (Tesla)
- NASDAQ:META (Meta)
- NASDAQ:NVDA (NVIDIA)

**金融股（Finance）**:
- NYSE:JPM (JPMorgan Chase)
- NYSE:BAC (Bank of America)
- NYSE:WFC (Wells Fargo)
- NYSE:GS (Goldman Sachs)

**个人投资（无 category）**:
- NYSE:DIS (Disney)
- NASDAQ:NFLX (Netflix)

> **重要**: 股票代码必须包含交易所前缀，例如 `NASDAQ:AAPL` 或 `NYSE:JPM`

### 步骤 2: 访问热力图页面

访问: http://localhost:3000/heatmap

### 步骤 3: 验证初始加载

#### 3.1 检查页面元素

✅ 应该看到:
- 顶部导航栏（包含 "Heatmap" 链接高亮）
- 热力图标题
- SSE 连接状态指示器（右上角）
  - 🟢 "实时连接" - 表示 SSE 已连接
  - 🔴 "离线" - 表示 SSE 未连接
- 底部颜色图例（13级渐变条）

#### 3.2 检查热力图显示

✅ 应该看到:
- **一级视图**（Pool 层级）:
  - "Technology" 池子（如果有多个科技股分组，它们会合并）
  - "Finance" 池子
  - "个人投资" 池子（独立显示，因为无 category）
  
- **每个池子显示**:
  - 池子名称在顶部
  - 池子大小按总市值加权
  - 池子颜色反映平均涨跌幅

#### 3.3 检查浏览器控制台

打开开发者工具（F12）→ Console 标签页

✅ 应该看到类似日志:
```
[SSE] Connected
[SSE] Connection confirmed: <clientId>
```

❌ 如果看到错误:
- 检查 MongoDB 连接
- 检查用户是否已登录
- 检查观察列表是否为空

### 步骤 4: 测试二级钻取

#### 4.1 点击任意池子

点击 "Technology" 池子

#### 4.2 验证二级视图

✅ 应该看到:
- 顶部显示 "Technology"（选中的池子名称）
- "返回" 按钮（左上角）
- 该池子内的所有股票（每个股票一个方块）

#### 4.3 检查股票方块

每个股票方块应显示:
- 股票代码（如 AAPL）
- 当前价格（如 $262.82）
- 涨跌幅（如 +1.25%）

#### 4.4 返回一级视图

点击 "返回" 按钮，验证能回到池子总览

### 步骤 5: 测试实时更新（关键！）

#### 5.1 查看 SSE 连接状态

右上角应显示 🟢 "实时连接"

#### 5.2 观察数据变化

**美股开盘时间**（实时报价）:
- 美东时间：9:30 AM - 4:00 PM
- 北京时间：21:30 PM - 次日 4:00 AM（夏令时）
- 北京时间：22:30 PM - 次日 5:00 AM（冬令时）

在开盘时间，你应该看到:
- 价格数值变化
- 涨跌幅百分比变化
- 方块颜色变化（根据涨跌幅）
- 池子大小变化（总市值变化）

**非开盘时间**:
- TradingView 仍会推送数据，但可能是延迟报价
- 更新频率较低
- 数据可能不变化（盘后/周末）

#### 5.3 强制查看更新（开发调试）

打开浏览器控制台，执行:

```javascript
// 监听 SSE 消息
const es = new EventSource('/api/heatmap/stream');
es.onmessage = (event) => {
  console.log('SSE Update:', JSON.parse(event.data));
};
```

✅ 应该看到类似输出:
```json
{
  "symbol": "NASDAQ:AAPL",
  "price": 262.82,
  "change": 3.24,
  "changePercent": 1.25,
  "volume": 38253717,
  "time": 1729872000
}
```

### 步骤 6: 测试鼠标悬停（Tooltip）

#### 6.1 一级视图 Tooltip

将鼠标悬停在任意池子上

✅ 应该看到:
- 池子名称
- 股票数量
- 平均涨跌幅（带颜色）
- 总市值
- "点击查看详情" 提示

#### 6.2 二级视图 Tooltip

进入任意池子，将鼠标悬停在股票方块上

✅ 应该看到:
- 股票代码
- 公司名称
- 当前价格
- 涨跌额和涨跌幅（带颜色）
- 成交量
- 市值

### 步骤 7: 测试颜色渐变

验证不同涨跌幅显示不同颜色:

| 涨跌幅范围 | 预期颜色 | 示例股票 |
|-----------|---------|---------|
| < -5% | 亮红色 #E53935 | 大跌的股票 |
| -4% ~ -5% | 中红色 #D32F2F | |
| -3% ~ -4% | 红色 #C62828 | |
| -2% ~ -3% | 暗红色 #B71C1C | |
| -1% ~ -2% | 深红色 #8B1A1A | |
| -0% ~ -1% | 极深红 #5D1715 | 微跌 |
| 0% | 深灰色 #424242 | 平盘 |
| +0% ~ +1% | 极深绿 #0D4D1C | 微涨 |
| +1% ~ +2% | 深墨绿 #1B5E20 | |
| +2% ~ +3% | 深绿色 #2E7D32 | |
| +3% ~ +4% | 中绿色 #388E3C | |
| +4% ~ +5% | 绿色 #43A047 | |
| > +5% | 亮绿色 #4CAF50 | 大涨的股票 |

### 步骤 8: 测试错误处理

#### 8.1 测试空观察列表

1. 删除所有观察列表股票
2. 刷新热力图页面
3. ✅ 应该看到友好提示: "您还没有添加任何观察列表。请先添加股票到观察列表。"

#### 8.2 测试 SSE 断线重连

1. 打开网络面板（F12 → Network）
2. 找到 `/api/heatmap/stream` 请求（Type: eventsource）
3. 模拟断线：右键 → Block request URL
4. 等待几秒
5. 取消阻止
6. ✅ 浏览器应自动重连（SSE 内置机制）

#### 8.3 测试页面刷新

1. 在热力图页面按 F5 刷新
2. ✅ 数据应重新加载
3. ✅ SSE 连接应重新建立

## 测试检查清单

### 功能测试

- [ ] 用户登录验证
- [ ] 初始数据加载
- [ ] 池子按 category 分组
- [ ] 无 category 的分组独立显示
- [ ] 一级视图显示所有池子
- [ ] 二级视图显示池子内股票
- [ ] 返回按钮工作正常
- [ ] SSE 连接建立成功
- [ ] 实时报价更新（开盘时间）
- [ ] Tooltip 显示正确信息
- [ ] 颜色渐变按涨跌幅显示
- [ ] 空状态提示显示
- [ ] SSE 自动重连

### 性能测试

- [ ] 初始加载时间 < 3 秒
- [ ] 图表渲染流畅（无卡顿）
- [ ] 实时更新无延迟（< 1 秒）
- [ ] 浏览器内存占用正常
- [ ] CPU 使用率正常

### UI/UX 测试

- [ ] 页面布局正确
- [ ] 响应式设计（调整窗口大小）
- [ ] 颜色对比度足够
- [ ] 字体大小可读
- [ ] 按钮可点击
- [ ] Tooltip 位置合适
- [ ] 图例说明清晰

## 常见问题排查

### 问题 1: 热力图页面空白

**可能原因**:
- 用户未登录
- 观察列表为空
- MongoDB 连接失败

**解决方案**:
```bash
# 检查 MongoDB 连接
npm run test:db

# 检查浏览器控制台错误
# F12 → Console
```

### 问题 2: SSE 连接失败（显示 "离线"）

**可能原因**:
- Next.js 开发服务器未启动
- API 路由错误
- 防火墙阻止

**解决方案**:
```bash
# 重启开发服务器
npm run dev

# 检查浏览器网络面板
# F12 → Network → 查找 /api/heatmap/stream
```

### 问题 3: TradingView Ticker 无数据

**可能原因**:
- TradingView WebSocket 服务器维护
- 网络连接问题
- 股票代码格式错误

**解决方案**:
```bash
# 测试 TradingView 连接
npx tsx scripts/test-tradingview-ticker.ts

# 检查股票代码格式（必须包含交易所前缀）
# 正确: NASDAQ:AAPL
# 错误: AAPL
```

### 问题 4: 数据不更新

**可能原因**:
- 非交易时间（市场休市）
- SSE 连接断开
- 股票代码无效

**解决方案**:
1. 检查当前时间是否在美股交易时间
2. 查看 SSE 连接状态指示器
3. 打开浏览器控制台查看错误日志
4. 验证股票代码格式正确

### 问题 5: 市值显示异常

**可能原因**:
- Finnhub API 限流
- 股票代码无市值数据
- 计算公式错误

**解决方案**:
```bash
# 检查 Finnhub API 密钥
cat .env | grep FINNHUB

# 查看浏览器控制台中的 API 响应
# F12 → Network → 查找 /api/heatmap/user-data
```

## 非开盘时间测试方案

### 方案 1: 使用模拟数据（推荐）

创建测试脚本 `scripts/test-heatmap-with-mock.ts`:

```typescript
import { TradingViewTicker } from '../lib/tradingview/ticker';

// 模拟实时更新
function simulateRealTimeUpdates() {
  const symbols = ['NASDAQ:AAPL', 'NASDAQ:MSFT', 'NASDAQ:GOOGL'];
  const ticker = new TradingViewTicker(symbols, true);

  // 模拟回调
  ticker.onUpdate((symbol, state) => {
    console.log(`Mock Update: ${symbol} - $${state.price.toFixed(2)} (${state.changePercent.toFixed(2)}%)`);
  });

  // 定期生成随机更新
  setInterval(() => {
    symbols.forEach(symbol => {
      const states = ticker.getStates();
      const state = states.get(symbol);
      if (state) {
        state.price += (Math.random() - 0.5) * 2;
        state.changePercent = (Math.random() - 0.5) * 5;
        ticker.onUpdate?.(symbol, state);
      }
    });
  }, 2000);
}

simulateRealTimeUpdates();
```

### 方案 2: 使用录制的历史数据

在开盘时间录制真实数据，非开盘时间回放:

```typescript
// 录制模式（开盘时）
const recordedData: any[] = [];
ticker.onUpdate((symbol, state) => {
  recordedData.push({ symbol, state, timestamp: Date.now() });
});

// 回放模式（非开盘时）
recordedData.forEach((record, index) => {
  setTimeout(() => {
    // 推送到 SSE
    sseManager.broadcastUpdate(record.symbol, record.state);
  }, index * 100);
});
```

### 方案 3: 直接测试 SSE Manager

```bash
# 独立测试 SSE Manager（不需要真实数据）
npx tsx -e "
import SSEManager from './lib/tradingview/sse-manager';
console.log('SSE Manager Stats:', SSEManager.getStats());
"
```

## 测试报告模板

```markdown
## 热力图测试报告

**测试日期**: 2025-10-25
**测试人**: Your Name
**环境**: 开发环境

### 测试结果

#### 功能测试
- [x] 用户登录: ✅ 通过
- [x] 初始加载: ✅ 通过（2.1 秒）
- [x] 池子分组: ✅ 通过
- [x] 二级钻取: ✅ 通过
- [x] SSE 连接: ✅ 通过
- [ ] 实时更新: ⏸️ 跳过（非交易时间）

#### 性能测试
- 初始加载: 2.1 秒 ✅
- 内存占用: 125 MB ✅
- CPU 使用: 8% ✅

#### UI/UX测试
- 响应式设计: ✅ 通过
- 颜色渐变: ✅ 通过
- Tooltip: ✅ 通过

### 发现的问题
1. 无

### 建议
1. 添加模拟数据模式用于非交易时间测试
```

## 总结

完整测试热力图需要:
1. ✅ 准备测试数据（创建观察列表分组）
2. ✅ 访问热力图页面
3. ✅ 验证初始加载和显示
4. ✅ 测试交互功能（钻取、返回）
5. ⏸️ 测试实时更新（需要交易时间）
6. ✅ 测试错误处理

**非交易时间测试**:
- 使用 `npx tsx scripts/test-tradingview-ticker.ts` 验证连接
- 检查 SSE 连接状态
- 验证 UI 交互功能
- 等待下次开盘时间验证实时更新

**下次美股开盘时间**:
- 查看: https://www.nasdaq.com/market-activity/stock-market-holiday-calendar
- 北京时间晚上 21:30 - 次日 4:00（夏令时）

