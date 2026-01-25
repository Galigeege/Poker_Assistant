# 🚀 Azure 部署方案

## 📋 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    Azure 部署架构                        │
└─────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│  Azure Static    │         │  Azure App       │
│  Web Apps        │────────▶│  Service         │
│  (前端)          │  HTTPS  │  (后端 API)      │
│                  │         │                  │
│  - React 静态文件 │         │  - FastAPI       │
│  - 免费托管       │         │  - WebSocket    │
│  - 自动 HTTPS     │         │  - Python 3.11  │
└──────────────────┘         └────────┬─────────┘
                                      │
                                      │ PostgreSQL
                                      ▼
                              ┌──────────────────┐
                              │  Azure Database  │
                              │  for PostgreSQL  │
                              │  (免费层 12个月) │
                              └──────────────────┘
```

---

## 🎯 方案选择

### 方案 A：Azure App Service（推荐，最简单）

**优势：**
- ✅ 自动 HTTPS、自动扩缩容
- ✅ 支持 WebSocket（需配置）
- ✅ 零运维，Azure 全托管
- ✅ 免费层可用（但有限制）

**成本：**
- 免费层：F1（共享 CPU，可能休眠）
- 推荐：B1 Basic（约 $13/月，稳定不休眠）

### 方案 B：Azure VM（最灵活，类似 Oracle）

**优势：**
- ✅ 完全控制，可运行 Docker Compose
- ✅ 免费层：B1s（1 vCPU, 1GB RAM）
- ✅ 稳定不休眠

**成本：**
- 免费层：B1s（12 个月免费）
- 之后：约 $10-15/月

---

## 📦 部署步骤（方案 A：App Service）

### 第一步：准备 Azure 资源

#### 1.1 创建资源组
```bash
az group create --name poker-assistant-rg --location eastus
```

#### 1.2 创建 PostgreSQL 数据库（免费层）
```bash
az postgres flexible-server create \
  --resource-group poker-assistant-rg \
  --name poker-assistant-db \
  --location eastus \
  --admin-user pokeradmin \
  --admin-password <你的强密码> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 14 \
  --storage-size 32 \
  --public-access 0.0.0.0-255.255.255.255

# 创建数据库
az postgres flexible-server db create \
  --resource-group poker-assistant-rg \
  --server-name poker-assistant-db \
  --database-name poker_assistant
```

#### 1.3 创建 App Service Plan（B1 Basic）
```bash
az appservice plan create \
  --name poker-assistant-plan \
  --resource-group poker-assistant-rg \
  --sku B1 \
  --is-linux
```

#### 1.4 创建 Web App（后端）
```bash
az webapp create \
  --resource-group poker-assistant-rg \
  --plan poker-assistant-plan \
  --name poker-assistant-api \
  --runtime "PYTHON:3.11"
```

#### 1.5 配置 WebSocket 支持
```bash
az webapp config set \
  --resource-group poker-assistant-rg \
  --name poker-assistant-api \
  --web-sockets-enabled true
```

#### 1.6 配置环境变量
```bash
# 获取数据库连接字符串
DB_HOST=$(az postgres flexible-server show \
  --resource-group poker-assistant-rg \
  --name poker-assistant-db \
  --query fullyQualifiedDomainName -o tsv)

# 设置环境变量
az webapp config appsettings set \
  --resource-group poker-assistant-rg \
  --name poker-assistant-api \
  --settings \
    DATABASE_URL="postgresql://pokeradmin:<密码>@${DB_HOST}:5432/poker_assistant" \
    JWT_SECRET_KEY="<生成一个32字符以上的随机字符串>" \
    JWT_ALGORITHM="HS256" \
    JWT_EXPIRATION_HOURS="24" \
    CORS_ORIGINS="https://<你的前端域名>.azurestaticapps.net" \
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

#### 1.7 配置启动命令
```bash
az webapp config set \
  --resource-group poker-assistant-rg \
  --name poker-assistant-api \
  --startup-file "startup.sh"
```

---

### 第二步：部署后端

#### 2.1 使用 Azure CLI 部署（推荐）
```bash
# 在项目根目录
az webapp up \
  --resource-group poker-assistant-rg \
  --name poker-assistant-api \
  --runtime "PYTHON:3.11" \
  --sku B1
```

#### 2.2 或使用 Git 部署
```bash
# 添加 Azure 远程仓库
az webapp deployment source config-local-git \
  --resource-group poker-assistant-rg \
  --name poker-assistant-api

# 获取部署 URL
DEPLOY_URL=$(az webapp deployment source show \
  --resource-group poker-assistant-rg \
  --name poker-assistant-api \
  --query url -o tsv)

# 添加 Git 远程仓库并推送
git remote add azure $DEPLOY_URL
git push azure main
```

---

### 第三步：部署前端（Azure Static Web Apps）

