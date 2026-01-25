#!/bin/bash
# Cloudflare 部署自动化脚本

set -e

echo "☁️  Cloudflare 部署设置向导"
echo "=============================="
echo ""

# 检查 cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "❌ 未安装 cloudflared"
    echo ""
    echo "安装方法："
    echo "  macOS:   brew install cloudflared"
    echo "  Linux:   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
    echo "  Windows: 下载 https://github.com/cloudflare/cloudflared/releases"
    echo ""
    read -p "安装完成后按 Enter 继续..."
fi

# 检查是否已登录
if [ ! -f ~/.cloudflared/cert.pem ]; then
    echo "🔐 步骤 1/5: 登录 Cloudflare"
    echo "请在弹出的浏览器中完成登录..."
    cloudflared tunnel login
else
    echo "✅ 已登录 Cloudflare"
fi

# 创建隧道
echo ""
echo "🚇 步骤 2/5: 创建 Cloudflare Tunnel"
read -p "输入隧道名称（默认: poker-assistant-backend）: " TUNNEL_NAME
TUNNEL_NAME=${TUNNEL_NAME:-poker-assistant-backend}

if cloudflared tunnel list | grep -q "$TUNNEL_NAME"; then
    echo "✅ 隧道 $TUNNEL_NAME 已存在"
    TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
else
    echo "创建新隧道..."
    TUNNEL_ID=$(cloudflared tunnel create "$TUNNEL_NAME" | grep -oP 'Created tunnel \K[^ ]+' || echo "")
    if [ -z "$TUNNEL_ID" ]; then
        echo "❌ 创建隧道失败"
        exit 1
    fi
    echo "✅ 隧道创建成功: $TUNNEL_ID"
fi

# 配置域名
echo ""
echo "🌐 步骤 3/5: 配置域名"
read -p "输入你的域名（例如: example.com）: " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo "⚠️  未输入域名，将使用临时域名"
    USE_TEMP_DOMAIN=true
else
    USE_TEMP_DOMAIN=false
    read -p "API 子域名（默认: api）: " API_SUBDOMAIN
    API_SUBDOMAIN=${API_SUBDOMAIN:-api}
    API_HOSTNAME="${API_SUBDOMAIN}.${DOMAIN}"
    
    read -p "WebSocket 子域名（默认: ws）: " WS_SUBDOMAIN
    WS_SUBDOMAIN=${WS_SUBDOMAIN:-ws}
    WS_HOSTNAME="${WS_SUBDOMAIN}.${DOMAIN}"
fi

# 创建配置文件
echo ""
echo "📝 步骤 4/5: 创建配置文件"
CONFIG_DIR="$HOME/.cloudflared"
mkdir -p "$CONFIG_DIR"

CONFIG_FILE="$CONFIG_DIR/config.yml"
cat > "$CONFIG_FILE" << EOF
tunnel: $TUNNEL_ID
credentials-file: $CONFIG_DIR/$TUNNEL_ID.json

ingress:
EOF

if [ "$USE_TEMP_DOMAIN" = false ]; then
    cat >> "$CONFIG_FILE" << EOF
  # 后端 API
  - hostname: $API_HOSTNAME
    service: http://localhost:8000
  # WebSocket
  - hostname: $WS_HOSTNAME
    service: http://localhost:8000
EOF
else
    cat >> "$CONFIG_FILE" << EOF
  # 使用临时域名（所有流量到后端）
  - service: http://localhost:8000
EOF
fi

cat >> "$CONFIG_FILE" << EOF
  # 默认规则（必须放在最后）
  - service: http_status:404
EOF

echo "✅ 配置文件已创建: $CONFIG_FILE"

# 配置 DNS（如果有域名）
if [ "$USE_TEMP_DOMAIN" = false ]; then
    echo ""
    echo "🔗 步骤 5/5: 配置 DNS 记录"
    echo "正在创建 DNS 记录..."
    
    cloudflared tunnel route dns "$TUNNEL_NAME" "$API_HOSTNAME" || echo "⚠️  DNS 记录创建失败，请手动在 Cloudflare Dashboard 中配置"
    cloudflared tunnel route dns "$TUNNEL_NAME" "$WS_HOSTNAME" || echo "⚠️  DNS 记录创建失败，请手动在 Cloudflare Dashboard 中配置"
    
    echo ""
    echo "✅ DNS 记录已配置"
    echo "   API: $API_HOSTNAME"
    echo "   WebSocket: $WS_HOSTNAME"
else
    echo ""
    echo "⚠️  使用临时域名，每次启动 Tunnel 会获得新的 URL"
    echo "   运行 'cloudflared tunnel --config $CONFIG_FILE run' 查看临时 URL"
fi

# 保存环境变量
echo ""
echo "💾 保存配置到 .env 文件..."
if [ ! -f .env ]; then
    cp env_template.txt .env
fi

if [ "$USE_TEMP_DOMAIN" = false ]; then
    # 更新 .env 文件
    if grep -q "CLOUDFLARE_API_URL" .env; then
        sed -i.bak "s|CLOUDFLARE_API_URL=.*|CLOUDFLARE_API_URL=https://$API_HOSTNAME|" .env
        sed -i.bak "s|CLOUDFLARE_WS_URL=.*|CLOUDFLARE_WS_URL=wss://$WS_HOSTNAME|" .env
    else
        echo "" >> .env
        echo "# Cloudflare Tunnel 配置" >> .env
        echo "CLOUDFLARE_API_URL=https://$API_HOSTNAME" >> .env
        echo "CLOUDFLARE_WS_URL=wss://$WS_HOSTNAME" >> .env
    fi
    echo "✅ 已更新 .env 文件"
fi

# 显示下一步
echo ""
echo "=============================================="
echo "✅ Cloudflare Tunnel 配置完成！"
echo ""
echo "📋 下一步操作："
echo ""
echo "1. 启动后端服务："
echo "   docker-compose up -d"
echo ""
echo "2. 启动 Cloudflare Tunnel："
if [ "$USE_TEMP_DOMAIN" = true ]; then
    echo "   cloudflared tunnel --config $CONFIG_FILE run"
    echo "   （查看输出中的临时 URL）"
else
    echo "   cloudflared tunnel --config $CONFIG_FILE run"
    echo "   或作为服务运行："
    echo "   sudo cloudflared service install"
    echo "   sudo systemctl start cloudflared"
fi
echo ""
echo "3. 在 Cloudflare Pages 中配置前端环境变量："
if [ "$USE_TEMP_DOMAIN" = false ]; then
    echo "   VITE_API_BASE_URL=https://$API_HOSTNAME"
    echo "   VITE_WS_URL=wss://$WS_HOSTNAME"
else
    echo "   （使用 Tunnel 启动后显示的临时 URL）"
fi
echo ""
echo "=============================================="

