"""
Poker Assistant Backend
FastAPI + WebSocket Server
"""
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from backend.connection_manager import manager
from backend.user_game_manager import user_game_manager
from backend.auth.router import router as auth_router
from backend.game.router import router as game_router
from backend.database.session import init_db

# 加载环境变量
load_dotenv()

app = FastAPI(
    title="Poker AI Arena API",
    description="Real-time Texas Hold'em AI Arena Backend",
    version="2.0.0"
)

# 初始化数据库
init_db()

# 注册路由
app.include_router(auth_router)
app.include_router(game_router)

# 配置 CORS
# 从环境变量读取允许的源，支持多个域名（逗号分隔）
# 如果未设置，开发环境默认允许所有源，生产环境应设置具体域名
cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    cors_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
else:
    # 开发环境默认允许所有源
    cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to Poker AI Arena API"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "2.0.0"}

@app.websocket("/ws/game")
async def websocket_endpoint(websocket: WebSocket):
    """
    游戏主 WebSocket 接口
    支持用户认证，为每个用户创建独立的游戏实例
    """
    print("[WS] New connection request...")
    
    # 从查询参数获取 token
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return
    
    # 验证 token 并获取用户
    user = user_game_manager.get_user_from_token(token)
    if not user:
        await websocket.close(code=4003, reason="Invalid authentication token")
        return
    
    user_id = user.id
    print(f"[WS] User authenticated: {user.username} (ID: {user_id})")
    
    # 连接时传入 user_id，用于连接隔离
    await manager.connect(websocket, user_id=user_id)
    print("[WS] Connection accepted.")
    
    # 获取用户的游戏管理器
    game_manager = user_game_manager.get_game_manager(user_id)
    # 设置账号级别 key（全局生效）
    game_manager.user_api_key = getattr(user, "deepseek_api_key", None)
    
    # 尝试从当前 session 加载配置（如果存在）
    # 注意：session_id 需要通过 WebSocket 消息传递，这里先尝试从数据库获取最新的 session
    try:
        from backend.database.session import get_db
        from backend.database import crud
        db = next(get_db())
        # 获取用户最新的 session
        sessions = crud.get_user_game_sessions(db, user_id, limit=1, offset=0)
        if sessions and sessions[0].config:
            game_manager.session_config = sessions[0].config
            print(f"[WS] Loaded session config for user {user.username}: {game_manager.session_config}")
        db.close()
    except Exception as e:
        print(f"[WS] Failed to load session config: {e}")
        import traceback
        traceback.print_exc()
    
    try:
        # 发送欢迎消息（包含管理员状态）
        await manager.send_personal_message(
            {
                "type": "system", 
                "content": f"Connected to Poker AI Server v2.0 (User: {user.username})",
                "is_admin": getattr(user, 'is_admin', False)
            },
            websocket
        )

        # 若服务器无默认 Key 且用户账号也未配置 Key：提示去配置页面
        env_key = os.getenv("DEEPSEEK_API_KEY", "") or ""
        has_default_key = bool(env_key) and ("your_" not in env_key)
        has_user_key = bool(game_manager.user_api_key)
        if not has_default_key and not has_user_key:
            await manager.send_personal_message(
                {
                    "type": "needs_api_key",
                    "content": "未检测到服务器默认 Deepseek API Key，且你的账号尚未配置。请前往设置页面配置后再使用 AI 功能。",
                },
                websocket
            )
        
        # 检查游戏状态，优先恢复现有游戏
        thread_alive = game_manager.game_thread.is_alive() if game_manager.game_thread else False
        print(f"[WS] User {user.username}: Checking game manager status. is_running={game_manager.is_running}, thread_alive={thread_alive}, async_player={game_manager.async_player is not None}")
        
        # 策略：优先恢复现有游戏，只有在游戏真正无法继续时才启动新游戏
        # 1. 如果游戏正常运行（线程存活，async_player 存在），直接使用现有游戏
        if game_manager.is_running and thread_alive and game_manager.async_player:
            print(f"[WS] User {user.username}: Game is running normally, will resume existing game")
            # 发送待处理的状态（如果有）
            await game_manager.send_pending_state(websocket)
        # 2. 如果游戏线程已死但 is_running 仍为 True（异常情况），需要重启
        elif game_manager.is_running and not thread_alive:
            print(f"[WS] User {user.username}: Game flag is running but thread is dead, need restart")
            game_manager.force_restart()
            game_manager.start_game()
        # 3. 如果线程存活但 async_player 为 None（异常情况），需要重启
        elif thread_alive and game_manager.async_player is None:
            print(f"[WS] User {user.username}: Thread is alive but async_player is None, need restart")
            game_manager.force_restart()
            game_manager.start_game()
        # 4. 如果游戏未运行，启动新游戏
        elif not game_manager.is_running and not thread_alive:
            print(f"[WS] User {user.username}: Game is not running, starting new game...")
            try:
                game_manager.start_game()
                print(f"[WS] User {user.username}: Game manager started.")
            except Exception as e:
                print(f"[WS] User {user.username}: Failed to start game: {e}")
                import traceback
                traceback.print_exc()
        else:
            print(f"[WS] User {user.username}: Unexpected game state, attempting to start new game...")
            game_manager.force_restart()
            try:
                game_manager.start_game()
            except Exception as e:
                print(f"[WS] User {user.username}: Failed to start game: {e}")
                import traceback
                traceback.print_exc()
        
        while True:
            # 等待客户端消息
            data = await websocket.receive_json()
            print(f"[WebSocket] Received: {data}")
            
            # 处理指令
            msg_type = data.get("type")
            
            if msg_type == "player_action":
                # 转发给 GameManager
                game_manager.handle_player_action(data.get("data", {}))
            elif msg_type == "start_next_round":
                # 处理"下一局"消息
                game_manager.handle_start_next_round()
            elif msg_type == "ai_copilot_setting":
                # 处理 AI Copilot 开关设置
                enabled = data.get("data", {}).get("enabled", False)
                game_manager.set_ai_copilot_enabled(enabled)
            elif msg_type == "review_request":
                # 处理复盘请求
                review_data = data.get("data", {})
                result = await game_manager.handle_review_request(review_data)
                await manager.send_personal_message(result, websocket)
            elif msg_type == "ping":
                await manager.send_personal_message({"type": "pong"}, websocket)
            elif msg_type == "new_game":
                # 处理"新游戏"请求（明确要求开始新游戏）
                print(f"[WS] User {user.username}: New game request received, restarting game...")
                game_manager.force_restart()
                game_manager.start_game()
                await manager.send_personal_message(
                    {"type": "system", "content": "新游戏已开始"},
                    websocket
                )
            elif msg_type == "debug_mode":
                # 处理 Debug 模式设置（仅管理员）
                if not user.is_admin:
                    await manager.send_personal_message(
                        {"type": "error", "content": "仅管理员可以使用 Debug 功能"},
                        websocket
                    )
                    continue
                
                debug_data = data.get("data", {})
                enabled = debug_data.get("enabled", False)
                filter_bots = debug_data.get("filter_bots", None)  # ["AI_1", "AI_3"] 或 None
                game_manager.set_debug_mode(enabled, filter_bots)
                await manager.send_personal_message(
                    {
                        "type": "debug_mode_updated",
                        "data": {
                            "enabled": enabled,
                            "filter_bots": filter_bots
                        }
                    },
                    websocket
                )
            
    except WebSocketDisconnect:
        print(f"[WS] User {user.username}: Client disconnected")
        manager.disconnect(websocket)
        # 不断开连接时不停止游戏，允许用户重新连接后恢复游戏
        # 游戏会继续运行，等待用户重新连接
        # 注意：这里不删除 game_manager，因为用户可能重新连接
        print(f"[WS] User {user.username}: Client disconnected. Remaining connections: {len(manager.active_connections)}. Game continues running.")
    except Exception as e:
        print(f"[WS] WebSocket error: {e}")
        import traceback
        traceback.print_exc()
        manager.disconnect(websocket)
        # 不断开连接时不停止游戏，允许用户重新连接后恢复游戏
        print(f"[WS] Client disconnected after error. Remaining connections: {len(manager.active_connections)}. Game continues running.")

if __name__ == "__main__":
    import sys
    import os
    import uvicorn
    
    # 确保项目根目录在 Python 路径中
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    
    # 开发模式启动
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
