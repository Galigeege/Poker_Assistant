#!/bin/bash
# 获取当前运行的 Tunnel URL

# 方法1: 从 cloudflared 进程的 stderr 输出中查找
# 由于 cloudflared 输出到 stderr，我们需要检查进程的输出

# 方法2: 重新启动一个临时 Tunnel 来获取 URL（不推荐，会创建新 URL）

# 方法3: 查看 cloudflared 的日志
LOG_DIR="$HOME/.config/.wrangler/logs"
if [ -d "$LOG_DIR" ]; then
    LATEST_LOG=$(find "$LOG_DIR" -name "*.log" -type f -mmin -10 | sort -r | head -1)
    if [ -n "$LATEST_LOG" ]; then
        echo "从日志文件查找 URL:"
        grep -i "trycloudflare\|https://" "$LATEST_LOG" | tail -5
    fi
fi

echo ""
echo "如果找不到 URL，请查看启动脚本的终端输出"
echo "或者重新运行: cloudflared tunnel --url http://localhost:8000"
