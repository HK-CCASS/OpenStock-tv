# OpenStock Docker 部署指南

## 概述

OpenStock 提供完整的 Docker Compose 配置，支持一键部署完整的应用栈。

## 服务架构

```
┌─────────────────────────────────────┐
│  OpenStock App (Next.js)            │
│  Container: openstock-app           │
│  Host Port: 3100 → Container: 3000  │
└──────────────┬──────────────────────┘
               │
               │ openstock-network
               │
       ┌───────┴────────┐
       │                │
┌──────┴──────┐  ┌──────┴──────┐
│ MongoDB 7   │  │ Redis 7     │
│ mongodb     │  │ redis       │
│ 27117→27017 │  │ 6479→6379   │
│ mongo-data  │  │ redis-data  │
└─────────────┘  └─────────────┘
```

**端口映射说明**：
- `3100→3000`: 主机端口 3100 映射到容器内部 3000
- `27117→27017`: MongoDB 非默认端口，避免冲突
- `6479→6379`: Redis 非默认端口，提升安全性

## 快速开始

### 前提条件

- Docker Engine 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存

### 步骤 1: 克隆项目

```bash
git clone <your-repo-url>
cd OpenStock-tv
```

### 步骤 2: 配置环境变量

创建 `.env` 文件：

```bash
# 复制示例文件（如果有）
cp .env.example .env

# 或手动创建
nano .env
```

最小配置（必需）：

```env
# Core
NODE_ENV=production

# Database (Docker 内部网络 - 容器内访问)
MONGODB_URI=mongodb://root:example@mongodb:27017/openstock?authSource=admin

# Database (主机网络 - 外部工具访问)
# MONGODB_URI=mongodb://root:example@localhost:27117/openstock?authSource=admin

# Redis (主机网络 - 外部工具访问)
# REDIS_URL=redis://localhost:6479

# Better Auth
BETTER_AUTH_SECRET=your_random_secret_here_min_32_chars
BETTER_AUTH_URL=http://localhost:3100

# Finnhub API
FINNHUB_API_KEY=your_finnhub_api_key_here
FINNHUB_BASE_URL=https://finnhub.io/api/v1

# Inngest AI (Optional)
GEMINI_API_KEY=your_gemini_api_key_here

# Email (Optional)
NODEMAILER_EMAIL=your_email@gmail.com
NODEMAILER_PASSWORD=your_gmail_app_password
```

> **重要**: 
> - `MONGODB_URI` 必须使用 `mongodb` 作为主机名（Docker 内部网络）
> - `BETTER_AUTH_SECRET` 必须至少 32 个字符
> - 外部访问时将 `localhost` 改为实际域名或 IP

### 步骤 3: 启动服务

```bash
# 构建并启动所有服务
docker compose up -d

# 或分步启动（推荐首次部署）
docker compose up -d mongodb    # 先启动 MongoDB
docker compose up -d --build    # 再启动应用
```

### 步骤 4: 验证部署

```bash
# 检查服务状态
docker compose ps

# 预期输出:
# NAME              STATUS          PORTS
# mongodb           Up (healthy)    0.0.0.0:27117->27017/tcp
# openstock-redis   Up (healthy)    0.0.0.0:6479->6379/tcp
# openstock-app     Up (healthy)    0.0.0.0:3100->3000/tcp

# 查看应用日志
docker compose logs -f openstock

# 查看 MongoDB 日志
docker compose logs -f mongodb
```

### 步骤 5: 访问应用

打开浏览器访问: http://localhost:3100

**注意**: 使用非默认端口以提升安全性并避免端口冲突

## 服务配置详解

### OpenStock App 服务

```yaml
openstock:
  build:
    context: .
    extra_hosts:
      - "mongodb:host-gateway"    # 允许访问主机的 MongoDB
  container_name: openstock-app
  ports:
    - "3100:3000"                 # 映射端口 (主机:容器)
  env_file:
    - .env                        # 加载环境变量
  environment:
    # 可以在这里覆盖 .env 的值
    USE_MOCK_TICKER: false        # 使用真实 TradingView 数据
  restart: unless-stopped
  depends_on:
    mongodb:
      condition: service_healthy  # 等待 MongoDB 健康检查通过
  networks:
    - openstock-network
  healthcheck:
    test: ["CMD", "wget", "--spider", "http://localhost:3000"]
    interval: 30s                 # 每 30 秒检查一次
    timeout: 10s
    retries: 3
    start_period: 40s             # 启动后 40 秒开始检查
```

### MongoDB 服务

```yaml
mongodb:
  image: mongo:7
  container_name: mongodb
  restart: unless-stopped
  environment:
    MONGO_INITDB_ROOT_USERNAME: root
    MONGO_INITDB_ROOT_PASSWORD: example
    MONGO_INITDB_DATABASE: openstock
  ports:
    - "27117:27017"               # 非默认端口
  volumes:
    - mongo-data:/data/db         # 数据持久化
    - mongo-config:/data/configdb # 配置持久化
  networks:
    - openstock-network
  healthcheck:
    test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 30s
```

