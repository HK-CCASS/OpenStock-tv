# Watchlist 使用指南

## 📋 如何添加股票到Watchlist

### 方法1：通过股票详情页添加

1. **搜索股票**：
   - 点击导航栏的 "Search"
   - 输入股票代码（如：AAPL、GOOGL、TSLA）
   - 从搜索结果中选择股票

2. **访问股票详情页**：
   - 点击搜索结果中的股票
   - 或直接访问：`http://localhost:3000/stocks/AAPL`

3. **添加到Watchlist**：
   - 在股票详情页右侧找到 "Add to Watchlist" 按钮
   - 点击按钮即可添加
   - 按钮会变为星形图标（已添加状态）

4. **选择分组**（如果有多个分组）：
   - 目前添加到默认分组 "我的自选"
   - 未来版本将支持选择特定分组

### 方法2：使用Server Action手动添加（开发测试）

可以使用MongoDB客户端或Node.js脚本直接添加：

```javascript
// scripts/add-test-stocks.ts
import { addToWatchlist } from '@/lib/actions/watchlist.actions';

// 添加测试股票
const testStocks = [
  { symbol: 'AAPL', company: 'Apple Inc.' },
  { symbol: 'GOOGL', company: 'Alphabet Inc.' },
  { symbol: 'MSFT', company: 'Microsoft Corporation' },
  { symbol: 'TSLA', company: 'Tesla Inc.' },
  { symbol: 'NVDA', company: 'NVIDIA Corporation' },
];

for (const stock of testStocks) {
  await addToWatchlist('YOUR_USER_ID', stock.symbol, stock.company);
  console.log(`✅ Added ${stock.symbol}`);
}
```

运行脚本：
```bash
npx tsx scripts/add-test-stocks.ts
```

### 方法3：直接操作数据库（快速测试）

```javascript
// 使用mongosh连接数据库
mongosh mongodb://localhost:27017/yourdb

// 1. 获取用户ID
db.user.find({}, {id: 1, email: 1})

// 2. 创建默认分组（如果不存在）
db.watchlistgroups.insertOne({
  userId: "YOUR_USER_ID",
  name: "我的自选",
  category: "默认",
  isSystem: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})

// 3. 获取分组ID
const groupId = db.watchlistgroups.findOne({userId: "YOUR_USER_ID"})._id

// 4. 批量添加股票
db.watchlists.insertMany([
  {
    userId: "YOUR_USER_ID",
    symbol: "AAPL",
    company: "Apple Inc.",
    groupId: groupId.toString(),
    addedAt: new Date()
  },
  {
    userId: "YOUR_USER_ID",
    symbol: "GOOGL",
    company: "Alphabet Inc.",
    groupId: groupId.toString(),
    addedAt: new Date()
  },
  {
    userId: "YOUR_USER_ID",
    symbol: "MSFT",
    company: "Microsoft Corporation",
    groupId: groupId.toString(),
    addedAt: new Date()
  },
  {
    userId: "YOUR_USER_ID",
    symbol: "TSLA",
    company: "Tesla Inc.",
    groupId: groupId.toString(),
    addedAt: new Date()
  },
  {
    userId: "YOUR_USER_ID",
    symbol: "NVDA",
    company: "NVIDIA Corporation",
    groupId: groupId.toString(),
    addedAt: new Date()
  }
])

// 5. 验证添加结果
db.watchlists.find({userId: "YOUR_USER_ID"}).count()
```

## 🔍 验证添加结果

### 方法1：访问Multi-Stock页面

```
http://localhost:3000/multi-stock
```

应该能看到添加的所有股票卡片，包含实时图表。

### 方法2：查询数据库

```bash
mongosh mongodb://localhost:27017/yourdb

# 查看用户的所有watchlist
db.watchlists.find({userId: "YOUR_USER_ID"}).pretty()

# 查看分组
db.watchlistgroups.find({userId: "YOUR_USER_ID"}).pretty()
```

### 方法3：使用API（如果有暴露的话）

```javascript
// 在浏览器控制台或Node.js环境
fetch('http://localhost:3000/api/watchlist')
  .then(r => r.json())
  .then(console.log)
```

## 📊 完整测试流程

### Step 1: 准备环境

```bash
# 启动MongoDB
docker compose up -d mongodb

# 运行迁移
npm run migrate:watchlist

# 启动开发服务器
npm run dev
```

### Step 2: 登录账户

访问 `http://localhost:3000/sign-in` 并登录

### Step 3: 获取用户ID

```bash
# 方法1：从浏览器控制台（登录后）
console.log(document.cookie)

# 方法2：从MongoDB查询
mongosh mongodb://localhost:27017/yourdb
db.user.find({email: "your@email.com"}, {id: 1})
```

### Step 4: 添加测试股票

使用上述任一方法添加股票到watchlist

### Step 5: 访问Multi-Stock页面

访问 `http://localhost:3000/multi-stock`，应该能看到：

✅ 所有添加的股票卡片
✅ TradingView实时图表
✅ 涨跌幅数据
✅ 控制面板（列数、排序、时间范围、图表类型）

### Step 6: 测试交互功能

- 切换列数（2-8列）
- 切换排序方式
- 切换时间范围
- 切换图表类型
- 点击股票卡片跳转到详情页

## 🐛 常见问题

### Q1: 添加股票后Multi-Stock页面为空

**原因**：
- 用户未登录
- 股票没有关联到watchlist group
- groupId为空或无效

**解决**：
```javascript
// 查询所有没有groupId的items
db.watchlists.find({groupId: {$exists: false}})

// 运行迁移脚本修复
npm run migrate:watchlist
```

### Q2: WatchlistButton点击无反应

**原因**：`onWatchlistChange` 回调未实现

**解决**：需要更新股票详情页，添加Server Action调用

### Q3: 图表不显示

**原因**：
- 网络问题（无法访问tradingview.com）
- 股票代码格式错误

**解决**：
- 检查网络连接
- 确保股票代码大写（AAPL, 不是 aapl）
- 查看浏览器控制台错误

## 🚀 推荐测试股票

### 美国科技股
- AAPL (Apple)
- GOOGL (Alphabet)
- MSFT (Microsoft)
- TSLA (Tesla)
- NVDA (NVIDIA)
- META (Meta/Facebook)
- AMZN (Amazon)

### 金融股
- JPM (JPMorgan)
- BAC (Bank of America)
- GS (Goldman Sachs)

### 其他
- WMT (Walmart)
- DIS (Disney)
- NKE (Nike)

这些股票在市场上都很活跃，数据完整，适合测试。

