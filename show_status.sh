#!/bin/bash
echo "📊 服务状态检查"
echo "=============="
echo ""
echo "后端服务:"
curl -s http://localhost:8000/health && echo "" || echo "❌ 后端未运行"
echo ""
echo "Cloudflare Tunnel:"
if pgrep -f "cloudflared tunnel" > /dev/null; then
    echo "✅ Tunnel 运行中"
    echo ""
    echo "⚠️  Tunnel URL 在启动时的输出中"
    echo "请查看运行 cloudflared 的终端窗口"
else
    echo "❌ Tunnel 未运行"
fi
