# Phase 2 手动测试指南

## 📋 测试前准备

### 1. 检查环境
确保以下服务已安装并可用：
- Python 3.8+
- Node.js 16+
- SQLite（数据库）

### 2. 检查依赖
```bash
# 后端依赖
pip install -r requirements.txt

# 前端依赖
cd frontend && npm install
```

### 3. 初始化数据库（如果还没有）
```bash
python3 scripts/init_db.py
```

---

## 🚀 启动服务

### 方式一：分别启动（推荐用于开发）

**终端 1 - 启动后端服务器**
```bash
cd /Users/mac/Codinnnnng/Poker_Assistant
python3 run_server.py
```

应该看到类似输出：
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**终端 2 - 启动前端开发服务器**
```bash
cd /Users/mac/Codinnnnng/Poker_Assistant/frontend
npm run dev
```

应该看到类似输出：
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 方式二：后台启动（用于快速测试）

**启动后端（后台）**
```bash
cd /Users/mac/Codinnnnng/Poker_Assistant
python3 run_server.py > /tmp/server.log 2>&1 &
```

**启动前端（后台）**
```bash
cd /Users/mac/Codinnnnng/Poker_Assistant/frontend
npm run dev > /tmp/frontend.log 2>&1 &
```

---

## 🧪 测试步骤

### 测试 1: 用户注册和登录

1. **打开浏览器**
   - 访问 `http://localhost:5173`
   - 应该自动跳转到登录页面

2. **注册新用户**
   - 点击"注册"或访问 `http://localhost:5173/register`
   - 填写信息：
     - 用户名：`testuser1`
     - 邮箱：`test1@example.com`
     - 密码：`testpass123`
   - 点击"注册"
   - ✅ **验证点**: 应该成功注册并自动登录，跳转到首页

3. **登出并重新登录**
   - 点击右上角的用户信息，选择"登出"
   - 使用刚才注册的账号登录
   - ✅ **验证点**: 应该成功登录

### 测试 2: 开始新游戏并保存数据

1. **开始新游戏**
   - 在首页点击"开始新游戏"按钮
   - 或访问 `http://localhost:5173/game`
   - ✅ **验证点**: 应该连接到 WebSocket，游戏开始

2. **完成几局游戏**
   - 等待游戏开始，进行几局游戏
   - 每局结束后点击"下一局"继续
   - 完成至少 3-5 局游戏
   - ✅ **验证点**: 每局游戏应该正常进行

3. **检查数据保存（后端）**
   ```bash
   # 检查数据库
   sqlite3 poker_assistant.db
   ```
   ```sql
   -- 查看会话
   SELECT id, started_at, total_hands, total_profit FROM game_sessions;
   
   -- 查看回合
   SELECT id, round_number, hero_profit, pot_size FROM game_rounds LIMIT 5;
   
   -- 退出
   .exit
   ```
   - ✅ **验证点**: 应该看到新创建的会话和回合记录

4. **检查数据保存（前端）**
   - 打开浏览器开发者工具（F12）
   - 查看 Console 标签
   - 应该看到类似日志：
     ```
     [Store] Backend session created: <session-id>
     [Store] Round saved to backend API: <round-id>
     ```
   - ✅ **验证点**: 应该看到数据保存到 API 的日志

### 测试 3: Dashboard 数据展示

1. **访问 Dashboard**
   - 点击"复盘中心"或访问 `http://localhost:5173/dashboard`
   - ✅ **验证点**: 应该显示加载状态，然后显示数据

2. **检查统计数据**
   - 查看统计卡片：
     - 总手数
     - 胜率
     - 入池率
     - 总盈利
     - 游戏场次
   - ✅ **验证点**: 应该显示正确的统计数据

3. **检查会话列表**
   - 查看"历史对局"列表
   - 应该看到刚才创建的游戏会话
   - ✅ **验证点**: 应该显示会话信息（日期、手数、盈利、胜率）

4. **检查资金曲线**
   - 查看"资金曲线（累计盈利）"图表
   - ✅ **验证点**: 应该显示累计盈利曲线，0 点位于中点

5. **检查 API 调用（可选）**
   - 打开浏览器开发者工具（F12）
   - 查看 Network 标签
   - 刷新 Dashboard 页面
   - 应该看到 API 请求：
     - `GET /api/game/statistics`
     - `GET /api/game/sessions`
   - ✅ **验证点**: 应该看到 API 请求成功（状态码 200）

### 测试 4: ReplayDetail 数据展示

1. **访问会话详情**
   - 在 Dashboard 中点击某个会话的"查看详情"按钮
   - 或直接访问 `http://localhost:5173/replay/<session-id>`
   - ✅ **验证点**: 应该显示加载状态，然后显示会话详情

2. **检查回合列表**
   - 查看左侧的"对局列表"
   - 应该看到该会话的所有回合
   - ✅ **验证点**: 应该显示回合信息（序号、盈利、时间）

3. **检查回合详情**
   - 点击某个回合
   - 查看右侧的回合详情：
     - 盈利/亏损
     - 底池大小
     - 手牌
     - 行动历史
   - ✅ **验证点**: 应该显示正确的回合详情

4. **检查 API 调用（可选）**
   - 打开浏览器开发者工具（F12）
   - 查看 Network 标签
   - 应该看到 API 请求：
     - `GET /api/game/sessions/<session-id>`
   - ✅ **验证点**: 应该看到 API 请求成功（状态码 200）

