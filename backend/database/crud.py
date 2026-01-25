"""
数据库 CRUD 操作
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from backend.database.models import User, GameSession, GameRound, UserStatistics


# ==================== User CRUD ====================

def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    """根据 ID 获取用户"""
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """根据用户名获取用户"""
    return db.query(User).filter(User.username == username).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """根据邮箱获取用户"""
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, username: str, email: str, password_hash: str) -> User:
    """创建新用户"""
    user = User(
        username=username,
        email=email,
        password_hash=password_hash
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ==================== GameSession CRUD ====================

def create_game_session(
    db: Session,
    user_id: str,
    config: Optional[dict] = None
) -> GameSession:
    """创建游戏会话"""
    session = GameSession(
        user_id=user_id,
        config=config or {}
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_game_session(db: Session, session_id: str, user_id: str) -> Optional[GameSession]:
    """获取游戏会话（确保属于指定用户）"""
    return db.query(GameSession).filter(
        GameSession.id == session_id,
        GameSession.user_id == user_id
    ).first()


def get_user_game_sessions(
    db: Session,
    user_id: str,
    limit: int = 100,
    offset: int = 0
) -> List[GameSession]:
    """获取用户的所有游戏会话"""
    return db.query(GameSession).filter(
        GameSession.user_id == user_id
    ).order_by(GameSession.started_at.desc()).limit(limit).offset(offset).all()


def update_game_session(
    db: Session,
    session_id: str,
    user_id: str,
    total_hands: Optional[int] = None,
    total_profit: Optional[float] = None,
    win_rate: Optional[float] = None,
    vpip: Optional[float] = None,
    ended_at: Optional[datetime] = None
) -> Optional[GameSession]:
    """更新游戏会话"""
    session = get_game_session(db, session_id, user_id)
    if not session:
        return None
    
    if total_hands is not None:
        session.total_hands = total_hands
    if total_profit is not None:
        session.total_profit = total_profit
    if win_rate is not None:
        session.win_rate = win_rate
    if vpip is not None:
        session.vpip = vpip
    if ended_at is not None:
        session.ended_at = ended_at
    
    db.commit()
    db.refresh(session)
    return session


# ==================== GameRound CRUD ====================

def create_game_round(
    db: Session,
    session_id: str,
    round_number: int,
    hero_hole_cards: Optional[List[str]] = None,
    community_cards: Optional[List[str]] = None,
    street_history: Optional[List[dict]] = None,
    player_actions: Optional[List[dict]] = None,
    winners: Optional[List[dict]] = None,
    hand_info: Optional[List[dict]] = None,
    hero_profit: Optional[float] = None,
    pot_size: Optional[float] = None,
    review_analysis: Optional[dict] = None
) -> GameRound:
    """创建游戏回合"""
    round_record = GameRound(
        session_id=session_id,
        round_number=round_number,
        hero_hole_cards=hero_hole_cards or [],
        community_cards=community_cards or [],
        street_history=street_history or [],
        player_actions=player_actions or [],
        winners=winners or [],
        hand_info=hand_info or [],
        hero_profit=hero_profit,
        pot_size=pot_size,
        review_analysis=review_analysis
    )
    db.add(round_record)
    db.commit()
    db.refresh(round_record)
    return round_record


def get_game_round(db: Session, round_id: str, user_id: str) -> Optional[GameRound]:
    """获取游戏回合（确保属于指定用户的会话）"""
    return db.query(GameRound).join(GameSession).filter(
        GameRound.id == round_id,
        GameSession.user_id == user_id
    ).first()


def get_session_rounds(
    db: Session,
    session_id: str,
    user_id: str
) -> List[GameRound]:
    """获取会话的所有回合"""
    return db.query(GameRound).join(GameSession).filter(
        GameRound.session_id == session_id,
        GameSession.user_id == user_id
    ).order_by(GameRound.round_number).all()


def update_game_round_review(
    db: Session,
    round_id: str,
    user_id: str,
    review_analysis: dict
) -> Optional[GameRound]:
    """更新游戏回合的复盘分析"""
    round_record = get_game_round(db, round_id, user_id)
    if not round_record:
        return None
    
    round_record.review_analysis = review_analysis
    db.commit()
    db.refresh(round_record)
    return round_record


# ==================== UserStatistics CRUD ====================

def get_or_create_user_statistics(db: Session, user_id: str) -> UserStatistics:
    """获取或创建用户统计数据"""
    stats = db.query(UserStatistics).filter(UserStatistics.user_id == user_id).first()
    if not stats:
        stats = UserStatistics(user_id=user_id)
        db.add(stats)
        db.commit()
        db.refresh(stats)
    return stats


def update_user_statistics(
    db: Session,
    user_id: str,
    total_sessions: Optional[int] = None,
    total_hands: Optional[int] = None,
    total_profit: Optional[float] = None,
    win_rate: Optional[float] = None,
    vpip: Optional[float] = None
) -> UserStatistics:
    """更新用户统计数据"""
    stats = get_or_create_user_statistics(db, user_id)
    
    if total_sessions is not None:
        stats.total_sessions = total_sessions
    if total_hands is not None:
        stats.total_hands = total_hands
    if total_profit is not None:
        stats.total_profit = total_profit
    if win_rate is not None:
        stats.win_rate = win_rate
    if vpip is not None:
        stats.vpip = vpip
    
    db.commit()
    db.refresh(stats)
    return stats


def calculate_user_statistics(db: Session, user_id: str) -> dict:
    """计算用户的统计数据（从所有会话和回合）"""
    # 获取所有会话
    sessions = get_user_game_sessions(db, user_id, limit=10000)
    
    total_sessions = len([s for s in sessions if s.ended_at is not None])
    total_hands = sum(s.total_hands for s in sessions)
    total_profit = sum(float(s.total_profit or 0) for s in sessions)
    
    # 计算胜率（获胜的手数 / 总手数）
    total_wins = 0
    for session in sessions:
        rounds = get_session_rounds(db, session.id, user_id)
        for round_record in rounds:
            # 如果 hero_profit > 0，说明这手牌赢了
            if round_record.hero_profit and float(round_record.hero_profit) > 0:
                total_wins += 1
    
    win_rate = (total_wins / total_hands * 100) if total_hands > 0 else 0.0
    
    # 计算 VPIP（入池的手数 / 总手数）
    total_vpip_hands = 0
    for session in sessions:
        rounds = get_session_rounds(db, session.id, user_id)
        for round_record in rounds:
            # 如果玩家在 pre-flop 有 call 或 raise 行动，说明入池了
            if round_record.street_history:
                for street in round_record.street_history:
                    if street.get('street') == 'preflop':
                        actions = street.get('actions', [])
                        hero_actions = [a for a in actions if a.get('player') == '你']
                        if hero_actions:
                            for action in hero_actions:
                                if action.get('action') in ['call', 'raise']:
                                    total_vpip_hands += 1
                                    break
    
    vpip = (total_vpip_hands / total_hands * 100) if total_hands > 0 else 0.0
    
    return {
        'total_sessions': total_sessions,
        'total_hands': total_hands,
        'total_profit': total_profit,
        'win_rate': win_rate,
        'vpip': vpip
    }


