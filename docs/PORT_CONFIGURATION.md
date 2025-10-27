# OpenStock 端口配置说明

## 概览

OpenStock 使用**非默认端口**来提升安全性并避免端口冲突。

| 服务 | 标准端口 | OpenStock 端口 | 原因 |
|------|---------|---------------|------|
| **Next.js App** | 3000 | **3100** | 避免与本地开发环境冲突 |
| **MongoDB** | 27017 | **27117** | 降低自动扫描攻击风险 |
| **Redis** | 6379 | **6479** | 提升缓存层安全性 |

---

## 端口映射详解

### 主机端口 vs 容器端口

Docker 容器内部仍使用标准端口，但映射到主机的非默认端口：

```
主机（外部访问）          Docker 容器（内部）
localhost:3100    →     openstock-app:3000
localhost:27117   →     mongodb:27017
localhost:6479    →     redis:6379
```

### 为什么这样设计？

1. **容器内部通信**：使用标准端口，无需修改应用代码
2. **外部访问安全**：非默认端口降低自动扫描命中率
3. **开发环境兼容**：避免与本地运行的服务冲突

---

## 使用场景

### 1. 启动 Docker 容器

```bash
docker compose up -d

# 检查端口映射
docker compose ps
# 输出:
# openstock-app     0.0.0.0:3100->3000/tcp
# mongodb           0.0.0.0:27117->27017/tcp
# openstock-redis   0.0.0.0:6479->6379/tcp
```

### 2. 访问应用

```bash
# 浏览器访问
http://localhost:3100

# API 请求
curl http://localhost:3100/api/health
```

### 3. 连接数据库

#### 从主机连接（使用主机端口）

```bash
# MongoDB
mongosh mongodb://root:example@localhost:27117/openstock?authSource=admin

# Redis
redis-cli -p 6479
```

#### 从容器内连接（使用容器端口）

```bash
# 进入应用容器
docker compose exec openstock sh

# 连接 MongoDB（使用服务名 + 标准端口）
mongosh mongodb://root:example@mongodb:27017/openstock?authSource=admin

# 连接 Redis
redis-cli -h redis -p 6379
```

### 4. 环境变量配置

#### Docker 部署（容器内）

```env
# .env 文件
MONGODB_URI=mongodb://root:example@mongodb:27017/openstock?authSource=admin
REDIS_URL=redis://redis:6379
BETTER_AUTH_URL=http://localhost:3100
```

**注意**: 
- MongoDB/Redis 使用服务名（`mongodb`/`redis`）+ 容器端口
- BETTER_AUTH_URL 使用主机端口（3100）

#### 本地开发（主机直连）

```env
# .env.local 文件
MONGODB_URI=mongodb://root:example@localhost:27117/openstock?authSource=admin
REDIS_URL=redis://localhost:6479
BETTER_AUTH_URL=http://localhost:3000  # 本地开发默认 3000
```

---

## 端口冲突排查

### 检查端口占用

```bash
# macOS/Linux
lsof -i :3100
lsof -i :27117
lsof -i :6479

# 或使用 netstat
netstat -tuln | grep -E "3100|27117|6479"

# Windows
netstat -ano | findstr "3100 27117 6479"
```

### 如果端口被占用

#### 方案 1: 停止占用端口的服务

```bash
# 查看进程 PID
lsof -ti :3100

# 终止进程
kill -9 $(lsof -ti :3100)
```

#### 方案 2: 修改为其他端口

编辑 `docker-compose.yml`：

```yaml
services:
  openstock:
    ports:
      - "3200:3000"  # 改为 3200
  
  mongodb:
    ports:
      - "27217:27017"  # 改为 27217
  
  redis:
    ports:
      - "6579:6379"  # 改为 6579
```

同步更新环境变量：

```env
BETTER_AUTH_URL=http://localhost:3200
# MongoDB/Redis 使用新的主机端口（如需主机直连）
```

---

## 安全建议

### 1. 生产环境：限制外部访问

仅允许内网访问数据库端口：

```yaml
# docker-compose.yml
services:
  mongodb:
    ports:
      - "127.0.0.1:27117:27017"  # 仅本地访问
  
  redis:
    ports:
      - "127.0.0.1:6479:6379"    # 仅本地访问
```

### 2. 配置防火墙

```bash
# Ubuntu/Debian
sudo ufw allow 3100/tcp           # 开放应用端口
sudo ufw deny 27117/tcp           # 拒绝 MongoDB 外部访问
sudo ufw deny 6479/tcp            # 拒绝 Redis 外部访问

# 或仅允许特定 IP
sudo ufw allow from 192.168.1.0/24 to any port 27117
```

### 3. 使用反向代理

通过 Nginx/Traefik 代理应用，隐藏真实端口：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3100;
        proxy_set_header Host $host;
    }
}
```

---

## 监控端口状态

### 使用 Docker 命令

```bash
# 查看端口映射
docker compose ps

# 实时监控连接
docker stats

# 查看网络详情
docker network inspect openstock-tv_openstock-network
```

### 使用系统工具

```bash
# 监控端口连接
watch -n 1 'netstat -tuln | grep -E "3100|27117|6479"'

# 查看进程占用
ps aux | grep -E "docker|mongod|redis"
```

---

## 常见问题

### Q1: 为什么不直接使用默认端口？

**A**: 
1. **开发环境冲突**: 本地可能已运行 MongoDB/Redis
2. **安全性**: 默认端口是自动扫描的首要目标
3. **端口管理**: 明确区分容器和主机环境

### Q2: 修改端口后应用连接失败？

**A**: 检查以下配置：

1. **环境变量**: `.env` 文件中的 URI 是否正确
2. **容器内通信**: 使用服务名 + 容器端口（`mongodb:27017`）
3. **主机访问**: 使用 localhost + 主机端口（`localhost:27117`）

```bash
# 测试连接
docker compose exec openstock sh -c 'wget -qO- http://localhost:3000'
curl http://localhost:3100
```

### Q3: 如何恢复默认端口？

**A**: 修改 `docker-compose.yml`：

```yaml
ports:
  - "3000:3000"   # 应用
  - "27017:27017" # MongoDB
  - "6379:6379"   # Redis
```

同步更新环境变量和防火墙规则。

---

## 相关文档

- [Docker 部署指南](DOCKER_GUIDE.md)
- [架构文档](ARCHITECTURE.md)
- [环境变量配置](../README.md#environment-variables)

---

## 快速参考

### 常用端口速查

```bash
# 应用访问
http://localhost:3100

# MongoDB 连接
mongodb://root:example@localhost:27117/openstock?authSource=admin

# Redis 连接
redis://localhost:6479

# 容器内部（应用连接数据库）
mongodb://root:example@mongodb:27017/openstock?authSource=admin
redis://redis:6379
```

### 端口测试

```bash
# 测试应用端口
curl -I http://localhost:3100

# 测试 MongoDB
docker compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# 测试 Redis
docker compose exec redis redis-cli ping
```

---

**更新日期**: 2025-10-27  
**版本**: v1.0

