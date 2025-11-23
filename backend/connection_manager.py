"""
WebSocket 连接管理器
负责管理客户端连接和消息广播
"""
from typing import List, Dict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # 活跃连接列表
        self.active_connections: List[WebSocket] = []
        
        # 可选：如果有多个房间或用户，可以使用 Dict[str, WebSocket]
        # self.user_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket):
        """接受新连接"""
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """断开连接"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"Client disconnected. Total: {len(self.active_connections)}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """发送私信 (JSON)"""
        await websocket.send_json(message)

    async def broadcast(self, message: dict):
        """广播消息给所有连接 (JSON)"""
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Broadcast error: {e}")
                # 可以在这里处理断开连接逻辑

# 全局单例
manager = ConnectionManager()

