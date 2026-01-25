"""
游戏控制器模块
控制整个游戏流程
"""
from typing import Optional, Callable, Dict, Any, List
from pypokerengine.api.game import setup_config, start_poker

from poker_assistant.engine.ai_opponent import AIOpponentPlayer
from poker_assistant.engine.bot_persona import get_random_persona
from poker_assistant.engine.game_state import GameState
from poker_assistant.utils.config import Config

# AI 分析模块
from poker_assistant.ai_analysis.strategy_advisor import StrategyAdvisor
from poker_assistant.ai_analysis.opponent_analyzer import OpponentAnalyzer
from poker_assistant.ai_analysis.board_analyzer import BoardAnalyzer
from poker_assistant.ai_analysis.review_analyzer import ReviewAnalyzer
from poker_assistant.ai_analysis.chat_agent import ChatAgent
from poker_assistant.ai_analysis.opponent_modeler import OpponentModeler
from poker_assistant.engine.game_logger import GameLogger
from poker_assistant.llm_service.client_factory import get_llm_client


class GameController:
    """游戏控制器 - 管理整个游戏流程"""
    
    def __init__(
        self,
        config: Config,
        game_overrides: Optional[Dict[str, Any]] = None,
        llm_provider: Optional[str] = None,
        llm_api_key: Optional[str] = None
    ):
        """
        Args:
            config: 游戏配置对象
            game_overrides: 覆盖游戏配置（用于 web 场景下按 session 配置启动）
            llm_provider: 覆盖 LLM provider（默认读取环境变量）
            llm_api_key: 覆盖 LLM API Key（用于按用户配置）
        """
        self.config = config
        self.game_config = config.get_game_config()
        if game_overrides:
            # 允许按 session 覆盖盲注/初始筹码等
            self.game_config.update(game_overrides)
        self.ai_config = config.get_ai_config()
        # CLI 组件已移除（Web 版本不需要）
        self.renderer = None
        self.input_handler = None
        self.game_state = None
        self.human_player = None
        self.ai_players = []
        
        # 初始化日志记录器
        self.game_logger = GameLogger()
        
        # 初始化对手建模器（无论是否启用 AI 都可以记录对手行为）
        self.opponent_modeler = OpponentModeler()
        self.current_round_id = 0
        
        # 记录每局开始时的筹码（用于计算赢得金额）
        self.initial_stacks = {}
        
        # Button 位置管理（PyPokerEngine 不会自动轮转，我们手动管理）
        self.current_dealer_btn = 0
        self.player_count_for_dealer = self.game_config['player_count']
        
        # 记录每局的玩家底牌（用于摊牌展示）
        self.player_hole_cards = {}  # {uuid: [card1, card2]}
        
        # 共享字典，供AI玩家记录底牌
        self.shared_hole_cards = {}  # {uuid: [card1, card2]}
        
        # 初始化 AI 分析引擎（如果 API Key 已配置）
        # 规则：如果传入 llm_api_key，则优先认为 AI 可用；否则按环境变量判断
        has_user_key = bool(llm_api_key)
        has_env_key = bool(config.DEEPSEEK_API_KEY and config.DEEPSEEK_API_KEY != "your_api_key_here")
        self.ai_enabled = has_user_key or has_env_key
        if self.ai_enabled:
            try:
                provider = llm_provider or getattr(config, "LLM_PROVIDER", None) or "deepseek"
                # 为本 GameController 统一创建一个 LLM client（按用户 key 覆盖）
                llm_client = get_llm_client(provider=provider, api_key=llm_api_key)
                self.strategy_advisor = StrategyAdvisor(llm_client=llm_client)
                self.opponent_analyzer = OpponentAnalyzer(llm_client=llm_client)
                self.board_analyzer = BoardAnalyzer(llm_client=llm_client)
                self.review_analyzer = ReviewAnalyzer(provider=provider, api_key=llm_api_key)
                self.chat_agent = ChatAgent(llm_client=llm_client)
                
                # 设置对手建模器
                self.strategy_advisor.set_opponent_modeler(self.opponent_modeler)
                self.opponent_analyzer.set_opponent_modeler(self.opponent_modeler)
                
                if self.renderer:
                    self.renderer.render_info("✅ AI 分析功能已启用（含对手建模）")
            except Exception as e:
                self.ai_enabled = False
                if self.renderer:
                    self.renderer.render_info(f"⚠️  AI 功能初始化失败: {e}")
        else:
            if self.renderer:
                self.renderer.render_info("ℹ️  AI 分析功能未启用（未配置 API Key）")
    
    def start_game(self):
        """开始游戏（CLI 模式，Web 版本不使用）"""
        # CLI 模式已移除，此方法保留以兼容性
        raise NotImplementedError("CLI mode has been removed. Use Web interface instead.")
    
    def _setup_game(self):
        """设置游戏"""
        player_count = self.game_config['player_count']
        initial_stack = self.game_config['initial_stack']
        
        # 创建游戏状态
        self.game_state = GameState(player_count, initial_stack)
        
        # 创建人类玩家（Web 模式下会被 AsyncHumanPlayer 替换）
        # CLI 模式已移除，human_player 将在 Web 模式下被替换
        self.human_player = None
        
        # 创建 AI 对手
        ai_difficulties = self._get_ai_difficulties(player_count - 1)
        self.ai_players = [
            AIOpponentPlayer(
                difficulty=diff, 
                shared_hole_cards=self.shared_hole_cards,
                persona=get_random_persona(),
                llm_client=getattr(self, "strategy_advisor", None).llm_client if getattr(self, "ai_enabled", False) else None
            ) 
            for diff in ai_difficulties
        ]
    
    def _create_poker_config(self):
        """创建 PyPokerEngine 配置"""
        config = setup_config(
            max_round=self.game_config['max_round'],
            initial_stack=self.game_config['initial_stack'],
            small_blind_amount=self.game_config['small_blind_amount']
        )
        
        # 注册人类玩家（Web 模式下会被 AsyncHumanPlayer 替换）
        if self.human_player:
            config.register_player(name="你", algorithm=self.human_player)
        
        # 注册 AI 玩家
        if self.renderer:
            self.renderer.render_info("\n🎲 对手入座情况：")
        for idx, ai_player in enumerate(self.ai_players):
            ai_name = f"AI_{idx+1}"
            config.register_player(name=ai_name, algorithm=ai_player)
            
            # 展示 AI 性格（仅 CLI 模式）
            if self.renderer:
                if ai_player.use_ai:
                    self.renderer.render_info(f"🤖 {ai_name} [{ai_player.persona.name}]")
                else:
                    self.renderer.render_info(f"🤖 {ai_name} [普通机器人]")
        
        return config
    
    def _get_ai_difficulties(self, count: int) -> list:
        """
        获取 AI 难度列表
        
        Args:
            count: AI 数量
        
        Returns:
            难度列表
        """
        difficulty_setting = self.ai_config.get('opponent_difficulty', 'mixed')
        
        # 如果设置为单一难度，所有 AI 使用相同难度
        if difficulty_setting in ['easy', 'medium', 'hard']:
            return [difficulty_setting] * count
        
        # 混合难度：根据数量分配不同难度
        if count >= 5:
            return ['easy', 'easy', 'medium', 'medium', 'hard']
        elif count == 4:
            return ['easy', 'medium', 'medium', 'hard']
        elif count == 3:
            return ['easy', 'medium', 'hard']
        elif count == 2:
            return ['medium', 'hard']
        else:
            return ['medium']
    
    def _get_human_action(self, valid_actions: list, hole_card: list, 
                         round_state: dict) -> tuple:
        """
        获取人类玩家行动
        
        Args:
            valid_actions: 可选行动
            hole_card: 手牌
            round_state: 回合状态
        
        Returns:
            (action, amount) 元组
        """
        # CLI 模式已移除，此方法不会被调用
        raise NotImplementedError("CLI mode has been removed. Use AsyncHumanPlayer in Web mode.")
    
    def _handle_game_event(self, event_type: str, event_data: Dict[str, Any]):
        """
        处理游戏事件
        
        Args:
            event_type: 事件类型
            event_data: 事件数据
        """
        try:
            if event_type == "game_start":
                if self.renderer:
                    self.renderer.render_game_start(event_data)
            
            elif event_type == "round_start":
                round_count = event_data['round_count']
                hole_card = event_data['hole_card']
                seats = event_data['seats']
                
                # 记录本局开始时的筹码（用于计算赢得金额）
                self.initial_stacks = {}
                for seat in seats:
                    self.initial_stacks[seat['uuid']] = seat['stack']
                
                # 记录日志：开始新牌局
                self.game_logger.start_new_hand(
                    round_count=round_count,
                    players=seats,
                    small_blind=self.game_config['small_blind_amount'],
                    big_blind=self.game_config['small_blind_amount']*2
                )
                # 记录玩家手牌
                self.game_logger.update_hero_cards(hole_card)
                
                # 清空上一局的底牌记录（使用clear()而不是创建新字典，保持AI玩家的引用）
                self.player_hole_cards.clear()
                self.shared_hole_cards.clear()
                
                # 记录人类玩家的底牌（Web 模式下使用 async_player）
                # 在 Web 模式下，human_player 会被 AsyncHumanPlayer 替换
                if self.human_player:
                    human_uuid = self.human_player.uuid
                    self.player_hole_cards[human_uuid] = hole_card
                    self.shared_hole_cards[human_uuid] = hole_card
                # 注意：Web 模式下，AsyncHumanPlayer 会在 receive_round_start 时自己记录底牌
                
                # Button 位置轮转（PyPokerEngine 不会自动轮转）
                # 找出所有还有筹码的玩家（淘汰的玩家不参与轮转）
                active_seats = [idx for idx, s in enumerate(seats) if s['stack'] > 0]
                active_player_count = len(active_seats)
                
                # 第一局时，Button在第一个有筹码的玩家
                if round_count == 1:
                    self.current_dealer_btn = active_seats[0] if active_seats else 0
                    self.player_count_for_dealer = active_player_count
                else:
                    # 后续局次，Button 在有筹码的玩家中顺时针移动
                    # 找到当前 dealer 在 active_seats 中的位置
                    try:
                        current_idx_in_active = active_seats.index(self.current_dealer_btn)
                        next_idx_in_active = (current_idx_in_active + 1) % active_player_count
                        self.current_dealer_btn = active_seats[next_idx_in_active]
                    except (ValueError, ZeroDivisionError):
                        # 如果当前 dealer 已被淘汰，从第一个有筹码的玩家开始
                        self.current_dealer_btn = active_seats[0] if active_seats else 0
                    
                    self.player_count_for_dealer = active_player_count
                
                # 开始新一局 - 初始化上下文
                self.current_round_id = round_count
                if self.ai_enabled:
                    round_id_str = f"round_{round_count}"
                    self.strategy_advisor.start_new_round(round_id_str)
                    self.opponent_analyzer.start_new_round(round_id_str)
                    self.board_analyzer.start_new_round(round_id_str)
                
                # 对手建模器开始新局
                self.opponent_modeler.start_new_round()
                
                # 使用我们自己管理的dealer_btn（不使用PyPokerEngine的）
                dealer_btn = self.current_dealer_btn
                
                if self.renderer:
                    self.renderer.render_round_start(round_count, hole_card,
                                                seats, dealer_btn)
            
            elif event_type == "street_start":
                street = event_data['street']
                round_state = event_data['round_state']
                community_cards = round_state.get('community_card', [])
                pot_size = round_state['pot']['main']['amount']
                
                # 记录日志：街道开始
                self.game_logger.record_street_start(street, community_cards)
                
                if self.renderer:
                    self.renderer.render_street_start(street, community_cards, pot_size)
            
            elif event_type == "game_update":
                action = event_data['action']
                player_name = action['player_uuid']
                
                # 找到玩家名字
                round_state = event_data['round_state']
                for seat in round_state['seats']:
                    if seat['uuid'] == action['player_uuid']:
                        player_name = seat['name']
                        break
                
                is_human = (player_name == "你")
                
                # 记录日志：玩家行动
                self.game_logger.record_action(
                    street=round_state.get('street', 'preflop'),
                    player_name=player_name,
                    action_type=action['action'],
                    amount=action.get('amount', 0),
                    pot_size=round_state.get('pot', {}).get('main', {}).get('amount', 0)
                )
                
                if self.renderer:
                    self.renderer.render_player_action(
                        player_name,
                        action['action'],
                        action.get('amount', 0),
                        is_human
                    )
            
            elif event_type == "round_result":
                winners = event_data['winners']
                hand_info = event_data['hand_info']
                round_state = event_data['round_state']
                
                # 在摊牌时，从shared_hole_cards获取所有底牌
                # （AI玩家会在receive_round_start时写入）
                final_hole_cards = dict(self.shared_hole_cards)
                
                # 记录日志：手牌结束
                self.game_logger.end_hand(
                    winners=winners,
                    showdown_hands=final_hole_cards,
                    total_pot=round_state.get('pot', {}).get('main', {}).get('amount', 0)
                )
                
                # 传递初始筹码和玩家底牌以用于展示（仅 CLI 模式）
                if self.renderer:
                    self.renderer.render_round_result(
                        winners, hand_info, round_state, self.initial_stacks, final_hole_cards
                    )
                    self.renderer.wait_for_continue()
        
        except Exception as e:
            if self.config.DEBUG:
                if self.renderer:
                    self.renderer.render_error(f"处理事件时出错: {e}")
                import traceback
                traceback.print_exc()
    
    def _handle_chat(self, question: str, hole_card: list, 
                    round_state: dict) -> str:
        """
        处理聊天请求
        
        Args:
            question: 用户问题
            hole_card: 手牌
            round_state: 回合状态
        
        Returns:
            AI 回复
        """
        if not self.ai_enabled or not self.ai_config.get('enable_chat', True):
            return ("AI 聊天功能未启用。\n"
                    "如需帮助，请输入 'H' 查看命令列表。")
        
        try:
            # 准备游戏上下文
            game_context = {
                "hole_cards": hole_card if hole_card else [],
                "community_cards": round_state.get('community_card', []),
                "street": round_state.get('street', ''),
                "pot_size": round_state.get('pot', {}).get('main', {}).get('amount', 0),
                "stack_size": self._get_my_stack(round_state)
            }
            
            # 调用 ChatAgent
            response = self.chat_agent.chat(question, game_context)
            return response
        
        except Exception as e:
            return f"抱歉，AI 暂时无法回答（{str(e)}）"
    
    def _get_ai_advice(self, valid_actions: list, hole_card: list,
                      round_state: dict) -> Dict[str, Any]:
        """
        获取 AI 建议
        
        Args:
            valid_actions: 可选行动
            hole_card: 手牌
            round_state: 回合状态
        
        Returns:
            AI 建议字典
        """
        try:
            # 确保 round_state 包含正确的 dealer_btn（PyPokerEngine 可能不会传递）
            # 使用我们管理的 current_dealer_btn
            if 'dealer_btn' not in round_state or round_state.get('dealer_btn') is None:
                round_state['dealer_btn'] = self.current_dealer_btn
                if self.config.DEBUG:
                    print(f"[_get_ai_advice] 注入 dealer_btn 到 round_state: {self.current_dealer_btn}")
            
            # 提取必要信息
            community_cards = round_state.get('community_card', [])
            street = round_state.get('street', 'preflop')
            pot_size = round_state.get('pot', {}).get('main', {}).get('amount', 0)
            stack_size = self._get_my_stack(round_state)
            
            # 获取玩家位置
            position = self._get_my_position(round_state)
            
            # 调试日志：记录位置信息
            if self.config.DEBUG:
                dealer_btn_from_state = round_state.get('dealer_btn')
                print(f"[_get_ai_advice] 计算的位置: {position}")
                print(f"[_get_ai_advice] round_state.dealer_btn: {dealer_btn_from_state}")
                print(f"[_get_ai_advice] self.current_dealer_btn: {self.current_dealer_btn}")
                print(f"[_get_ai_advice] 当前回合ID: {self.current_round_id}")
            
            # 计算跟注金额
            call_amount = 0
            for action in valid_actions:
                if action.get('action') == 'call':
                    call_amount = action.get('amount', 0)
                    break
            
            # 规范化 valid_actions 给 AI (Call 0 -> Check)
            ai_valid_actions = []
            for action in valid_actions:
                new_action = action.copy()
                if new_action['action'] == 'call' and new_action['amount'] == 0:
                     new_action['action'] = 'check'
                ai_valid_actions.append(new_action)
            
            # 获取对手行动（规范化Check/Call）
            # 使用完整历史，以便 AI 分析整个故事线
            opponent_actions = self._get_full_hand_history(round_state)
            
            # 获取活跃对手列表
            active_opponents = self._get_active_opponents(round_state)
            
            # 调用策略建议引擎（含对手建模）
            advice = self.strategy_advisor.get_advice(
                hole_cards=hole_card,
                community_cards=community_cards,
                street=street,
                position=position,
                pot_size=pot_size,
                stack_size=stack_size,
                call_amount=call_amount,
                valid_actions=ai_valid_actions, # 传入处理后的行动列表
                opponent_actions=opponent_actions,
                active_opponents=active_opponents
            )
            
            # 记录日志：AI 建议
            self.game_logger.record_ai_advice(street, advice)
            
            return advice
        
        except Exception as e:
            return {
                "reasoning": f"AI 建议暂时不可用（{str(e)}）",
                "recommended_action": "call"
            }
    
    def _get_my_position(self, round_state: dict) -> str:
        """
        获取玩家位置名称
        
        Args:
            round_state: 回合状态
        
        Returns:
            位置名称（BTN, SB, BB, UTG, MP, CO, HJ等）
        """
        try:
            # 找到玩家的座位索引（Web 模式下使用 async_player）
            if not self.human_player:
                # Web 模式下，human_player 可能为 None，尝试从 seats 中找到 "你"
                seats = round_state.get('seats', [])
                for idx, seat in enumerate(seats):
                    if seat.get('name') == "你":
                        my_idx = idx
                        break
                else:
                    return "Unknown"
            else:
                my_uuid = self.human_player.uuid
                my_idx = None
                seats = round_state.get('seats', [])
                
                for idx, seat in enumerate(seats):
                    if seat.get('uuid') == my_uuid:
                        my_idx = idx
                        break
            
            if my_idx is None:
                return "Unknown"
            
            # 获取庄位：优先使用 round_state 中的 dealer_btn，如果没有则使用 self.current_dealer_btn
            # 注意：PyPokerEngine 可能不会在 round_state 中传递 dealer_btn，
            # 所以我们需要使用自己管理的 current_dealer_btn
            dealer_btn_from_state = round_state.get('dealer_btn')
            if dealer_btn_from_state is not None:
                dealer_btn = dealer_btn_from_state
                if self.config.DEBUG:
                    print(f"[_get_my_position] 使用 round_state 中的 dealer_btn: {dealer_btn}")
            else:
                dealer_btn = self.current_dealer_btn
                if self.config.DEBUG:
                    print(f"[_get_my_position] round_state 中没有 dealer_btn，使用 self.current_dealer_btn: {dealer_btn}")
            
            active_seats = [idx for idx, s in enumerate(seats) if s['stack'] > 0]
            active_count = len(active_seats)
            
            # 两人对决
            if active_count == 2:
                return "BTN" if my_idx == dealer_btn else "BB"
            
            # 多人游戏：计算位置
            if my_idx == dealer_btn:
                return "BTN"
            
            # 在活跃玩家中找到相对位置
            try:
                dealer_idx_in_active = active_seats.index(dealer_btn)
                my_idx_in_active = active_seats.index(my_idx)
                
                # 计算相对位置（顺时针距离）
                relative_pos = (my_idx_in_active - dealer_idx_in_active) % active_count
                
                if relative_pos == 1:
                    return "SB"
                elif relative_pos == 2:
                    return "BB"
                elif relative_pos == active_count - 1:
                    return "CO"  # Cut-off
                elif relative_pos == active_count - 2:
                    return "HJ"  # Hijack
                elif relative_pos == 3:
                    return "UTG"  # Under the gun
                else:
                    return "MP"  # Middle position
            except ValueError:
                return "Unknown"
        
        except Exception as e:
            if self.config.DEBUG:
                print(f"获取位置失败: {e}")
            return "Unknown"
    
    def _get_my_stack(self, round_state: dict) -> int:
        """获取自己的筹码数"""
        for seat in round_state.get('seats', []):
            if seat.get('name') == "你":
                return seat.get('stack', 1000)
        return 1000
    
    def _get_active_opponents(self, round_state: dict) -> List[str]:
        """获取当前活跃的对手"""
        opponents = []
        for seat in round_state.get('seats', []):
            player_name = seat.get('name', '')
            if player_name != "你" and seat.get('state') != 'folded':
                opponents.append(player_name)
        return opponents
    
    def _record_opponent_action(self, action: Dict, round_state: dict):
        """记录对手行动到建模器"""
        if not hasattr(self, 'opponent_modeler'):
            return
        
        try:
            # 从action中提取信息
            player_uuid = action.get('uuid', '')
            action_type = action.get('action', '')
            amount = action.get('amount', 0)
            
            # 找到对应的玩家名称
            player_name = None
            for seat in round_state.get('seats', []):
                if seat.get('uuid') == player_uuid:
                    player_name = seat.get('name', '')
                    break
            
            if player_name and player_name != "你":
                # 记录到对手建模器
                self.opponent_modeler.record_action(
                    player_name=player_name,
                    action=action_type,
                    amount=amount,
                    street=round_state.get('street', ''),
                    pot_size=round_state.get('pot', {}).get('main', {}).get('amount', 0),
                    community_cards=round_state.get('community_card', [])
                )
        except Exception as e:
            if self.config.DEBUG:
                print(f"记录对手行动失败: {e}")
    
    def _get_recent_actions(self, round_state: dict) -> List[Dict]:
        """获取最近的对手行动（规范化Check/Call）- 仅当前街道"""
        # 保持兼容性，某些逻辑可能只关心当前街道
        actions = []
        action_histories = round_state.get('action_histories', {})
        
        # 获取当前街道的行动
        street = round_state.get('street', 'preflop')
        if street in action_histories:
            for action in action_histories[street]:
                # 记录到对手建模器 (仍然在实时流中记录)
                self._record_opponent_action(action, round_state)
                
                action_type = action.get('action', '').lower()
                amount = action.get('amount', 0)
                
                # 规范化：将 call 0 转换为 check
                if action_type == 'call' and amount == 0:
                    action_type = 'check'
                
                actions.append({
                    "player": action.get('uuid', ''),
                    "action": action_type,
                    "amount": amount
                })
        
        return actions

    def _get_full_hand_history(self, round_state: dict) -> List[Dict]:
        """获取完整的局内行动历史（所有街道）"""
        full_history = []
        action_histories = round_state.get('action_histories', {})
        
        # 按顺序遍历所有街道
        for street in ['preflop', 'flop', 'turn', 'river']:
            if street in action_histories:
                for action in action_histories[street]:
                    action_type = action.get('action', '').lower()
                    amount = action.get('amount', 0)
                    
                    # 规范化：将 call 0 转换为 check
                    if action_type == 'call' and amount == 0:
                        action_type = 'check'
                    
                    # 转换玩家 ID 为友好名称
                    player_uuid = action.get('uuid', '')
                    player_name = "未知"
                    
                    # 查找座位信息
                    for seat in round_state.get('seats', []):
                        if seat['uuid'] == player_uuid:
                            if seat['name'] == "你":
                                player_name = "我"
                            else:
                                player_name = seat['name'] # AI_1, AI_2 等
                            break
                            
                    full_history.append({
                        "street": street,
                        "player": player_name, # 使用名称而非 UUID
                        "action": action_type,
                        "amount": amount
                    })
        
        return full_history

