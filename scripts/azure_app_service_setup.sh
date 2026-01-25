#!/bin/bash
# Azure App Service 一键部署脚本
# 使用方法: ./scripts/azure_app_service_setup.sh

set -e

RESOURCE_GROUP=${1:-poker-assistant-app-rg}
LOCATION=${2:-southeastasia}
DB_NAME=${3:-poker-assistant-db}
APP_NAME=${4:-poker-assistant-api}
PLAN_NAME=${5:-poker-assistant-plan}

echo "🚀 开始创建 Azure App Service 资源..."
echo "资源组: $RESOURCE_GROUP"
echo "区域: $LOCATION"
echo ""

# 检查 Azure CLI 是否安装
if ! command -v az &> /dev/null; then
    echo "❌ 错误: 未安装 Azure CLI"
    exit 1
fi

# 检查是否已登录
if ! az account show &> /dev/null; then
    echo "⚠️  未登录 Azure，请先登录..."
    az login
fi

echo "📦 步骤 1/8: 创建资源组..."
az group create --name $RESOURCE_GROUP --location $LOCATION --output none

echo ""
echo "🗄️  步骤 2/8: 检查并注册 PostgreSQL 资源提供程序..."
REGISTRATION_STATE=$(az provider show --namespace Microsoft.DBforPostgreSQL --query "registrationState" -o tsv 2>/dev/null || echo "NotRegistered")

if [ "$REGISTRATION_STATE" != "Registered" ]; then
    echo "⚠️  PostgreSQL 资源提供程序未注册，正在注册..."
    az provider register --namespace Microsoft.DBforPostgreSQL --output none
    echo "⏳ 等待注册完成（通常需要 1-2 分钟）..."
    
    # 等待注册完成
    for i in {1..30}; do
        sleep 5
        REGISTRATION_STATE=$(az provider show --namespace Microsoft.DBforPostgreSQL --query "registrationState" -o tsv 2>/dev/null || echo "NotRegistered")
        if [ "$REGISTRATION_STATE" == "Registered" ]; then
            echo "✅ PostgreSQL 资源提供程序已注册"
            break
        fi
        echo "   等待中... ($i/30)"
    done
    
    if [ "$REGISTRATION_STATE" != "Registered" ]; then
        echo "⚠️  注册可能需要更长时间，继续尝试创建数据库..."
    fi
fi

echo ""
echo "🗄️  步骤 2/8: 创建 PostgreSQL 数据库..."

# 如果环境变量中已有密码，使用它；否则提示输入
if [ -z "$DB_PASSWORD" ]; then
    echo "⚠️  请输入数据库管理员密码（至少 8 字符，包含大小写字母、数字和特殊字符）:"
    read -s DB_PASSWORD
    echo ""
fi

# 验证密码长度
if [ ${#DB_PASSWORD} -lt 8 ]; then
    echo "❌ 错误: 密码长度至少 8 字符"
    exit 1
fi

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
  --public-access 0.0.0.0-255.255.255.255 \
  --output none

echo ""
echo "📊 步骤 3/8: 创建数据库..."
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_NAME \
  --database-name poker_assistant \
  --output none

# 获取数据库连接信息
DB_HOST=$(az postgres flexible-server show \
  --resource-group $RESOURCE_GROUP \
  --name $DB_NAME \
  --query fullyQualifiedDomainName -o tsv)

echo ""
echo "🌐 步骤 4/8: 创建 App Service Plan..."
az appservice plan create \
  --name $PLAN_NAME \
  --resource-group $RESOURCE_GROUP \
  --sku B1 \
  --is-linux \
  --location $LOCATION \
  --output none

echo ""
echo "🚀 步骤 5/8: 创建 Web App..."
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $PLAN_NAME \
  --name $APP_NAME \
  --runtime "PYTHON:3.11" \
  --output none

# 启用 WebSocket
echo ""
echo "⚙️  步骤 6/8: 配置 WebSocket 支持..."
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --web-sockets-enabled true \
  --output none

# 生成 JWT Secret
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")

echo ""
echo "⚙️  步骤 7/8: 配置环境变量..."
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
    SCM_DO_BUILD_DURING_DEPLOYMENT="true" \
  --output none

# 设置启动命令
echo ""
echo "⚙️  步骤 8/8: 配置启动命令..."
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --startup-file "startup.sh" \
  --output none

echo ""
echo "✅ Azure App Service 资源创建完成！"
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
echo "  2. 或使用 Git 部署: 参考 AZURE_DEPLOYMENT.md"
echo "  3. 创建 Static Web App 部署前端"
echo "  4. 更新 CORS_ORIGINS 为前端域名"

