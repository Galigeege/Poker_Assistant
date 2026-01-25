"""
数据库模型定义
"""
from sqlalchemy import Column, String, Integer, Numeric, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from backend.database.session import Base


class User(Base):
    """用户表"""
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # 用户级别的 AI Key（上线前先明文存储；生产建议改为加密存储）
    deepseek_api_key = Column(String(255), nullable=True)
    
    # 关系
    game_sessions = relationship("GameSession", back_populates="user", cascade="all, delete-orphan")
    statistics = relationship("UserStatistics", back_populates="user", uselist=False, cascade="all, delete-orphan")


class GameSession(Base):
    """游戏会话表"""
    __tablename__ = "game_sessions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    total_hands = Column(Integer, default=0, nullable=False)
    total_profit = Column(Numeric(10, 2), default=0, nullable=False)
    win_rate = Column(Numeric(5, 2), nullable=True)
    vpip = Column(Numeric(5, 2), nullable=True)
    config = Column(JSON, nullable=True)  # 游戏配置（盲注、AI难度等）
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    user = relationship("User", back_populates="game_sessions")
    rounds = relationship("GameRound", back_populates="session", cascade="all, delete-orphan")


class GameRound(Base):
    """游戏回合表"""
    __tablename__ = "game_rounds"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    round_number = Column(Integer, nullable=False)
    hero_hole_cards = Column(JSON, nullable=True)  # ["SA", "HK"]
    community_cards = Column(JSON, nullable=True)  # ["DA", "DK", "DQ"]
    street_history = Column(JSON, nullable=True)  # 完整的街道历史
    player_actions = Column(JSON, nullable=True)  # 所有玩家的行动
    winners = Column(JSON, nullable=True)  # 赢家信息
    hand_info = Column(JSON, nullable=True)  # 摊牌信息
    hero_profit = Column(Numeric(10, 2), nullable=True)
    pot_size = Column(Numeric(10, 2), nullable=True)
    review_analysis = Column(JSON, nullable=True)  # AI 复盘分析（可选）
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    session = relationship("GameSession", back_populates="rounds")


class UserStatistics(Base):
    """用户统计数据表"""
    __tablename__ = "user_statistics"
    
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    total_sessions = Column(Integer, default=0, nullable=False)
    total_hands = Column(Integer, default=0, nullable=False)
    total_profit = Column(Numeric(10, 2), default=0, nullable=False)
    win_rate = Column(Numeric(5, 2), default=0, nullable=False)
    vpip = Column(Numeric(5, 2), default=0, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关系
    user = relationship("User", back_populates="statistics")

