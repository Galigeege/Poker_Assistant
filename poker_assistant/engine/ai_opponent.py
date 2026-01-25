"""
AI 对手玩家模块
实现基于 LLM 的 AI 对手，支持个性化性格和独立决策
"""
import random
import json
import os
from typing import Dict, Tuple, List, Optional
from pypokerengine.players import BasePokerPlayer

from poker_assistant.llm_service.client_factory import get_llm_client
from poker_assistant.llm_service.base_client import BaseLLMClient
from poker_assistant.engine.bot_persona import BotPersona, get_random_persona
from poker_assistant.utils.card_utils import format_cards
from poker_assistant.utils.config import Config
from poker_assistant.utils.poker_math import PokerMath


class AIOpponentPlayer(BasePokerPlayer):
    """
    AI 对手玩家
    支持 LLM 驱动的个性化决策，具备独立的性格和上下文
    """
    
    def __init__(
        self,
        difficulty: str = "medium",
        shared_hole_cards: dict = None,
        persona: BotPersona = None,
        llm_client: Optional[BaseLLMClient] = None
    ):
        """
        Args:
            difficulty: 难度级别 ('easy', 'medium', 'hard') - 仅作为 Fallback 策略使用
            shared_hole_cards: 共享字典，用于记录底牌
            persona: Bot 的性格设定，如果为 None 则随机分配
        """
        super().__init__()
        self.difficulty = difficulty
        self.action_history = []
        self.round_count = 0
        self.hole_cards = []  # 保存底牌用于摊牌展示
        self.shared_hole_cards = shared_hole_cards  # 共享底牌字典
        
        # AI 核心组件
        self.persona = persona if persona else get_random_persona()
        self.client = None
        self.use_ai = False
        self.poker_math = PokerMath() # 初始化数学工具
        
        # 初始化 API 客户端
        # 优先使用外部注入的 llm_client（用于按 session/user 的 key 运行）
        if llm_client is not None:
            self.client = llm_client
            self.use_ai = True
        else:
            # 兼容旧逻辑：从环境变量读取 key
            config = Config()
            # 只要配置了任意一个 Provider 的 Key，就可以启用 AI
            if config.DEEPSEEK_API_KEY or config.OPENAI_API_KEY or config.GEMINI_API_KEY:
                try:
                    self.client = get_llm_client()
                    self.use_ai = True
                except Exception as e:
                    print(f"Warning: Failed to initialize AI client for bot: {e}")
                    self.use_ai = False
            
        # 加载 Prompt 模板
        self.prompt_template = ""
        try:
            prompt_path = os.path.join(os.path.dirname(__file__), '../prompts/bot_action.txt')
            with open(prompt_path, 'r', encoding='utf-8') as f:
                self.prompt_template = f.read()
        except Exception as e:
            print(f"Error loading prompt template: {e}")

    def declare_action(self, valid_actions, hole_card, round_state):
        """
        决定下一步行动
        优先尝试使用 AI 决策，失败则回退到规则策略
        """
        # 1. 尝试 AI 决策
        if self.use_ai:
            try:
                action, amount = self._get_ai_action(valid_actions, hole_card, round_state)
                if action:
                    return action, amount
            except Exception as e:
                # 仅在调试模式下打印错误，避免刷屏
                if os.environ.get('DEBUG'):
                    print(f"[{self.uuid}] AI Decision Failed: {e}")
        
        # 2. Fallback: 使用规则策略
        return self._rule_based_strategy(valid_actions, hole_card, round_state)

    def _get_ai_action(self, valid_actions, hole_card, round_state) -> Tuple[Optional[str], Optional[int]]:
        """使用 LLM 获取决策"""
        # 准备数据
        community_cards = round_state.get('community_card', [])
        pot_size = round_state.get('pot', {}).get('main', {}).get('amount', 0)
        street = round_state.get('street', 'preflop')
        
        # 计算 Call 的金额和最小 Raise 金额
        can_call = False
        amount_to_call = 0
        min_raise = 0
        
        for action in valid_actions:
            if action['action'] == 'call':
                can_call = True
                amount_to_call = action['amount']
            if action['action'] == 'raise':
                min_raise = action['amount']['min']

        # 格式化行动历史
        action_history_str = self._format_action_history(round_state)
        
        # 数学分析 (Hybrid Brain)
        math_analysis = self.poker_math.analyze_hand(
            hole_cards=hole_card,
            community_cards=community_cards,
            pot_size=pot_size,
            to_call=amount_to_call
        )
        
        math_context = (
            f"Win Probability (Equity): {math_analysis['equity_percent']}\n"
            f"Pot Odds needed to Call: {math_analysis['pot_odds_percent']}\n"
            f"EV if Call: {math_analysis['ev_call']} ({'Positive' if math_analysis['is_ev_positive'] else 'Negative'})\n"
        )
        
        # 填充 Prompt
        prompt = self.prompt_template.format(
            name=f"AI_{self.uuid[-4:]}",
            persona_name=self.persona.name,
            persona_description=self.persona.description,
            round_state=street,
            position=self._get_position_name(round_state),
            hole_cards=format_cards(hole_card),
            community_cards=format_cards(community_cards) if community_cards else "None",
            pot_size=pot_size,
            to_call=amount_to_call,
            min_raise=min_raise,
            stack=self._get_my_stack(round_state),
            active_players_count=self._count_active_players(round_state),
            recent_history=action_history_str,
            hand_analysis=f"{math_context}\nAnalyze your hand strength based on the math above."
        )

        # 调用 API
        # 使用较低的 max_tokens 减少延迟，temperature 稍高增加多样性
        messages = [{"role": "user", "content": prompt}]
        response = self.client.chat(
            messages=messages,
            max_tokens=200,
            temperature=0.8 
        )
        
        # 解析 JSON
        if not response:
            return None, None
            
        # 清理 Markdown 标记（Deepseek 可能会输出 ```json ... ```）
        content = response.replace("```json", "").replace("```", "").strip()
        
        decision_data = json.loads(content)
        action_type = decision_data.get('action', '').lower()
        amount = decision_data.get('amount', 0)
        
        # 校验合法性
        return self._validate_action(action_type, amount, valid_actions)

    def _validate_action(self, action_type, amount, valid_actions):
        """校验并修正 AI 的决策"""
        valid_types = [a['action'] for a in valid_actions]
        
        # 获取 call 信息，用于判断是否可以 check（call amount = 0 表示 check）
        call_info = next((a for a in valid_actions if a['action'] == 'call'), None)
        can_check = call_info is not None and call_info['amount'] == 0
        
        # 1. 修正 Check/Call 混淆
        # PyPokerEngine 中没有 'check'，而是用 call amount=0 表示
        # 如果 AI 说 Check，转换为 call
        if action_type == 'check':
            action_type = 'call'
            amount = 0
        
        # 2. 修正 Raise 金额
        if action_type == 'raise':
            raise_info = next((a for a in valid_actions if a['action'] == 'raise'), None)
            if raise_info:
                min_amt = raise_info['amount']['min']
                max_amt = raise_info['amount']['max']
                if amount == -1: # All-in
                    amount = max_amt
                else:
                    amount = max(min_amt, min(amount, max_amt))
            else:
                # 如果不能加注，降级为 Call
                action_type = 'call'
        
        # 3. 获取最终合法的动作对象
        chosen_action = next((a for a in valid_actions if a['action'] == action_type), None)
        
        # 如果 AI 给出的动作不合法，优先选择 Check（如果可以），否则 Fold
        if not chosen_action:
            # 可以 Check（call amount = 0）时，绝不 Fold
            if can_check:
                return 'call', 0
            # 否则尝试 Call
            if 'call' in valid_types:
                return 'call', call_info['amount'] if call_info else 0
            return 'fold', 0
            
        # 对于 Call，金额由引擎决定
        if action_type == 'call':
            amount = chosen_action['amount']
            
        return action_type, amount

    def _count_active_players(self, round_state):
        """计算当前活跃玩家数量（未弃牌）"""
        seats = round_state.get('seats', [])
        return sum(1 for seat in seats if seat['state'] != 'folded')

    def _get_position_name(self, round_state):
        """获取语义化位置名称 (BTN, SB, BB, etc.)"""
        try:
            dealer_btn = round_state.get('dealer_btn')
            seats = round_state.get('seats', [])
            active_seats = [i for i, seat in enumerate(seats) if seat['state'] != 'folded']
            
            # 找到自己在 active_seats 中的索引
            my_seat_idx = -1
            for i, seat in enumerate(seats):
                if seat['uuid'] == self.uuid:
                    my_seat_idx = i
                    break
            
            if my_seat_idx == -1:
                return "Unknown"

            # 计算相对于 Dealer 的位置
            # 注意：这里简化处理，不完全严谨，但在 6 人桌够用
            # SB = (Dealer + 1) % len(seats)
            # BB = (Dealer + 2) % len(seats)
            
            if my_seat_idx == dealer_btn:
                return "Button (Dealer)"
            
            # 简单的相对位置计算
            # 实际上应该基于 active players 轮转，这里先简化
            steps_from_btn = (my_seat_idx - dealer_btn) % len(seats)
            
            if steps_from_btn == 1:
                return "Small Blind (SB)"
            elif steps_from_btn == 2:
                return "Big Blind (BB)"
            elif steps_from_btn == 3:
                return "UTG (Under the Gun)"
            
            return f"Seat {my_seat_idx} (Pos +{steps_from_btn})"
        except:
            return "Unknown"

    def _get_my_stack(self, round_state):
        """获取自己的剩余筹码"""
        seats = round_state.get('seats', [])
        for seat in seats:
            if seat['uuid'] == self.uuid:
                return seat['stack']
        return 0

    def _format_action_history(self, round_state):
        """格式化本局行动历史"""
        histories = round_state.get('action_histories', {})
        lines = []
        for street in ['preflop', 'flop', 'turn', 'river']:
            if street in histories:
                lines.append(f"--- {street.upper()} ---")
                for action in histories[street]:
                    player_uuid = action.get('uuid')
                    # 简单区分是自己还是对手
                    player_name = "You" if player_uuid == self.uuid else f"Player_{player_uuid[-4:]}"
                    act = action.get('action')
                    amt = action.get('amount', 0)
                    lines.append(f"{player_name}: {act} {amt if amt > 0 else ''}")
        return "\n".join(lines)

    def _rule_based_strategy(self, valid_actions, hole_card, round_state):
        """原有的基于规则的策略"""
        fold_action = valid_actions[0]
        call_action = valid_actions[1]
        raise_action = valid_actions[2]
        
        if self.difficulty == "easy":
            return self._easy_strategy(fold_action, call_action, raise_action, hole_card, round_state)
        elif self.difficulty == "hard":
            return self._hard_strategy(fold_action, call_action, raise_action, hole_card, round_state)
        else:
            return self._medium_strategy(fold_action, call_action, raise_action, hole_card, round_state)

    # --- 以下为原有的规则策略代码 (Easy/Medium/Hard) ---
    
    def _easy_strategy(self, fold_action, call_action, raise_action, hole_card, round_state):
        if call_action['amount'] == 0:
            return call_action['action'], call_action['amount']
        if random.random() < 0.2:
            return fold_action['action'], fold_action['amount']
        return call_action['action'], call_action['amount']

    def _medium_strategy(self, fold_action, call_action, raise_action, hole_card, round_state):
        if call_action['amount'] == 0:
            if random.random() < 0.2:
                return raise_action['action'], raise_action['amount']['min']
            return call_action['action'], call_action['amount']
        if random.random() < 0.1:
            return fold_action['action'], fold_action['amount']
        if random.random() < 0.2:
             return raise_action['action'], raise_action['amount']['min']
        return call_action['action'], call_action['amount']

    def _hard_strategy(self, fold_action, call_action, raise_action, hole_card, round_state):
        if call_action['amount'] == 0:
            if random.random() < 0.4:
                return raise_action['action'], raise_action['amount']['min']
            return call_action['action'], call_action['amount']
        if random.random() < 0.3:
             return raise_action['action'], raise_action['amount']['min']
        return call_action['action'], call_action['amount']

    def receive_game_start_message(self, game_info):
        self.round_count = 0
    
    def receive_round_start_message(self, round_count, hole_card, seats):
        self.round_count = round_count
        self.hole_cards = hole_card
        if self.shared_hole_cards is not None:
            self.shared_hole_cards[self.uuid] = hole_card
    
    def receive_street_start_message(self, street, round_state):
        pass
    
    def receive_game_update_message(self, action, round_state):
        self.action_history.append(action)
    
    def receive_round_result_message(self, winners, hand_info, round_state):
        pass