## 常用命令

### 启动和停止

```bash
# 启动所有服务
docker compose up -d

# 停止所有服务
docker compose down

# 停止并删除卷（⚠️ 会删除所有数据）
docker compose down -v

# 重启服务
docker compose restart

# 重启单个服务
docker compose restart openstock
```

### 查看日志

```bash
# 查看所有服务日志
docker compose logs

# 实时查看日志
docker compose logs -f

# 查看特定服务日志
docker compose logs openstock
docker compose logs mongodb

# 查看最近 100 行日志
docker compose logs --tail=100
```

### 构建和更新

```bash
# 重新构建应用（代码更新后）
docker compose build openstock

# 重新构建并启动
docker compose up -d --build

# 拉取最新镜像
docker compose pull

# 查看服务状态
docker compose ps

# 查看服务详细信息
docker compose ps -a
```

### 数据库管理

```bash
# 进入 MongoDB 容器（容器内部使用 27017）
docker compose exec mongodb mongosh -u root -p example

# 从主机连接 MongoDB（使用 27117）
mongosh mongodb://root:example@localhost:27117/openstock?authSource=admin

# 备份数据库
docker compose exec mongodb mongodump --uri="mongodb://root:example@localhost:27017/openstock?authSource=admin" --out=/data/backup

# 恢复数据库
docker compose exec mongodb mongorestore --uri="mongodb://root:example@localhost:27017/openstock?authSource=admin" /data/backup/openstock

# 从主机导出备份
docker compose exec mongodb tar -czf /data/backup.tar.gz /data/backup
docker compose cp mongodb:/data/backup.tar.gz ./backup.tar.gz
```

### 清理和维护

```bash
# 停止并删除容器（保留卷）
docker compose down

# 删除所有未使用的镜像
docker image prune -a

# 删除所有未使用的卷
docker volume prune

# 查看磁盘使用
docker system df

# 完全清理 Docker 系统（⚠️ 谨慎使用）
docker system prune -a --volumes
```

## 环境变量配置

### 必需环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `NODE_ENV` | 运行环境 | `production` |
| `MONGODB_URI` | MongoDB 连接字符串 | `mongodb://root:example@mongodb:27017/openstock?authSource=admin` |
| `BETTER_AUTH_SECRET` | Auth 密钥 | 至少 32 个随机字符 |
| `BETTER_AUTH_URL` | App URL | `http://localhost:3000` |
| `FINNHUB_API_KEY` | Finnhub API 密钥 | 从 finnhub.io 获取 |

### 可选环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `USE_MOCK_TICKER` | 使用模拟数据 | `false` |
| `GEMINI_API_KEY` | Gemini AI 密钥 | - |
| `NODEMAILER_EMAIL` | 邮件发送地址 | - |
| `NODEMAILER_PASSWORD` | 邮件密码 | - |

### 在 docker-compose.yml 中覆盖

```yaml
services:
  openstock:
    environment:
      NODE_ENV: production
      USE_MOCK_TICKER: false
      # 覆盖 .env 文件中的值
```

## 网络配置

### 内部网络

Docker Compose 创建了一个名为 `openstock-network` 的桥接网络：

```
openstock-app (3000) ←→ openstock-network ←→ mongodb (27017)
                                           ←→ redis (6379)

主机端口映射:
- localhost:3100 → openstock-app:3000
- localhost:27117 → mongodb:27017
- localhost:6479 → redis:6379
```

### 外部访问

```bash
# 应用端口（外部 → 内部）
localhost:3100 → openstack-app:3000

# MongoDB 端口（外部 → 内部）
localhost:27117 → mongodb:27017

# Redis 端口（外部 → 内部）
localhost:6479 → redis:6379
```

**为什么使用非默认端口？**
- ✅ 避免与本地开发环境端口冲突
- ✅ 降低自动扫描攻击的命中率
- ✅ 提升生产环境安全性

### 防火墙配置

生产环境建议：
- ✅ 开放 3100 端口（应用）
- ⚠️ 限制 27117 端口（仅内部网络）
- ⚠️ 限制 6479 端口（仅内部网络）

```bash
# Ubuntu/Debian
sudo ufw allow 3100/tcp
sudo ufw deny 27117/tcp
sudo ufw deny 6479/tcp

# 或仅允许特定 IP 访问数据库
sudo ufw allow from 192.168.1.0/24 to any port 27117
sudo ufw allow from 192.168.1.0/24 to any port 6479
```

## 数据持久化

### 卷管理

