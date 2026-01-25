"""
WebSocket 连接管理器
负责管理客户端连接和消息广播
支持按用户隔离连接
"""
from typing import List, Dict, Optional
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # 活跃连接列表（保留用于兼容性）
        self.active_connections: List[WebSocket] = []
        
        # 用户连接映射: {user_id: [websocket1, websocket2, ...]}
        self.user_connections: Dict[str, List[WebSocket]] = {}
        
        # WebSocket 到用户 ID 的映射: {websocket: user_id}
        self.websocket_to_user: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, user_id: Optional[str] = None):
        """接受新连接"""
        await websocket.accept()
        self.active_connections.append(websocket)
        
        # 如果提供了 user_id，添加到用户连接映射
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(websocket)
            self.websocket_to_user[websocket] = user_id
            print(f"Client connected (User: {user_id}). Total: {len(self.active_connections)}, User connections: {len(self.user_connections[user_id])}")
        else:
            print(f"Client connected (No user ID). Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """断开连接"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        # 从用户连接映射中移除
        user_id = self.websocket_to_user.get(websocket)
        if user_id and user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            # 如果用户没有其他连接，清理映射
            if len(self.user_connections[user_id]) == 0:
                del self.user_connections[user_id]
        
        # 从 WebSocket 到用户的映射中移除
        if websocket in self.websocket_to_user:
            del self.websocket_to_user[websocket]
        
        print(f"Client disconnected. Total: {len(self.active_connections)}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """发送私信 (JSON)"""
        await websocket.send_json(message)

    async def send_to_user(self, message: dict, user_id: str):
        """向特定用户的所有连接发送消息"""
        if user_id in self.user_connections:
            for websocket in self.user_connections[user_id]:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    print(f"Send to user {user_id} error: {e}")
                    # 可以在这里处理断开连接逻辑

    async def broadcast(self, message: dict):
        """广播消息给所有连接 (JSON) - 保留用于向后兼容"""
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Broadcast error: {e}")
                # 可以在这里处理断开连接逻辑

# 全局单例
manager = ConnectionManager()

