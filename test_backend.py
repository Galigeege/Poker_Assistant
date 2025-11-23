"""
后端集成测试脚本
模拟 Web 前端，测试 FastAPI + WebSocket + GameEngine 的完整链路
"""
import asyncio
import json
import websockets
import sys

async def test_game_flow():
    # 强制禁用代理，防止 localhost 连接失败
    import os
    os.environ.pop("http_proxy", None)
    os.environ.pop("https_proxy", None)
    os.environ.pop("all_proxy", None)
    
    uri = "ws://localhost:8000/ws/game"
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri, ping_interval=None) as websocket:
            print("✅ Connected!")
            
            # 1. 等待欢迎消息
            msg = await websocket.recv()
            print(f"[Server] {msg}")
            
            # 2. 游戏循环
            while True:
                msg_str = await websocket.recv()
                try:
                    msg = json.loads(msg_str)
                    msg_type = msg.get("type")
                    data = msg.get("data", {})
                    
                    print(f"\n[Event] {msg_type}")
                    
                    if msg_type == "game_start":
                        print("🎲 游戏开始！")
                        
                    elif msg_type == "round_start":
                        print(f"🃏 第 {data.get('round_count')} 局")
                        print(f"   手牌: {data.get('hole_card')}")
                        
                    elif msg_type == "street_start":
                        print(f"🎴 进入 {data.get('street')} 阶段")
                        
                    elif msg_type == "game_update":
                        action = data.get('action', {})
                        print(f"   {action.get('player_uuid')}: {action.get('action')} {action.get('amount')}")
                        
                    elif msg_type == "action_request":
                        # 关键：收到行动请求，自动回复
                        print("🔔 轮到我行动了！")
                        valid_actions = data.get("valid_actions", [])
                        # 简单策略：优先 Call，否则 Fold
                        action_to_send = "fold"
                        amount = 0
                        
                        for act in valid_actions:
                            if act['action'] == 'call':
                                action_to_send = 'call'
                                amount = act['amount']
                                break
                            if act['action'] == 'check':
                                action_to_send = 'check'
                                amount = 0
                                break
                                
                        response = {
                            "type": "player_action",
                            "data": {
                                "action": action_to_send,
                                "amount": amount
                            }
                        }
                        print(f"📤 发送操作: {response}")
                        await websocket.send(json.dumps(response))
                        
                    elif msg_type == "round_result":
                        print("🏆 本局结束")
                        winners = data.get('winners', [])
                        for w in winners:
                            print(f"   赢家: {w.get('uuid')} (+{w.get('stack')})")
                        # 测试一局后退出，或者继续
                        # break 
                        
                except json.JSONDecodeError:
                    print(f"[Raw] {msg_str}")
                    
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        print("请确保后端服务已启动: uvicorn backend.main:app --reload")

if __name__ == "__main__":
    # 检查是否安装了 websockets 库
    try:
        import websockets
        asyncio.run(test_game_flow())
    except ImportError:
        print("请先安装测试依赖: pip install websockets")

