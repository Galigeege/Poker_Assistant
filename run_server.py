#!/usr/bin/env python3
"""
启动服务器脚本
从项目根目录运行，确保正确的 Python 路径
"""
import sys
import os

# 确保项目根目录在 Python 路径中
project_root = os.path.dirname(os.path.abspath(__file__))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

import uvicorn

if __name__ == "__main__":
    # 开发模式启动
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)


