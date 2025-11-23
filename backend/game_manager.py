"""
游戏管理器模块
负责管理游戏线程和 WebSocket 通信的桥梁
"""
import threading
import asyncio
from queue import Queue, Empty
from typing import Dict, Any, Optional

from poker_assistant.engine.game_controller import GameController
from poker_assistant.engine.async_human_player import AsyncHumanPlayer
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
    
    def __init__(self):
        self.game_thread = None
        self.is_running = False
        
        # 通信队列
        self.request_queue = Queue()  # Game -> Web
        self.response_queue = Queue() # Web -> Game
        
        # 游戏控制器实例
        self.config = Config()
        self.controller = GameController(self.config)
        
    def start_game(self):
        """启动游戏线程"""
        if self.is_running:
            return
            
        self.is_running = True
        self.game_thread = threading.Thread(target=self._game_loop, daemon=True)
        self.game_thread.start()
        print("Game thread started.")
        
        # 启动队列监听任务
        asyncio.create_task(self._listen_to_game_events())

    def stop_game(self):
        """停止游戏"""
        self.is_running = False
        # 这里可能需要更复杂的逻辑来优雅地停止 PyPokerEngine
        
    def handle_player_action(self, action_data: Dict[str, Any]):
        """处理玩家操作（来自 WebSocket）"""
        # 将操作放入响应队列，解除游戏线程的阻塞
        print(f"[GameManager] Pushing action to queue: {action_data}")
        self.response_queue.put(action_data)

    async def _listen_to_game_events(self):
        """监听游戏事件并广播到 WebSocket"""
        while self.is_running:
            try:
                # 非阻塞获取，避免卡死 asyncio 循环
                # 使用 run_in_executor 来执行阻塞的 queue.get
                # 或者简单的轮询 + sleep
                try:
                    event = self.request_queue.get_nowait()
                    # 广播事件
                    await manager.broadcast(event)
                except Empty:
                    await asyncio.sleep(0.1)
                    
            except Exception as e:
                print(f"Error in event listener: {e}")
                await asyncio.sleep(1)

    def _game_loop(self):
        """
        游戏主循环 (运行在独立线程中)
        """
        print("[GameThread] Initializing game...")
        
        # 1. 设置游戏
        self.controller._setup_game()
        
        # 2. 替换人类玩家为 AsyncHumanPlayer
        # 我们需要重写 _create_poker_config 部分逻辑，或者手动注入
        
        # 为了复用 GameController 的初始化逻辑，我们直接修改其 human_player 属性
        # 这有点 hacky，但在 Phase 2 是可行的
        async_player = AsyncHumanPlayer(
            uuid="human_player", 
            name="你", 
            request_queue=self.request_queue, 
            response_queue=self.response_queue
        )
        
        # 重新配置 PyPokerEngine
        poker_config = setup_config(
            max_round=self.config.GAME_MAX_ROUND,
            initial_stack=self.config.GAME_INITIAL_STACK,
            small_blind_amount=self.config.GAME_SMALL_BLIND
        )
        
        # 注册玩家
        poker_config.register_player(name="你", algorithm=async_player)
        
        # 注册 AI
        for idx, ai_player in enumerate(self.controller.ai_players):
            ai_name = f"AI_{idx+1}"
            poker_config.register_player(name=ai_name, algorithm=ai_player)
            
        print("[GameThread] Starting start_poker...")
        
        try:
            # 启动游戏 (阻塞调用)
            start_poker(poker_config, verbose=1)
        except Exception as e:
            print(f"[GameThread] Game Error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            self.is_running = False
            print("[GameThread] Game finished.")

# 全局单例
game_manager = GameManager()

