"""
游戏日志记录模块
负责将完整的游戏过程、AI 建议和结果持久化存储，用于复盘分析
"""
import os
import json
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

class GameLogger:
    """游戏日志记录器"""
    
    def __init__(self, log_dir: str = "data/game_history"):
        """
        初始化日志记录器
        
        Args:
            log_dir: 日志存储目录
        """
        self.base_dir = log_dir
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.session_dir = os.path.join(self.base_dir, f"session_{self.session_id}")
        
        # 当前手牌数据缓存
        self.current_hand_data = None
        self.current_hand_id = 0
        
        # 确保目录存在
        os.makedirs(self.session_dir, exist_ok=True)
        
        # 初始化会话汇总
        self._update_session_summary()
        
    def start_new_hand(self, round_count: int, players: List[Dict], small_blind: int, big_blind: int):
        """
        开始记录一手新牌
        
        Args:
            round_count: 局数
            players: 玩家列表（包含初始筹码、位置等）
            small_blind: 小盲金额
            big_blind: 大盲金额
        """
        self.current_hand_id = round_count
        self.current_hand_data = {
            "hand_id": f"{self.session_id}_{round_count}",
            "round_count": round_count,
            "timestamp": datetime.now().isoformat(),
            "rule": {
                "small_blind": small_blind,
                "big_blind": big_blind
            },
            "players": players, # [{"name": "User", "uuid": "...", "stack": 1000, "position": "BTN"}]
            "hero_hole_cards": [], # 稍后填充
            "streets": {
                "preflop": {"actions": [], "ai_advice": None},
                "flop": {"community_cards": [], "actions": [], "ai_advice": None},
                "turn": {"community_cards": [], "actions": [], "ai_advice": None},
                "river": {"community_cards": [], "actions": [], "ai_advice": None}
            },
            "result": None
        }
        
    def update_hero_cards(self, cards: List[str]):
        """更新玩家手牌"""
        if self.current_hand_data:
            self.current_hand_data["hero_hole_cards"] = cards
            
    def record_street_start(self, street: str, community_cards: List[str]):
        """记录街道开始（公共牌发牌）"""
        if self.current_hand_data and street in self.current_hand_data["streets"]:
            self.current_hand_data["streets"][street]["community_cards"] = community_cards

    def record_action(self, street: str, player_name: str, action_type: str, amount: int, pot_size: int):
        """
        记录玩家行动
        
        Args:
            street: 当前街道 (preflop, flop, etc.)
            player_name: 玩家名称
            action_type: 行动类型 (call, raise, fold, check)
            amount: 金额
            pot_size: 行动后的底池大小（近似值）
        """
        if self.current_hand_data and street in self.current_hand_data["streets"]:
            action_record = {
                "player": player_name,
                "action": action_type,
                "amount": amount,
                "pot_after": pot_size,
                "timestamp": time.time()
            }
            self.current_hand_data["streets"][street]["actions"].append(action_record)
            
    def record_ai_advice(self, street: str, advice: Dict[str, Any]):
        """
        记录 AI 建议
        
        Args:
            street: 当前街道
            advice: AI 建议字典
        """
        if self.current_hand_data and street in self.current_hand_data["streets"]:
            # 我们只记录最后一次建议（通常每条街玩家只行动一次，如果多次行动，可改为列表）
            # 考虑到复盘重点，我们记录所有建议
            if self.current_hand_data["streets"][street]["ai_advice"] is None:
                self.current_hand_data["streets"][street]["ai_advice"] = []
            
            self.current_hand_data["streets"][street]["ai_advice"].append({
                "timestamp": time.time(),
                "content": advice
            })

    def end_hand(self, winners: List[Dict], showdown_hands: Dict[str, List[str]], total_pot: int):
        """
        结束并保存当前手牌
        
        Args:
            winners: 获胜者列表
            showdown_hands: 摊牌数据 {uuid: [cards]}
            total_pot: 总底池
        """
        if not self.current_hand_data:
            return
            
        # 记录结果
        self.current_hand_data["result"] = {
            "winners": winners,
            "showdown_hands": showdown_hands,
            "total_pot": total_pot
        }
        
        # 保存到文件
        filename = f"hand_{self.current_hand_id}.json"
        filepath = os.path.join(self.session_dir, filename)
        
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(self.current_hand_data, f, indent=2, ensure_ascii=False)
            
            # 更新 Session 汇总
            self._update_session_summary(last_hand_id=self.current_hand_id)
            
        except Exception as e:
            print(f"Error saving game log: {e}")
            
        # 清理缓存
        self.current_hand_data = None

    def _update_session_summary(self, last_hand_id: int = 0):
        """更新会话汇总文件"""
        summary_path = os.path.join(self.session_dir, "session_summary.json")
        summary = {
            "session_id": self.session_id,
            "start_time": self.session_id, # 格式化后
            "last_update": datetime.now().isoformat(),
            "total_hands": last_hand_id,
            "log_dir": self.session_dir
        }
        try:
            with open(summary_path, 'w', encoding='utf-8') as f:
                json.dump(summary, f, indent=2, ensure_ascii=False)
        except Exception:
            pass

