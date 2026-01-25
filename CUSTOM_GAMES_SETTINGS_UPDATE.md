# Custom Games 设置页面更新

## 修改内容

### 1. 前端修改

#### GameConfigModal.tsx
- **保留的设置**：
  - ✅ 盲注结构（小盲注、大盲注）
  - ✅ Deepseek API Key 输入
  
- **置灰的设置**（显示"正在开发中"）：
  - 🔒 对手配置（对手数量、AI 难度、AI 性格扮演）
  - 🔒 辅助功能（实时胜率显示、实时 AI 建议）
  - 🔒 初始筹码（已移除，仅保留盲注结构）

- **UI 改进**：
  - 置灰区域使用半透明背景和锁定图标
  - 显示"正在开发中"提示
  - 所有置灰控件设置为 `disabled` 状态

#### App.tsx
- 修改 `onSave` 回调：
  - 保存配置到 localStorage
  - 创建游戏会话时传递盲注结构配置（`small_blind`, `big_blind`）
  - 保存 session ID 到 localStorage

#### useGameStore.ts
- 修改 `game_start` 处理逻辑：
  - 检查是否已有 session，避免重复创建
  - 从 localStorage 读取游戏配置
  - 创建 session 时传递盲注结构配置

#### sessionService.ts
- 修复 `createSession` 函数：
  - 直接发送 config 作为 Body，而不是包装在对象中

### 2. 后端修改

#### game_manager.py
- 添加 `session_config` 属性用于存储 session 配置
- 修改 `_game_loop` 方法：
  - 优先使用 `session_config` 中的盲注设置
  - 如果 session_config 中有 `small_blind` 和 `big_blind`，使用它们
  - 否则使用默认配置（从环境变量读取）
  - 添加日志输出，显示使用的盲注值

#### main.py
- 在 WebSocket 连接时：
  - 从数据库获取用户最新的 session
  - 如果 session 有 config，将其设置到 GameManager 的 `session_config`
  - 添加错误处理和日志

## 数据流程

1. **用户设置配置**：
   - 用户在 Custom Games 页面设置盲注结构和 API Key
   - 配置保存到 localStorage（`gameConfig`）
   - API Key 保存到 localStorage（`DEEPSEEK_API_KEY`）

2. **创建游戏会话**：
   - 点击"保存并开始游戏"后，调用 `createSession` API
   - 传递盲注结构配置（`small_blind`, `big_blind`）
   - 后端保存配置到数据库的 `game_sessions.config` 字段

3. **WebSocket 连接**：
   - 前端连接 WebSocket 时，后端从数据库获取最新的 session
   - 将 session 的 config 设置到 GameManager 的 `session_config`

4. **游戏启动**：
   - GameManager 启动游戏时，优先使用 `session_config` 中的盲注设置
   - 如果 session_config 中没有，使用默认配置（环境变量）

## 测试建议

1. **测试盲注结构设置**：
   - 设置小盲注为 10，大盲注为 20
   - 开始游戏，验证游戏中的盲注是否正确

2. **测试 API Key 设置**：
   - 输入 API Key
   - 验证是否保存到 localStorage
   - 验证 AI 功能是否使用该 API Key

3. **测试置灰设置**：
   - 验证对手配置和辅助功能区域是否置灰
   - 验证是否显示"正在开发中"提示
   - 验证置灰控件是否无法交互

## 注意事项

- 盲注结构设置会在创建新 session 时生效
- 如果游戏已经在运行，需要重新开始游戏才能应用新配置
- API Key 设置会立即保存到 localStorage，但需要重启游戏才能生效（如果 AI 功能已在使用中）


