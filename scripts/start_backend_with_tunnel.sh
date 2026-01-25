#!/bin/bash
# 启动后端 + Cloudflare Tunnel 脚本

set -e

echo "🚀 启动 Poker Assistant 后端 + Cloudflare Tunnel"
echo "=============================================="

# 检查 cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "❌ 错误: 未安装 cloudflared"
    echo ""
    echo "安装方法："
    echo "  macOS:   brew install cloudflared"
    echo "  Linux:   下载 https://github.com/cloudflare/cloudflared/releases"
    exit 1
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  .env 文件不存在，从模板创建..."
    cp env_template.txt .env
    echo "✅ 已创建 .env 文件"
    echo ""
    echo "⚠️  重要: 请编辑 .env 文件，设置必要的配置"
    read -p "按 Enter 继续（或 Ctrl+C 退出编辑 .env）..."
fi

# 检查数据库
if [ ! -f data/poker_assistant.db ]; then
    echo "📦 初始化数据库..."
    python3 -c "from backend.database.session import init_db; init_db()" || {
        echo "❌ 数据库初始化失败"
        exit 1
    }
    echo "✅ 数据库初始化完成"
fi

# 检查 Tunnel 配置
TUNNEL_CONFIG="$HOME/.cloudflared/config.yml"
if [ ! -f "$TUNNEL_CONFIG" ]; then
    echo "⚠️  Cloudflare Tunnel 配置不存在"
    echo ""
    echo "请先运行设置脚本："
    echo "  ./scripts/cloudflare_setup.sh"
    echo ""
    read -p "是否现在运行设置脚本？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./scripts/cloudflare_setup.sh
    else
        echo "❌ 请先配置 Cloudflare Tunnel"
        exit 1
    fi
fi

# 检查后端是否已运行
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  端口 8000 已被占用"
    echo "请先停止占用端口的进程，或修改后端端口"
    exit 1
fi

# 启动后端（后台运行）
echo ""
echo "🔧 启动后端服务..."
python3 run_server.py &
BACKEND_PID=$!
echo "✅ 后端已启动 (PID: $BACKEND_PID)"

# 等待后端启动
echo "⏳ 等待后端启动..."
sleep 3

# 检查后端健康状态
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ 后端健康检查通过"
else
    echo "❌ 后端健康检查失败"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# 启动 Cloudflare Tunnel
echo ""
echo "☁️  启动 Cloudflare Tunnel..."
echo "=============================================="
echo "Tunnel 启动后，会显示访问 URL"
echo "请复制 URL 并配置到 Cloudflare Pages 环境变量中"
echo "=============================================="
echo ""

# 前台运行 Tunnel（这样可以看到 URL）
cloudflared tunnel --config "$TUNNEL_CONFIG" run

# 清理：如果 Tunnel 退出，停止后端
echo ""
echo "🛑 停止后端服务..."
kill $BACKEND_PID 2>/dev/null || true

