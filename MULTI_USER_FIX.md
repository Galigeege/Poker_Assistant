# 多用户游戏隔离修复

## 问题描述

两个不同的用户账号进入了同一个游戏 session，导致数据混乱。

## 问题原因

1. **全局单例 GameManager**: `backend/game_manager.py` 中创建了全局单例 `game_manager`，所有用户共享同一个实例
2. **WebSocket 未认证**: WebSocket 连接时没有验证用户身份
3. **无用户隔离**: 没有为每个用户创建独立的游戏实例

## 解决方案

### 1. 创建用户游戏管理器

**文件**: `backend/user_game_manager.py`

- 为每个用户管理独立的 `GameManager` 实例
- 使用字典存储：`{user_id: GameManager}`
- 从 token 中获取用户身份

### 2. 修改 WebSocket 端点

**文件**: `backend/main.py`

- 在 WebSocket 连接时验证 token
- 从查询参数获取 token: `?token=<jwt_token>`
- 为每个用户获取独立的 `GameManager` 实例
- 所有游戏操作都使用用户特定的 `GameManager`

### 3. 修改前端连接逻辑

**文件**: `frontend/src/store/useGameStore.ts`

- 在连接 WebSocket 时添加 token 到查询参数
- 检查 token 是否存在，如果不存在则提示错误

## 修改内容

### 后端修改

1. **新增文件**: `backend/user_game_manager.py`
   - `UserGameManager` 类：管理每个用户的游戏实例
   - `get_user_from_token()`: 从 token 获取用户
   - `get_game_manager()`: 获取或创建用户的游戏管理器

2. **修改文件**: `backend/main.py`
   - WebSocket 端点添加 token 验证
   - 使用 `user_game_manager.get_game_manager(user_id)` 获取用户特定的游戏管理器
   - 所有游戏操作都使用用户特定的 `game_manager`

### 前端修改

1. **修改文件**: `frontend/src/store/useGameStore.ts`
   - 导入 `useAuthStore`
   - 在连接 WebSocket 时获取 token 并添加到查询参数
   - 如果 token 不存在，显示错误并阻止连接

## 测试验证

### 测试步骤

1. **启动服务器**
   ```bash
   python3 run_server.py
   ```

2. **启动前端**
   ```bash
   cd frontend && npm run dev
   ```

3. **测试多用户隔离**
   - 在浏览器 1 中注册/登录用户 1
   - 在浏览器 2 中注册/登录用户 2
   - 两个用户分别开始游戏
   - 验证：两个用户应该看到不同的游戏状态

### 验证点

- ✅ 用户 1 的游戏操作不影响用户 2
- ✅ 用户 2 的游戏操作不影响用户 1
- ✅ 每个用户有独立的游戏 session
- ✅ WebSocket 连接需要有效的 token
- ✅ 无 token 时连接被拒绝

## 技术细节

### Token 传递方式

WebSocket 不支持标准的 HTTP Authorization header，因此使用查询参数传递 token：

```
ws://localhost:8000/ws/game?token=<jwt_token>
```

### 用户游戏管理器生命周期

- **创建**: 用户首次连接时创建
- **复用**: 用户重新连接时复用现有实例
- **清理**: 目前不自动清理（保留用于重新连接），可以后续添加清理逻辑

### 游戏实例隔离

每个用户有独立的：
- `GameManager` 实例
- 游戏线程
- 游戏状态
- 待处理状态（pending states）

## 注意事项

1. **Token 安全**: Token 通过查询参数传递，在日志中可能可见。生产环境建议使用更安全的方式（如 WebSocket subprotocol）

2. **内存管理**: 目前不自动清理用户的游戏实例。如果用户长时间不连接，可以考虑添加清理逻辑

3. **并发限制**: 每个用户只能有一个活跃的游戏实例。如果用户多次连接，会共享同一个游戏实例

## 后续优化建议

1. **WebSocket Subprotocol**: 使用 WebSocket subprotocol 传递认证信息，更安全
2. **自动清理**: 添加定时清理长时间未使用的游戏实例
3. **连接限制**: 限制每个用户的最大并发连接数
4. **游戏状态持久化**: 将游戏状态持久化到数据库，支持跨服务器实例

---

**修复日期**: 2026-01-19  
**状态**: ✅ 已完成


