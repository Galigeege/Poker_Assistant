# ReplayDetail 数据展示修复

## 问题描述

1. 对局详情中没有展示玩家的手牌信息
2. 摊牌结果的手牌也没展示
3. 摊牌结果玩家信息显示 Unknown

## 修复内容

### 1. 保存 seats 信息到 street_history

**文件**: `frontend/src/services/gameDataAdapter.ts`

在保存 `street_history` 时，将 `seats` 信息保存到第一个 street（preflop）中，用于后续数据恢复：

```typescript
// 在第一个 street（preflop）中保存 seats 信息，用于后续数据恢复
if (idx === 0 && roundResult.round_state.seats) {
  streetData.seats = roundResult.round_state.seats;
}
```

### 2. 改进 ReplayDetail 数据提取逻辑

**文件**: `frontend/src/pages/ReplayDetail.tsx`

- **从多个来源提取 seats**：优先从 `street_history[0].seats` 提取，如果不存在则从其他 street 中查找
- **改进 hero UUID 推断**：从多个来源推断 hero UUID（seats、hand_info、winners）
- **改进 playerHoleCards 提取**：
  - Hero 手牌：从 `hero_hole_cards` 提取
  - 其他玩家手牌：从 `hand_info` 中提取（支持 `hole_card` 和 `hole_cards` 两种格式）
  - Winners 手牌：从 `winners` 中提取（如果有 `hole_card` 字段）
- **确保 seats 存在**：如果 seats 为空，创建一个基本的 seats 结构

### 3. 确保 hand_info 包含玩家名称

**文件**: `frontend/src/services/gameDataAdapter.ts`

在转换 `hand_info` 时，确保每个 hand 都包含 `name` 字段：

```typescript
const handInfo = (roundResult.hand_info || []).map((hand: any) => {
  // 如果 hand_info 中没有 name，从 seats 中查找
  if (!hand.name && !hand.player_name) {
    const playerSeat = roundResult.round_state.seats.find((s: Player) => s.uuid === hand.uuid);
    return {
      ...hand,
      name: playerSeat?.name || 'Unknown',
      player_name: playerSeat?.name || 'Unknown'
    };
  }
  return hand;
});
```

### 4. 改进 UI 显示逻辑

**文件**: `frontend/src/pages/ReplayDetail.tsx`

- **摊牌结果玩家名称**：优先使用 `hand.name` 或 `hand.player_name`，然后从 `seats` 查找，最后使用 'Unknown'
- **其他玩家手牌显示**：优先从 `hand_info` 中查找玩家名称，然后从 `seats` 查找
- **手牌显示**：如果手牌为空，显示"手牌未记录"提示

## 测试建议

1. 开启新游戏并完成几局
2. 进入复盘中心，查看对局详情
3. 验证：
   - Hero 手牌是否正确显示
   - 摊牌时其他玩家的手牌是否正确显示
   - 摊牌结果中的玩家名称是否正确（不是 Unknown）
   - 所有玩家的手牌信息都能正确展示

## 数据流程

1. **保存时**：
   - `street_history[0]` 包含 `seats` 信息
   - `hand_info` 中的每个 hand 包含 `name` 字段
   - `winners` 中的每个 winner 包含 `name` 字段

2. **读取时**：
   - 从 `street_history[0].seats` 提取 seats
   - 从 `hero_hole_cards` 提取 Hero 手牌
   - 从 `hand_info` 提取所有玩家的手牌和名称
   - 从 `winners` 提取赢家信息（包含名称）

## 兼容性

- 支持旧数据格式（没有 seats 的 street_history）
- 支持多种手牌字段格式（`hole_card`、`hole_cards`）
- 支持多种名称字段格式（`name`、`player_name`）


