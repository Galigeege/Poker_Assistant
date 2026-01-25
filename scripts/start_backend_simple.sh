#!/bin/bash
# 简化版：启动后端 + 临时 Cloudflare Tunnel（无需登录）

set -e

echo "🚀 启动 Poker Assistant 后端（临时 Tunnel）"
echo "=============================================="

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  .env 文件不存在，从模板创建..."
    cp env_template.txt .env
    echo "✅ 已创建 .env 文件"
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

# 检查端口
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  端口 8000 已被占用"
    echo "请先停止占用端口的进程"
    exit 1
fi

# 启动后端（后台运行）
echo ""
echo "🔧 启动后端服务..."
cd /Users/mac/Codinnnnng/Poker_Assistant
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

# 启动临时 Cloudflare Tunnel
echo ""
echo "☁️  启动 Cloudflare Tunnel（临时域名）..."
echo "=============================================="
echo "⚠️  重要提示："
echo "1. 临时 URL 每次启动都会变化"
echo "2. 复制下面显示的 URL"
echo "3. 在 Cloudflare Pages 环境变量中配置："
echo "   VITE_API_BASE_URL=https://显示的URL"
echo "   VITE_WS_URL=wss://显示的URL"
echo "=============================================="
echo ""

# 前台运行 Tunnel（这样可以看到 URL）
cloudflared tunnel --url http://localhost:8000

# 清理：如果 Tunnel 退出，停止后端
echo ""
echo "🛑 停止后端服务..."
kill $BACKEND_PID 2>/dev/null || true

