<div align="center">
  Checkout new amazing projects also, <a href="github.com/open-dev-society/openreadme" target="_blank">OpenReadme </a> is live
</div>  
<div align="center">
  <br />
  <a href="#" target="_blank">
    <img src="./public/assets/images/dashboard.png" alt="Project Banner" />
  </a>
  © Open Dev Society. This project is licensed under AGPL-3.0; if you modify, redistribute, or deploy it (including as a web service), you must release your source code under the same license and credit the original authors.
  <br />
  <br/>

  <div>
    <img src="https://img.shields.io/badge/-Next.js-black?style=for-the-badge&logoColor=white&logo=next.js&color=000000" alt="Next.js badge" />
    <img src="https://img.shields.io/badge/-TypeScript-black?style=for-the-badge&logoColor=white&logo=typescript&color=3178C6"/>
    <img src="https://img.shields.io/badge/-Tailwind%20CSS-black?style=for-the-badge&logoColor=white&logo=tailwindcss&color=38B2AC"/>
    <img src="https://img.shields.io/badge/-shadcn/ui-black?style=for-the-badge&logoColor=white&logo=shadcnui&color=000000"/>
    <img src="https://img.shields.io/badge/-Radix%20UI-black?style=for-the-badge&logoColor=white&logo=radixui&color=000000"/>
    <img src="https://img.shields.io/badge/-Better%20Auth-black?style=for-the-badge&logoColor=white&logo=betterauth&color=000000"/>
    <img src="https://img.shields.io/badge/-MongoDB-black?style=for-the-badge&logoColor=white&logo=mongodb&color=00A35C"/>
    <img src="https://img.shields.io/badge/-Inngest-black?style=for-the-badge&logoColor=white&logo=inngest&color=000000"/>
    <img src="https://img.shields.io/badge/-Nodemailer-black?style=for-the-badge&logoColor=white&logo=gmail&color=EA4335"/>
    <img src="https://img.shields.io/badge/-TradingView-black?style=for-the-badge&logoColor=white&logo=tradingview&color=2962FF"/>
    <img src="https://img.shields.io/badge/-Finnhub-black?style=for-the-badge&logoColor=white&color=30B27A"/>
    <img src="https://img.shields.io/badge/-CodeRabbit-black?style=for-the-badge&logoColor=white&logo=coderabbit&color=9146FF"/>
  </div>
</div>

# OpenStock

OpenStock is an open-source alternative to expensive market platforms. Track real-time prices, set personalized alerts, and explore detailed company insights — built openly, for everyone, forever free.

Note: OpenStock is community-built and not a brokerage. Market data may be delayed based on provider rules and your configuration. Nothing here is financial advice.

## 📋 Table of Contents

