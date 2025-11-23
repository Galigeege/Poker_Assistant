"""
Poker Assistant Backend
FastAPI + WebSocket Server
"""
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from backend.connection_manager import manager
from backend.game_manager import game_manager

# 加载环境变量
load_dotenv()

app = FastAPI(
    title="Poker AI Arena API",
    description="Real-time Texas Hold'em AI Arena Backend",
    version="2.0.0"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发阶段允许所有源
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
    """
    print("[WS] New connection request...")
    await manager.connect(websocket)
    print("[WS] Connection accepted.")
    
    try:
        # 发送欢迎消息
        await manager.send_personal_message(
            {"type": "system", "content": "Connected to Poker AI Server v2.0"},
            websocket
        )
        
        # 自动开始游戏 (Phase 2 简化逻辑：只要连上就开打)
        # 注意：在真实产品中，应该由客户端发送 "start_game" 指令
        print("[WS] Checking game manager status...")
        if not game_manager.is_running:
            print("[WS] Starting game manager...")
            try:
                game_manager.start_game()
                print("[WS] Game manager started.")
            except Exception as e:
                print(f"[WS] Failed to start game: {e}")
        
        while True:
            # 等待客户端消息
            data = await websocket.receive_json()
            print(f"[WebSocket] Received: {data}")
            
            # 处理指令
            msg_type = data.get("type")
            
            if msg_type == "player_action":
                # 转发给 GameManager
                game_manager.handle_player_action(data.get("data", {}))
            elif msg_type == "ping":
                await manager.send_personal_message({"type": "pong"}, websocket)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        # 可选：如果最后一个人断开，停止游戏
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    # 开发模式启动
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
