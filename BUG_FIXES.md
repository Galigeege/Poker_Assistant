# Bug 修复总结

## 修复日期
2026-01-19

## 修复的问题

### 1. Dashboard 未展示玩家手牌 ✅

**问题描述**: Dashboard 中的会话列表没有显示第一局的手牌

**修复内容**:
- 在 `Session` 接口中添加 `firstRoundHoleCards?: string[]` 字段
- 修改 `loadData()` 函数，从 API 获取每个会话的第一局手牌
- 在 `SessionRow` 组件中显示第一局手牌（如果存在）

**文件修改**:
- `frontend/src/pages/Dashboard.tsx`
  - 添加 `firstRoundHoleCards` 字段到 `Session` 接口
  - 使用 `getSessionDetail()` 获取第一局手牌
  - 在 `SessionRow` 中显示手牌卡片

### 2. 摊牌结果玩家信息显示 Unknown ✅

**问题描述**: ReplayDetail 中摊牌结果的玩家名称显示为 "Unknown"

**修复内容**:
- 修改 `convertRoundDataToAPI()` 函数，保存 winners 时包含 `name` 字段
- 修改 `ReplayDetail` 的数据转换逻辑，优先使用 API 返回的 `name` 字段

**文件修改**:
- `frontend/src/services/gameDataAdapter.ts`
  - 在转换 winners 时，从 `round_state.seats` 中查找玩家名称
  - 保存 `name` 字段到 API

- `frontend/src/pages/ReplayDetail.tsx`
  - 优先使用 `w.name`（如果 API 返回了），否则从 seats 查找

### 3. 没有发牌就轮到行动 ✅

**问题描述**: 用户收到 `action_request` 但没有收到 `round_start`，导致手牌为空

**修复内容**:
- 在 `GameManager` 中添加 `pending_round_start` 状态保存
- 修改 `send_pending_state()` 方法，确保先发送 `round_start`，再发送 `action_request`
- 在前端 `action_request` 处理中添加 fallback 逻辑（如果手牌为空，从 action_request 中获取）

**文件修改**:
- `backend/game_manager.py`
  - 添加 `pending_round_start` 属性
  - 在 `_listen_to_game_events()` 中保存 `round_start` 事件
  - 修改 `send_pending_state()` 确保按顺序发送：`round_start` -> `action_request` -> `round_result`
  - 更新 `clear_pending_state()` 支持清除 `round_start`

- `frontend/src/store/useGameStore.ts`
  - 在 `action_request` 处理中添加 fallback 逻辑
  - 如果手牌为空，从 `action_request.hole_card` 中获取（作为备用）
  - 添加警告日志

## 技术细节

### Dashboard 手牌显示

```typescript
// 获取第一局手牌
const sessionDetail = await getSessionDetail(session.id);
if (sessionDetail.rounds && sessionDetail.rounds.length > 0) {
  firstRoundHoleCards = sessionDetail.rounds[0].hero_hole_cards || undefined;
}
```

### Winners 名称修复

```typescript
// 保存时包含 name
const winners = roundResult.winners.map((w: any) => {
  const winnerSeat = roundResult.round_state.seats.find((s: Player) => s.uuid === w.uuid);
  return {
    uuid: w.uuid,
    name: (w as any).name || winnerSeat?.name || 'Unknown',
    stack: w.stack
  };
});
```

### 事件发送顺序

```python
# 确保 round_start 在 action_request 之前发送
if self.pending_round_start:
    await manager.send_to_user(self.pending_round_start, self.user_id)
    await asyncio.sleep(0.1)  # 等待处理

if self.pending_action_request:
    await manager.send_to_user(self.pending_action_request, self.user_id)
```

## 测试验证

### 测试步骤

1. **Dashboard 手牌显示**
   - 访问 Dashboard
   - 验证会话列表中显示第一局手牌

2. **摊牌结果名称**
   - 访问 ReplayDetail
   - 查看摊牌结果，验证玩家名称正确显示（不是 "Unknown"）

3. **发牌顺序**
   - 开始新游戏
   - 验证先收到 `round_start`（包含手牌），再收到 `action_request`
   - 验证手牌正确显示

## 状态

✅ 所有问题已修复
✅ 前端编译通过
✅ 后端导入成功

---

**修复完成时间**: 2026-01-19


