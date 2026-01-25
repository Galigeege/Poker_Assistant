"""
异步人类玩家模块 (Queue Based)
使用 queue.Queue 实现线程间通信，阻塞等待前端输入
"""
import time
import threading
from queue import Queue
from pypokerengine.players import BasePokerPlayer

class AsyncHumanPlayer(BasePokerPlayer):
    """
    Web 端人类玩家
    """
    
    def __init__(self, uuid: str, name: str, request_queue: Queue, response_queue: Queue, game_controller=None):
        super().__init__()
        self.uuid = uuid
        self.name = name
        self.request_queue = request_queue   # 发送给前端的请求 (Game -> Web)
        self.response_queue = response_queue # 接收前端的响应 (Web -> Game)
        self.game_controller = game_controller # GameController Reference
        self.next_round_event = threading.Event()  # Event to wait for next round signal
        self.ai_copilot_enabled = False  # AI Copilot 开关状态（默认关闭）
        
    def declare_action(self, valid_actions, hole_card, round_state):
        """
        声明行动 - 阻塞方法
        """
        # 0. 获取 AI 建议 (Copilot) - 仅在启用时生成
        ai_advice = None
        if self.ai_copilot_enabled and self.game_controller:
            try:
                print("[AsyncHumanPlayer] AI Copilot 已启用，正在生成 AI 建议...")
                # 修正参数顺序: valid_actions, hole_card, round_state
                ai_advice = self.game_controller._get_ai_advice(valid_actions, hole_card, round_state)
            except Exception as e:
                print(f"[AsyncHumanPlayer] 生成 AI 建议失败: {e}")
        else:
            if not self.ai_copilot_enabled:
                print("[AsyncHumanPlayer] AI Copilot 已关闭，跳过 AI 建议生成")

        # 提取 call_amount
        call_amount = 0
        for action in valid_actions:
            if action['action'] == 'call':
                call_amount = action['amount']
                break

        # 1. 构建请求数据
        action_request = {
            "type": "action_request",
            "data": {
                "valid_actions": valid_actions,
                "hole_card": hole_card,
                "round_state": round_state,
                "player_uuid": self.uuid,
                "call_amount": call_amount,  # 显式传递
                "ai_advice": ai_advice  # 注入 AI 建议
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
        
        # 5. 验证行动的有效性
        validated_action, validated_amount = self._validate_action(action, amount, valid_actions)
        
        if validated_action != action or validated_amount != amount:
            print(f"[AsyncHumanPlayer] WARNING: Action validated/changed from ({action}, {amount}) to ({validated_action}, {validated_amount})")
        
        return validated_action, validated_amount
    
    def _validate_action(self, action_type: str, amount: int, valid_actions: list) -> tuple:
        """
        验证并修正玩家行动
        
        Args:
            action_type: 行动类型 (fold, call, raise)
            amount: 金额
            valid_actions: 有效行动列表
            
        Returns:
            (validated_action, validated_amount) 元组
        """
        valid_types = [a['action'] for a in valid_actions]
        
        # 获取 call 信息
        call_info = next((a for a in valid_actions if a['action'] == 'call'), None)
        can_check = call_info is not None and call_info.get('amount', 0) == 0
        
        # 1. 如果行动类型不在有效列表中，返回错误
        if action_type not in valid_types:
            print(f"[AsyncHumanPlayer] ERROR: Invalid action type '{action_type}'. Valid types: {valid_types}")
            # 如果可以 check，优先 check，否则 fold
            if can_check:
                return 'call', 0
            elif 'call' in valid_types:
                return 'call', call_info.get('amount', 0) if call_info else 0
            else:
                return 'fold', 0
        
        # 2. 验证 Raise 金额
        if action_type == 'raise':
            raise_info = next((a for a in valid_actions if a['action'] == 'raise'), None)
            if not raise_info:
                print(f"[AsyncHumanPlayer] ERROR: Raise not available, but action is 'raise'. Falling back to call/check.")
                if can_check:
                    return 'call', 0
                elif 'call' in valid_types:
                    return 'call', call_info.get('amount', 0) if call_info else 0
                else:
                    return 'fold', 0
            
            min_amt = raise_info['amount']['min']
            max_amt = raise_info['amount']['max']
            
            # 检查金额是否在有效范围内
            if amount < min_amt or amount > max_amt:
                print(f"[AsyncHumanPlayer] ERROR: Raise amount {amount} is out of valid range [{min_amt}, {max_amt}]")
                # 修正金额到有效范围内
                corrected_amount = max(min_amt, min(amount, max_amt))
                print(f"[AsyncHumanPlayer] Corrected raise amount to {corrected_amount}")
                # 注意：这里应该通知前端，但由于 declare_action 是阻塞的，我们只能修正金额
                # 更好的方案是在前端进行验证，但这里作为最后一道防线
                return 'raise', corrected_amount
        
        # 3. 对于 Call，金额由引擎决定
        if action_type == 'call':
            if call_info:
                return 'call', call_info.get('amount', 0)
            else:
                print(f"[AsyncHumanPlayer] ERROR: Call not available, but action is 'call'. Falling back to fold.")
                return 'fold', 0
        
        # 4. Fold 不需要验证金额
        if action_type == 'fold':
            return 'fold', 0
        
        # 默认返回原值
        return action_type, amount

    def receive_game_start_message(self, game_info):
        self.request_queue.put({
            "type": "game_start",
            "data": game_info
        })

    def receive_round_start_message(self, round_count, hole_card, seats, dealer_btn=None):
        # Get dealer_btn from GameController if available
        if dealer_btn is None and self.game_controller:
            dealer_btn = getattr(self.game_controller, 'current_dealer_btn', None)
        
        self.request_queue.put({
            "type": "round_start",
            "data": {
                "round_count": round_count,
                "hole_card": hole_card,
                "seats": seats,
                "dealer_btn": dealer_btn
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

    def receive_round_result_message(self, winners, hand_info, round_state, initial_stacks=None, player_hole_cards=None):
        # Get initial_stacks and player_hole_cards from GameController if available
        if initial_stacks is None and self.game_controller:
            initial_stacks = getattr(self.game_controller, 'initial_stacks', None)
        if player_hole_cards is None and self.game_controller:
            player_hole_cards = getattr(self.game_controller, 'shared_hole_cards', None)
        
        self.request_queue.put({
            "type": "round_result",
            "data": {
                "winners": winners,
                "hand_info": hand_info,
                "round_state": round_state,
                "initial_stacks": initial_stacks,
                "player_hole_cards": player_hole_cards
            }
        })
        
        # Wait for "next round" signal from frontend
        # Use a loop with timeout to avoid hanging and allow for debugging
        print(f"[AsyncHumanPlayer] Waiting for next round signal... (event id: {id(self.next_round_event)})")
        self.next_round_event.clear()
        
        # Wait with timeout to prevent infinite blocking
        wait_count = 0
        while not self.next_round_event.is_set():
            got_signal = self.next_round_event.wait(timeout=1.0)
            if got_signal:
                break
            wait_count += 1
            if wait_count % 10 == 0:
                print(f"[AsyncHumanPlayer] Still waiting for next round signal... ({wait_count}s)")
        
        print("[AsyncHumanPlayer] Next round signal received, continuing...")
    
    def signal_next_round(self):
        """Signal to continue to next round (called by GameManager)"""
        print(f"[AsyncHumanPlayer] signal_next_round called (event id: {id(self.next_round_event)}, is_set before: {self.next_round_event.is_set()})")
        self.next_round_event.set()
        print(f"[AsyncHumanPlayer] signal_next_round done (is_set after: {self.next_round_event.is_set()})")
    
    def set_ai_copilot_enabled(self, enabled: bool):
        """设置 AI Copilot 开关状态"""
        self.ai_copilot_enabled = enabled
        print(f"[AsyncHumanPlayer] AI Copilot {'已启用' if enabled else '已禁用'}")
