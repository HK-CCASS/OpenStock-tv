# .env 文件迁移指南

## ⚠️ 重要：需要手动更新您的 .env 文件

由于 Docker 端口配置变更，您需要更新本地 `.env` 文件中的端口相关配置。

---

## 🔍 需要更新的配置项

### 1️⃣ **BETTER_AUTH_URL** (必需更新)

#### Docker 环境
```env
BETTER_AUTH_URL=http://localhost:3100
```

#### 本地开发环境
```env
BETTER_AUTH_URL=http://localhost:3000
```

---

### 2️⃣ **MONGODB_URI** (可选，取决于连接方式)

#### 从主机连接 Docker MongoDB（使用外部工具）
```env
MONGODB_URI=mongodb://root:example@localhost:27117/openstock?authSource=admin
```

#### Docker 容器内连接（应用容器→MongoDB容器）
```env
MONGODB_URI=mongodb://root:example@mongodb:27017/openstock?authSource=admin
```

#### 本地开发（本地 MongoDB）
```env
MONGODB_URI=mongodb://root:example@localhost:27017/openstock?authSource=admin
```

---

### 3️⃣ **REDIS_URL** (可选)

#### 从主机连接 Docker Redis
```env
REDIS_URL=redis://localhost:6479
```

#### Docker 容器内连接
```env
REDIS_URL=redis://redis:6379
```

#### 本地开发（本地 Redis）
```env
REDIS_URL=redis://localhost:6379
```

---

## 📝 快速迁移步骤

### 方案 A：使用 .env.example 作为模板

```bash
# 1. 备份现有 .env
cp .env .env.backup

# 2. 查看 .env.example 的新配置
cat .env.example

# 3. 手动编辑 .env，更新端口配置
nano .env
# 或使用您喜欢的编辑器
```

### 方案 B：使用 sed 批量替换（macOS/Linux）

```bash
# 备份
cp .env .env.backup

# 替换 BETTER_AUTH_URL (Docker 环境)
sed -i '' 's|BETTER_AUTH_URL=http://localhost:3000|BETTER_AUTH_URL=http://localhost:3100|g' .env

# 或者如果使用主机连接 Docker 数据库
sed -i '' 's|localhost:27017|localhost:27117|g' .env
sed -i '' 's|localhost:6379|localhost:6479|g' .env
```

---

## ✅ 验证配置

### 1. 检查必需变量

```bash
# 检查 BETTER_AUTH_URL
grep BETTER_AUTH_URL .env

# 应该看到:
# BETTER_AUTH_URL=http://localhost:3100  (Docker)
# 或
# BETTER_AUTH_URL=http://localhost:3000  (本地开发)
```

### 2. 测试数据库连接

```bash
# 测试 MongoDB
npm run test:db

# 应该看到连接成功信息
```

### 3. 启动应用验证

```bash
# Docker 环境
docker compose down
docker compose up -d --build

# 访问应用
open http://localhost:3100

# 本地开发
npm run dev
open http://localhost:3000
```

---

## 🆘 常见问题

### Q1: 我应该使用哪个配置？

**Docker 环境**（使用 `docker compose up`）:
```env
BETTER_AUTH_URL=http://localhost:3100
MONGODB_URI=mongodb://root:example@mongodb:27017/openstock?authSource=admin
REDIS_URL=redis://redis:6379
```

**本地开发**（使用 `npm run dev`）:
```env
BETTER_AUTH_URL=http://localhost:3000
MONGODB_URI=mongodb://root:example@localhost:27017/openstock?authSource=admin
REDIS_URL=redis://localhost:6379
```

### Q2: 更新后应用无法启动？

1. 检查端口是否被占用：
```bash
lsof -i :3100  # Docker
lsof -i :3000  # 本地
```

2. 检查 .env 文件语法：
```bash
cat .env | grep -v "^#" | grep -v "^$"
```

3. 查看应用日志：
```bash
docker compose logs -f openstock  # Docker
npm run dev  # 本地开发
```

### Q3: 如何回滚到旧配置？

```bash
# 恢复备份
cp .env.backup .env

# 使用旧端口重启
docker compose down
# 编辑 docker-compose.yml 恢复旧端口
docker compose up -d
```

---

## 📚 相关文档

- [.env.example](/.env.example) - 完整环境变量示例
- [端口配置文档](/docs/PORT_CONFIGURATION.md) - 详细端口说明
- [Docker 部署指南](/docs/DOCKER_GUIDE.md) - Docker 使用指南
- [README.md](/README.md) - 项目文档

---

## 🔒 安全提醒

- ⚠️ **永远不要提交 .env 文件到 Git**
- ⚠️ **不要在公共环境暴露 .env 内容**
- ⚠️ **定期更新 BETTER_AUTH_SECRET**
- ⚠️ **生产环境使用强密码**

---

**完成迁移后，删除此文件或您的 .env.backup 文件以保护敏感信息。**

最后更新：2025-10-27

