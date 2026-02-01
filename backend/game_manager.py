"""
游戏管理器模块
负责管理游戏线程和 WebSocket 通信的桥梁
"""
import threading
import asyncio
from queue import Queue, Empty
from typing import Dict, Any, Optional, List

from poker_assistant.engine.game_controller import GameController
from poker_assistant.engine.async_human_player import AsyncHumanPlayer
from poker_assistant.ai_analysis.review_analyzer import ReviewAnalyzer
# 应用 PyPokerEngine 手牌评估修复补丁
from poker_assistant.engine import patched_game_evaluator  # noqa: F401
from poker_assistant.utils.config import Config
from pypokerengine.api.game import setup_config, start_poker
from backend.connection_manager import manager

class GameManager:
    """
    游戏管理器
    - 运行在主线程（FastAPI 循环）中
    - 管理一个后台游戏线程 (Worker Thread)
    - 处理 WebSocket 消息和游戏事件的转发
    """
    
    def __init__(self, user_id: str = None):
        self.user_id = user_id  # 关联的用户 ID
        self.game_thread = None
        self.is_running = False
        self.async_player = None  # Reference to AsyncHumanPlayer for signaling
        
        # 通信队列
        self.request_queue = Queue()  # Game -> Web
        self.response_queue = Queue() # Web -> Game
        
        # 游戏控制器实例
        self.config = Config()
        self.controller = GameController(self.config)
        
        # Session 配置（用于覆盖默认配置）
        self.session_config: Optional[Dict[str, Any]] = None
        # 用户账号级别的 Deepseek API Key（用于全局生效）
        self.user_api_key: Optional[str] = None
        
        # 保存最后一个待处理的状态（用于连接恢复）
        self.pending_round_start = None      # 最后一个 round_start（应该在 action_request 之前）
        self.pending_action_request = None  # 最后一个 action_request
        self.pending_round_result = None    # 最后一个 round_result
        
        # 复盘分析器（如果 AI 已启用）
        self.review_analyzer = None
        # 注意：后端可能有环境默认 Key，也可能希望使用 session_config 中的用户自定义 Key。
        # 这里不强依赖环境变量初始化；实际调用复盘时会按优先级选择 key 并创建 analyzer。
        try:
            self.review_analyzer = ReviewAnalyzer()
            print(f"[GameManager] ReviewAnalyzer initialized for user {user_id}.")
        except Exception as e:
            # 允许无 key 启动；复盘时再创建/报错
            self.review_analyzer = None
            print(f"[GameManager] ReviewAnalyzer not initialized at startup: {e}")
        
        # Debug 模式配置
        self.debug_mode = False  # 是否启用 Debug Panel
        self.debug_filter: Optional[List[str]] = None  # 过滤指定 AI 玩家 ID，None 表示显示全部
        
    def start_game(self):
        """启动游戏线程"""
        # 如果游戏正在运行，先停止它（完全清空，因为要启动新游戏）
        if self.is_running:
            print("[GameManager] Game is already running, stopping it first...")
            self.stop_game(clear_async_player=True)
            # 等待旧线程结束（最多等待2秒）
            if self.game_thread and self.game_thread.is_alive():
                self.game_thread.join(timeout=2.0)
                if self.game_thread.is_alive():
                    print("[GameManager] WARNING: Old game thread did not stop in time")
            
        self.is_running = True
        self.game_thread = threading.Thread(target=self._game_loop, daemon=True)
        self.game_thread.start()
        print(f"[GameManager] Game thread started. Thread ID: {self.game_thread.ident}")
        
        # 启动队列监听任务
        asyncio.create_task(self._listen_to_game_events())

    def stop_game(self, clear_async_player=True):
        """停止游戏
        
        Args:
            clear_async_player: 是否清空 async_player 引用。在 force_restart 时应该清空，但在正常游戏流程中不应该清空
        """
        if not self.is_running:
            return
            
        print("[GameManager] Stopping game...")
        self.is_running = False
        
        # 只有在明确需要清空时才清空 async_player（比如完全重启游戏）
        if clear_async_player:
            self.async_player = None
        
        # 清空队列，避免旧消息干扰
        while not self.request_queue.empty():
            try:
                self.request_queue.get_nowait()
            except Empty:
                break
        while not self.response_queue.empty():
            try:
                self.response_queue.get_nowait()
            except Empty:
                break
        
        print("[GameManager] Game stopped.")
        # 注意：PyPokerEngine 的 start_poker 是阻塞调用，无法直接中断
        # 但设置 is_running = False 后，_game_loop 会在完成后退出
    
    def force_restart(self):
        """强制重启游戏（用于处理页面刷新等情况）"""
        print("[GameManager] Force restarting game...")
        
        # 先停止当前游戏
        self.stop_game()
        
        # 等待旧线程结束（最多等待2秒）
        if self.game_thread and self.game_thread.is_alive():
            print("[GameManager] Waiting for old game thread to finish...")
            self.game_thread.join(timeout=2.0)
            if self.game_thread.is_alive():
                print("[GameManager] WARNING: Old game thread did not stop in time, but continuing anyway")
            else:
                print("[GameManager] Old game thread stopped successfully")
        
        # 重新创建 GameController
        self.controller = GameController(self.config)
        print("[GameManager] Force restart complete. Ready to start new game.")
        
    def handle_player_action(self, action_data: Dict[str, Any]):
        """处理玩家操作（来自 WebSocket）"""
        # 将操作放入响应队列，解除游戏线程的阻塞
        print(f"[GameManager] Pushing action to queue: {action_data}")
        self.response_queue.put(action_data)
        # 清除待处理的 action_request，因为用户已经响应
        self.clear_pending_state('action_request')
    
    def handle_start_next_round(self):
        """处理"下一局"消息"""
        print("[GameManager] handle_start_next_round called")
        # Signal the async player to continue
        if hasattr(self, 'async_player') and self.async_player:
            print(f"[GameManager] Signaling async_player (id: {id(self.async_player)})")
            self.async_player.signal_next_round()
            print("[GameManager] Signal sent successfully")
            # 清除待处理的 round_result，因为用户已经点击下一局
            self.clear_pending_state('round_result')
        else:
            print("[GameManager] ERROR: No async_player reference, cannot signal next round")
            print(f"[GameManager] hasattr check: {hasattr(self, 'async_player')}")
            if hasattr(self, 'async_player'):
                print(f"[GameManager] async_player value: {self.async_player}")
    
    def set_ai_copilot_enabled(self, enabled: bool):
        """设置 AI Copilot 开关状态"""
        if hasattr(self, 'async_player') and self.async_player:
            if hasattr(self.async_player, 'set_ai_copilot_enabled'):
                self.async_player.set_ai_copilot_enabled(enabled)
                print(f"[GameManager] AI Copilot {'已启用' if enabled else '已禁用'}")
            else:
                print(f"[GameManager] Warning: async_player 没有 set_ai_copilot_enabled 方法")
        else:
            print(f"[GameManager] Warning: async_player 不存在")
    
    def set_debug_mode(self, enabled: bool, filter_bots: Optional[List[str]] = None):
        """
        设置 Debug 模式
        
        Args:
            enabled: 是否启用 Debug 模式
            filter_bots: 仅显示指定 AI 玩家的日志（如 ["AI_1", "AI_3"]），None 表示显示全部
        """
        self.debug_mode = enabled
        self.debug_filter = filter_bots
        print(f"[GameManager] Debug mode {'启用' if enabled else '禁用'}, filter={filter_bots}")
        
        # 更新所有 AI 玩家的 debug callback
        if hasattr(self, 'controller') and hasattr(self.controller, 'ai_players'):
            for ai_player in self.controller.ai_players:
                if enabled:
                    ai_player.set_debug_callback(self._debug_callback)
                else:
                    ai_player.clear_debug_callback()
    
    def _debug_callback(self, debug_log: Dict[str, Any]):
        """
        Debug 回调：将 AI Bot 的 LLM 交互日志发送到前端
        """
        if not self.debug_mode:
            return
        
        # 检查过滤条件
        bot_name = debug_log.get("bot_name", "")
        if self.debug_filter and bot_name not in self.debug_filter:
            return
        
        # 构建 debug 消息
        debug_message = {
            "type": "debug_log",
            "data": debug_log
        }
        
        # 将消息放入队列以便通过 WebSocket 发送
        self.request_queue.put(debug_message)
        print(f"[GameManager] Debug log queued for {bot_name}")
    
    async def handle_review_request(self, review_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        处理复盘请求
        
        Args:
            review_data: 复盘所需数据，包含：
                - hero_hole_cards: 玩家手牌
                - community_cards: 公共牌
                - street_history: 每条街的行动历史
                - winners: 赢家信息
                - hand_info: 手牌信息
                - final_pot: 最终底池
                - seats: 座位信息
        
        Returns:
            复盘结果消息（结构化 JSON）
        """
        print(f"[GameManager] Received review request")
        
        # 优先级：session_config（本局） > user_api_key（账号） > 环境默认 key
        session_key = None
        if self.session_config:
            session_key = self.session_config.get("deepseek_api_key") or self.session_config.get("DEEPSEEK_API_KEY")
        user_key = self.user_api_key
        key_source = "session" if session_key else ("user" if user_key else "env")
        
        try:
            # 为本次请求创建 analyzer（确保使用正确的 key）
            key_to_use = session_key or user_key
            try:
                analyzer = ReviewAnalyzer(provider="deepseek", api_key=key_to_use) if key_to_use else (self.review_analyzer or ReviewAnalyzer())
            except Exception as e:
                return {
                    "type": "review_result",
                    "data": {
                        "streets": [],
                        "error": f"AI 复盘不可用（{key_source} key 无效或未配置：{str(e)}）"
                    }
                }

            # 从 review_data 中提取数据
            hero_hole_cards = review_data.get("hero_hole_cards", [])
            community_cards = review_data.get("community_cards", [])
            street_history = review_data.get("street_history", [])
            winners = review_data.get("winners", [])
            hand_info = review_data.get("hand_info", [])
            final_pot = review_data.get("final_pot", 0)
            seats = review_data.get("seats", [])
            
            # 构建行动历史（用于 ReviewAnalyzer）
            action_history = []
            for street_data in street_history:
                street = street_data.get("street", "")
                for action in street_data.get("actions", []):
                    action_history.append({
                        "street": street,
                        "player_name": action.get("player", ""),
                        "action": action.get("action", ""),
                        "amount": action.get("amount", 0)
                    })
            
            # 构建赢家信息（添加 name）
            winners_with_names = []
            for winner in winners:
                winner_uuid = winner.get("uuid", "")
                winner_name = "Unknown"
                for seat in seats:
                    if seat.get("uuid") == winner_uuid:
                        winner_name = seat.get("name", "Unknown")
                        break
                winners_with_names.append({
                    "uuid": winner_uuid,
                    "name": winner_name,
                    "stack": winner.get("stack", 0)
                })
            
            # 调用 ReviewAnalyzer（在线程池中执行以避免阻塞）
            import asyncio
            loop = asyncio.get_event_loop()
            review_result = await loop.run_in_executor(
                None,
                lambda: analyzer.generate_review(
                    round_count=1,
                    hole_cards=hero_hole_cards,
                    community_cards=community_cards,
                    action_history=action_history,
                    winners=winners_with_names,
                    hand_info=hand_info or [],
                    final_pot=final_pot
                )
            )
            
            print(f"[GameManager] Review generated successfully")
            
            # 使用实际的 street_history 中的 community_cards 替换 LLM 返回的（可能格式不正确）
            if "streets" in review_result and isinstance(review_result["streets"], list):
                # 创建 street -> community_cards 映射
                street_cards_map = {}
                for street_data in street_history:
                    street_name = street_data.get("street", "")
                    cards = street_data.get("community_cards", [])
                    if cards:
                        street_cards_map[street_name] = cards
                
                # 替换每个 street 的 community_cards
                for street_review in review_result["streets"]:
                    street_name = street_review.get("street", "")
                    if street_name in street_cards_map:
                        street_review["community_cards"] = street_cards_map[street_name]
                        print(f"[GameManager] Replaced community_cards for {street_name} with actual data: {street_cards_map[street_name]}")
            
            # review_result 现在是结构化的 dict
            return {
                "type": "review_result",
                "data": review_result
            }
            
        except Exception as e:
            print(f"[GameManager] Review generation failed: {e}")
            import traceback
            traceback.print_exc()
            return {
                "type": "review_result",
                "data": {
                    "streets": [],
                    "error": f"复盘生成失败: {str(e)}"
                }
            }

    async def _listen_to_game_events(self):
        """监听游戏事件并广播到 WebSocket"""
        while self.is_running:
            try:
                # 非阻塞获取，避免卡死 asyncio 循环
                # 使用 run_in_executor 来执行阻塞的 queue.get
                # 或者简单的轮询 + sleep
                try:
                    event = self.request_queue.get_nowait()
                    event_type = event.get('type', '')
                    
                    # 保存待处理的状态，用于连接恢复
                    if event_type == 'round_start':
                        self.pending_round_start = event
                        print("[GameManager] Saved pending round_start for reconnection")
                    elif event_type == 'action_request':
                        self.pending_action_request = event
                        print("[GameManager] Saved pending action_request for reconnection")
                    elif event_type == 'round_result':
                        self.pending_round_result = event
                        print("[GameManager] Saved pending round_result for reconnection")
                    
                    # 只向特定用户发送事件（如果 user_id 存在）
                    if self.user_id:
                        await manager.send_to_user(event, self.user_id)
                    else:
                        # 向后兼容：如果没有 user_id，广播给所有连接
                        await manager.broadcast(event)
                except Empty:
                    await asyncio.sleep(0.1)
                    
            except Exception as e:
                print(f"Error in event listener: {e}")
                await asyncio.sleep(1)
    
    async def send_pending_state(self, websocket):
        """向新连接的客户端发送待处理的状态（用于连接恢复）"""
        # 按顺序发送：round_start -> action_request -> round_result
        if self.pending_round_start:
            print("[GameManager] Sending pending round_start to reconnected client")
            if self.user_id:
                await manager.send_to_user(self.pending_round_start, self.user_id)
            else:
                await manager.send_personal_message(self.pending_round_start, websocket)
            # 等待一小段时间，确保 round_start 先处理
            import asyncio
            await asyncio.sleep(0.1)
        
        if self.pending_action_request:
            print("[GameManager] Sending pending action_request to reconnected client")
            if self.user_id:
                await manager.send_to_user(self.pending_action_request, self.user_id)
            else:
                await manager.send_personal_message(self.pending_action_request, websocket)
        elif self.pending_round_result:
            print("[GameManager] Sending pending round_result to reconnected client")
            if self.user_id:
                await manager.send_to_user(self.pending_round_result, self.user_id)
            else:
                await manager.send_personal_message(self.pending_round_result, websocket)
        else:
            if not self.pending_round_start:
                print("[GameManager] No pending state to send")
    
    def clear_pending_state(self, state_type: str = None):
        """清除待处理的状态
        
        Args:
            state_type: 要清除的状态类型 ('round_start', 'action_request', 'round_result')，如果为 None 则清除所有
        """
        if state_type is None:
            self.pending_round_start = None
            self.pending_action_request = None
            self.pending_round_result = None
            print("[GameManager] Cleared all pending states")
        elif state_type == 'round_start':
            self.pending_round_start = None
            print("[GameManager] Cleared pending round_start")
        elif state_type == 'action_request':
            self.pending_action_request = None
            print("[GameManager] Cleared pending action_request")
        elif state_type == 'round_result':
            self.pending_round_result = None
            print("[GameManager] Cleared pending round_result")

    def _game_loop(self):
        """
        游戏主循环 (运行在独立线程中)
        """
        thread_id = threading.current_thread().ident
        print(f"[GameThread-{thread_id}] Initializing game...")
        
        # 检查是否应该继续运行
        if not self.is_running:
            print(f"[GameThread-{thread_id}] Game was stopped before initialization, exiting...")
            return
        
        # 1. 根据 session_config / user_api_key 构建本局配置（盲注/初始筹码/用户 LLM key）
        session_key = None
        game_overrides: Dict[str, Any] = {}
        if self.session_config:
            # 游戏参数覆盖
            if 'small_blind' in self.session_config:
                game_overrides['small_blind_amount'] = int(self.session_config['small_blind'])
            if 'big_blind' in self.session_config:
                game_overrides['big_blind_amount'] = int(self.session_config['big_blind'])
            if 'initial_stack' in self.session_config:
                game_overrides['initial_stack'] = int(self.session_config['initial_stack'])
            # LLM key（Deepseek）
            session_key = self.session_config.get('deepseek_api_key') or self.session_config.get('DEEPSEEK_API_KEY')

        # 统一 key 优先级：session > user > env
        key_to_use = session_key or self.user_api_key
        key_source = "session" if session_key else ("user" if self.user_api_key else "env")

        # 使用覆盖配置创建 GameController（让 Copilot/对手 AI/聊天等都使用用户 key）
        self.controller = GameController(
            self.config,
            game_overrides=game_overrides or None,
            llm_provider="deepseek",
            llm_api_key=key_to_use
        )
        print(f"[GameThread-{thread_id}] LLM key source for this game: {key_source}, enabled={self.controller.ai_enabled}")

        # 2. 设置游戏
        self.controller._setup_game()
        
        # 2. 替换人类玩家为 AsyncHumanPlayer
        # 我们需要重写 _create_poker_config 部分逻辑，或者手动注入
        
        # 为了复用 GameController 的初始化逻辑，我们直接修改其 human_player 属性
        # 这有点 hacky，但在 Phase 2 是可行的
        async_player = AsyncHumanPlayer(
            uuid="human_player", 
            name="你", 
            request_queue=self.request_queue, 
            response_queue=self.response_queue,
            game_controller=self.controller
        )
        self.async_player = async_player  # Store reference for signaling
        
        # 替换 GameController 中的 human_player 引用，确保 shared_hole_cards 使用正确的 UUID
        self.controller.human_player = async_player
        
        # 重新配置 PyPokerEngine
        # 优先使用 session_config 中的盲注/初始筹码设置，否则使用默认配置
        small_blind = self.config.GAME_SMALL_BLIND
        big_blind = self.config.GAME_BIG_BLIND
        initial_stack = self.config.GAME_INITIAL_STACK
        if self.session_config:
            if 'small_blind' in self.session_config:
                small_blind = int(self.session_config['small_blind'])
            if 'big_blind' in self.session_config:
                big_blind = int(self.session_config['big_blind'])
            if 'initial_stack' in self.session_config:
                initial_stack = int(self.session_config['initial_stack'])
        
        print(f"[GameThread-{thread_id}] Using config: SB={small_blind}, BB={big_blind}, initial_stack={initial_stack}")
        
        poker_config = setup_config(
            max_round=self.config.GAME_MAX_ROUND,
            initial_stack=initial_stack,
            small_blind_amount=small_blind
        )
        
        # 注册玩家
        poker_config.register_player(name="你", algorithm=async_player)
        
        # 注册 AI
        for idx, ai_player in enumerate(self.controller.ai_players):
            ai_name = f"AI_{idx+1}"
            poker_config.register_player(name=ai_name, algorithm=ai_player)
            
            # 如果 Debug 模式已启用，设置 debug callback
            if self.debug_mode:
                ai_player.set_debug_callback(self._debug_callback)
            
        print(f"[GameThread-{thread_id}] Starting start_poker... Debug mode: {self.debug_mode}")
        
        try:
            # 启动游戏 (阻塞调用)
            start_poker(poker_config, verbose=1)
        except Exception as e:
            print(f"[GameThread-{thread_id}] Game Error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            self.is_running = False
            print(f"[GameThread-{thread_id}] Game finished. is_running={self.is_running}")

# 全局单例
game_manager = GameManager()

