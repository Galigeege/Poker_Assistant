"""
认证路由
"""
import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from backend.database.session import get_db
from backend.auth import schemas, crud, security
from backend.auth.dependencies import get_current_active_user
from backend.database.models import User
from backend.user_game_manager import user_game_manager

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    """
    用户注册
    
    Returns:
        创建的用户信息（不包含密码）
    """
    try:
        user = crud.create_user(
            db=db,
            username=user_data.username,
            email=user_data.email,
            password=user_data.password
        )
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=schemas.Token)
async def login(
    user_data: schemas.UserLogin,
    db: Session = Depends(get_db)
):
    """
    用户登录
    
    Returns:
        JWT access token
    """
    user = crud.authenticate_user(db, user_data.username, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 创建 access token
    access_token = security.create_access_token(
        data={"sub": user.id, "username": user.username}
    )
    
    # 计算过期时间（秒）
    expires_in = security.JWT_EXPIRATION_HOURS * 3600
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": expires_in
    }


@router.get("/me", response_model=schemas.UserResponse)
async def get_me(
    current_user: User = Depends(get_current_active_user)
):
    """
    获取当前用户信息
    """
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "created_at": current_user.created_at,
        "is_active": current_user.is_active,
        "has_deepseek_api_key": bool(current_user.deepseek_api_key),
    }


@router.get("/me/api-key/status", response_model=schemas.ApiKeyStatusResponse)
async def api_key_status(
    current_user: User = Depends(get_current_active_user)
):
    """
    获取 API Key 配置状态（用于前端提示）
    """
    env_key = os.getenv("DEEPSEEK_API_KEY", "") or ""
    has_default = bool(env_key) and ("your_" not in env_key)
    return {
        "has_default_api_key": has_default,
        "has_user_api_key": bool(current_user.deepseek_api_key),
    }


@router.put("/me/api-key", response_model=schemas.UserResponse)
async def update_api_key(
    payload: schemas.ApiKeyUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    更新当前用户的 Deepseek API Key（账号级别）
    """
    user = crud.set_user_deepseek_api_key(db, current_user.id, payload.deepseek_api_key)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    # 同步更新内存中的 GameManager（避免已连接时仍使用旧 key）
    try:
        gm = user_game_manager.get_game_manager(current_user.id)
        gm.user_api_key = payload.deepseek_api_key
    except Exception as e:
        print(f"[Auth] Failed to update in-memory user_api_key: {e}")
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "created_at": user.created_at,
        "is_active": user.is_active,
        "has_deepseek_api_key": bool(user.deepseek_api_key),
    }


@router.delete("/me/api-key", response_model=schemas.UserResponse)
async def clear_api_key(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    清除当前用户的 Deepseek API Key
    """
    user = crud.clear_user_deepseek_api_key(db, current_user.id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        gm = user_game_manager.get_game_manager(current_user.id)
        gm.user_api_key = None
    except Exception as e:
        print(f"[Auth] Failed to clear in-memory user_api_key: {e}")
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "created_at": user.created_at,
        "is_active": user.is_active,
        "has_deepseek_api_key": bool(user.deepseek_api_key),
    }

