#!/bin/bash
# 本地测试启动脚本

echo "🎰 启动 Poker Assistant 本地测试环境"
echo "=================================="

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  .env 文件不存在，从模板创建..."
    cp env_template.txt .env
    echo "✅ 已创建 .env 文件，请配置 API Key"
fi

# 检查数据库
if [ ! -f data/poker_assistant.db ]; then
    echo "📦 初始化数据库..."
    python3 -c "from backend.database.session import init_db; init_db()" 2>/dev/null || echo "⚠️  数据库初始化失败，将在首次运行时自动创建"
fi

echo ""
echo "🚀 启动后端服务器..."
echo "后端地址: http://localhost:8000"
echo "API 文档: http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

python3 run_server.py
