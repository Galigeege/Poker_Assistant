"""
用户游戏管理器
为每个用户管理独立的游戏实例
"""
from typing import Dict, Optional
from backend.game_manager import GameManager
from backend.auth.security import verify_token
from backend.database.session import get_db
from backend.database.models import User
from backend.auth.crud import get_user_by_id


class UserGameManager:
    """
    管理每个用户的游戏实例
    """
    
    def __init__(self):
        # 存储每个用户的 GameManager 实例
        # key: user_id, value: GameManager
        self.user_games: Dict[str, GameManager] = {}
    
    def get_user_from_token(self, token: str) -> Optional[User]:
        """从 token 中获取用户"""
        try:
            payload = verify_token(token)
            if payload is None:
                return None
            
            user_id: str = payload.get("sub")
            if user_id is None:
                return None
            
            # 获取数据库会话
            db_gen = get_db()
            db = next(db_gen)
            try:
                user = get_user_by_id(db, user_id)
                return user
            finally:
                db.close()
        except Exception as e:
            print(f"[UserGameManager] Error getting user from token: {e}")
            return None
    
    def get_game_manager(self, user_id: str) -> GameManager:
        """获取用户的游戏管理器，如果不存在则创建"""
        if user_id not in self.user_games:
            print(f"[UserGameManager] Creating new GameManager for user {user_id}")
            self.user_games[user_id] = GameManager(user_id=user_id)
        return self.user_games[user_id]
    
    def remove_game_manager(self, user_id: str):
        """移除用户的游戏管理器（当用户断开连接且没有其他连接时）"""
        if user_id in self.user_games:
            game_manager = self.user_games[user_id]
            # 停止游戏
            if game_manager.is_running:
                game_manager.stop_game()
            # 从字典中移除
            del self.user_games[user_id]
            print(f"[UserGameManager] Removed GameManager for user {user_id}")
    
    def get_user_id_from_websocket(self, websocket) -> Optional[str]:
        """从 WebSocket 连接中获取用户 ID"""
        # 尝试从查询参数获取 token
        token = websocket.query_params.get("token")
        if token:
            user = self.get_user_from_token(token)
            if user:
                return user.id
        
        # 尝试从 headers 获取 Authorization
        # WebSocket 不支持标准的 Authorization header，但可以通过自定义 header 传递
        # 或者通过查询参数传递 token（更简单）
        return None


# 全局用户游戏管理器实例
user_game_manager = UserGameManager()

