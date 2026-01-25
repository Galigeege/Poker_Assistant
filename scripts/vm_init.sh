#!/bin/bash
# Azure VM 初始化脚本
# 安装 Docker、Docker Compose 和必要工具

set -e

echo "🚀 开始初始化 Azure VM..."

# 更新系统
echo "📦 更新系统包..."
sudo apt update
sudo apt upgrade -y

# 安装基础工具
echo "🔧 安装基础工具..."
sudo apt install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    ufw \
    certbot \
    python3-certbot-nginx

# 安装 Docker
echo "🐳 安装 Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    
    # 将当前用户添加到 docker 组（避免每次都用 sudo）
    sudo usermod -aG docker $USER
    
    echo "✅ Docker 安装完成"
else
    echo "✅ Docker 已安装"
fi

# 安装 Docker Compose
echo "🐳 安装 Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    echo "✅ Docker Compose 安装完成"
else
    echo "✅ Docker Compose 已安装"
fi

# 配置防火墙
echo "🔥 配置防火墙..."
sudo ufw --force enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw status

# 配置 Docker 自动启动
echo "⚙️  配置 Docker 自动启动..."
sudo systemctl enable docker
sudo systemctl start docker

# 创建应用目录
echo "📁 创建应用目录..."
mkdir -p ~/poker-assistant
mkdir -p ~/poker-assistant/data
mkdir -p ~/poker-assistant/logs

echo ""
echo "✅ VM 初始化完成！"
echo ""
echo "📝 下一步："
echo "  1. 重新登录以应用 docker 组权限（或运行: newgrp docker）"
echo "  2. 上传项目文件到 ~/poker-assistant"
echo "  3. 配置 .env 文件"
echo "  4. 运行: docker-compose up -d"
echo ""
echo "💡 提示："
echo "  - 查看日志: docker-compose logs -f"
echo "  - 重启服务: docker-compose restart"
echo "  - 停止服务: docker-compose down"

