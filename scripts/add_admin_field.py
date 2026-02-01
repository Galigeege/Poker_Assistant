#!/usr/bin/env python3
"""
数据库迁移脚本：添加 is_admin 字段并设置 gali 为管理员
"""
import sys
import os

# 添加项目根目录到 path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from backend.database.session import engine, SessionLocal


def migrate():
    """执行迁移"""
    print("开始迁移：添加 is_admin 字段...")
    
    with engine.connect() as conn:
        # 1. 检查列是否已存在
        result = conn.execute(text("PRAGMA table_info(users)"))
        columns = [row[1] for row in result.fetchall()]
        
        if 'is_admin' not in columns:
            # 2. 添加 is_admin 列
            print("添加 is_admin 列...")
            conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0 NOT NULL"))
            conn.commit()
            print("is_admin 列添加成功")
        else:
            print("is_admin 列已存在，跳过")
        
        # 3. 设置 gali 为管理员
        print("设置 gali 为管理员...")
        result = conn.execute(text("UPDATE users SET is_admin = 1 WHERE username = 'gali'"))
        conn.commit()
        
        if result.rowcount > 0:
            print(f"成功设置 {result.rowcount} 个用户为管理员")
        else:
            print("未找到用户 gali，请确保该用户已注册")
        
        # 4. 验证
        result = conn.execute(text("SELECT username, is_admin FROM users WHERE is_admin = 1"))
        admins = result.fetchall()
        print(f"\n当前管理员列表: {[row[0] for row in admins]}")
    
    print("\n迁移完成!")


if __name__ == "__main__":
    migrate()
