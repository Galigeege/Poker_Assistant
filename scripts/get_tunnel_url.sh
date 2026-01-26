#!/bin/bash
# 获取当前运行的 Tunnel URL 或创建新的临时 Tunnel

echo "🔍 获取 Cloudflare Tunnel URL"
echo "=============================="
echo ""

# 检查是否有运行中的 cloudflared
if pgrep -f "cloudflared tunnel" > /dev/null; then
    echo "✅ 检测到运行中的 Cloudflare Tunnel"
    echo ""
    echo "由于 Tunnel 在后台运行，URL 在启动时的输出中。"
    echo ""
    echo "方法 1: 查看启动脚本的终端输出（应该显示了 URL）"
    echo "方法 2: 停止当前 Tunnel，重新在前台运行以查看 URL"
    echo ""
    read -p "是否重新启动 Tunnel 以查看 URL？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "停止当前 Tunnel..."
        pkill -f "cloudflared tunnel" || true
        sleep 2
        echo ""
        echo "启动新的临时 Tunnel（会显示 URL）..."
        echo "=============================================="
        cloudflared tunnel --url http://localhost:8000
    fi
else
    echo "❌ 没有运行中的 Tunnel"
    echo ""
    echo "启动新的临时 Tunnel..."
    echo "=============================================="
    cloudflared tunnel --url http://localhost:8000
fi

