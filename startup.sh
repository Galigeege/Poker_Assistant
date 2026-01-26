#!/bin/bash
# 启动脚本（支持 Docker 和 Azure App Service）

echo "Starting Poker Assistant Backend..."

# 设置 PYTHONPATH
export PYTHONPATH="${PYTHONPATH:-/app}"

# 进入项目目录（Docker 中是 /app，Azure 中是 /home/site/wwwroot）
if [ -d "/app" ]; then
    cd /app
elif [ -d "/home/site/wwwroot" ]; then
    cd /home/site/wwwroot
    export PYTHONPATH="${PYTHONPATH}:/home/site/wwwroot"
fi

# 初始化数据库（如果表不存在）
echo "Initializing database..."
python3 -c "from backend.database.session import init_db; init_db()" 2>&1 || echo "Database initialization skipped or failed"

# 启动 Gunicorn + Uvicorn
echo "Starting Gunicorn with Uvicorn workers..."
# Docker 环境使用 2 workers，Azure App Service 使用 1 worker
WORKERS=${WORKERS:-2}
if [ -d "/home/site/wwwroot" ]; then
    WORKERS=1  # Azure App Service 使用 1 worker
fi

exec gunicorn backend.main:app \
  --workers $WORKERS \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --keep-alive 5 \
  --access-logfile - \
  --error-logfile - \
  --log-level info

