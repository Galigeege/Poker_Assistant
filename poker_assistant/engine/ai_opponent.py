"""
AI 对手玩家模块
实现基于 LLM 的 AI 对手，支持个性化性格和独立决策
支持 Harrington 理论的高级决策模式
"""
import random
import json
import os
from typing import Dict, Tuple, List, Optional
from pypokerengine.players import BasePokerPlayer

from poker_assistant.llm_service.client_factory import get_llm_client
from poker_assistant.llm_service.base_client import BaseLLMClient
from poker_assistant.engine.bot_persona import BotPersona, get_random_persona, get_default_persona
from poker_assistant.utils.card_utils import format_cards
from poker_assistant.utils.config import Config
from poker_assistant.utils.poker_math import PokerMath


class AIOpponentPlayer(BasePokerPlayer):
    """
    AI 对手玩家
    支持 LLM 驱动的个性化决策，具备独立的性格和上下文
    默认使用 Harrington 理论的高级决策模式
    """
    
    def __init__(
        self,
        difficulty: str = "medium",
        shared_hole_cards: dict = None,
        persona: BotPersona = None,
        llm_client: Optional[BaseLLMClient] = None,
        big_blind: int = 10,
        use_harrington_default: bool = True,
        debug_callback: Optional[callable] = None
    ):
        """
        Args:
            difficulty: 难度级别 ('easy', 'medium', 'hard') - 仅作为 Fallback 策略使用
            shared_hole_cards: 共享字典，用于记录底牌
            persona: Bot 的性格设定，如果为 None 则使用默认 (Harrington)
            llm_client: LLM 客户端
            big_blind: 大盲注金额（用于计算有效筹码深度）
            use_harrington_default: 是否默认使用 Harrington 性格
            debug_callback: 调试回调函数，用于输出 LLM 交互日志
        """
        super().__init__()
        self.difficulty = difficulty
        self.action_history = []
        self.round_count = 0
        self.hole_cards = []  # 保存底牌用于摊牌展示
        self.shared_hole_cards = shared_hole_cards  # 共享底牌字典
        self.big_blind = big_blind  # 大盲注（用于 Harrington 分析）
        self.debug_callback = debug_callback  # Debug 回调
        
        # AI 核心组件
        if persona is not None:
            self.persona = persona
        elif use_harrington_default:
            self.persona = get_default_persona()  # 默认使用 Harrington
        else:
            self.persona = get_random_persona()
            
        self.client = None
        self.use_ai = False
        self.poker_math = PokerMath()  # 初始化数学工具
        
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
        self.prompt_templates = {}
        self._load_prompt_templates()

    def _load_prompt_templates(self):
        """加载所有 Prompt 模板"""
        prompts_dir = os.path.join(os.path.dirname(__file__), '../prompts')
        
        # 加载标准模板
        try:
            with open(os.path.join(prompts_dir, 'bot_action.txt'), 'r', encoding='utf-8') as f:
                self.prompt_templates['standard'] = f.read()
        except Exception as e:
            print(f"Error loading standard prompt template: {e}")
            self.prompt_templates['standard'] = ""
        
        # 加载 Harrington 模板
        try:
            with open(os.path.join(prompts_dir, 'bot_action_harrington.txt'), 'r', encoding='utf-8') as f:
                self.prompt_templates['harrington'] = f.read()
        except Exception as e:
            print(f"Error loading Harrington prompt template: {e}")
            self.prompt_templates['harrington'] = self.prompt_templates.get('standard', "")

    def _get_prompt_template(self) -> str:
        """根据当前 Persona 获取对应的 Prompt 模板"""
        if self.persona.use_custom_prompt and self.persona.custom_prompt_file:
            # Harrington 使用专用模板
            if 'harrington' in self.persona.custom_prompt_file.lower():
                return self.prompt_templates.get('harrington', self.prompt_templates.get('standard', ''))
        return self.prompt_templates.get('standard', '')

    def declare_action(self, valid_actions, hole_card, round_state):
        """
        决定下一步行动
        优先尝试使用 AI 决策，失败则回退到规则策略
        """
        # 打印 Persona 信息（帮助调试）
        street = round_state.get('street', 'preflop')
        position = self._get_position_name(round_state)
        
        # 检查是否可以免费看牌
        call_info = next((a for a in valid_actions if a['action'] == 'call'), None)
        can_check = call_info is not None and call_info['amount'] == 0
        
        print(f"\n[AI Bot] ========== ACTION REQUEST ==========")
        print(f"[AI Bot] Player: {self.uuid[-6:]} | {self.persona.style_code.upper()}")
        print(f"[AI Bot] Position: {position} | Street: {street}")
        print(f"[AI Bot] Hole cards: {hole_card}")
        print(f"[AI Bot] Valid actions: {valid_actions}")
        if call_info:
            print(f"[AI Bot] Call amount: ${call_info['amount']} | Can check (free): {can_check}")
        else:
            print(f"[AI Bot] No call action available")
        print(f"[AI Bot] ========================================")
        
        # 1. 尝试 AI 决策
        if self.use_ai:
            try:
                action, amount = self._get_ai_action(valid_actions, hole_card, round_state)
                if action:
                    # 最终安全检查：免费看牌时绝不弃牌
                    if action == 'fold' and can_check:
                        print(f"[AI Bot] SAFETY: Prevented FOLD when CHECK is free!")
                        action, amount = 'call', 0
                    print(f"[AI Bot] Decision: {action.upper()} {amount if amount else ''}")
                    return action, amount
            except Exception as e:
                # 仅在调试模式下打印错误，避免刷屏
                if os.environ.get('DEBUG'):
                    print(f"[{self.uuid}] AI Decision Failed: {e}")
                print(f"[AI Bot] LLM failed, using fallback strategy")
        
        # 2. Fallback: 使用规则策略
        action, amount = self._rule_based_strategy(valid_actions, hole_card, round_state)
        
        # Fallback 安全检查
        if action == 'fold' and can_check:
            print(f"[AI Bot] SAFETY: Prevented FOLD in fallback when CHECK is free!")
            action, amount = 'call', 0
            
        print(f"[AI Bot] Fallback Decision: {action.upper()} {amount if amount else ''}")
        return action, amount

    def _get_ai_action(self, valid_actions, hole_card, round_state) -> Tuple[Optional[str], Optional[int]]:
        """使用 LLM 获取决策"""
        # 准备数据
        community_cards = round_state.get('community_card', [])
        pot_size = round_state.get('pot', {}).get('main', {}).get('amount', 0)
        street = round_state.get('street', 'preflop')
        
        # 计算 Call 的金额和最小 Raise 金额
        amount_to_call = 0
        min_raise = 0
        max_raise = 0
        
        for action in valid_actions:
            if action['action'] == 'call':
                amount_to_call = action['amount']
            if action['action'] == 'raise':
                min_raise = action['amount']['min']
                max_raise = action['amount']['max']

        # 格式化行动历史
        action_history_str = self._format_action_history(round_state)
        
        # 获取筹码信息
        my_stack = self._get_my_stack(round_state)
        opponent_stacks = self._get_opponent_stacks(round_state)
        
        # 生成 RNG 随机数 (0-100) 用于混合策略
        rng_value = random.randint(0, 100)
        
        # 根据 Persona 选择分析方法和模板
        if self.persona.use_custom_prompt:
            # Harrington 模式：使用增强分析
            analysis = self.poker_math.analyze_hand_harrington(
                hole_cards=hole_card,
                community_cards=community_cards,
                pot_size=pot_size,
                to_call=amount_to_call,
                my_stack=my_stack,
                opponent_stacks=opponent_stacks,
                big_blind=self.big_blind
            )
            
            prompt = self._build_harrington_prompt(
                hole_card, community_cards, street, pot_size,
                amount_to_call, min_raise, my_stack, action_history_str,
                analysis, rng_value, round_state
            )
            
            # Harrington 模式：适当的 tokens 数量以输出完整的思维链和决策
            # 800 tokens 确保 100 字 thought + 完整 JSON 输出不会被截断
            max_tokens = 800
        else:
            # 标准模式：使用原有分析
            analysis = self.poker_math.analyze_hand(
                hole_cards=hole_card,
                community_cards=community_cards,
                pot_size=pot_size,
                to_call=amount_to_call
            )
            
            prompt = self._build_standard_prompt(
                hole_card, community_cards, street, pot_size,
                amount_to_call, min_raise, my_stack, action_history_str,
                analysis, round_state
            )
            max_tokens = 200

        # 调用 API
        messages = [{"role": "user", "content": prompt}]
        response = self.client.chat(
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.8 
        )
        
        # 发送调试日志（如果有回调）
        if self.debug_callback:
            try:
                debug_log = {
                    "bot_id": self.uuid,
                    "bot_name": f"AI_{self.uuid[-4:]}",
                    "persona": self.persona.name,
                    "style": self.persona.style_code.upper(),
                    "street": street,
                    "position": self._get_position_name(round_state),
                    "hole_cards": hole_card,
                    "community_cards": community_cards,
                    "pot_size": pot_size,
                    "to_call": amount_to_call,
                    "rng_value": rng_value,
                    "prompt": prompt[:3500] + "..." if len(prompt) > 3500 else prompt,  # 截断以节省带宽
                    "response": response if response else "N/A",
                    "analysis": {
                        "equity": analysis.get('equity_percent', 'N/A'),
                        "spr": analysis.get('spr', 'N/A'),
                        "board_texture": analysis.get('board_texture_cn', 'N/A')
                    } if isinstance(analysis, dict) else {}
                }
                self.debug_callback(debug_log)
            except Exception as e:
                print(f"[AI Bot] Debug callback error: {e}")
        
        # 打印 LLM 响应到终端（便于调试）
        if response:
            print(f"[AI Bot] LLM Response: {response}")
        
        # 解析 JSON
        if not response:
            return None, None
            
        # 清理 Markdown 标记
        content = response.replace("```json", "").replace("```", "").strip()
        
        # 提取 JSON 部分
        if '{' in content:
            start = content.find('{')
            end = content.rfind('}') + 1
            content = content[start:end]
        
        decision_data = json.loads(content)
        action_type = decision_data.get('action', '').lower()
        amount = decision_data.get('amount', 0)
        
        print(f"[AI Bot] Parsed LLM output: action={action_type}, amount={amount}")
        
        # 校验合法性
        validated_action, validated_amount = self._validate_action(action_type, amount, valid_actions)
        print(f"[AI Bot] After validation: action={validated_action}, amount={validated_amount}")
        
        return validated_action, validated_amount

    def _build_harrington_prompt(
        self, hole_card, community_cards, street, pot_size,
        amount_to_call, min_raise, my_stack, action_history_str,
        analysis, rng_value, round_state
    ) -> str:
        """构建 Harrington 模式的 Prompt"""
        template = self._get_prompt_template()
        
        return template.format(
            # Persona 风格参数
            style_code=self.persona.style_code.upper(),
            persona_name=self.persona.name,
            persona_description=self.persona.description,
            playing_style=self.persona.playing_style,
            # 游戏状态
            street=street,
            position=self._get_position_name(round_state),
            hole_cards=format_cards(hole_card),
            community_cards=format_cards(community_cards) if community_cards else "None (Pre-Flop)",
            pot_size=pot_size,
            to_call=amount_to_call,
            min_raise=min_raise,
            stack=my_stack,
            active_players_count=self._count_active_players(round_state),
            recent_history=action_history_str,
            # Harrington 专用参数
            effective_stack_bb=analysis['effective_stack_bb'],
            stack_category=analysis['stack_category'],
            spr=analysis['spr'],
            spr_category=analysis['spr_category'],
            board_texture=analysis['board_texture'],
            board_texture_cn=analysis['board_texture_cn'],
            board_description=analysis['board_description'],
            equity_percent=analysis['equity_percent'],
            pot_odds_percent=analysis['pot_odds_percent'],
            ev_call=analysis['ev_call'],
            ev_status='Positive +EV' if analysis['is_ev_positive'] else 'Negative -EV',
            rng_value=rng_value,
            # 牌型评估（关键！）
            made_hand_cn=analysis.get('made_hand_cn', '未知'),
            made_hand_en=analysis.get('made_hand_en', 'Unknown'),
            made_hand_description=analysis.get('made_hand_description', '牌型未评估')
        )

    def _build_standard_prompt(
        self, hole_card, community_cards, street, pot_size,
        amount_to_call, min_raise, my_stack, action_history_str,
        analysis, round_state
    ) -> str:
        """构建标准模式的 Prompt"""
        template = self._get_prompt_template()
        
        math_context = (
            f"Win Probability (Equity): {analysis['equity_percent']}\n"
            f"Pot Odds needed to Call: {analysis['pot_odds_percent']}\n"
            f"EV if Call: {analysis['ev_call']} ({'Positive' if analysis['is_ev_positive'] else 'Negative'})\n"
        )
        
        return template.format(
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
            stack=my_stack,
            active_players_count=self._count_active_players(round_state),
            recent_history=action_history_str,
            hand_analysis=f"{math_context}\nAnalyze your hand strength based on the math above."
        )

    def _get_opponent_stacks(self, round_state) -> List[int]:
        """获取所有对手的筹码"""
        seats = round_state.get('seats', [])
        opponent_stacks = []
        for seat in seats:
            if seat['uuid'] != self.uuid and seat['state'] != 'folded':
                opponent_stacks.append(seat['stack'])
        return opponent_stacks

    def _validate_action(self, action_type, amount, valid_actions):
        """
        校验并修正 AI 的决策
        
        核心原则：
        1. 可以免费看牌（Check）时，绝不弃牌
        2. 大盲位面对 limp（只需补齐大盲）时，优先 Check 看牌
        """
        valid_types = [a['action'] for a in valid_actions]
        
        # 获取 call 信息，用于判断是否可以 check（call amount = 0 表示 check）
        call_info = next((a for a in valid_actions if a['action'] == 'call'), None)
        can_check = call_info is not None and call_info['amount'] == 0
        
        # 获取 raise 信息
        raise_info = next((a for a in valid_actions if a['action'] == 'raise'), None)
        
        print(f"[AI Bot] _validate_action input: action={action_type}, amount={amount}")
        print(f"[AI Bot] Valid types: {valid_types}")
        if raise_info:
            print(f"[AI Bot] Raise info: min={raise_info['amount']['min']}, max={raise_info['amount']['max']}")
        
        # ===== 关键修复：防止免费看牌时弃牌 =====
        # 如果 AI 选择 FOLD，但实际上可以 CHECK（免费看牌），强制改为 CHECK
        if action_type == 'fold' and can_check:
            print(f"[AI Bot] WARNING: Prevented fold when check is free! Forcing CHECK.")
            return 'call', 0
        
        # 1. 修正 Check/Call 混淆
        # PyPokerEngine 中没有 'check'，而是用 call amount=0 表示
        # 如果 AI 说 Check，转换为 call
        if action_type == 'check':
            action_type = 'call'
            amount = 0
        
        # 2. 修正 All-in 动作 (处理各种格式: ALL_IN, all_in, allin, ALLIN)
        action_lower = action_type.lower().replace('_', '').replace('-', '')
        if action_lower == 'allin':
            raise_info = next((a for a in valid_actions if a['action'] == 'raise'), None)
            # 检查 raise 是否真的可用 (max > 0 表示可以加注)
            can_raise = raise_info and raise_info['amount']['max'] > 0
            
            if can_raise:
                action_type = 'raise'
                amount = raise_info['amount']['max']
                print(f"[AI Bot] ALL_IN converted to RAISE {amount} (max)")
            else:
                # 不能加注，降级为 Call（全下式跟注）
                call_info_local = next((a for a in valid_actions if a['action'] == 'call'), None)
                if call_info_local:
                    action_type = 'call'
                    amount = call_info_local['amount']
                    print(f"[AI Bot] ALL_IN converted to CALL {amount} (no raise available, max={raise_info['amount']['max'] if raise_info else 'N/A'})")
                else:
                    # 极端情况：既不能 raise 也不能 call，只能 fold
                    # 但这种情况理论上不应该发生
                    action_type = 'fold'
                    amount = 0
                    print(f"[AI Bot] WARNING: ALL_IN but no raise or call available! Forced FOLD.")
        
        # 3. 修正 Raise 金额
        if action_type == 'raise':
            raise_info_local = next((a for a in valid_actions if a['action'] == 'raise'), None)
            if raise_info_local:
                min_amt = raise_info_local['amount']['min']
                max_amt = raise_info_local['amount']['max']
                
                # 检查 raise 是否真的可用 (max > 0)
                if max_amt <= 0:
                    # raise 不可用，降级为 call
                    print(f"[AI Bot] Raise not available (max={max_amt}), downgrading to CALL")
                    action_type = 'call'
                elif amount == -1 or amount == 0:  # All-in (amount=-1 or amount=0 means max)
                    amount = max_amt
                    print(f"[AI Bot] Raise amount set to max: {amount}")
                else:
                    amount = max(min_amt, min(amount, max_amt))
                    print(f"[AI Bot] Raise amount adjusted: {amount} (min={min_amt}, max={max_amt})")
            else:
                # 如果不能加注，降级为 Call
                print(f"[AI Bot] No raise action available, downgrading to CALL")
                action_type = 'call'
        
        # 4. 获取最终合法的动作对象
        chosen_action = next((a for a in valid_actions if a['action'] == action_type), None)
        
        # 如果 AI 给出的动作不合法，优先选择 Check（如果可以），否则 Call，最后才 Fold
        if not chosen_action:
            # 可以 Check（call amount = 0）时，绝不 Fold
            if can_check:
                print(f"[AI Bot] Invalid action '{action_type}', falling back to CHECK (free).")
                return 'call', 0
            # 否则尝试 Call
            if 'call' in valid_types:
                print(f"[AI Bot] Invalid action '{action_type}', falling back to CALL.")
                return 'call', call_info['amount'] if call_info else 0
            # 最后才 Fold
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
            
            # 找到自己在 seats 中的索引
            my_seat_idx = -1
            for i, seat in enumerate(seats):
                if seat['uuid'] == self.uuid:
                    my_seat_idx = i
                    break
            
            if my_seat_idx == -1:
                return "Unknown"
            
            num_seats = len(seats)
            
            # 计算相对于 Dealer 的位置
            # BTN = dealer_btn
            # SB = (dealer_btn + 1) % num_seats
            # BB = (dealer_btn + 2) % num_seats
            
            if my_seat_idx == dealer_btn:
                return "Button (BTN)"
            
            steps_from_btn = (my_seat_idx - dealer_btn) % num_seats
            
            # 6人桌标准位置
            if steps_from_btn == 1:
                return "Small Blind (SB)"
            elif steps_from_btn == 2:
                return "Big Blind (BB)"
            elif steps_from_btn == 3:
                return "UTG (Under the Gun)"
            elif steps_from_btn == 4:
                return "Hijack (HJ)"
            elif steps_from_btn == 5:
                return "Cutoff (CO)"
            
            # Fallback (理论上不应该到达这里)
            return f"Position +{steps_from_btn}"
        except Exception as e:
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
    
    def get_persona_info(self) -> dict:
        """获取 Persona 信息，用于日志记录"""
        return {
            "name": self.persona.name,
            "style_code": self.persona.style_code,
            "description": self.persona.description[:50] + "..." if len(self.persona.description) > 50 else self.persona.description
        }
    
    def set_debug_callback(self, callback: callable):
        """设置调试回调函数（用于输出 LLM 交互日志）"""
        self.debug_callback = callback
    
    def clear_debug_callback(self):
        """清除调试回调函数"""
        self.debug_callback = None
