# Phase 2 前端集成进度

## ✅ 已完成

### 后端 API
1. ✅ 添加了 `POST /api/game/sessions` - 创建会话端点
2. ✅ 添加了 `POST /api/game/sessions/{session_id}/rounds` - 创建回合端点
3. ✅ 所有 API 端点测试通过

### 前端服务层
1. ✅ `sessionService.ts` - API 服务封装完成
2. ✅ `gameDataAdapter.ts` - 数据转换函数完成
3. ✅ 添加了 `createSession()` 函数
4. ✅ 添加了 `createRound()` 函数

---

## 🔄 待完成（前端集成）

### 1. 修改数据保存逻辑
**文件**: `frontend/src/store/useGameStore.ts`

需要修改 `saveRoundToSession` 函数：
- [ ] 在游戏开始时创建后端会话（调用 `createSession()`）
- [ ] 保存后端会话 ID 到 localStorage（映射到前端 sessionId）
- [ ] 在保存回合时，同时调用 `createRound()` API
- [ ] 保留 localStorage 作为备份（fallback）
- [ ] 错误处理：如果 API 调用失败，只保存到 localStorage

**关键代码位置**:
- `saveRoundToSession()` 函数（约第 5 行）
- `game_start` 消息处理（约第 531 行）
- `round_result` 消息处理（约第 737 行）

### 2. 重构 Dashboard
**文件**: `frontend/src/pages/Dashboard.tsx`

需要修改数据获取逻辑：
- [ ] 从 API 获取统计数据（`getStatistics()`）
- [ ] 从 API 获取会话列表（`getSessions()`）
- [ ] 保留 localStorage 作为 fallback
- [ ] 处理加载状态和错误
- [ ] 数据格式转换（API 格式 → 前端格式）

**关键代码位置**:
- `useEffect` 数据加载（约第 40 行）
- 统计数据计算（约第 46 行）
- 会话列表渲染（约第 300 行）

### 3. 重构 ReplayDetail
**文件**: `frontend/src/pages/ReplayDetail.tsx`

需要修改数据获取逻辑：
- [ ] 从 API 获取会话详情（`getSessionDetail()`）
- [ ] 从 API 获取复盘分析（从会话详情中）
- [ ] 保存复盘分析到 API（`saveRoundReview()`）
- [ ] 保留 localStorage 作为 fallback
- [ ] 数据格式转换

**关键代码位置**:
- `useEffect` 数据加载（约第 27 行）
- 复盘分析保存（约第 100 行）

---

## 📝 实现策略

### 数据保存策略（双写）
1. **优先保存到 API**（数据库持久化）
2. **同时保存到 localStorage**（作为备份和离线支持）
3. **错误处理**: 如果 API 保存失败，仅保存到 localStorage 并记录错误

### 数据读取策略（优先 API）
1. **优先从 API 读取**（数据库）
2. **如果 API 失败，fallback 到 localStorage**
3. **如果两者都失败，显示错误**

### 会话 ID 管理
- **前端 sessionId**: 存储在 localStorage，用于标识前端会话
- **后端 session_id**: UUID，由后端 API 生成
- **映射关系**: 在 localStorage 中维护映射 `backend_session_id -> frontend_session_id`

---

## 🔧 技术细节

### 会话创建时机
- 在 `game_start` 事件时创建后端会话
- 保存后端会话 ID 到 localStorage
- 在后续的回合保存中使用后端会话 ID

### 数据格式转换
- 使用 `convertRoundDataToAPI()` 函数转换数据格式
- API 返回的数据需要转换为前端格式

### 错误处理
- API 调用使用 try-catch
- 记录错误日志
- 优雅降级（fallback 到 localStorage）

---

## 📋 实施步骤

1. **第一步**: 修改 `saveRoundToSession` 函数，添加 API 调用
2. **第二步**: 在 `game_start` 处理中创建后端会话
3. **第三步**: 重构 Dashboard 数据获取
4. **第四步**: 重构 ReplayDetail 数据获取
5. **第五步**: 测试完整流程

---

**状态**: 后端 API 完成 ✅，前端服务层完成 ✅，前端集成进行中 🔄


