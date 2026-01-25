#!/usr/bin/env python3
"""
数据库初始化脚本
用于创建数据库表和初始数据
"""
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database.session import init_db, engine, Base
from backend.database.models import User, GameSession, GameRound, UserStatistics

def main():
    """初始化数据库"""
    print("=" * 50)
    print("初始化数据库...")
    print("=" * 50)
    
    # 创建所有表
    init_db()
    
    print("\n✅ 数据库初始化完成！")
    print(f"数据库位置: {engine.url}")
    print("\n已创建的表:")
    print("  - users (用户表)")
    print("  - game_sessions (游戏会话表)")
    print("  - game_rounds (游戏回合表)")
    print("  - user_statistics (用户统计表)")

if __name__ == "__main__":
    main()


