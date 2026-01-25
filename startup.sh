#!/bin/bash
# Azure App Service 启动脚本

echo "Starting Poker Assistant Backend..."

# 初始化数据库（如果表不存在）
echo "Initializing database..."
python -c "from backend.database.session import init_db; init_db()" || echo "Database initialization skipped or failed"

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

