"""
异步人类玩家模块 (Queue Based)
使用 queue.Queue 实现线程间通信，阻塞等待前端输入
"""
import time
from queue import Queue
from pypokerengine.players import BasePokerPlayer

class AsyncHumanPlayer(BasePokerPlayer):
    """
    Web 端人类玩家
    """
    
    def __init__(self, uuid: str, name: str, request_queue: Queue, response_queue: Queue):
        super().__init__()
        self.uuid = uuid
        self.name = name
        self.request_queue = request_queue   # 发送给前端的请求 (Game -> Web)
        self.response_queue = response_queue # 接收前端的响应 (Web -> Game)
        
    def declare_action(self, valid_actions, hole_card, round_state):
        """
        声明行动 - 阻塞方法
        """
        # 1. 构建请求数据
        action_request = {
            "type": "action_request",
            "data": {
                "valid_actions": valid_actions,
                "hole_card": hole_card,
                "round_state": round_state,
                "player_uuid": self.uuid
            }
        }
        
        # 2. 发送请求到队列
        print(f"[AsyncHumanPlayer] Requesting action for {self.name}...")
        self.request_queue.put(action_request)
        
        # 3. 阻塞等待响应
        # 这是一个在独立线程中运行的方法，所以阻塞是安全的
        action_response = self.response_queue.get(block=True)
        
        print(f"[AsyncHumanPlayer] Received action: {action_response}")
        
        # 4. 解析响应
        # 期望格式: {"action": "call", "amount": 100}
        action = action_response.get('action')
        amount = action_response.get('amount', 0)
        
        return action, amount

    def receive_game_start_message(self, game_info):
        self.request_queue.put({
            "type": "game_start",
            "data": game_info
        })

    def receive_round_start_message(self, round_count, hole_card, seats):
        self.request_queue.put({
            "type": "round_start",
            "data": {
                "round_count": round_count,
                "hole_card": hole_card,
                "seats": seats
            }
        })

    def receive_street_start_message(self, street, round_state):
        self.request_queue.put({
            "type": "street_start",
            "data": {
                "street": street,
                "round_state": round_state
            }
        })

    def receive_game_update_message(self, action, round_state):
        self.request_queue.put({
            "type": "game_update",
            "data": {
                "action": action,
                "round_state": round_state
            }
        })

    def receive_round_result_message(self, winners, hand_info, round_state):
        self.request_queue.put({
            "type": "round_result",
            "data": {
                "winners": winners,
                "hand_info": hand_info,
                "round_state": round_state
            }
        })
