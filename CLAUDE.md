# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 开发命令

### 核心开发命令
- `npm run dev` - 启动 Next.js 开发服务器（使用 Turbopack）
- `npm run dev:mock` - 启动开发服务器（使用模拟 Ticker，无需 TradingView）
- `npm run build` - 构建生产版本（使用 Turbopack）
- `npm run start` - 启动生产服务器
- `npm run lint` - 运行 ESLint 检查
- `npm run test:db` - 测试数据库连接

### 数据迁移命令
- `npm run migrate:watchlist` - 迁移观察列表数据到多分组结构（使用 tsx）
- `npm run migrate:multigroup` - 执行多分组数据迁移
- `npm run test:multigroup` - 测试多分组迁移功能

### 缓存管理命令
- `npm run cache:check` - 终端查看缓存状态（MongoDB + Redis）
- `npm run cache:visualize` - 生成 HTML 可视化报告（`cache-report.html`）

### 订阅健康监控命令 ⭐ **NEW**
- `npm run subscription:health` - 查看 TradingView 订阅健康状态
- `npm run subscription:repair` - 手动触发订阅修复（重新订阅失败的股票）

### Inngest 本地开发
- `npx inngest-cli@latest dev` - 启动 Inngest 本地开发服务器（工作流、定时任务、AI 推理）

### Docker 开发
启动完整开发环境的推荐方式：
```bash
# 启动基础服务（MongoDB + Redis）
docker compose up -d mongodb redis

# 启动应用（使用开发模式构建）
docker compose up -d --build openstock
```

或使用简化命令：
```bash
docker compose up -d mongodb && docker compose up -d --build
```

**Docker 服务端口**：
- 应用：http://localhost:3100
- MongoDB：localhost:27117（非默认端口）
- Redis：localhost:6479（非默认端口）

## 项目架构

### 技术栈
- **前端框架**: Next.js 15 (App Router) + React 19
- **样式**: Tailwind CSS v4 + shadcn/ui + Radix UI
- **语言**: TypeScript
- **数据库**: MongoDB + Mongoose
- **缓存层**: Redis (L1) + MongoDB (L2) 双层缓存架构
- **认证**: Better Auth (邮箱/密码) + MongoDB 适配器
- **外部 API**: Yahoo Finance (市值主源)、Finnhub (备用源)、TradingView (图表组件)
- **自动化**: Inngest (事件、定时任务、AI 推理 via Gemini)
- **邮件**: Nodemailer (Gmail 传输)

### 核心目录结构
```
app/                    # Next.js App Router
├── (auth)/            # 认证相关路由 (sign-in, sign-up)
├── (root)/            # 主要应用路由
│   ├── stocks/[symbol]/ # 个股详情页
│   ├── multi-stock/    # 多股同列页面
│   ├── watchlists/     # 观察列表分组管理
│   ├── heatmap/        # 实时热力图页面
│   ├── api-docs/      # API 文档
│   └── help/          # 帮助页面
├── api/inngest/       # Inngest API 路由
└── layout.tsx         # 根布局

components/              # React 组件
├── ui/               # shadcn/ui 基础组件
├── forms/            # 表单组件
└── [其他业务组件]     # Header, Footer, SearchCommand 等

lib/                   # 核心逻辑库
├── actions/          # Server Actions
│   ├── auth.actions.ts           # 认证相关
│   ├── finnhub.actions.ts        # Finnhub API (备用源)
│   ├── yahoo-finance.actions.ts  # Yahoo Finance API (主源)
│   ├── heatmap.actions.ts        # 热力图数据 + 市值缓存
│   ├── user.actions.ts           # 用户操作
│   ├── watchlist.actions.ts      # 观察列表 + 预缓存
│   └── watchlist-group.actions.ts # 观察列表分组
├── cache/           # 缓存管理
│   └── market-cap-cache-manager.ts # 双层缓存管理器
├── redis/           # Redis 客户端
│   └── client.ts    # Redis 连接管理（懒加载 + 降级）
├── adapters/        # 适配器层 (multi-stock-adapter)
├── better-auth/     # Better Auth 配置
├── inngest/         # Inngest 客户端、函数、提示词
├── nodemailer/      # 邮件传输和模板
├── types/          # TypeScript 类型定义
├── constants.ts    # 常量定义
└── utils.ts        # 工具函数

database/              # 数据库相关
├── models/          # Mongoose 模型
│   ├── watchlist.model.ts       # 观察列表
│   ├── watchlist-group.model.ts # 观察列表分组
│   └── market-cap.model.ts      # 市值缓存 (L2)
└── mongoose.ts      # 数据库连接

scripts/              # 脚本文件
├── test-db.mjs                # 数据库连接测试
├── migrate-watchlist.ts       # 数据迁移脚本
├── test-tradingview-ticker.ts # TradingView ticker 测试
├── check-cache-status.ts      # 查看缓存状态（终端）
└── visualize-cache.ts         # 生成缓存可视化报告
```