1. ✨ [Introduction](#introduction)
2. 🌍 [Open Dev Society Manifesto](#manifesto)
3. ⚙️ [Tech Stack](#tech-stack)
4. 🔋 [Features](#features)
5. 🤸 [Quick Start](#quick-start)
6. 🐳 [Docker Setup](#docker-setup)
7. 🔐 [Environment Variables](#environment-variables)
8. 🧱 [Project Structure](#project-structure)
9. 🏗️ [Architecture](#architecture)
10. 📡 [Data & Integrations](#data--integrations)
11. 🧪 [Scripts & Tooling](#scripts--tooling)
12. 🤝 [Contributing](#contributing)
13. 🛡️ [Security](#security)
14. 📜 [License](#license)
15. 🙏 [Acknowledgements](#acknowledgements)

## ✨ Introduction

OpenStock is a modern stock market app powered by Next.js (App Router), shadcn/ui and Tailwind CSS, Better Auth for authentication, MongoDB for persistence, Finnhub for market data, and TradingView widgets for charts and market views.

## 🌍 Open Dev Society Manifesto <a name="manifesto"></a>

We live in a world where knowledge is hidden behind paywalls. Where tools are locked in subscriptions. Where information is twisted by bias. Where newcomers are told they’re not “good enough” to build.

We believe there’s a better way.

- Our Belief: Technology should belong to everyone. Knowledge should be open, free, and accessible. Communities should welcome newcomers with trust, not gatekeeping.
- Our Mission: Build free, open-source projects that make a real difference:
    - Tools that professionals and students can use without barriers.
    - Knowledge platforms where learning is free, forever.
    - Communities where every beginner is guided, not judged.
    - Resources that run on trust, not profit.
- Our Promise: We will never lock knowledge. We will never charge for access. We will never trade trust for money. We run on transparency, donations, and the strength of our community.
- Our Call: If you’ve ever felt you didn’t belong, struggled to find free resources, or wanted to build something meaningful — you belong here.

Because the future belongs to those who build it openly.

## ⚙️ Tech Stack

Core
- Next.js 15 (App Router), React 19
- TypeScript
- Tailwind CSS v4 (via @tailwindcss/postcss)
- shadcn/ui + Radix UI primitives
- Lucide icons

Auth & Data
- Better Auth (email/password) with MongoDB adapter
- MongoDB + Mongoose
- **Redis** (L1 cache, 1-hour TTL) + **MongoDB** (L2 cache, 24-hour expiry) - Dual-layer market cap caching
- **Yahoo Finance** API (primary market cap source, batch 100 stocks)
- **Finnhub** API (fallback market cap source + symbols, profiles, market news)
- TradingView embeddable widgets + WebSocket (real-time quotes)
- ECharts (interactive treemap visualizations)

Automation & Comms
- Inngest (events, cron, AI inference via Gemini)
- Nodemailer (Gmail transport)
- Server-Sent Events (SSE) for real-time data streaming
- next-themes, cmdk (command palette), react-hook-form

Language composition
- TypeScript (~93.4%), CSS (~6%), JavaScript (~0.6%)

## 🔋 Features

- Authentication
    - Email/password auth with Better Auth + MongoDB adapter
    - Protected routes enforced via Next.js middleware
- Global search and Command + K palette
    - Fast stock search backed by Finnhub
    - Popular stocks when idle; debounced querying
- Watchlist
    - Per-user watchlist stored in MongoDB (unique symbol per user)
    - Group management with category-based organization
- Stock details
    - TradingView symbol info, candlestick/advanced charts, baseline, technicals
    - Company profile and financials widgets
- Market overview
    - Heatmap, quotes, and top stories (TradingView widgets)
- **Cache Management System** 🆕
    - Admin dashboard for monitoring dual-layer cache system (Redis L1 + MongoDB L2)
    - Real-time cache statistics and performance metrics
    - Data source health monitoring (Yahoo Finance, Finnhub, Fallback)
    - Cache data management with filtering, search, and bulk operations
    - Audit log tracking for all cache operations
    - **Real-time monitoring** via Server-Sent Events (SSE)
    - **Performance analytics**: Hit rates, response times, memory usage
    - **Cache operations**: View, search, filter, export, and bulk delete cached data
    - **User-friendly access**: Simple `/cache` URL with authentication protection
- **Real-time Heatmap** 🆕
    - Interactive treemap visualization based on user's watchlists
    - Group stocks by category with automatic pool aggregation
    - Live quote updates via TradingView WebSocket + SSE
    - Real-time market cap calculation with **dual-layer caching** (Redis L1 + MongoDB L2)
    - **Market Cap Caching System**:
        - Yahoo Finance primary source (batch 50 stocks) with Finnhub fallback (batch 50 stocks)
        - Redis L1 cache (1-hour TTL, ~1-2ms response)
        - MongoDB L2 cache (24-hour expiry, persistent storage)
        - Automatic pre-caching on watchlist add + daily scheduled updates (UTC 21:30, post US market close)
        - Auto-fallback to price estimation if both sources fail
        - **Unified batch size** (50 stocks/batch) for all operations
    - **Batch Subscription System** ⭐ **NEW**:
        - TradingView WebSocket subscription in batches (50 stocks/batch)
        - Supports 500+ stocks with automatic batch processing
        - 200ms inter-batch delay for optimal performance
        - Unified batch size across all data sources
    - **Subscription Health Monitoring** ⭐ **NEW**:
        - Auto-repair mechanism for failed subscriptions
        - Health check every 5 minutes with auto-recovery
        - Manual health check: `npm run subscription:health`
        - Manual repair: `npm run subscription:repair`
        - API endpoints: `/api/heatmap/subscription-health`, `/api/heatmap/repair-subscriptions`
    - **Performance Optimizations** ⭐ **NEW**:
        - All high-frequency logs disabled (99%+ reduction)
        - Memory usage reduced by 80-90%
        - CPU usage reduced by 40-70%
        - Silent production mode with error-only logging
    - TradingView-style 13-level color gradient (-5% to +5%)
    - Two-level drill-down (pools → stocks)
    - **Fullscreen mode** with dynamic resizing
    - Core optimizations: `useMemo`, `useCallback`, `requestAnimationFrame`, disabled animations
    - **Mock Ticker** support for testing during non-trading hours (85+ preset stocks)
- Personalized onboarding
    - Collects country, investment goals, risk tolerance, preferred industry
- Email & automation
    - AI-personalized welcome email (Gemini via Inngest)
    - Daily news summary emails (cron) personalized using user watchlists
- Polished UI
    - shadcn/ui components, Radix primitives, Tailwind v4 design tokens
    - Dark theme by default
- Keyboard shortcut
    - Cmd/Ctrl + K for quick actions/search

## 🤸 Quick Start

Prerequisites
- Node.js 20+ and pnpm or npm
- MongoDB connection string (MongoDB Atlas or local via Docker Compose)
- **Redis** (optional but recommended) - for L1 market cap caching (Docker Compose or local)
- **Yahoo Finance** - primary market cap source (no API key needed)
- **Finnhub** API key - fallback market cap source + stock search/profiles (free tier supported)
- Gmail account for email (or update Nodemailer transport)
- Optional: Google Gemini API key (for AI-generated welcome intros)

Clone and install
```bash
git clone https://github.com/Open-Dev-Society/OpenStock.git
cd OpenStock

# choose one:
pnpm install
# or
npm install
```

Configure environment
- Create a `.env` file (see [Environment Variables](#environment-variables)).
- Verify DB connectivity:
```bash
pnpm test:db
# or
npm run test:db
```

Run development
```bash
# Next.js dev (Turbopack) - Real TradingView Ticker
pnpm dev
# or
npm run dev

# Next.js dev with Mock Ticker (for testing during non-trading hours)
pnpm dev:mock
# or
npm run dev:mock
```

Run Inngest locally (workflows, cron, AI)
```bash
npx inngest-cli@latest dev
```

Cache Management (optional)
```bash
# Check cache status (terminal output)
npm run cache:check

# Generate cache visualization report (HTML)
npm run cache:visualize
# Opens cache-report.html in your browser
```

Build & start (production)
```bash
pnpm build && pnpm start
# or
npm run build && npm start
```

Open http://localhost:3000 to view the app (local development).

**Cache Management**: Access the admin cache dashboard at http://localhost:3000/cache (requires authentication)

**Note**: For Docker deployment, the app runs on **http://localhost:3100** (non-default port).

## 🐳 Docker Setup

You can run OpenStock, MongoDB, and Redis easily with Docker Compose.

1) Ensure Docker and Docker Compose are installed.

2) docker-compose.yml includes three services:
- **openstock** (this app)
- **mongodb** (MongoDB database with persistent volume)
- **openstock-redis** (Redis L1 cache with persistent volume)

3) Create your `.env` (see examples below). For the Docker setup, use local connection strings like:
```env
MONGODB_URI=mongodb://root:example@mongodb:27017/openstock?authSource=admin
REDIS_URL=redis://openstock-redis:6379
```

4) Start the stack:
```bash
# from the repository root
# Start MongoDB and Redis first
docker compose up -d mongodb
docker compose up -d openstock-redis

# Then start the app
docker compose up -d --build
```

5) Access the app:
- **App**: http://localhost:3100 (**非默认端口 3100**)
- **MongoDB**: Available at `mongodb:27017` (inside Docker network) or `localhost:27117` (from host, **非默认端口**)
- **Redis**: Available at `openstock-redis:6379` (inside Docker network) or `localhost:6479` (from host, **非默认端口**)

**为什么使用非默认端口？**
- ✅ 避免与本地开发环境端口冲突
- ✅ 降低自动端口扫描攻击风险
- ✅ 提升生产环境安全性

详见: [端口配置文档](docs/PORT_CONFIGURATION.md)

Notes
- The app service depends_on the mongodb service.
- Credentials are defined in Compose for the MongoDB root user; authSource=admin is required on the connection string for root.
- Data persists across restarts via the docker volume.

Optional: Example service definitions used in this project:
```yaml
services:
  mongodb:
    image: mongo:7
    container_name: mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: example
    ports:
      - "27117:27017"  # 非默认端口
    volumes:
      - mongo-data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  openstock-redis:
    image: redis:7-alpine
    container_name: openstock-redis
    restart: unless-stopped
    ports:
      - "6479:6379"  # 非默认端口
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mongo-data:
  redis-data:
```

## 🔐 Environment Variables

Create `.env` at the project root. Choose either a hosted MongoDB (Atlas) URI or the local Docker URI.

Hosted (MongoDB Atlas):
```env
# Core
NODE_ENV=development

# Database (Atlas)
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority

# Redis (L1 Cache) - Optional but recommended
# For Docker: Use localhost:6479 (non-default port)
REDIS_URL=redis://localhost:6479
# Note: If Redis is unavailable, system auto-falls back to MongoDB-only caching

# Better Auth
BETTER_AUTH_SECRET=your_better_auth_secret
# For Docker: Use localhost:3100 (non-default port)
BETTER_AUTH_URL=http://localhost:3100

# Market Data Sources
# Yahoo Finance - Primary market cap source (no API key needed, batch 50 stocks)
# Finnhub - Fallback market cap + stock search/profiles (batch 50 stocks)
FINNHUB_API_KEY=your_finnhub_key
# Optional client-exposed variant if needed by client code:
NEXT_PUBLIC_FINNHUB_API_KEY=
FINNHUB_BASE_URL=https://finnhub.io/api/v1

# Mock Ticker (Testing/Demo mode)
# Set to 'true' to enable mock real-time data (for non-trading hours testing)
# USE_MOCK_TICKER=true

# Inngest AI (Gemini)
GEMINI_API_KEY=your_gemini_api_key

# Email (Nodemailer via Gmail; consider App Passwords if 2FA)
NODEMAILER_EMAIL=youraddress@gmail.com
NODEMAILER_PASSWORD=your_gmail_app_password
```

Local (Docker Compose):
```env
# Core
NODE_ENV=development

# Database (Docker)
MONGODB_URI=mongodb://root:example@mongodb:27017/openstock?authSource=admin

# Redis (Docker L1 Cache)
REDIS_URL=redis://openstock-redis:6379
# Note: Use 'openstock-redis:6379' as hostname inside Docker network
# Note: Use 'localhost:6479' (non-default port) if connecting from host machine

# Better Auth
BETTER_AUTH_SECRET=your_better_auth_secret
BETTER_AUTH_URL=http://localhost:3100  # Docker uses non-default port 3100

# Market Data Sources
# Yahoo Finance - Primary market cap source (no API key needed, batch 50 stocks)
# Finnhub - Fallback market cap + stock search/profiles (batch 50 stocks)
FINNHUB_API_KEY=your_finnhub_key
NEXT_PUBLIC_FINNHUB_API_KEY=
FINNHUB_BASE_URL=https://finnhub.io/api/v1

# Mock Ticker (Testing/Demo mode)
# Set to 'true' to enable mock real-time data (for non-trading hours testing)
# USE_MOCK_TICKER=true

# Inngest AI (Gemini)
GEMINI_API_KEY=your_gemini_api_key

# Email (Nodemailer via Gmail; consider App Passwords if 2FA)
NODEMAILER_EMAIL=youraddress@gmail.com
NODEMAILER_PASSWORD=your_gmail_app_password
```

Notes
- Keep private keys server-side whenever possible.
- If using `NEXT_PUBLIC_` variables, remember they are exposed to the browser.
- In production, prefer a dedicated SMTP provider over a personal Gmail.
- Do not hardcode secrets in the Dockerfile; use `.env` and Compose.

## 🧱 Project Structure

```
app/
  (auth)/
    layout.tsx
    sign-in/page.tsx
    sign-up/page.tsx
  (root)/
    layout.tsx
    page.tsx
    help/page.tsx
    stocks/[symbol]/page.tsx
  api/inngest/route.ts
  globals.css
  layout.tsx
components/
  ui/…          # shadcn/radix primitives (button, dialog, command, input, etc.)
  forms/…       # InputField, SelectField, CountrySelectField, FooterLink
  admin/…       # Cache management components (charts, visualizers, etc.)
  Header.tsx, Footer.tsx, SearchCommand.tsx, WatchlistButton.tsx, …
database/
  models/watchlist.model.ts
  watchlist-group.model.ts
  market-cap.model.ts  # L2 cache persistence for market cap data
  audit-log.model.ts     # Cache admin audit log tracking
  mongoose.ts
lib/
  actions/…     # server actions (auth, finnhub, yahoo-finance, heatmap, user, watchlist, watchlist-group, admin/cache-admin.actions)
  cache/…       # market-cap-cache-manager (dual-layer Redis L1 + MongoDB L2)
  redis/…       # Redis client (lazy-loaded, auto-fallback)
  utils/permissions.ts  # Admin access control and security
  tradingview/… # ticker, mock-ticker, sse-manager
  better-auth/…
  inngest/…     # client, functions, prompts
  nodemailer/…  # transporter, email templates
  adapters/…    # multi-stock-adapter
  constants.ts, utils.ts
scripts/
  test-db.mjs
types/
  global.d.ts
next.config.ts          # i.ibb.co image domain allowlist
postcss.config.mjs      # Tailwind v4 postcss setup
components.json         # shadcn config
public/assets/images/   # logos and screenshots
```

## 🏗️ Architecture

OpenStock follows a modern, scalable architecture with clear separation of concerns:

### System Overview
- **Frontend**: Next.js 15 App Router + React 19
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Backend**: Server Actions + API Routes
- **Database**: MongoDB + Mongoose ODM
- **Caching**: Redis (L1, 1-hour TTL) + MongoDB (L2, 24-hour expiry)
- **Market Data**: Yahoo Finance (primary, batch 100) + Finnhub (fallback, batch 50)
- **Real-time**: TradingView WebSocket + SSE streaming (+ Mock Ticker for testing)
- **Automation**: Inngest workflows + Gemini AI

### Key Modules
1. **Authentication** - Better Auth with MongoDB adapter
2. **Watchlist Management** - Multi-group support with category-based organization
3. **Market Cap Caching** - Dual-layer system (Redis L1 + MongoDB L2) with auto-fallback
4. **Real-time Heatmap** - TradingView WebSocket + SSE + ECharts treemap visualization
5. **Multi-Stock View** - Grid layout with TradingView mini charts
6. **Stock Details** - Comprehensive TradingView widgets integration
7. **Inngest Workflows** - AI-powered email automation + daily market cap updates (UTC 21:30)
8. **Mock Ticker** - Testing mode with 85+ preset stocks for non-trading hours

### Real-time Data Flow
```
User → Heatmap Page → Initial Data API → Cached Market Cap (Redis L1 → MongoDB L2)
                                      ↓
                    → Yahoo Finance (primary, batch 50) → Finnhub (fallback, batch 50)
                                      ↓
                    → SSE Connection → SSE Manager → TradingView Ticker / Mock Ticker
                                      ↓
                    → TradingView WebSocket (Batch Subscribe: 50 stocks/batch, 200ms delay)
                                      ↓
                    → Health Check (every 5min) → Auto-Repair Failed Subscriptions
                                      ↓
                    → Real-time Quotes → SSE Push → Frontend → Calculate Market Cap
                                      ↓
                    → Update ECharts Treemap (Silent Mode: Error-Only Logging)
```

### Market Cap Caching Architecture
```
Watchlist Add → Pre-cache Trigger → Yahoo Finance (primary) → Finnhub (fallback)
                                   ↓
Daily Cron (UTC 21:30) → Update All Market Caps → Redis L1 (1hr TTL) + MongoDB L2 (24hr)
                                   ↓
Heatmap Request → Cache Hit (Redis ~1-2ms) → Return
                ↓ Cache Miss
                → MongoDB L2 (persistent) → Return + Backfill Redis
                ↓ L2 Miss or Expired
                → Fetch Fresh Data → Cache to L1 + L2
```

### Documentation
- **Full Architecture**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Complete system architecture with Mermaid diagrams
- **Heatmap Architecture**: [docs/architecture/heatmap-architecture.md](docs/architecture/heatmap-architecture.md)
- **Market Cap Caching**: [docs/MARKET_CAP_CACHE.md](docs/MARKET_CAP_CACHE.md) - Dual-layer caching system documentation
- **Cache Visualization**: [docs/CACHE_VISUALIZATION_GUIDE.md](docs/CACHE_VISUALIZATION_GUIDE.md) - How to inspect cached data
- **Heatmap Testing**: [docs/HEATMAP_TESTING_GUIDE.md](docs/HEATMAP_TESTING_GUIDE.md)
- **Mock Ticker Usage**: [docs/MOCK_TICKER_USAGE.md](docs/MOCK_TICKER_USAGE.md) - Testing with 85+ preset stocks
- **Watchlist Usage**: [docs/WATCHLIST_USAGE.md](docs/WATCHLIST_USAGE.md)
- **Development Guide**: [CLAUDE.md](CLAUDE.md) - Comprehensive development reference

## 📡 Data & Integrations

### Market Data Sources

- **Yahoo Finance** (Primary)
    - Market cap data source (no API key required)
    - **Batch processing**: 50 stocks per request (unified batch size)
    - Free and reliable for market capitalization data
    - Library: `yahoo-finance2`

- **Finnhub** (Fallback + Additional Features)
    - Fallback market cap source (**batch 50 stocks per request**)
    - Stock search, company profiles, and market news
    - Set `FINNHUB_API_KEY` and `FINNHUB_BASE_URL` (default: https://finnhub.io/api/v1)
    - Free tiers may return delayed quotes; respect rate limits and terms

- **TradingView**
    - Real-time WebSocket for live stock quotes
    - **Batch subscription**: 50 stocks per batch (unified with market data)
    - **Inter-batch delay**: 200ms for optimal performance
    - **Subscription health monitoring**: Auto-repair failed subscriptions every 5 minutes
    - **Performance optimizations**: Silent mode (error-only logging), 80-90% memory reduction
    - Embeddable widgets for charts, heatmap, quotes, and timelines
    - Mock Ticker alternative for non-trading hours testing (85+ preset stocks)
    - External images from `i.ibb.co` are allowlisted in `next.config.ts`

### Caching Infrastructure

- **Redis** (L1 Cache)
    - In-memory caching with 1-hour TTL
    - ~1-2ms response time for cached market cap data
    - Lazy-loaded with automatic fallback if unavailable
    - Optional but highly recommended for performance

- **MongoDB** (L2 Cache + Persistence)
    - Persistent market cap cache with 24-hour expiry
    - Automatic backfill to Redis on cache miss
    - Stores: symbol, marketCap, price, source, lastUpdated, validUntil
    - Data sources tracked: `yahoo`, `finnhub`, `fallback`

### Authentication & Database

- **Better Auth + MongoDB**
    - Email/password authentication with MongoDB adapter
    - Session validation via middleware
    - Most routes are protected, with public exceptions for `sign-in`, `sign-up`, assets and Next internals

### Automation & Workflows

- **Inngest**
    - Workflows:
        - `app/user.created` → AI-personalized Welcome Email (via Gemini)
        - Cron `0 12 * * *` → Daily News Summary per user
        - **Cron `30 21 * * 1-5` (UTC 21:30, Mon-Fri)** → Daily Market Cap Cache Update (post US market close)
    - Local dev: `npx inngest-cli@latest dev`
    - Async pre-caching on watchlist add

- **Email (Nodemailer)**
    - Gmail transport (update credentials or switch to your SMTP provider)
    - Templates for welcome and news summary emails

## 🧪 Scripts & Tooling

### Core Development Scripts

```bash
# Development
npm run dev              # Start dev server with real TradingView ticker
npm run dev:mock         # Start dev server with Mock Ticker (85+ preset stocks)
npm run build            # Production build (Turbopack)
npm run start            # Run production server
npm run lint             # Run ESLint

# Database & Testing
npm run test:db          # Validate MongoDB connectivity
npm run migrate:watchlist      # Migrate watchlist data structure
npm run migrate:multigroup     # Migrate to multi-group watchlist system
npm run test:multigroup        # Test multi-group watchlist functionality

# Cache Management
npm run cache:check      # View cache status (terminal output)
npm run cache:visualize  # Generate HTML cache visualization report

# Subscription Health & Monitoring ⭐ NEW
npm run subscription:health   # Check subscription health status
npm run subscription:repair   # Manually trigger subscription repair
```

### Cache Visualization

The `cache:visualize` script generates an interactive HTML report showing:
- Redis L1 cache hit rate and performance
- MongoDB L2 cache statistics
- Data source distribution (Yahoo, Finnhub, Fallback)
- Cache expiry timeline
- Individual stock cache details

**Output**: `cache-report.html` (auto-opens in browser)

### Mock Ticker Mode

Perfect for testing during non-trading hours:
- 85+ preset stocks with realistic prices
- Auto-updates every 1-3 seconds
- Covers all major sectors (Tech, Finance, Consumer, Healthcare, Energy, etc.)
- No network dependencies

**Usage**: `npm run dev:mock` or set `USE_MOCK_TICKER=true` in `.env`

### Developer Experience

- **TypeScript** strict mode with comprehensive type safety
- **Tailwind CSS v4** (no separate config needed, PostCSS-based)
- **shadcn/ui** components with Radix UI primitives
- **ECharts** for advanced data visualizations (treemap heatmap)
- **Command Palette** (cmdk) - Press Cmd/Ctrl + K
- **Dark Theme** (next-themes) - Default dark mode
- **Icons** (lucide-react) - Extensive icon library

## 🤝 Contributing

You belong here. Whether you’re a student, a self-taught dev, or a seasoned engineer — contributions are welcome.

- Open an issue to discuss ideas and bugs
- Look for “good first issue” or “help wanted”
- Keep PRs focused; add screenshots for UI changes
- Be kind, guide beginners, no gatekeeping — that’s the ODS way

## 🛡️ Security

If you discover a vulnerability:
- Do not open a public issue
- Email: opendevsociety@cc.cc
- We’ll coordinate responsible disclosure and patch swiftly

## 📜 License

OpenStock is and will remain free and open for everyone. This project is licensed under the AGPL-3.0 License - see the LICENSE file for details.

## 🙏 Acknowledgements

- Finnhub for accessible market data
- TradingView for embeddable market widgets
- shadcn/ui, Radix UI, Tailwind CSS, Next.js community
- Inngest for dependable background jobs and workflows
- Better Auth for simple and secure authentication
- All contributors who make open tools possible

— Built openly, for everyone, forever free. Open Dev Society.

> © Open Dev Society. This project is licensed under AGPL-3.0; if you modify, redistribute, or deploy it (including as a web service), you must release your source code under the same license and credit the original authors.

## Our Honourable Contributors
- [ravixalgorithm](https://github.com/ravixalgorithm) - Developed the entire application from the ground up, including authentication, UI design, API and AI integration, and deployment.
- [Priyanshuu00007](https://github.com/Priyanshuu00007) - Created the official OpenStock logo and contributed to the project’s visual identity.
- [chinnsenn](https://github.com/chinnsenn) - Set up Docker configuration for the repository, ensuring a smooth development and deployment process.
- [koevoet1221](https://github.com/koevoet1221) - Resolved MongoDB Docker build issues, improving the project’s overall stability and reliability.

## Special thanks
Huge thanks to [Adrian Hajdin (JavaScript Mastery)](https://github.com/adrianhajdin) — his excellent Stock Market App tutorial was instrumental in building OpenStock for the open-source community under the Open Dev Society.

GitHub: [adrianhajdin](https://github.com/adrianhajdin)
YouTube tutorial: [Stock Market App Tutorial](https://www.youtube.com/watch?v=gu4pafNCXng)
YouTube channel: [JavaScript Mastery](https://www.youtube.com/@javascriptmastery)
