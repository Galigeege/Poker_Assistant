"""
认证相关的 Pydantic schemas
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """用户基础模型"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr


class UserCreate(UserBase):
    """用户注册模型"""
    password: str = Field(..., min_length=6, max_length=72)  # bcrypt 限制 72 字节


class UserLogin(BaseModel):
    """用户登录模型"""
    username: str
    password: str


class UserResponse(UserBase):
    """用户响应模型"""
    id: str
    created_at: datetime
    is_active: bool
    is_admin: bool = False  # 管理员标识
    has_deepseek_api_key: bool = False
    
    class Config:
        from_attributes = True


class ApiKeyUpdateRequest(BaseModel):
    """更新用户 Deepseek API Key"""
    deepseek_api_key: str = Field(..., min_length=8, max_length=255)


class ApiKeyStatusResponse(BaseModel):
    """用户 API Key 状态"""
    has_default_api_key: bool
    has_user_api_key: bool


class Token(BaseModel):
    """Token 响应模型"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # 秒数


class TokenData(BaseModel):
    """Token 数据模型（用于验证）"""
    user_id: Optional[str] = None
    username: Optional[str] = None

