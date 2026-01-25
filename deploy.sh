#!/bin/bash
# Docker Compose 一键部署脚本

set -e

echo "🎰 Poker Assistant - Docker Compose 部署脚本"
echo "=============================================="

# 检查 Docker 和 Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未安装 Docker"
    echo "请访问 https://docs.docker.com/get-docker/ 安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ 错误: 未安装 Docker Compose"
    echo "请访问 https://docs.docker.com/compose/install/ 安装 Docker Compose"
    exit 1
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  .env 文件不存在，从模板创建..."
    cp env_template.txt .env
    echo "✅ 已创建 .env 文件"
    echo ""
    echo "⚠️  重要: 请编辑 .env 文件，设置以下关键配置："
    echo "   - POSTGRES_PASSWORD: 数据库密码（强密码）"
    echo "   - JWT_SECRET_KEY: JWT 密钥（至少 32 字符）"
    echo "   - DEEPSEEK_API_KEY: Deepseek API 密钥（可选）"
    echo ""
    read -p "按 Enter 继续（或 Ctrl+C 退出编辑 .env）..."
fi

# 构建前端
echo ""
echo "📦 步骤 1/4: 构建前端..."
cd frontend
if [ ! -d node_modules ]; then
    echo "安装前端依赖..."
    npm install
fi
echo "构建前端..."
npm run build
cd ..

# 检查前端构建结果
if [ ! -d frontend/dist ]; then
    echo "❌ 前端构建失败"
    exit 1
fi
echo "✅ 前端构建完成"

# 停止旧容器（如果存在）
echo ""
echo "🛑 步骤 2/4: 停止旧容器..."
docker-compose down 2>/dev/null || true

# 构建 Docker 镜像
echo ""
echo "🐳 步骤 3/4: 构建 Docker 镜像..."
docker-compose build

# 启动服务
echo ""
echo "🚀 步骤 4/4: 启动服务..."
docker-compose up -d

# 等待数据库就绪
echo ""
echo "⏳ 等待数据库启动..."
sleep 5

# 初始化数据库
echo ""
echo "📊 初始化数据库..."
docker-compose exec -T backend python3 -c "from backend.database.session import init_db; init_db()" || {
    echo "⚠️  数据库初始化失败，但服务可能仍在运行"
}

# 显示状态
echo ""
echo "=============================================="
echo "✅ 部署完成！"
echo ""
echo "📊 服务状态:"
docker-compose ps
echo ""
echo "🌐 访问地址:"
echo "   前端: http://localhost"
echo "   后端 API: http://localhost/api"
echo "   API 文档: http://localhost/api/docs"
echo "   健康检查: http://localhost/api/health"
echo ""
echo "📝 查看日志:"
echo "   docker-compose logs -f          # 所有服务"
echo "   docker-compose logs -f backend   # 仅后端"
echo "   docker-compose logs -f postgres # 仅数据库"
echo ""
echo "🛑 停止服务:"
echo "   docker-compose down"
echo ""
echo "🔄 重启服务:"
echo "   docker-compose restart"
echo "=============================================="

