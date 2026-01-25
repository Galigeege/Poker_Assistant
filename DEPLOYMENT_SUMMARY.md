# 📦 Azure 部署文件清单

## ✅ 已创建的配置文件

### 1. 部署文档
- **`AZURE_DEPLOYMENT.md`** - 完整的 Azure 部署方案文档（架构、步骤、配置）
- **`AZURE_QUICK_START.md`** - 快速部署指南（一键部署脚本使用说明）
- **`frontend/ENV_CONFIG.md`** - 前端环境变量配置说明

### 2. 后端配置文件
- **`startup.sh`** - Azure App Service 启动脚本（Gunicorn + Uvicorn）
- **`requirements.txt`** - 已更新，添加 `gunicorn>=21.0.0`
- **`.deployment`** - Azure 部署配置（启用构建）

### 3. 代码更新
- **`backend/main.py`** - 更新 CORS 配置，支持环境变量 `CORS_ORIGINS`
- **`frontend/src/store/useGameStore.ts`** - 更新 WebSocket URL 配置，支持环境变量 `VITE_WS_URL`

### 4. 脚本文件
- **`scripts/azure_setup.sh`** - 一键创建 Azure 资源的自动化脚本
- **`scripts/migrate_to_postgres.sql`** - 数据库迁移参考脚本

---

## 🚀 快速开始

### 第一步：运行自动化脚本创建 Azure 资源

```bash
./scripts/azure_setup.sh
```

脚本会创建：
- 资源组
- PostgreSQL 数据库（免费层）
- App Service Plan（B1 Basic）
- Web App（后端服务）

### 第二步：部署后端

```bash
az webapp up \
  --resource-group poker-assistant-rg \
  --name poker-assistant-api \
  --runtime "PYTHON:3.11" \
  --sku B1
```

### 第三步：配置并部署前端

1. 创建 `frontend/.env.production`：
```env
VITE_API_BASE_URL=https://poker-assistant-api.azurewebsites.net
VITE_WS_URL=wss://poker-assistant-api.azurewebsites.net
```

2. 构建并部署：
```bash
cd frontend
npm run build
swa deploy ./dist --deployment-token <token>
```

---

## 📋 环境变量清单

### 后端（Azure App Service 配置）

在 Azure Portal 或使用 CLI 设置：

```bash
az webapp config appsettings set \
  --resource-group poker-assistant-rg \
  --name poker-assistant-api \
  --settings \
    DATABASE_URL="postgresql://..." \
    JWT_SECRET_KEY="<32字符以上随机字符串>" \
    JWT_ALGORITHM="HS256" \
    JWT_EXPIRATION_HOURS="24" \
    CORS_ORIGINS="https://<前端域名>.azurestaticapps.net" \
    DEEPSEEK_API_KEY="" \
    DEEPSEEK_BASE_URL="https://api.deepseek.com/v1" \
    LLM_PROVIDER="deepseek" \
    GAME_INITIAL_STACK="1000" \
    GAME_SMALL_BLIND="5" \
    GAME_BIG_BLIND="10" \
    GAME_MAX_ROUND="100" \
    GAME_PLAYER_COUNT="6" \
    SCM_DO_BUILD_DURING_DEPLOYMENT="true"
```

### 前端（`.env.production`）

```env
VITE_API_BASE_URL=https://poker-assistant-api.azurewebsites.net
VITE_WS_URL=wss://poker-assistant-api.azurewebsites.net
```

---

## 🔍 验证清单

部署后，请验证：

- [ ] 后端健康检查：`curl https://<api-url>/health`
- [ ] 数据库连接：查看应用日志
- [ ] WebSocket 连接：前端能否连接游戏服务器
- [ ] CORS 配置：前端能否调用 API
- [ ] 用户注册/登录功能
- [ ] 游戏创建和 WebSocket 通信

---

## 📚 参考文档

- **详细部署步骤**：`AZURE_DEPLOYMENT.md`
- **快速开始**：`AZURE_QUICK_START.md`
- **前端环境变量**：`frontend/ENV_CONFIG.md`

---

## 💡 提示

1. **数据库迁移**：如果从本地 SQLite 迁移数据，参考 `scripts/migrate_to_postgres.sql`
2. **自定义域名**：可在 Azure Portal 中配置自定义域名
3. **监控**：建议启用 Application Insights 监控应用性能
4. **备份**：PostgreSQL 免费层不包含自动备份，建议定期手动备份

---

## 🆘 遇到问题？

1. 查看应用日志：`az webapp log tail --resource-group poker-assistant-rg --name poker-assistant-api`
2. 检查健康状态：`curl https://<api-url>/health`
3. 参考 `AZURE_DEPLOYMENT.md` 中的"常见问题"章节

