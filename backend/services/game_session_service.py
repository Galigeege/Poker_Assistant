"""
游戏会话服务
处理游戏会话和回合的数据持久化
"""
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
from datetime import datetime

from backend.database import crud
from backend.database.models import GameSession, GameRound


class GameSessionService:
    """游戏会话服务"""
    
    def __init__(self, db: Session, user_id: str):
        self.db = db
        self.user_id = user_id
        self.current_session: Optional[GameSession] = None
    
    def start_session(self, config: Optional[Dict[str, Any]] = None) -> GameSession:
        """开始新的游戏会话"""
        self.current_session = crud.create_game_session(
            self.db,
            self.user_id,
            config
        )
        return self.current_session
    
    def get_or_create_session(self, session_id: Optional[str] = None) -> GameSession:
        """获取或创建游戏会话"""
        if session_id:
            session = crud.get_game_session(self.db, session_id, self.user_id)
            if session:
                self.current_session = session
                return session
        
        # 如果没有指定 session_id 或找不到，创建新会话
        return self.start_session()
    
    def save_round(
        self,
        round_number: int,
        round_data: Dict[str, Any]
    ) -> GameRound:
        """保存游戏回合
        
        Args:
            round_number: 回合编号
            round_data: 回合数据，包含：
                - hero_hole_cards: List[str]
                - community_cards: List[str]
                - street_history: List[dict]
                - player_actions: List[dict]
                - winners: List[dict]
                - hand_info: List[dict]
                - hero_profit: float
                - pot_size: float
        """
        if not self.current_session:
            raise ValueError("No active session. Call start_session() first.")
        
        round_record = crud.create_game_round(
            self.db,
            self.current_session.id,
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
        self._update_session_stats()
        
        return round_record
    
    def update_round_review(self, round_id: str, review_analysis: Dict[str, Any]) -> Optional[GameRound]:
        """更新回合的复盘分析"""
        return crud.update_game_round_review(
            self.db,
            round_id,
            self.user_id,
            review_analysis
        )
    
    def end_session(self) -> Optional[GameSession]:
        """结束当前会话"""
        if not self.current_session:
            return None
        
        # 更新会话统计
        self._update_session_stats()
        
        # 设置结束时间
        session = crud.update_game_session(
            self.db,
            self.current_session.id,
            self.user_id,
            ended_at=datetime.utcnow()
        )
        
        # 更新用户统计
        self._update_user_statistics()
        
        self.current_session = None
        return session
    
    def _update_session_stats(self):
        """更新会话统计数据"""
        if not self.current_session:
            return
        
        rounds = crud.get_session_rounds(
            self.db,
            self.current_session.id,
            self.user_id
        )
        
        total_hands = len(rounds)
        total_profit = sum(float(r.hero_profit or 0) for r in rounds)
        
        # 计算胜率
        wins = sum(1 for r in rounds if r.hero_profit and float(r.hero_profit) > 0)
        win_rate = (wins / total_hands * 100) if total_hands > 0 else None
        
        # 计算 VPIP
        vpip_hands = 0
        for round_record in rounds:
            if round_record.street_history:
                for street in round_record.street_history:
                    if street.get('street') == 'preflop':
                        actions = street.get('actions', [])
                        hero_actions = [a for a in actions if a.get('player') == '你']
                        if hero_actions:
                            for action in hero_actions:
                                if action.get('action') in ['call', 'raise']:
                                    vpip_hands += 1
                                    break
        
        vpip = (vpip_hands / total_hands * 100) if total_hands > 0 else None
        
        crud.update_game_session(
            self.db,
            self.current_session.id,
            self.user_id,
            total_hands=total_hands,
            total_profit=total_profit,
            win_rate=win_rate,
            vpip=vpip
        )
    
    def _update_user_statistics(self):
        """更新用户统计数据"""
        stats = crud.calculate_user_statistics(self.db, self.user_id)
        crud.update_user_statistics(
            self.db,
            self.user_id,
            **stats
        )
    
    def get_session_rounds(self, session_id: str) -> List[GameRound]:
        """获取会话的所有回合"""
        return crud.get_session_rounds(
            self.db,
            session_id,
            self.user_id
        )