### 关键架构模式

#### 认证系统
- 使用 Better Auth + MongoDB 适配器
- 认证实例在 `lib/better-auth/auth.ts` 中懒加载初始化
- 受保护路由通过 Next.js 中间件强制执行

#### 数据流
- Server Actions 处理所有数据库操作和外部 API 调用
- Finnhub API 提供股票搜索、公司资料、市场新闻
- TradingView 嵌入式组件提供图表和市场视图
- 适配器模式：`lib/adapters/multi-stock-adapter.ts` 处理多股票数据适配

#### 实时热力图系统
- 基于 ECharts 的交互式热力图可视化
- TradingView WebSocket + SSE 实现实时数据流
- **双层缓存架构**：
  - **L1 缓存 (Redis)**: 1 小时 TTL，快速读取 (~1-2ms)
  - **L2 缓存 (MongoDB)**: 24 小时有效期，持久化存储
  - 自动降级：Redis 不可用时直接使用 MongoDB
- **多源数据回退**（统一批次大小 50 支/批）：
  1. Yahoo Finance (主源，批量 50 支)
  2. Finnhub (备用源，批量 50 支)
  3. Price Estimation (最终回退)
- **智能预缓存**：
  - 添加到 Watchlist 时立即异步缓存
  - 每日 UTC 21:30 自动更新（美股收盘后）
- **分批订阅系统** ⭐ **NEW**：
  - TradingView WebSocket 分批订阅（50 支/批）
  - 支持 500+ 股票的大规模订阅
  - 批次间延迟 200ms，避免消息过大
  - 初始订阅 + 动态添加均支持分批
- **订阅健康监控** ⭐ **NEW**：
  - 每 5 分钟自动健康检查
  - 自动检测并重新订阅失败的股票
  - 手动健康检查：`npm run subscription:health`
  - 手动修复：`npm run subscription:repair`
  - API 端点：`/api/heatmap/subscription-health`, `/api/heatmap/repair-subscriptions`
- **性能优化** ⭐ **NEW**：
  - 禁用所有高频日志（99%+ 日志减少）
  - 内存占用降低 80-90%
  - CPU 占用降低 40-70%
  - 静默生产模式（仅错误日志）
- 分组聚合：股票按类别分组为池，支持两级钻取

#### 自动化工作流 (Inngest)
- 用户注册发送个性化欢迎邮件（AI 生成内容）
- 每日新闻摘要邮件（定时任务，基于用户观察列表个性化）
- **每日市值缓存更新**（UTC 21:30，周一至周五，美股收盘后）
- AI 推理使用 Gemini 2.5 Flash Lite

#### 观察列表管理
- 支持分组功能：每个用户可创建多个观察列表分组
- 数据模型：Watchlist（基础观察列表）+ WatchlistGroup（分组管理）
- 迁移支持：`migrate-watchlist.ts` 用于数据结构升级

#### UI 组件架构
- 基于 shadcn/ui 和 Radix UI 原语构建
- 统一的表单组件在 `components/forms/` 目录
- 深色主题默认启用，使用 next-themes

## 重要配置

### 环境变量
必需的环境变量包括：
- `MONGODB_URI` - MongoDB 连接字符串
  - Docker 容器内: `mongodb://root:example@mongodb:27017/openstock?authSource=admin`
  - 主机访问: `mongodb://root:example@localhost:27117/openstock?authSource=admin` (非默认端口 27117)
- `REDIS_URL` - Redis 连接字符串（可选，缺失时自动降级）
  - Docker 容器内: `redis://redis:6379`
  - 主机访问: `redis://localhost:6479` (非默认端口 6479)
- `BETTER_AUTH_SECRET` - Better Auth 密钥
- `BETTER_AUTH_URL` - Better Auth URL
- `FINNHUB_API_KEY` - Finnhub API 密钥（备用数据源）
- `GEMINI_API_KEY` - Google Gemini API 密钥（AI 功能）
- `NODEMAILER_EMAIL` / `NODEMAILER_PASSWORD` - 邮件发送凭据

