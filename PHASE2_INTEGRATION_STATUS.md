# Phase 2 前端集成状态

## ✅ 已完成

### useGameStore.ts 数据保存集成
1. ✅ 添加了 API 服务导入
   - `createSession` - 创建会话
   - `createRound` - 创建回合
   - `convertRoundDataToAPI` - 数据格式转换

2. ✅ `game_start` 事件处理
   - 在游戏开始时创建后端会话
   - 保存后端会话 ID 到 localStorage（映射关系）
   - 错误处理（如果创建失败，继续使用 localStorage）

3. ✅ `saveRoundToSession` 函数增强
   - 保留原有的 localStorage 保存逻辑
   - 添加 API 保存逻辑（如果后端会话 ID 存在）
   - 使用 `convertRoundDataToAPI` 转换数据格式
   - 保存回合 ID 映射（用于后续的复盘分析保存）
   - 错误处理（API 失败时不影响 localStorage 保存）

4. ✅ 前端编译通过

---

## 🔄 待完成

### Dashboard 重构
**文件**: `frontend/src/pages/Dashboard.tsx`

需要修改：
- [ ] 从 API 获取统计数据（`getStatistics()`）
- [ ] 从 API 获取会话列表（`getSessions()`）
- [ ] 保留 localStorage 作为 fallback
- [ ] 处理加载状态和错误
- [ ] 数据格式转换（API 格式 → 前端格式）

### ReplayDetail 重构
**文件**: `frontend/src/pages/ReplayDetail.tsx`

需要修改：
- [ ] 从 API 获取会话详情（`getSessionDetail()`）
- [ ] 从 API 获取复盘分析（从会话详情中）
- [ ] 保存复盘分析到 API（`saveRoundReview()`）
- [ ] 保留 localStorage 作为 fallback
- [ ] 数据格式转换

---

## 📝 技术实现说明

### 数据保存策略（双写）
1. **优先保存到 API**（数据库持久化）
2. **同时保存到 localStorage**（作为备份和离线支持）
3. **错误处理**: 如果 API 保存失败，仅保存到 localStorage 并记录错误

### 会话 ID 管理
- **前端 sessionId**: 存储在 localStorage (`current_session_id`)
- **后端 session_id**: UUID，存储在 localStorage (`backend_session_${frontendSessionId}`)
- **映射关系**: 通过 localStorage key 维护映射

### 回合 ID 管理
- **前端 roundId**: 时间戳生成的 ID (`round_${Date.now()}`)
- **后端 round_id**: UUID，存储在 localStorage (`backend_round_${frontendRoundId}`)
- **用途**: 用于后续的复盘分析保存

---

## 🎯 下一步

继续完成 Dashboard 和 ReplayDetail 的重构，使它们能够从 API 获取数据。

---

**状态**: 数据保存逻辑集成完成 ✅，数据读取集成进行中 🔄


