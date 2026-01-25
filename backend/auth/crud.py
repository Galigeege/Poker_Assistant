"""
用户相关的数据库操作
"""
from sqlalchemy.orm import Session
from typing import Optional
from backend.database.models import User, UserStatistics
from backend.auth.security import get_password_hash, verify_password
import uuid


def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    """根据 ID 获取用户"""
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """根据用户名获取用户"""
    return db.query(User).filter(User.username == username).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """根据邮箱获取用户"""
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, username: str, email: str, password: str) -> User:
    """
    创建新用户
    
    Returns:
        创建的 User 对象
    """
    # 检查用户名和邮箱是否已存在
    if get_user_by_username(db, username):
        raise ValueError("Username already registered")
    if get_user_by_email(db, email):
        raise ValueError("Email already registered")
    
    # 验证密码长度（bcrypt 限制 72 字节）
    if len(password.encode('utf-8')) > 72:
        raise ValueError("Password too long (maximum 72 bytes)")
    
    # 创建用户
    user = User(
        id=str(uuid.uuid4()),
        username=username,
        email=email,
        password_hash=get_password_hash(password),
        is_active=True
    )
    db.add(user)
    db.flush()  # 获取 user.id
    
    # 创建用户统计数据
    stats = UserStatistics(
        user_id=user.id,
        total_sessions=0,
        total_hands=0,
        total_profit=0,
        win_rate=0,
        vpip=0
    )
    db.add(stats)
    
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """
    验证用户身份
    
    Returns:
        如果验证成功返回 User 对象，否则返回 None
    """
    user = get_user_by_username(db, username)
    if not user:
        return None
    
    if not verify_password(password, user.password_hash):
        return None
    
    # 更新最后登录时间
    from datetime import datetime
    user.last_login = datetime.utcnow()
    db.commit()
    
    return user


def set_user_deepseek_api_key(db: Session, user_id: str, api_key: str) -> Optional[User]:
    """设置用户级别 Deepseek API Key"""
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    user.deepseek_api_key = api_key
    db.commit()
    db.refresh(user)
    return user


def clear_user_deepseek_api_key(db: Session, user_id: str) -> Optional[User]:
    """清除用户级别 Deepseek API Key"""
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    user.deepseek_api_key = None
    db.commit()
    db.refresh(user)
    return user

