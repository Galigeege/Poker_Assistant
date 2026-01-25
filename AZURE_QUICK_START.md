# 🚀 Azure 快速部署指南

## 前置要求

1. ✅ Azure 账号（已注册）
2. ✅ Azure CLI 已安装：`az --version`
3. ✅ 已登录 Azure：`az login`

---

## 一键部署（推荐）

### 步骤 1: 运行自动化脚本

```bash
cd /Users/mac/Codinnnnng/Poker_Assistant
./scripts/azure_setup.sh
```

脚本会提示你输入：
- 资源组名称（默认：`poker-assistant-rg`）
- 区域（默认：`eastus`）
- 数据库管理员密码

### 步骤 2: 部署后端

```bash
# 方法 A: 使用 Azure CLI（推荐）
az webapp up \
  --resource-group poker-assistant-rg \
  --name poker-assistant-api \
  --runtime "PYTHON:3.11" \
  --sku B1

# 方法 B: 使用 Git 部署
az webapp deployment source config-local-git \
  --resource-group poker-assistant-rg \
  --name poker-assistant-api

DEPLOY_URL=$(az webapp deployment source show \
  --resource-group poker-assistant-rg \
  --name poker-assistant-api \
  --query url -o tsv)

git remote add azure $DEPLOY_URL
git push azure main
```

### 步骤 3: 配置前端环境变量

在 `frontend` 目录创建 `.env.production`：

```env
VITE_API_BASE_URL=https://poker-assistant-api.azurewebsites.net
VITE_WS_URL=wss://poker-assistant-api.azurewebsites.net
```

### 步骤 4: 构建并部署前端

```bash
cd frontend
npm install
npm run build

# 使用 Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# 创建 Static Web App（如果还没创建）
az staticwebapp create \
  --name poker-assistant-frontend \
  --resource-group poker-assistant-rg \
  --location eastus2 \
  --sku Free

# 获取部署令牌（从 Azure Portal 获取）
swa deploy ./dist \
  --deployment-token <你的部署令牌> \
  --env production
```

### 步骤 5: 更新 CORS 配置

获取前端域名后，更新后端 CORS 设置：

```bash
az webapp config appsettings set \
  --resource-group poker-assistant-rg \
  --name poker-assistant-api \
  --settings CORS_ORIGINS="https://<你的前端域名>.azurestaticapps.net"
```

---

## 手动部署（详细步骤）

参考 `AZURE_DEPLOYMENT.md` 获取完整的手动部署步骤。

---

## 验证部署

### 1. 检查后端健康状态

```bash
curl https://poker-assistant-api.azurewebsites.net/health
```

应该返回：
```json
{"status":"ok","version":"2.0.0"}
```

### 2. 检查数据库连接

查看应用日志：
```bash
az webapp log tail \
  --resource-group poker-assistant-rg \
  --name poker-assistant-api
```

### 3. 测试前端

访问前端 URL，尝试：
- 注册/登录
- 创建游戏会话
- 连接 WebSocket

---

## 常见问题

### Q: 部署后 502 Bad Gateway？
A: 检查：
1. 启动脚本 `startup.sh` 是否可执行
2. `requirements.txt` 是否包含 `gunicorn`
3. 应用日志：`az webapp log tail`

### Q: WebSocket 连接失败？
A: 确保：
1. WebSocket 已启用：`az webapp config set --web-sockets-enabled true`
2. 前端使用 `wss://`（不是 `ws://`）
3. 检查浏览器控制台错误

### Q: 数据库连接失败？
A: 检查：
1. 防火墙规则（允许 App Service 访问）
2. 连接字符串格式
3. 数据库是否已创建

---

## 下一步

1. ✅ 配置自定义域名（可选）
2. ✅ 设置自动备份（PostgreSQL）
3. ✅ 配置 Application Insights（监控）
4. ✅ 设置 CI/CD（自动部署）

---

## 成本提醒

- **12 个月内**：约 $13/月（App Service B1）
- **12 个月后**：约 $25/月（App Service + PostgreSQL）

建议在 12 个月免费期结束前考虑：
- 迁移到 Azure VM（更便宜）
- 或升级到付费计划

