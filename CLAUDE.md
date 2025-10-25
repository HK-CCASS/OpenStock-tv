# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 开发命令

### 核心开发命令
- `npm run dev` - 启动 Next.js 开发服务器（使用 Turbopack）
- `npm run build` - 构建生产版本（使用 Turbopack）
- `npm run start` - 启动生产服务器
- `npm run lint` - 运行 ESLint 检查
- `npm run test:db` - 测试数据库连接
- `npm run migrate:watchlist` - 迁移观察列表数据（使用 tsx）

### Inngest 本地开发
- `npx inngest-cli@latest dev` - 启动 Inngest 本地开发服务器（工作流、定时任务、AI 推理）

### Docker 开发
- `docker compose up -d mongodb && docker compose up -d --build` - 启动完整 Docker 开发环境

## 项目架构

### 技术栈
- **前端框架**: Next.js 15 (App Router) + React 19
- **样式**: Tailwind CSS v4 + shadcn/ui + Radix UI
- **语言**: TypeScript
- **数据库**: MongoDB + Mongoose
- **认证**: Better Auth (邮箱/密码) + MongoDB 适配器
- **外部 API**: Finnhub (股票数据)、TradingView (图表组件)
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
│   ├── api-docs/      # API 文档
│   └── help/          # 帮助页面
├── api/inngest/       # Inngest API 路由
└── layout.tsx         # 根布局

components/              # React 组件
├── ui/               # shadcn/ui 基础组件
├── forms/            # 表单组件
└── [其他业务组件]     # Header, Footer, SearchCommand 等

lib/                   # 核心逻辑库
├── actions/          # Server Actions (auth, finnhub, user, watchlist, watchlist-group)
├── adapters/         # 适配器层 (multi-stock-adapter)
├── better-auth/      # Better Auth 配置
├── inngest/          # Inngest 客户端、函数、提示词
├── nodemailer/       # 邮件传输和模板
├── types/           # TypeScript 类型定义
├── constants.ts     # 常量定义
└── utils.ts         # 工具函数

database/              # 数据库相关
├── models/          # Mongoose 模型
└── mongoose.ts      # 数据库连接

scripts/              # 脚本文件
├── test-db.mjs      # 数据库连接测试
└── migrate-watchlist.ts  # 数据迁移脚本
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

#### 自动化工作流 (Inngest)
- 用户注册发送个性化欢迎邮件（AI 生成内容）
- 每日新闻摘要邮件（定时任务，基于用户观察列表个性化）
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
- `BETTER_AUTH_SECRET` - Better Auth 密钥
- `BETTER_AUTH_URL` - Better Auth URL
- `FINNHUB_API_KEY` - Finnhub API 密钥
- `GEMINI_API_KEY` - Google Gemini API 密钥（AI 功能）
- `NODEMAILER_EMAIL` / `NODEMAILER_PASSWORD` - 邮件发送凭据

### Next.js 配置
- 图片域名白名单：`i.ibb.co`（TradingView 图片）
- 构建时忽略 ESLint 和 TypeScript 错误（用于快速开发）
- 路径别名：`@/*` 映射到项目根目录

### 数据库模型
- Watchlist：用户观察列表，每个用户每个股票符号唯一
- WatchlistGroup：观察列表分组，支持用户创建多个自定义分组

## 开发注意事项

### API 使用限制
- Finnhub 免费层可能有延迟报价，需遵守速率限制
- TradingView 组件是嵌入式的，依赖外部服务

### 认证中间件
- 大部分路由需要登录认证
- 公开路由：sign-in、sign-up、assets、Next.js 内部路由

### 部署要求
- 如修改、重新分发或部署（包括作为 web 服务），必须遵循 AGPL-3.0 许可证
- 必须以相同许可证发布源代码并署名原作者