**注意**：
- Yahoo Finance 无需 API Key，作为主要市值数据源
- Redis 不可用时系统会自动降级到 MongoDB 单层缓存

### Next.js 配置
- **图片域名白名单**：`i.ibb.co`（TradingView 图片）
- **构建优化**：构建时忽略 ESLint 和 TypeScript 错误（用于快速开发）
- **路径别名**：`@/*` 映射到项目根目录（配置在 `tsconfig.json`）
- **开发指示器**：已禁用 devIndicators 以获得更清洁的开发体验

### Docker 配置
- **非默认端口**：MongoDB 使用 27117，Redis 使用 6479，避免与本地服务冲突
- **健康检查**：所有服务都配置了健康检查，确保依赖服务就绪后才启动应用
- **网络隔离**：使用 bridge 网络模式，服务间通过服务名通信
- **数据持久化**：MongoDB 和 Redis 数据卷独立存储

### 数据库模型
- **Watchlist**：用户观察列表，每个用户每个股票符号唯一，支持分组关联
- **WatchlistGroup**：观察列表分组，支持用户创建多个自定义分组，包含系统分组
- **MarketCap**：市值缓存模型（L2 持久化层）
  - 存储字段：`symbol`, `marketCap`, `price`, `source`, `lastUpdated`, `validUntil`
  - 数据源：`yahoo` (主源) | `finnhub` (备用) | `fallback` (估算)
  - 有效期：24 小时（`validUntil` 字段）
  - 自动过期：查询时检查 `validUntil`，过期则重新获取

## 开发注意事项

### API 使用限制
- **Yahoo Finance**：无需 API Key，免费使用，批量最多 100 支
- **Finnhub**：免费层可能有延迟报价，需遵守速率限制，批量最多 50 支
- **TradingView**：组件是嵌入式的，依赖外部服务

### 缓存策略
- **查看缓存状态**：`npm run cache:check` 或 `npm run cache:visualize`
- **手动清理缓存**：
  ```bash
  # 清理 Redis (L1)
  docker exec -it openstock-redis redis-cli FLUSHDB
  
  # 清理 MongoDB (L2) - 在 MongoDB shell 中
  docker exec -it mongodb mongosh -u root -p example --authenticationDatabase admin
  use openstock
  db.marketcaps.deleteMany({})
  ```
- **缓存预热**：访问热力图页面或等待定时任务（UTC 21:30）

### 认证中间件
- 大部分路由需要登录认证
- 公开路由：sign-in、sign-up、assets、Next.js 内部路由

### 热力图开发
- 实时数据通过 SSE 推送到前端
- 市值缓存遵循双层架构（Redis + MongoDB）
- 颜色梯度遵循 TradingView 风格（13 级）
- 数据源自动回退：Yahoo → Finnhub → Price Estimation

### 部署要求
- 如修改、重新分发或部署（包括作为 web 服务），必须遵循 AGPL-3.0 许可证
- 必须以相同许可证发布源代码并署名原作者

## 调试与故障排除

### 常见问题诊断
1. **数据库连接失败**：
   - 检查 MongoDB 和 Redis 服务是否运行：`docker ps`
   - 验证端口占用：`lsof -i :27117` 和 `lsof -i :6479`
   - 运行连接测试：`npm run test:db`

2. **缓存数据不一致**：
   - 查看缓存状态：`npm run cache:check`
   - 生成可视化报告：`npm run cache:visualize`
   - 手动清理缓存（见下方缓存策略部分）

3. **热力图无数据**：
   - 检查环境变量 `FINNHUB_API_KEY` 是否配置
   - 验证 API 配额是否超限
   - 使用模拟模式测试：`npm run dev:mock`

4. **Inngest 工作流未触发**：
   - 确认 Inngest 本地开发服务器运行：`npx inngest-cli@latest dev`
   - 检查函数日志输出
   - 验证事件是否正确发送

### 日志查看
```bash
# 查看应用日志
docker compose logs -f openstock

# 查看数据库日志
docker compose logs -f mongodb

# 查看 Redis 日志
docker compose logs -f redis
```

### 环境验证脚本
项目中包含多个验证脚本：
- `scripts/test-db.mjs` - 数据库连接测试
- `scripts/test-tradingview-ticker.ts` - TradingView 组件测试
- `scripts/check-cache-status.ts` - 缓存状态检查
- `scripts/test-watchlist-multi-group.ts` - 多分组功能测试

## 关键文件位置

