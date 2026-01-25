"""
数据库会话管理
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# 获取数据库 URL，默认使用 SQLite
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./data/poker_assistant.db"
)

# 如果是 SQLite，需要特殊配置
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},  # SQLite 需要这个
        echo=False  # 设置为 True 可以看到 SQL 日志
    )
else:
    # PostgreSQL 或其他数据库
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # 连接池健康检查
        echo=False
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    获取数据库会话（依赖注入）
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    初始化数据库（创建所有表）
    """
    # 确保数据目录存在
    if DATABASE_URL.startswith("sqlite"):
        os.makedirs("data", exist_ok=True)
    
    # 创建所有表
    Base.metadata.create_all(bind=engine)
    print(f"[Database] Database initialized at {DATABASE_URL}")