#### 3.1 创建 Static Web App
```bash
az staticwebapp create \
  --name poker-assistant-frontend \
  --resource-group poker-assistant-rg \
  --location eastus2 \
  --sku Free
```

#### 3.2 配置构建设置
在 Azure Portal 中配置：
- **App location**: `/frontend`
- **Api location**: (留空)
- **Output location**: `dist`

#### 3.3 部署前端
```bash
# 构建前端
cd frontend
npm install
npm run build

# 使用 Azure Static Web Apps CLI 部署
npm install -g @azure/static-web-apps-cli
swa deploy ./dist \
  --deployment-token <从 Azure Portal 获取的部署令牌> \
  --env production
```

#### 3.4 配置前端 API 地址
在 `frontend/src/services/api.ts` 中更新 API 基础 URL：
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://poker-assistant-api.azurewebsites.net';
const WS_URL = import.meta.env.VITE_WS_URL || 'wss://poker-assistant-api.azurewebsites.net';
```

创建 `.env.production`：
```env
VITE_API_URL=https://poker-assistant-api.azurewebsites.net
VITE_WS_URL=wss://poker-assistant-api.azurewebsites.net
```

---

### 第四步：数据库迁移

#### 4.1 从 SQLite 导出数据（可选）
```bash
# 使用 sqlite3 导出
sqlite3 data/poker_assistant.db .dump > backup.sql
```

#### 4.2 初始化 PostgreSQL 数据库
```bash
# 连接到 Azure PostgreSQL
psql -h <数据库主机名> -U pokeradmin -d poker_assistant

# 运行迁移脚本（见 scripts/migrate_to_postgres.sql）
```

---

## 🔧 配置文件说明

### `startup.sh`（App Service 启动脚本）
```bash
#!/bin/bash
# 初始化数据库
python -c "from backend.database.session import init_db; init_db()"

# 启动应用
gunicorn backend.main:app \
  --workers 2 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
```

### `.deployment`（部署配置）
```
[config]
SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

### `requirements.txt`（已存在，需确认包含 gunicorn）
确保包含：
```
gunicorn>=21.0.0
```

---

## 🔐 安全配置

### 1. 更新 CORS 配置
在 `backend/main.py` 中：
```python
import os
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. 防火墙规则
```bash
# 允许 App Service 访问 PostgreSQL
az postgres flexible-server firewall-rule create \
  --resource-group poker-assistant-rg \
  --name poker-assistant-db \
  --rule-name AllowAppService \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

---

## 📊 监控与日志

### 查看应用日志
```bash
az webapp log tail \
  --resource-group poker-assistant-rg \
  --name poker-assistant-api
```

### 启用 Application Insights（可选）
```bash
az monitor app-insights component create \
  --app poker-assistant-insights \
  --location eastus \
  --resource-group poker-assistant-rg

# 关联到 Web App
az webapp config appsettings set \
  --resource-group poker-assistant-rg \
  --name poker-assistant-api \
  --settings APPINSIGHTS_INSTRUMENTATION_KEY="<从 Insights 获取>"
```

---

## 💰 成本估算

### 方案 A（App Service + PostgreSQL）
- **App Service B1**: ~$13/月（12 个月后）
- **PostgreSQL B1ms**: 免费（12 个月），之后 ~$12/月
- **Static Web Apps**: 免费
- **总计（12 个月内）**: ~$13/月
- **总计（12 个月后）**: ~$25/月

### 方案 B（VM + 自建 PostgreSQL）
- **VM B1s**: 免费（12 个月），之后 ~$10/月
- **总计（12 个月内）**: $0
- **总计（12 个月后）**: ~$10/月

---

## 🚨 常见问题

### Q: WebSocket 连接失败？
A: 确保：
1. `az webapp config set --web-sockets-enabled true`
2. 前端使用 `wss://`（不是 `ws://`）
3. 检查防火墙规则

### Q: 数据库连接失败？
A: 检查：
1. 防火墙规则是否允许 App Service IP
2. 连接字符串格式：`postgresql://user:pass@host:5432/dbname`
3. 数据库是否已创建

### Q: 前端无法调用 API？
A: 检查：
1. CORS 配置是否正确
2. 前端环境变量 `VITE_API_URL` 是否设置
3. 浏览器控制台是否有 CORS 错误

---

## 📝 下一步

1. ✅ 完成上述部署步骤
2. ✅ 测试 WebSocket 连接
3. ✅ 测试数据库读写
4. ✅ 配置自定义域名（可选）
5. ✅ 设置自动备份（PostgreSQL）

---

## 🔗 参考链接

- [Azure App Service 文档](https://docs.microsoft.com/azure/app-service/)
- [Azure Static Web Apps 文档](https://docs.microsoft.com/azure/static-web-apps/)
- [Azure Database for PostgreSQL 文档](https://docs.microsoft.com/azure/postgresql/)

