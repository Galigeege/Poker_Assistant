#!/bin/bash
# Azure App Service 启动脚本

echo "Starting Poker Assistant Backend..."

# 设置 PYTHONPATH（确保可以导入 backend 模块）
export PYTHONPATH="${PYTHONPATH}:/home/site/wwwroot"

# 进入项目目录
cd /home/site/wwwroot

# 初始化数据库（如果表不存在）
echo "Initializing database..."
python3 -c "from backend.database.session import init_db; init_db()" || echo "Database initialization skipped or failed"

# 启动 Gunicorn + Uvicorn
echo "Starting Gunicorn with Uvicorn workers..."
exec gunicorn backend.main:app \
  --workers 2 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --keep-alive 5 \
  --access-logfile - \
  --error-logfile - \
  --log-level info

