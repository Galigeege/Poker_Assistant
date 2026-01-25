"""
游戏数据 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime

from backend.auth.dependencies import get_current_user
from backend.database.session import get_db
from backend.database.models import User, GameSession, GameRound
from backend.database import crud
from backend.services.game_session_service import GameSessionService
from backend.auth import crud as auth_crud
from backend.user_game_manager import user_game_manager

router = APIRouter(prefix="/api/game", tags=["game"])


@router.post("/sessions")
async def create_session(
    config: Optional[Dict[str, Any]] = Body(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建新的游戏会话"""
    config = config or {}

    # 如果前端传了 deepseek_api_key：保存到用户账号（全局生效），并避免落到 session config
    deepseek_api_key = config.pop("deepseek_api_key", None)
    if deepseek_api_key:
        auth_crud.set_user_deepseek_api_key(db, current_user.id, deepseek_api_key)
        # 同步更新内存中的 GameManager（避免已连接时新局仍用旧 key）
        try:
            gm = user_game_manager.get_game_manager(current_user.id)
            gm.user_api_key = deepseek_api_key
        except Exception as e:
            print(f"[GameRouter] Failed to update in-memory user_api_key: {e}")

    session = crud.create_game_session(db, current_user.id, config)
    
    return {
        "id": session.id,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "total_hands": session.total_hands,
        "total_profit": float(session.total_profit or 0),
        "win_rate": float(session.win_rate or 0) if session.win_rate else None,
        "vpip": float(session.vpip or 0) if session.vpip else None,
        "config": session.config
    }


@router.post("/sessions/{session_id}/rounds")
async def create_round(
    session_id: str,
    round_data: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建游戏回合"""
    # 验证会话属于当前用户
    session = crud.get_game_session(db, session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # 获取当前回合数
    existing_rounds = crud.get_session_rounds(db, session_id, current_user.id)
    round_number = len(existing_rounds) + 1
    
    # 创建回合
    round_record = crud.create_game_round(
        db,
        session_id,
        round_number,
        hero_hole_cards=round_data.get('hero_hole_cards'),
        community_cards=round_data.get('community_cards'),
        street_history=round_data.get('street_history'),
        player_actions=round_data.get('player_actions'),
        winners=round_data.get('winners'),
        hand_info=round_data.get('hand_info'),
        hero_profit=round_data.get('hero_profit'),
        pot_size=round_data.get('pot_size'),
        review_analysis=round_data.get('review_analysis')
    )
    
    # 更新会话统计
    service = GameSessionService(db, current_user.id)
    service.current_session = session
    service._update_session_stats()
    
    return {
        "id": round_record.id,
        "round_number": round_record.round_number,
        "hero_hole_cards": round_record.hero_hole_cards,
        "community_cards": round_record.community_cards,
        "street_history": round_record.street_history,
        "player_actions": round_record.player_actions,
        "winners": round_record.winners,
        "hand_info": round_record.hand_info,
        "hero_profit": float(round_record.hero_profit or 0),
        "pot_size": float(round_record.pot_size or 0),
        "review_analysis": round_record.review_analysis,
        "created_at": round_record.created_at.isoformat() if round_record.created_at else None
    }


@router.get("/sessions")
async def get_sessions(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取当前用户的所有游戏会话"""
    sessions = crud.get_user_game_sessions(db, current_user.id, limit=limit, offset=skip)
    
    return {
        "sessions": [
            {
                "id": session.id,
                "started_at": session.started_at.isoformat() if session.started_at else None,
                "ended_at": session.ended_at.isoformat() if session.ended_at else None,
                "total_hands": session.total_hands,
                "total_profit": float(session.total_profit or 0),
                "win_rate": float(session.win_rate or 0),
                "vpip": float(session.vpip or 0),
                "config": session.config
            }
            for session in sessions
        ]
    }


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取游戏会话详情"""
    session = crud.get_game_session(db, session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    rounds = crud.get_session_rounds(db, session_id, current_user.id)
    
    return {
        "id": session.id,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "total_hands": session.total_hands,
        "total_profit": float(session.total_profit or 0),
        "win_rate": float(session.win_rate or 0),
        "vpip": float(session.vpip or 0),
        "config": session.config,
        "rounds": [
            {
                "id": round_record.id,
                "round_number": round_record.round_number,
                "hero_hole_cards": round_record.hero_hole_cards,
                "community_cards": round_record.community_cards,
                "street_history": round_record.street_history,
                "player_actions": round_record.player_actions,
                "winners": round_record.winners,
                "hand_info": round_record.hand_info,
                "hero_profit": float(round_record.hero_profit or 0),
                "pot_size": float(round_record.pot_size or 0),
                "review_analysis": round_record.review_analysis,
                "created_at": round_record.created_at.isoformat() if round_record.created_at else None
            }
            for round_record in rounds
        ]
    }


@router.get("/sessions/{session_id}/rounds/{round_id}")
async def get_round(
    session_id: str,
    round_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取游戏回合详情"""
    round_record = crud.get_game_round(db, round_id, current_user.id)
    if not round_record:
        raise HTTPException(status_code=404, detail="Round not found")
    
    # 验证回合属于指定会话
    if round_record.session_id != session_id:
        raise HTTPException(status_code=400, detail="Round does not belong to this session")
    
    return {
        "id": round_record.id,
        "round_number": round_record.round_number,
        "hero_hole_cards": round_record.hero_hole_cards,
        "community_cards": round_record.community_cards,
        "street_history": round_record.street_history,
        "player_actions": round_record.player_actions,
        "winners": round_record.winners,
        "hand_info": round_record.hand_info,
        "hero_profit": float(round_record.hero_profit or 0),
        "pot_size": float(round_record.pot_size or 0),
        "review_analysis": round_record.review_analysis,
        "created_at": round_record.created_at.isoformat() if round_record.created_at else None
    }


@router.get("/statistics")
async def get_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取用户统计数据"""
    stats = crud.get_or_create_user_statistics(db, current_user.id)
    
    return {
        "total_sessions": stats.total_sessions,
        "total_hands": stats.total_hands,
        "total_profit": float(stats.total_profit or 0),
        "win_rate": float(stats.win_rate or 0),
        "vpip": float(stats.vpip or 0)
    }


@router.post("/sessions/{session_id}/rounds/{round_id}/review")
async def save_round_review(
    session_id: str,
    round_id: str,
    review_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """保存回合的复盘分析"""
    round_record = crud.update_game_round_review(
        db,
        round_id,
        current_user.id,
        review_data
    )
    
    if not round_record:
        raise HTTPException(status_code=404, detail="Round not found")
    
    return {
        "id": round_record.id,
        "review_analysis": round_record.review_analysis
    }