### 核心配置文件
- `package.json` - 项目依赖和脚本定义
- `next.config.ts` - Next.js 配置（图片域名、构建选项）
- `tsconfig.json` - TypeScript 配置（路径别名 `@/*`）
- `docker-compose.yml` - Docker 服务编排（非默认端口）
- `.env` - 环境变量配置（需从 `.env.example` 复制）

### 数据库模型
- `database/models/watchlist.model.ts` - 观察列表模型
- `database/models/watchlist-group.model.ts` - 观察列表分组模型
- `database/models/market-cap.model.ts` - 市值缓存模型（L2）
- `database/mongoose.ts` - 数据库连接配置

### Server Actions
- `lib/actions/auth.actions.ts` - 用户认证逻辑
- `lib/actions/yahoo-finance.actions.ts` - Yahoo Finance API（主数据源）
- `lib/actions/finnhub.actions.ts` - Finnhub API（备用数据源）
- `lib/actions/heatmap.actions.ts` - 热力图数据处理
- `lib/actions/watchlist.actions.ts` - 观察列表管理
- `lib/actions/watchlist-group.actions.ts` - 分组管理

### 缓存管理
- `lib/cache/market-cap-cache-manager.ts` - 双层缓存核心逻辑
- `lib/redis/client.ts` - Redis 客户端（懒加载 + 降级）

### 页面路由
- `app/(auth)/sign-in/page.tsx` - 登录页
- `app/(root)/page.tsx` - 首页（仪表盘）
- `app/(root)/heatmap/page.tsx` - 热力图页面
- `app/(root)/watchlists/page.tsx` - 观察列表页面
- `app/(root)/stocks/[symbol]/page.tsx` - 个股详情页

### API 路由 ⭐ **UPDATED**
- `app/api/heatmap/stream/route.ts` - SSE 实时数据流
- `app/api/heatmap/user-data/route.ts` - 初始数据获取
- `app/api/heatmap/subscription-health/route.ts` - 订阅健康检查 ⭐ **NEW**
- `app/api/heatmap/repair-subscriptions/route.ts` - 订阅修复 ⭐ **NEW**
- `app/api/inngest/` - Inngest 工作流路由

### 监控和维护脚本 ⭐ **NEW**
- `scripts/check-subscription-health.ts` - 检查订阅健康状态
- `scripts/repair-subscriptions.ts` - 手动修复失败的订阅
- `scripts/check-cache-status.ts` - 查看缓存状态
- `scripts/visualize-cache.ts` - 生成缓存可视化报告

### 自动化工作流
- `lib/inngest/client.ts` - Inngest 客户端配置
- `lib/inngest/functions/` - Inngest 函数定义
- `app/api/inngest/` - Inngest API 路由

## 架构文档
详细的架构文档位于 `docs/` 目录：
- `docs/ARCHITECTURE.md` - 完整系统架构（含缓存架构图）
- `docs/ARCHITECTURE_OVERVIEW.md` - 系统概览
- `docs/architecture/heatmap-architecture.md` - 热力图架构详解
- `docs/CACHE_VISUALIZATION_GUIDE.md` - 缓存数据可视化指南
- `docs/MARKET_CAP_CACHE.md` - 市值缓存系统文档
- `docs/HEATMAP_TESTING_GUIDE.md` - 热力图测试指南
- `docs/MOCK_TICKER_USAGE.md` - 模拟 Ticker 使用指南
- `docs/WATCHLIST_USAGE.md` - 观察列表使用指南
- `docs/WATCHLIST_MULTIGROUP_FEATURE.md` - 多分组功能文档
- `docs/DOCKER_GUIDE.md` - Docker 部署指南
- `docs/PORT_CONFIGURATION.md` - 端口配置说明

## 许可证与合规

### AGPL-3.0 许可证要求
本项目采用 **GNU Affero General Public License v3.0 (AGPL-3.0)** 许可证。

**重要要求**：
- ✅ 允许查看、修改和私人使用
- ✅ 允许分发修改版本（需开源）
- ⚠️ **网络使用**：通过计算机网络提供服务时，必须提供完整源代码
- ⚠️ **修改再分发**：必须以相同许可证开源，并保留原作者署名
- ⚠️ **完整文档**：需提供许可证文本和版权声明

**何时必须开源**：
- 部署为 Web 服务
- 提供 API 给外部用户
- 以任何方式通过网络提供服务

**合规检查清单**：
- [ ] 保留所有 LICENSE 和 COPYRIGHT 声明
- [ ] 记录所有修改内容
- [ ] 提供访问完整源代码的方式（如果是网络服务）
- [ ] 使用相同许可证发布修改版本
- [ ] 明确标识原创作者和贡献者