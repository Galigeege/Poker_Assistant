#!/bin/bash
# Azure VM 一键创建脚本
# 使用方法: ./scripts/azure_vm_setup.sh <resource-group-name> <location>

set -e

RESOURCE_GROUP=${1:-poker-assistant-rg}
LOCATION=${2:-eastus}
VM_NAME=${3:-poker-assistant-vm}
VM_SIZE=${4:-Standard_B1s}  # 免费层：B1s

echo "🚀 开始创建 Azure VM..."
echo "资源组: $RESOURCE_GROUP"
echo "区域: $LOCATION"
echo "VM 名称: $VM_NAME"
echo "VM 规格: $VM_SIZE"
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

echo "📦 步骤 1/7: 创建资源组..."
az group create --name $RESOURCE_GROUP --location $LOCATION

echo ""
echo "🌐 步骤 2/7: 创建虚拟网络..."
az network vnet create \
  --resource-group $RESOURCE_GROUP \
  --name poker-assistant-vnet \
  --address-prefix 10.0.0.0/16 \
  --subnet-name default \
  --subnet-prefix 10.0.1.0/24

echo ""
echo "🔒 步骤 3/7: 创建网络安全组..."
az network nsg create \
  --resource-group $RESOURCE_GROUP \
  --name poker-assistant-nsg

# 开放 SSH (22)
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name poker-assistant-nsg \
  --name AllowSSH \
  --priority 1000 \
  --protocol Tcp \
  --destination-port-ranges 22 \
  --access Allow \
  --output none

# 开放 HTTP (80)
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name poker-assistant-nsg \
  --name AllowHTTP \
  --priority 1001 \
  --protocol Tcp \
  --destination-port-ranges 80 \
  --access Allow \
  --output none

# 开放 HTTPS (443)
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name poker-assistant-nsg \
  --name AllowHTTPS \
  --priority 1002 \
  --protocol Tcp \
  --destination-port-ranges 443 \
  --access Allow \
  --output none

echo ""
echo "🌍 步骤 4/7: 创建公共 IP..."
az network public-ip create \
  --resource-group $RESOURCE_GROUP \
  --name poker-assistant-ip \
  --allocation-method Static \
  --sku Basic \
  --output none

echo ""
echo "🖥️  步骤 5/7: 创建 VM..."
az vm create \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --image Ubuntu2204 \
  --size $VM_SIZE \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-address poker-assistant-ip \
  --vnet-name poker-assistant-vnet \
  --subnet default \
  --nsg poker-assistant-nsg \
  --storage-sku Standard_LRS \
  --output none

echo ""
echo "📊 步骤 6/7: 获取 VM 信息..."
VM_IP=$(az vm show -d \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --query publicIps -o tsv)

echo ""
echo "✅ Azure VM 创建完成！"
echo ""
echo "📋 资源信息:"
echo "  资源组: $RESOURCE_GROUP"
echo "  VM 名称: $VM_NAME"
echo "  VM IP: $VM_IP"
echo "  SSH 命令: ssh azureuser@$VM_IP"
echo ""
echo "📝 下一步:"
echo "  1. 连接到 VM: ssh azureuser@$VM_IP"
echo "  2. 运行初始化脚本:"
echo "     curl -fsSL https://raw.githubusercontent.com/your-repo/poker-assistant/main/scripts/vm_init.sh | bash"
echo "  3. 或者手动执行:"
echo "     - 安装 Docker: curl -fsSL https://get.docker.com | sh"
echo "     - 安装 Docker Compose: 参考 Docker 官方文档"
echo "  4. 上传项目文件并配置 .env"
echo "  5. 运行: docker-compose up -d"
echo ""
echo "💡 提示:"
echo "  - 免费层 B1s: 1 vCPU, 1GB RAM（12 个月免费）"
echo "  - 建议配置域名并设置 HTTPS"
echo "  - 定期备份数据库"