```bash
# 列出所有卷
docker volume ls

# 查看卷详情
docker volume inspect openstock-tv_mongo-data

# 备份卷
docker run --rm -v openstock-tv_mongo-data:/data \
  -v $(pwd):/backup alpine tar -czf /backup/mongo-data-backup.tar.gz /data

# 恢复卷
docker run --rm -v openstock-tv_mongo-data:/data \
  -v $(pwd):/backup alpine tar -xzf /backup/mongo-data-backup.tar.gz -C /data
```

### 数据目录

| 卷名 | 挂载点 | 说明 |
|------|--------|------|
| `mongo-data` | `/data/db` | MongoDB 数据文件 |
| `mongo-config` | `/data/configdb` | MongoDB 配置文件 |

## 健康检查

### 应用健康检查

```bash
# 手动检查应用健康（从主机访问）
curl -f http://localhost:3100 || echo "App is down"

# Docker 健康状态
docker compose ps
# STATUS 列显示 (healthy) 表示健康
```

### MongoDB 健康检查

```bash
# 手动检查 MongoDB
docker compose exec mongodb mongosh \
  -u root -p example \
  --eval "db.adminCommand('ping')"

# 预期输出: { ok: 1 }
```

### 健康检查配置

```yaml
healthcheck:
  test: ["CMD", "wget", "--spider", "http://localhost:3000"]
  interval: 30s       # 每 30 秒检查
  timeout: 10s        # 10 秒超时
  retries: 3          # 失败 3 次标记为 unhealthy
  start_period: 40s   # 启动 40 秒后开始检查
```

## 故障排查

### 问题 1: 容器无法启动

```bash
# 查看详细日志
docker compose logs openstock

# 检查端口占用
lsof -i :3100
lsof -i :27117
lsof -i :6479
netstat -tuln | grep -E "3100|27117|6479"

# 检查环境变量
docker compose config
```

### 问题 2: MongoDB 连接失败

```bash
# 验证 MongoDB 运行状态
docker compose ps mongodb

# 测试连接（容器内部使用 3000）
docker compose exec openstock \
  wget -qO- http://localhost:3000/api/health

# 从主机测试（使用 3100）
curl http://localhost:3100/api/health

# 检查网络
docker network inspect openstock-tv_openstock-network
```

### 问题 3: 数据丢失

```bash
# 检查卷是否存在
docker volume ls | grep openstock

# 恢复数据（如果有备份）
docker compose down
docker volume rm openstock-tv_mongo-data
# 恢复备份...
docker compose up -d
```

### 问题 4: 构建失败

```bash
# 清理缓存重新构建
docker compose build --no-cache openstock

# 检查 Dockerfile
cat Dockerfile

# 检查磁盘空间
df -h
```

## 生产部署

### 推荐配置

```yaml
# docker-compose.prod.yml
services:
  openstock:
    environment:
      NODE_ENV: production
      USE_MOCK_TICKER: false
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 启动生产环境

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 安全建议

1. **修改默认密码**:
   ```yaml
   MONGO_INITDB_ROOT_USERNAME: your_custom_user
   MONGO_INITDB_ROOT_PASSWORD: your_strong_password
   ```

2. **限制网络访问**:
   ```yaml
   ports:
     - "127.0.0.1:27117:27017"  # 仅本地访问 MongoDB
     - "127.0.0.1:6479:6379"    # 仅本地访问 Redis
   ```

3. **使用 HTTPS**:
   - 配置反向代理（Nginx/Traefik）
   - 使用 Let's Encrypt 证书

4. **定期备份**:
   ```bash
   # 设置 cron 任务
   0 2 * * * /path/to/backup-script.sh
   ```

### 反向代理示例 (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 监控和日志

### 日志聚合

```bash
# 将日志输出到文件
docker compose logs -f > openstock.log

# 使用 Docker 日志驱动
services:
  openstock:
    logging:
      driver: syslog
      options:
        syslog-address: "tcp://192.168.1.100:514"
```

### 资源监控

```bash
# 查看资源使用
docker stats

# 限制资源
services:
  openstock:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## 更新和维护

### 应用更新

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建
docker compose build openstock

# 3. 重启服务（零停机）
docker compose up -d --no-deps --build openstock
```

### 数据库升级

```bash
# 1. 备份数据
docker compose exec mongodb mongodump ...

# 2. 停止服务
docker compose down

# 3. 更新镜像版本
# mongodb: mongo:7 → mongo:8

# 4. 重启服务
docker compose up -d
```

## 总结

Docker Compose 提供了一种简单、可靠的方式来部署 OpenStock：

- ✅ 一键部署完整栈
- ✅ 开发和生产环境一致
- ✅ 数据持久化和备份
- ✅ 健康检查和自动重启
- ✅ 易于扩展和维护

---

**相关文档**:
- [完整架构](ARCHITECTURE.md)
- [环境变量配置](../README.md#environment-variables)
- [热力图测试](HEATMAP_TESTING_GUIDE.md)

