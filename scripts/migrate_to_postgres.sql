-- PostgreSQL 数据库迁移脚本
-- 从 SQLite 迁移到 PostgreSQL
-- 注意：此脚本假设表结构已通过 SQLAlchemy 创建，主要用于数据迁移参考

-- 1. 确保数据库已创建
-- CREATE DATABASE poker_assistant;

-- 2. 表结构会通过 SQLAlchemy 的 Base.metadata.create_all() 自动创建
-- 如果需要手动创建，参考 backend/database/models.py

-- 3. 数据迁移步骤（如果从 SQLite 导出数据）：
-- 
-- 步骤 A: 从 SQLite 导出数据
-- sqlite3 data/poker_assistant.db .dump > backup.sql
--
-- 步骤 B: 清理 SQL 文件，只保留 INSERT 语句
-- 步骤 C: 调整 SQL 语法（SQLite -> PostgreSQL）：
--   - 移除 AUTOINCREMENT，使用 SERIAL
--   - 调整日期时间格式
--   - 调整布尔值（SQLite: 0/1, PostgreSQL: false/true）
--
-- 步骤 D: 在 PostgreSQL 中执行
-- psql -h <host> -U <user> -d poker_assistant -f cleaned_backup.sql

-- 4. 验证迁移
-- SELECT COUNT(*) FROM users;
-- SELECT COUNT(*) FROM game_sessions;
-- SELECT COUNT(*) FROM game_rounds;

-- 5. 索引优化（可选）
-- CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id);
-- CREATE INDEX idx_game_sessions_created_at ON game_sessions(created_at);
-- CREATE INDEX idx_game_rounds_session_id ON game_rounds(session_id);