### 测试 5: AI 复盘分析

1. **生成复盘分析**
   - 在 ReplayDetail 页面选择一个回合
   - 点击"生成 AI 复盘分析"按钮
   - ✅ **验证点**: 应该显示加载状态（"正在生成 AI 复盘分析，预计需要 30 秒左右"）

2. **等待分析完成**
   - 等待约 30 秒
   - ✅ **验证点**: 应该显示复盘分析结果

3. **检查分析保存**
   - 刷新页面
   - 重新选择同一个回合
   - ✅ **验证点**: 应该仍然显示之前生成的复盘分析（已保存）

4. **检查 API 调用（可选）**
   - 打开浏览器开发者工具（F12）
   - 查看 Network 标签
   - 应该看到 API 请求：
     - `POST /api/game/sessions/<session-id>/rounds/<round-id>/review`
   - ✅ **验证点**: 应该看到 API 请求成功（状态码 200）

### 测试 6: 多用户数据隔离

1. **注册第二个用户**
   - 登出当前用户
   - 注册新用户：
     - 用户名：`testuser2`
     - 邮箱：`test2@example.com`
     - 密码：`testpass123`

2. **创建游戏数据**
   - 开始新游戏，完成几局
   - 查看 Dashboard
   - ✅ **验证点**: 应该只显示当前用户的数据

3. **切换用户**
   - 登出，使用第一个用户登录
   - 查看 Dashboard
   - ✅ **验证点**: 应该只显示第一个用户的数据，不包含第二个用户的数据

### 测试 7: Fallback 机制（API 失败时）

1. **停止后端服务器**
   ```bash
   # 找到进程并停止
   pkill -f "uvicorn"
   # 或
   pkill -f "run_server.py"
   ```

2. **访问 Dashboard**
   - 刷新 Dashboard 页面
   - ✅ **验证点**: 应该显示错误提示（"加载失败"），但继续显示本地数据（如果有）

3. **访问 ReplayDetail**
   - 访问某个会话详情
   - ✅ **验证点**: 应该显示错误提示，但继续显示本地数据（如果有）

4. **重新启动服务器**
   ```bash
   python3 run_server.py
   ```

5. **再次访问**
   - 刷新页面
   - ✅ **验证点**: 应该成功从 API 加载数据

---

## 🔍 常见问题排查

### 问题 1: 后端服务器无法启动

**检查项**:
- 端口 8000 是否被占用：`lsof -i :8000`
- 数据库文件是否存在：`ls -la poker_assistant.db`
- 依赖是否安装：`pip list | grep fastapi`

**解决方案**:
```bash
# 杀死占用端口的进程
lsof -ti:8000 | xargs kill -9

# 重新初始化数据库
python3 scripts/init_db.py

# 重新安装依赖
pip install -r requirements.txt
```

### 问题 2: 前端无法连接后端

**检查项**:
- 后端是否运行：访问 `http://localhost:8000/docs`
- 前端代理配置：检查 `frontend/vite.config.ts`
- CORS 设置：检查后端 `main.py` 中的 CORS 配置

**解决方案**:
- 确保后端在 `http://127.0.0.1:8000` 运行
- 检查前端环境变量：`VITE_API_BASE_URL`

### 问题 3: API 返回 401 未授权

**检查项**:
- 用户是否已登录：检查 localStorage 中的 token
- Token 是否过期：检查 token 的有效期

**解决方案**:
- 重新登录
- 清除浏览器缓存和 localStorage

### 问题 4: 数据未保存到数据库

**检查项**:
- 查看后端日志：检查是否有错误信息
- 检查数据库：`sqlite3 poker_assistant.db "SELECT * FROM game_sessions;"`
- 检查前端 Console：查看是否有错误日志

**解决方案**:
- 检查数据库连接
- 检查用户认证（确保有有效的 token）
- 查看后端日志中的错误信息

### 问题 5: Dashboard 显示空数据

**检查项**:
- 是否创建了游戏数据
- API 是否返回数据：查看 Network 标签
- 是否有错误日志：查看 Console 标签

**解决方案**:
- 先完成几局游戏
- 检查 API 响应：在 Network 标签中查看 API 返回的数据
- 检查数据格式转换是否正确

---

## 📊 验证清单

完成测试后，确认以下项目：

- [ ] 用户注册和登录正常
- [ ] 游戏数据保存到数据库
- [ ] Dashboard 从 API 获取统计数据
- [ ] Dashboard 显示会话列表
- [ ] ReplayDetail 从 API 获取会话详情
- [ ] AI 复盘分析可以生成并保存
- [ ] 多用户数据隔离正常
- [ ] API 失败时 fallback 到 localStorage
- [ ] 前端编译无错误
- [ ] 后端服务器运行正常

---

## 🎯 测试完成

如果所有测试项都通过，说明 Phase 2 的功能已正确实现！

如有问题，请查看：
- 后端日志：`/tmp/server.log` 或终端输出
- 前端日志：浏览器 Console
- 数据库：`sqlite3 poker_assistant.db`

---

**测试日期**: _______________
**测试人员**: _______________
**测试结果**: ☐ 通过  ☐ 失败
**备注**: _______________


