#!/bin/bash
# Azure 资源一键创建脚本
# 使用方法: ./scripts/azure_setup.sh <resource-group-name> <location>

set -e

RESOURCE_GROUP=${1:-poker-assistant-rg}
LOCATION=${2:-eastus}
DB_NAME=${3:-poker-assistant-db}
APP_NAME=${4:-poker-assistant-api}
PLAN_NAME=${5:-poker-assistant-plan}

echo "🚀 开始创建 Azure 资源..."
echo "资源组: $RESOURCE_GROUP"
echo "区域: $LOCATION"
echo ""

# 检查 Azure CLI 是否安装
if ! command -v az &> /dev/null; then
    echo "❌ 错误: 未安装 Azure CLI"
    echo "请访问: https://docs.microsoft.com/cli/azure/install-azure-cli"
    exit 1
fi

# 检查是否已登录
if ! az account show &> /dev/null; then
    echo "⚠️  未登录 Azure，请先登录..."
    az login
fi

echo "📦 步骤 1/5: 创建资源组..."
az group create --name $RESOURCE_GROUP --location $LOCATION

echo ""
echo "🗄️  步骤 2/5: 创建 PostgreSQL 数据库..."
echo "⚠️  请输入数据库管理员密码（至少 8 字符，包含大小写字母、数字和特殊字符）:"
read -s DB_PASSWORD

az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_NAME \
  --location $LOCATION \
  --admin-user pokeradmin \
  --admin-password "$DB_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 14 \
  --storage-size 32 \
  --public-access 0.0.0.0-255.255.255.255

echo ""
echo "📊 步骤 3/5: 创建数据库..."
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_NAME \
  --database-name poker_assistant

# 获取数据库连接信息
DB_HOST=$(az postgres flexible-server show \
  --resource-group $RESOURCE_GROUP \
  --name $DB_NAME \
  --query fullyQualifiedDomainName -o tsv)

echo ""
echo "🌐 步骤 4/5: 创建 App Service Plan..."
az appservice plan create \
  --name $PLAN_NAME \
  --resource-group $RESOURCE_GROUP \
  --sku B1 \
  --is-linux

echo ""
echo "🚀 步骤 5/5: 创建 Web App..."
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $PLAN_NAME \
  --name $APP_NAME \
  --runtime "PYTHON:3.11"

# 启用 WebSocket
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --web-sockets-enabled true

# 生成 JWT Secret
JWT_SECRET=$(openssl rand -hex 32)

echo ""
echo "⚙️  配置环境变量..."
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --settings \
    DATABASE_URL="postgresql://pokeradmin:${DB_PASSWORD}@${DB_HOST}:5432/poker_assistant" \
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

# 设置启动命令
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --startup-file "startup.sh"

echo ""
echo "✅ Azure 资源创建完成！"
echo ""
echo "📋 资源信息:"
echo "  资源组: $RESOURCE_GROUP"
echo "  数据库主机: $DB_HOST"
echo "  Web App URL: https://${APP_NAME}.azurewebsites.net"
echo ""
echo "🔐 重要信息（请保存）:"
echo "  数据库密码: $DB_PASSWORD"
echo "  JWT Secret: $JWT_SECRET"
echo ""
echo "📝 下一步:"
echo "  1. 部署后端: az webapp up --resource-group $RESOURCE_GROUP --name $APP_NAME"
echo "  2. 配置防火墙规则（允许 App Service 访问数据库）"
echo "  3. 部署前端到 Azure Static Web Apps"
echo "  4. 更新前端环境变量中的 API URL"

