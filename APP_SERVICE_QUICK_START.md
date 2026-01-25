# 🚀 Azure App Service 快速部署指南

## ✅ 当前进度

- ✅ 资源组已创建：`poker-assistant-app-rg` (southeastasia)
- ✅ App Service Plan 已创建：`poker-assistant-plan` (B1 Basic)
- ✅ Web App 已创建：`poker-assistant-api`

## 📝 下一步操作

### 步骤 1: 创建 PostgreSQL 数据库

**需要你手动输入数据库密码**，运行：

```bash
# 方法 A: 使用自动化脚本（推荐）
./scripts/azure_app_service_setup.sh

# 方法 B: 手动创建（需要输入密码）
az postgres flexible-server create \
  --resource-group poker-assistant-app-rg \
  --name poker-assistant-db \
  --location southeastasia \
  --admin-user pokeradmin \
  --admin-password <你的强密码> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 14 \
  --storage-size 32 \
  --public-access 0.0.0.0-255.255.255.255

# 创建数据库
az postgres flexible-server db create \
  --resource-group poker-assistant-app-rg \
  --server-name poker-assistant-db \
  --database-name poker_assistant
```

### 步骤 2: 配置环境变量

创建数据库后，运行以下命令配置环境变量：

```bash
# 获取数据库主机名
DB_HOST=$(az postgres flexible-server show \
  --resource-group poker-assistant-app-rg \
  --name poker-assistant-db \
  --query fullyQualifiedDomainName -o tsv)

# 生成 JWT Secret
JWT_SECRET=$(openssl rand -hex 32)

# 配置环境变量（替换 <密码> 为你的数据库密码）
az webapp config appsettings set \
  --resource-group poker-assistant-app-rg \
  --name poker-assistant-api \
  --settings \
    DATABASE_URL="postgresql://pokeradmin:<密码>@${DB_HOST}:5432/poker_assistant" \
    JWT_SECRET_KEY="$JWT_SECRET" \
    JWT_ALGORITHM="HS256" \
    JWT_EXPIRATION_HOURS="24" \
    CORS_ORIGINS="*" \
    DEEPSEEK_API_KEY="" \
    DEEPSEEK_BASE_URL="https://api.deepseek.com/v1" \
    LLM_PROVIDER="deepseek" \
    GAME_INITIAL_STACK="1000" \
    GAME_SMALL_BLIND="5" \
    GAME_BIG_BLIND="10" \
    GAME_MAX_ROUND="100" \
    GAME_PLAYER_COUNT="6" \
    SCM_DO_BUILD_DURING_DEPLOYMENT="true"

# 配置启动命令
az webapp config set \
  --resource-group poker-assistant-app-rg \
  --name poker-assistant-api \
  --startup-file "startup.sh"
```

### 步骤 3: 部署后端代码

```bash
# 方法 A: 使用 Azure CLI（推荐）
az webapp up \
  --resource-group poker-assistant-app-rg \
  --name poker-assistant-api \
  --runtime "PYTHON:3.11" \
  --sku B1

# 方法 B: 使用 Git 部署
az webapp deployment source config-local-git \
  --resource-group poker-assistant-app-rg \
  --name poker-assistant-api

DEPLOY_URL=$(az webapp deployment source show \
  --resource-group poker-assistant-app-rg \
  --name poker-assistant-api \
  --query url -o tsv)

git remote add azure-app $DEPLOY_URL
git push azure-app dev-web-backend:main
```

### 步骤 4: 初始化数据库

部署后，初始化数据库：

```bash
# 通过 Azure Portal 的 SSH 控制台执行
# 或使用 Azure CLI 执行命令
az webapp ssh --resource-group poker-assistant-app-rg --name poker-assistant-api
# 然后在 SSH 中执行：
# python -c "from backend.database.session import init_db; init_db()"
```

### 步骤 5: 创建 Static Web App（前端）

```bash
# 创建 Static Web App
az staticwebapp create \
  --name poker-assistant-frontend \
  --resource-group poker-assistant-app-rg \
  --location southeastasia \
  --sku Free
```

### 步骤 6: 部署前端

```bash
# 构建前端
cd frontend
npm install
npm run build

# 获取部署令牌（从 Azure Portal）
# 然后使用 SWA CLI 部署
npm install -g @azure/static-web-apps-cli
swa deploy ./dist --deployment-token <从 Azure Portal 获取>
```

### 步骤 7: 更新 CORS 配置

获取前端域名后，更新 CORS：

```bash
az webapp config appsettings set \
  --resource-group poker-assistant-app-rg \
  --name poker-assistant-api \
  --settings CORS_ORIGINS="https://<前端域名>.azurestaticapps.net"
```

## 🔍 验证部署

```bash
# 检查健康状态
curl https://poker-assistant-api.azurewebsites.net/health

# 查看日志
az webapp log tail \
  --resource-group poker-assistant-app-rg \
  --name poker-assistant-api
```

## 📋 资源信息

- **资源组**: `poker-assistant-app-rg`
- **区域**: `southeastasia` (新加坡)
- **App Service Plan**: `poker-assistant-plan` (B1 Basic)
- **Web App**: `poker-assistant-api`
- **URL**: `https://poker-assistant-api.azurewebsites.net`

## 💰 成本

- **12 个月内**: 约 $13/月（App Service B1）
- **12 个月后**: 约 $25/月（App Service + PostgreSQL）

## 🆘 遇到问题？

1. 查看应用日志：`az webapp log tail --resource-group poker-assistant-app-rg --name poker-assistant-api`
2. 检查健康状态：`curl https://poker-assistant-api.azurewebsites.net/health`
3. 参考详细文档：`AZURE_DEPLOYMENT.md`

